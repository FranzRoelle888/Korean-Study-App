import { supabase } from './supabaseClient'
import { dailyPool } from './dailyPool'

/* ============================================================
   DATENSCHICHT + WIEDERHOLUNGS-ALGORITHMUS

   Quelle der Wahrheit: die Supabase-Cloud-Datenbank (dauerhaft).
   Zusätzlich spiegeln wir alles in den Browser-Speicher
   (localStorage) als "Puffer": So ist die App schnell und
   funktioniert auch offline / wenn kurz kein Internet da ist.

   Ablauf:
   - Start: aus der Cloud laden -> in den Puffer schreiben.
     Kein Internet? -> aus dem Puffer laden.
   - Änderung: sofort in den Puffer (instant, offline-sicher)
     UND in die Cloud schreiben (dauerhaft).

   Zwei Kartentypen pro Wort:
     front 'en' -> Vorderseite Englisch, Antwort eintippen
     front 'ko' -> Vorderseite Koreanisch, umdrehen
   ============================================================ */

const START_EASE = 2.5
const MIN_EASE = 1.3
const DAILY_NEW = 2 // neue Vokabeln pro Tag (leicht änderbar)
const REVIEW_CAP = 50 // max. Nachhol-Karten pro Tag

const WORDS_CACHE = 'korean-app:words'
const CARDS_CACHE = 'korean-app:cards'

/* ---------- Puffer (localStorage) ---------- */
export function writeWordsCache(words) {
  localStorage.setItem(WORDS_CACHE, JSON.stringify(words))
}
export function writeCardsCache(cards) {
  localStorage.setItem(CARDS_CACHE, JSON.stringify(cards))
}
function readWordsCache() {
  try {
    return JSON.parse(localStorage.getItem(WORDS_CACHE)) || []
  } catch {
    return []
  }
}
function readCardsCache() {
  try {
    return JSON.parse(localStorage.getItem(CARDS_CACHE)) || []
  } catch {
    return []
  }
}

/* ---------- Umwandlung DB-Zeile <-> App-Objekt ---------- */
// (Die DB benutzt Unterstrich-Namen wie word_id, die App camelCase.)
function wordFromRow(r) {
  return { id: r.id, en: r.en, ko: r.ko, createdAt: new Date(r.created_at).getTime() }
}
function wordToRow(w) {
  return { id: w.id, en: w.en, ko: w.ko, created_at: new Date(w.createdAt).toISOString() }
}
function cardFromRow(r) {
  return {
    id: r.id,
    wordId: r.word_id,
    front: r.front,
    ease: r.ease,
    intervalDays: r.interval_days,
    reps: r.reps,
    lapses: r.lapses,
    due: r.due,
    lastReviewed: r.last_reviewed,
  }
}
function cardToRow(c) {
  return {
    id: c.id,
    word_id: c.wordId,
    front: c.front,
    ease: c.ease,
    interval_days: c.intervalDays,
    reps: c.reps,
    lapses: c.lapses,
    due: c.due,
    last_reviewed: c.lastReviewed,
  }
}

/* ---------- Datums-Helfer (tagesgenau, lokale Zeit) ---------- */
function toISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
export function todayStr() {
  // Ein "Lerntag" läuft von 4:00 bis 4:00 Uhr: vor 4 Uhr morgens zählt
  // noch zum Vortag. So bezieht sich "heute" überall (fällige Karten,
  // Tagesaufgaben, Streak) auf denselben Zeitraum.
  const d = new Date()
  if (d.getHours() < 4) d.setDate(d.getDate() - 1)
  return toISO(d)
}
function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/* ---------- Start: alles laden ---------- */
export async function loadInitial() {
  try {
    const [wRes, cRes] = await Promise.all([
      supabase.from('words').select('*').order('created_at', { ascending: false }),
      supabase.from('cards').select('*'),
    ])
    if (wRes.error) throw wRes.error
    if (cRes.error) throw cRes.error

    const words = wRes.data.map(wordFromRow)
    const cards = cRes.data.map(cardFromRow)
    writeWordsCache(words)
    writeCardsCache(cards)
    return { words, cards, online: true }
  } catch (e) {
    // Kein Internet oder Tabellen fehlen -> Puffer benutzen
    console.warn('Cloud-Laden fehlgeschlagen, benutze lokalen Puffer:', e?.message || e)
    return { words: readWordsCache(), cards: readCardsCache(), online: false }
  }
}

/* ---------- Streuung ("Zufall mit Gedächtnis") ----------
   Ohne Streuung bekommt jede Karte bei gleichem Stand exakt denselben
   Termin. Wer mit vielen Vokabeln auf einmal anfängt, schiebt dadurch
   für immer einen Klumpen im Gleichschritt vor sich her.

   Wichtig: nicht bei jedem Klick neu würfeln, sondern die Abweichung
   AUS DER KARTE berechnen (id + Anzahl Wiederholungen + Knopf).
   Dieselbe Karte ergibt so immer dieselbe Zahl -> die Vorschau auf den
   Knöpfen stimmt mit dem, was danach wirklich passiert. Verschiedene
   Karten driften trotzdem auseinander, und nach jeder Wiederholung
   (reps ändert sich) wird neu gestreut. */
function seeded(...parts) {
  const s = parts.join('|')
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967296 // 0 … knapp unter 1
}

// Ganze Zahl aus [lo, hi] – ausgewürfelt, aber reproduzierbar.
function pick(seed, lo, hi) {
  return lo + Math.floor(seed * (hi - lo + 1))
}

// Intervall leicht verschieben: bis 4 Tage um ±1 Tag, darüber um ±15 %.
function fuzzDays(days, seed) {
  if (days <= 1) return days
  const spread = days <= 4 ? 1 : Math.max(1, Math.round(days * 0.15))
  return Math.max(1, days + pick(seed, -spread, spread))
}

/* ---------- Neue Karte (neu = sofort fällig) ---------- */
function newCard(wordId, front) {
  return {
    id: crypto.randomUUID(),
    wordId,
    front,
    // Auch das Tempo (ease) startet leicht gestreut, damit nicht alle
    // Karten mit exakt derselben Beschleunigung loslaufen.
    ease: Math.round((START_EASE + (Math.random() - 0.5) * 0.3) * 100) / 100,
    intervalDays: 0,
    reps: 0,
    lapses: 0,
    due: todayStr(),
    lastReviewed: null,
  }
}

/* ---------- Duplikat-Sperre (auf Wortebene) ---------- */
export function isDuplicate(words, ko) {
  const needle = ko.trim()
  return words.some((w) => w.ko.trim() === needle)
}

/* ---------- Vokabel anlegen (rein, ohne Speichern) ----------
   Prüft Eingaben + Duplikat und erzeugt Wort + zwei Karten.
   Gibt { error } zurück oder { word, c1, c2 }. */
export function validateNewWord(words, en, ko) {
  const cleanEn = en.trim()
  const cleanKo = ko.trim()
  if (!cleanEn || !cleanKo) {
    return { error: 'Please fill in both fields.' }
  }
  if (isDuplicate(words, cleanKo)) {
    return { error: `"${cleanKo}" is already in your library.` }
  }
  const word = { id: crypto.randomUUID(), en: cleanEn, ko: cleanKo, createdAt: Date.now() }
  return { word, c1: newCard(word.id, 'en'), c2: newCard(word.id, 'ko') }
}

/* ---------- In die Cloud schreiben ---------- */
export async function persistNewWord(word, c1, c2) {
  const we = await supabase.from('words').insert(wordToRow(word))
  if (we.error) throw we.error
  const ce = await supabase.from('cards').insert([cardToRow(c1), cardToRow(c2)])
  if (ce.error) throw ce.error
}

export async function persistCard(card) {
  const { error } = await supabase.from('cards').update(cardToRow(card)).eq('id', card.id)
  if (error) throw error
}

/* ---------- Vokabel bearbeiten ----------
   Prüft die neuen Werte (Duplikat gegen ANDERE Wörter). Die beiden
   Karten hängen am Wort und aktualisieren sich dadurch automatisch;
   ihr Lernstand/Termin bleibt unangetastet. */
export function validateEdit(words, id, en, ko) {
  const cleanEn = en.trim()
  const cleanKo = ko.trim()
  if (!cleanEn || !cleanKo) {
    return { error: 'Please fill in both fields.' }
  }
  const dup = words.some((w) => w.id !== id && w.ko.trim() === cleanKo)
  if (dup) {
    return { error: `"${cleanKo}" is already in your library.` }
  }
  return { en: cleanEn, ko: cleanKo }
}

export async function updateWordCloud(id, en, ko) {
  const { error } = await supabase.from('words').update({ en, ko }).eq('id', id)
  if (error) throw error
}

/* ---------- Vokabel löschen ----------
   Die zwei zugehörigen Karten werden in der DB automatisch mit
   gelöscht (on delete cascade). */
export async function deleteWordCloud(id) {
  const { error } = await supabase.from('words').delete().eq('id', id)
  if (error) throw error
}

/* ============================================================
   DER ALGORITHMUS (SM-2, vereinfacht, tagesgenau)
   ============================================================ */
export function applyRating(card, rating) {
  let { ease, intervalDays, reps, lapses } = card

  // Die Streuung dieser Karte für genau diesen Knopf (siehe seeded()).
  const seed = seeded(card.id, reps, rating)

  if (rating === 'again') {
    ease = Math.max(MIN_EASE, ease - 0.2)
    reps = 0
    lapses = lapses + 1
    intervalDays = 0
  } else {
    if (rating === 'hard') ease = Math.max(MIN_EASE, ease - 0.15)
    else if (rating === 'easy') ease = ease + 0.15

    if (reps === 0) {
      // Erste Wiederholung: statt bei allen Karten stur 1 bzw. 4 Tage
      // eine kleine Spanne, damit der Anfangs-Klumpen sofort aufbricht.
      intervalDays = rating === 'hard' ? 1 : rating === 'easy' ? pick(seed, 3, 5) : pick(seed, 1, 2)
    } else if (reps === 1) {
      intervalDays =
        rating === 'hard' ? pick(seed, 2, 3) : rating === 'easy' ? pick(seed, 6, 9) : pick(seed, 3, 5)
    } else {
      const factor = rating === 'hard' ? 1.2 : rating === 'easy' ? ease * 1.3 : ease
      intervalDays = fuzzDays(Math.max(1, Math.round(intervalDays * factor)), seed)
    }
    reps = reps + 1
  }

  return {
    ...card,
    ease,
    intervalDays,
    reps,
    lapses,
    due: addDays(todayStr(), intervalDays),
    lastReviewed: todayStr(),
  }
}

/* ---------- Reihenfolge des Tagesstapels ----------
   1) Mischen: alle heute fälligen Karten in eine zufällige Reihenfolge.
      Der Seed ist Datum + Karten-Id -> jeden Morgen neu gemischt, aber
      über den Tag stabil (der Stapel springt nicht herum, wenn man die
      App zwischendurch verlässt und wieder reingeht).
   2) Paare trennen: die zwei Karten eines Wortes (eintippen / umdrehen)
      dürfen nicht direkt hintereinander liegen – sonst verrät die erste
      die Antwort der zweiten und der Lerneffekt ist weg. */
const PAIR_GAP = 3 // mindestens so viele andere Karten zwischen zwei Karten eines Wortes

function shuffleForToday(list) {
  const t = todayStr()
  return list
    .map((c) => ({ c, k: seeded('order', t, c.id) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.c)
}

// Geht die gemischte Liste durch und nimmt immer die erste Karte, deren
// Wort nicht gerade eben dran war. Notfalls (Stapel fast leer, es geht
// nicht besser) einfach die nächste.
function spaceOutPairs(list) {
  const rest = [...list]
  const out = []
  while (rest.length > 0) {
    const recent = out.slice(-PAIR_GAP).map((c) => c.wordId)
    let i = rest.findIndex((c) => !recent.includes(c.wordId))
    if (i === -1) i = 0
    out.push(rest.splice(i, 1)[0])
  }
  return out
}

/* ---------- Heute fällige Karten (mit en/ko verbunden) ----------
   - Frisch eingeführte Karten (reps 0) sind IMMER dabei (sollen ja
     direkt auf den Stapel).
   - Nachhol-Karten (reps > 0) werden auf REVIEW_CAP pro Tag gedeckelt,
     die überfälligsten zuerst.
   - Danach wird der ganze Stapel gemischt (neu + Nachholer gemeinsam)
     und die Wort-Paare werden auseinandergezogen. */
export function dueCards(words, cards) {
  const t = todayStr()
  const byId = Object.fromEntries(words.map((w) => [w.id, w]))
  const all = cards
    .filter((c) => c.due <= t && byId[c.wordId])
    .map((c) => ({ ...c, en: byId[c.wordId].en, ko: byId[c.wordId].ko }))

  const fresh = all.filter((c) => c.reps === 0)
  const review = all
    .filter((c) => c.reps > 0)
    .sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0))
    .slice(0, REVIEW_CAP)

  return spaceOutPairs(shuffleForToday([...fresh, ...review]))
}

/* ============================================================
   VOKABEL DES TAGES (Nachziehstapel)
   ============================================================ */

const DAILY_KEY = 'korean-app:daily' // { date, introduced } – Tageszähler

function getDailyProgress() {
  try {
    const d = JSON.parse(localStorage.getItem(DAILY_KEY))
    if (d && d.date === todayStr()) return d
  } catch {
    /* egal */
  }
  return { date: todayStr(), introduced: 0 }
}
function bumpDailyProgress() {
  const p = getDailyProgress()
  const next = { date: todayStr(), introduced: p.introduced + 1 }
  localStorage.setItem(DAILY_KEY, JSON.stringify(next))
}

// Die nächsten Pool-Einträge, die noch NICHT in der Bibliothek sind.
function nextFromPool(words, count) {
  const have = new Set(words.map((w) => w.ko.trim()))
  const list = []
  for (const e of dailyPool) {
    if (list.length >= count) break
    if (!have.has(e.ko.trim())) list.push(e)
  }
  return list
}

// Was steht heute an? left = wie viele heute noch, candidates = Einträge.
export function dailyStatus(words) {
  const introduced = getDailyProgress().introduced
  const left = Math.max(0, DAILY_NEW - introduced)
  const candidates = nextFromPool(words, left)
  return {
    left,
    candidates,
    introducedToday: introduced,
    done: left === 0 || candidates.length === 0,
    poolEmpty: nextFromPool(words, 1).length === 0,
  }
}

// Ein Pool-Wort einführen: Wort + zwei Karten (SOFORT fällig -> direkt
// auf den Stapel), dauerhaft speichern, Tageszähler hochsetzen.
export function makeIntroducedWord(poolEntry) {
  const word = {
    id: crypto.randomUUID(),
    en: poolEntry.en,
    ko: poolEntry.ko,
    createdAt: Date.now(),
  }
  // newCard setzt due = heute, reps = 0 -> neue Karte, sofort fällig
  return { word, c1: newCard(word.id, 'en'), c2: newCard(word.id, 'ko') }
}

export function countIntroductionToday() {
  bumpDailyProgress()
}

/* ============================================================
   ZAHLEN-CHALLENGE (1–99, sino- + nativ-koreanisch)
   ============================================================ */

const SINO_ONES = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']
const NATIVE_ONES = ['', '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉']
const NATIVE_TENS = ['', '열', '스물', '서른', '마흔', '쉰', '예순', '일흔', '여든', '아흔']

// Sino-koreanisch: 21 -> 이십일, 10 -> 십, 5 -> 오
export function sinoKorean(n) {
  const t = Math.floor(n / 10)
  const o = n % 10
  let s = ''
  if (t >= 1) s += (t === 1 ? '' : SINO_ONES[t]) + '십'
  if (o >= 1) s += SINO_ONES[o]
  return s
}

// Nativ-koreanisch: 21 -> 스물하나, 10 -> 열, 5 -> 다섯
export function nativeKorean(n) {
  const t = Math.floor(n / 10)
  const o = n % 10
  let s = ''
  if (t >= 1) s += NATIVE_TENS[t]
  if (o >= 1) s += NATIVE_ONES[o]
  return s
}

const NUMBER_KEY = 'korean-app:number' // { date, number, done }

// Die Zahl des Tages (einmal pro Tag festgelegt, damit man nicht
// neu würfeln kann, bis eine leichte kommt).
export function getNumberChallenge() {
  try {
    const d = JSON.parse(localStorage.getItem(NUMBER_KEY))
    if (d && d.date === todayStr()) return d
  } catch {
    /* egal */
  }
  const fresh = { date: todayStr(), number: 1 + Math.floor(Math.random() * 99), done: false }
  localStorage.setItem(NUMBER_KEY, JSON.stringify(fresh))
  return fresh
}

export function completeNumberChallenge() {
  const c = getNumberChallenge()
  const next = { ...c, done: true }
  localStorage.setItem(NUMBER_KEY, JSON.stringify(next))
  return next
}

/* ============================================================
   STREAK (Tage in Folge) + Kalender

   In der Cloud-Tabelle daily_log steht je erledigtem Lerntag eine
   Zeile { day, done }. Ein Tag gilt als erledigt, wenn ALLE drei
   Tagesaufgaben fertig sind (Vokabel des Tages + Wiederholungsstapel
   leer + Zahlen-Challenge). Die Streak = wie viele Tage am Stück.
   ============================================================ */

const LOG_CACHE = 'korean-app:log'

function writeLogCache(rows) {
  localStorage.setItem(LOG_CACHE, JSON.stringify(rows))
}
function readLogCache() {
  try {
    return JSON.parse(localStorage.getItem(LOG_CACHE)) || []
  } catch {
    return []
  }
}

// Alle erledigten Tage laden (mit Offline-Puffer).
export async function loadDailyLog() {
  try {
    const { data, error } = await supabase.from('daily_log').select('*')
    if (error) throw error
    writeLogCache(data)
    return data
  } catch (e) {
    console.warn('Streak-Laden fehlgeschlagen, benutze Puffer:', e?.message || e)
    return readLogCache()
  }
}

// Einen Tag als erledigt markieren (dauerhaft + Puffer).
export async function markDayDone(logRows, day) {
  const next = logRows.some((r) => r.day === day)
    ? logRows.map((r) => (r.day === day ? { ...r, done: true } : r))
    : [...logRows, { day, done: true }]
  writeLogCache(next)
  supabase
    .from('daily_log')
    .upsert({ day, done: true })
    .then(({ error }) => {
      if (error) console.warn('Streak-Speichern fehlgeschlagen:', error.message)
    })
  return next
}

// Wie viele Tage am Stück (bis heute, sonst bis gestern) erledigt?
export function computeStreak(logRows) {
  const done = new Set(logRows.filter((r) => r.done).map((r) => r.day))
  let streak = 0
  let d = todayStr()
  if (!done.has(d)) d = addDays(d, -1) // heute noch offen -> zähle bis gestern
  while (done.has(d)) {
    streak++
    d = addDays(d, -1)
  }
  return streak
}

// Wochentag auf Koreanisch (0=So … 6=Sa).
const KO_WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

// 7 Tage rund um heute: heute steht immer an 3. Stelle (2 Tage davor,
// 4 Tage danach) und ist mit isToday markiert. Zukünftige Tage sind
// noch nicht erledigt (done = false).
export function last7Days(logRows) {
  const done = new Set(logRows.filter((r) => r.done).map((r) => r.day))
  const today = todayStr()
  const out = []
  for (let offset = -2; offset <= 4; offset++) {
    const ds = addDays(today, offset)
    const label = KO_WEEKDAY[new Date(ds + 'T00:00:00').getDay()]
    out.push({ day: ds, label, done: done.has(ds), isToday: ds === today })
  }
  return out
}

// Set der erledigten Tage (für den Kalender).
export function doneDaysSet(logRows) {
  return new Set(logRows.filter((r) => r.done).map((r) => r.day))
}

/* ---------- Intervall-Vorschau für die Buttons ---------- */
export function previewInterval(card, rating) {
  return applyRating(card, rating).intervalDays
}
export function formatInterval(days) {
  if (days <= 0) return 'today'
  if (days === 1) return '1 day'
  return `${days} days`
}
