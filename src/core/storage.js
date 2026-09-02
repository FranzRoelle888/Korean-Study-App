import { supabase } from './supabaseClient'
import { poolFor } from './dailyPool'
import { fsrsSchritt } from './fsrs'
import { PROFILES, DEFAULT_PROFILE } from './profiles'

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
/* Tages-Zahlen PRO SEITE (A2-Sprint, Phase 0, 02.09.2026):
   해인 bereitet sich auf die Goethe-A2-Pruefung vor — mehr neue
   Woerter, hoeherer Wiederhol-Deckel. Franz bleibt beim alten
   10-15-Minuten-Budget. */
const TAGES_ZAHLEN = {
  ko: { neueProTag: 3, deckel: 50 },
  de: { neueProTag: 5, deckel: 80 },
}
const dailyNew = () => (TAGES_ZAHLEN[activeProfile] ?? TAGES_ZAHLEN.ko).neueProTag
const reviewCap = () => (TAGES_ZAHLEN[activeProfile] ?? TAGES_ZAHLEN.ko).deckel

/* ============================================================
   TRENNUNG DER BEIDEN LERNENDEN

   Die Datenbank enthält die Daten von zwei Leuten. Getrennt werden
   sie über die Spalte "profile" ('ko' = Franz, 'de' = seine
   Freundin). Damit das verlässlich ist, laufen ALLE Zugriffe durch
   die zwei Helfer hier — nirgendwo sonst im Code steht ein Filter.

   Dadurch gibt es keine Zeile, die beiden gehört. Keiner kann also
   den Fortschritt des anderen überschreiben, auch nicht, wenn
   beide gleichzeitig lernen.
   ============================================================ */

let activeProfile = DEFAULT_PROFILE

/* Wird beim Start und bei jedem Umschalten aus App.jsx gesetzt. */
export function setActiveProfile(id) {
  activeProfile = PROFILES[id] ? id : DEFAULT_PROFILE
}
export function getActiveProfile() {
  return activeProfile
}

/* Jede Abfrage bekommt den Filter, jede neue Zeile das Kürzel. */
function mine(query) {
  return query.eq('profile', activeProfile)
}
function stamp(row) {
  return { ...row, profile: activeProfile }
}

/* Auch der Offline-Puffer wird getrennt — sonst würden sich beim
   Umschalten auf demselben Gerät die Zwischenstände überschreiben. */
function cacheKey(name) {
  return `korean-app:${activeProfile}:${name}`
}

/* Einmalig beim Update: Vor der Trennung hiess der Puffer noch
   'korean-app:words' ohne Kürzel. Diese Altbestände gehören zur
   koreanischen Seite und werden einmal umgehängt — sonst stünde
   Franz nach dem Update ohne Offline-Puffer da. */
;(function migrateOldCache() {
  try {
    for (const name of ['words', 'cards', 'log', 'daily', 'number']) {
      const old = localStorage.getItem(`korean-app:${name}`)
      const target = `korean-app:ko:${name}`
      if (old !== null && localStorage.getItem(target) === null) {
        localStorage.setItem(target, old)
      }
      localStorage.removeItem(`korean-app:${name}`)
    }
  } catch {
    /* kein Speicherzugriff — dann bleibt eben alles beim Alten */
  }
})()

/* ---------- Puffer (localStorage) ---------- */
export function writeWordsCache(words) {
  localStorage.setItem(cacheKey('words'), JSON.stringify(words))
}
export function writeCardsCache(cards) {
  localStorage.setItem(cacheKey('cards'), JSON.stringify(cards))
}
function readWordsCache() {
  try {
    return JSON.parse(localStorage.getItem(cacheKey('words'))) || []
  } catch {
    return []
  }
}
function readCardsCache() {
  try {
    return JSON.parse(localStorage.getItem(cacheKey('cards'))) || []
  } catch {
    return []
  }
}

/* ---------- Umwandlung DB-Zeile <-> App-Objekt ---------- */
// (Die DB benutzt Unterstrich-Namen wie word_id, die App camelCase.)
function wordFromRow(r) {
  return {
    id: r.id,
    en: r.en,
    ko: r.ko,
    pos: r.pos || null,
    /* Zusatzinfos: Plural bei Substantiven, Konjugation bei Verben */
    plural: r.plural || null,
    pluralNote: r.plural_note || null,
    conj: r.conj || null,
    ex: r.ex || null,
    exTr: r.ex_tr || null,
    extrasAuto: !!r.extras_auto,
    createdAt: new Date(r.created_at).getTime(),
  }
}
function wordToRow(w) {
  const row = {
    id: w.id,
    en: w.en,
    ko: w.ko,
    pos: w.pos || null,
    created_at: new Date(w.createdAt).toISOString(),
  }
  /* Zusatzspalten NUR mitschicken, wenn wirklich etwas drinsteht.
     Grund: Sie werden erst durch supabase-migration-extras.sql
     angelegt. Wuerden wir sie immer mitschicken, lehnt die
     Datenbank jedes Anlegen ab, solange die Migration nicht lief —
     genau das ist einmal passiert. So laeuft die App mit beiden
     Staenden, und wer die Migration noch nicht ausgefuehrt hat,
     merkt schlicht nichts davon. */
  if (w.plural) row.plural = w.plural
  if (w.pluralNote) row.plural_note = w.pluralNote
  if (w.conj) row.conj = w.conj
  if (w.ex) row.ex = w.ex
  if (w.exTr) row.ex_tr = w.exTr
  if (w.extrasAuto) row.extras_auto = true
  return row
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
    /* FSRS-Zustand (Migration 011) — fehlt vor der Migration */
    stab: r.stab ?? null,
    diff: r.diff ?? null,
  }
}
function cardToRow(c) {
  const row = {
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
  /* Schema-Toleranz: FSRS-Spalten nur mitschicken, wenn befüllt —
     sonst lehnt die Datenbank vor Migration 011 jedes Update ab */
  if (c.stab != null) row.stab = c.stab
  if (c.diff != null) row.diff = c.diff
  return row
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
function tageZwischen(vonIso, bisIso) {
  return Math.round(
    (new Date(bisIso + 'T00:00:00') - new Date(vonIso + 'T00:00:00')) / 86400000
  )
}

/* ============================================================
   FSRS-SCHALTER — sanfte Umstellung (Entscheidung Franz 02.09.)

   FSRS braucht die Spalten stab/diff (Migration 011). Solange die
   fehlen, würde jedes Karten-Update scheitern — deshalb schaltet
   sich FSRS erst scharf, wenn loadInitial() die Spalten gesehen
   hat. Das Ergebnis wird lokal gemerkt, damit auch Offline-Starts
   im richtigen Modus laufen. Bis dahin: SM-2 wie bisher.
   ============================================================ */
let fsrsAktiv = null
export function istFsrsAktiv() {
  if (fsrsAktiv === null) fsrsAktiv = localStorage.getItem(cacheKey('fsrs')) === '1'
  return fsrsAktiv
}
function merkeFsrs(an) {
  fsrsAktiv = an
  localStorage.setItem(cacheKey('fsrs'), an ? '1' : '0')
}

/* ---------- Antwort-Historie (Migration 011) ----------
   Jede Bewertung eine Zeile — Grundlage für die spätere
   persönliche Eichung der FSRS-Parameter und für den Verlauf.
   Bewusst Feuer-und-vergessen: Die Historie ist wertvoll, aber
   nie blockierend (fehlt die Tabelle noch, passiert still nichts). */
export function logReview(vorher, rating, nachher) {
  try {
    supabase
      .from('review_log')
      .insert(
        stamp({
          card_id: String(vorher.id),
          word_id: vorher.wordId ?? null,
          rating,
          elapsed_days: vorher.lastReviewed ? tageZwischen(vorher.lastReviewed, todayStr()) : 0,
          stab_vorher: vorher.stab ?? null,
          stab_nachher: nachher.stab ?? null,
          diff: nachher.diff ?? null,
        })
      )
      .then(() => {})
  } catch {
    /* still */
  }
}

/* ============================================================
   NACHTRAEGLICH SPEICHERN

   Bisher galt: lokal sofort schreiben, Cloud im Hintergrund, und
   bei Fehlschlag nur eine Konsolenwarnung. Das war ein stiller
   Datenverlust — beim naechsten Start hat loadInitial() den
   lokalen Puffer mit dem Cloud-Stand ueberschrieben und die
   ungespeicherte Aenderung war weg.

   Jetzt landet jeder fehlgeschlagene Schreibvorgang in einer
   Warteschlange und wird beim naechsten Laden erneut versucht.
   ============================================================ */

const PENDING_KEY = () => cacheKey(`pending`)

function readPending() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY())) || []
  } catch {
    return []
  }
}
function writePending(list) {
  localStorage.setItem(PENDING_KEY(), JSON.stringify(list))
}

export function queueFailed(op) {
  const list = readPending()
  list.push(op)
  writePending(list)
}

export function pendingCount() {
  return readPending().length
}

/* Der Reihe nach erneut versuchen. Was durchgeht, faellt raus;
   beim ersten Fehler stoppen wir, damit die Reihenfolge stimmt. */
export async function flushPending() {
  let list = readPending()
  if (list.length === 0) return 0
  let sent = 0
  while (list.length > 0) {
    const op = list[0]
    try {
      if (op.t === 'new') await persistNewWord(op.word, op.c1, op.c2)
      else if (op.t === 'card') await persistCard(op.card)
      else if (op.t === 'edit') await updateWordCloud(op.id, op.en, op.ko, op.pos, op.clearExtras)
      else if (op.t === 'del') await deleteWordCloud(op.id)
    } catch (e) {
      /* Sonderfall: Der Eintrag ist schon in der Cloud (der erste
         Versuch kam an, nur die Antwort ging verloren). Ein 409/
         23505 wuerde die Warteschlange sonst fuer immer blockieren
         und der Offline-Balken bliebe stehen. */
      const doppelt = e && (e.code === '23505' || String(e.message || '').includes('duplicate'))
      if (!doppelt) break
    }
    list = list.slice(1)
    writePending(list)
    sent++
  }
  return sent
}

/* ---------- Start: alles laden ---------- */
export async function loadInitial() {
  try {
    /* Reihenfolge ist wichtig: erst das Ausstehende hochschieben,
       sonst ueberschreibt der Cloud-Stand es gleich wieder. */
    await flushPending()
    const [wRes, cRes, fsrsProbe] = await Promise.all([
      mine(supabase.from('words').select('*')).order('created_at', { ascending: false }),
      mine(supabase.from('cards').select('*')),
      /* Gibt es die FSRS-Spalten schon? (Migration 011) */
      supabase.from('cards').select('stab').limit(1),
    ])
    if (wRes.error) throw wRes.error
    if (cRes.error) throw cRes.error
    merkeFsrs(!fsrsProbe.error)

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
/* Fehler kommen als Kürzel zurück, nicht als fertiger Satz — die
   Oberfläche übersetzt sie in die jeweilige Menüsprache. */
export function validateNewWord(words, en, ko, pos) {
  const cleanEn = en.trim()
  const cleanKo = ko.trim()
  if (!cleanEn || !cleanKo) {
    return { error: 'fillBoth' }
  }
  if (isDuplicate(words, cleanKo)) {
    return { error: 'duplicate', word: cleanKo }
  }
  const word = {
    id: crypto.randomUUID(),
    en: cleanEn,
    ko: cleanKo,
    pos: pos || null,
    createdAt: Date.now(),
  }
  return { word, c1: newCard(word.id, 'en'), c2: newCard(word.id, 'ko') }
}

/* ---------- In die Cloud schreiben ---------- */
export async function persistNewWord(word, c1, c2) {
  const we = await supabase.from('words').insert(stamp(wordToRow(word)))
  if (we.error) throw we.error
  const ce = await supabase.from('cards').insert([stamp(cardToRow(c1)), stamp(cardToRow(c2))])
  if (ce.error) throw ce.error
}

export async function persistCard(card) {
  const { error } = await mine(
    supabase.from('cards').update(cardToRow(card)).eq('id', card.id)
  )
  if (error) throw error
}

/* ---------- Vokabel bearbeiten ----------
   Prüft die neuen Werte (Duplikat gegen ANDERE Wörter). Die beiden
   Karten hängen am Wort und aktualisieren sich dadurch automatisch;
   ihr Lernstand/Termin bleibt unangetastet. */
export function validateEdit(words, id, en, ko, pos) {
  const cleanEn = en.trim()
  const cleanKo = ko.trim()
  if (!cleanEn || !cleanKo) {
    return { error: 'fillBoth' }
  }
  const dup = words.some((w) => w.id !== id && w.ko.trim() === cleanKo)
  if (dup) {
    return { error: 'duplicate', word: cleanKo }
  }
  return { en: cleanEn, ko: cleanKo, pos: pos || null }
}

export async function updateWordCloud(id, en, ko, pos, clearExtras) {
  const patch = { en, ko, pos: pos || null }
  /* Wird das ZIELsprachen-Wort selbst geaendert, stimmen Plural und
     Konjugation des alten Wortes nicht mehr — loeschen. Der
     Nachtlauf fuellt die Luecke am naechsten Tag korrekt neu. */
  if (clearExtras) {
    patch.plural = null
    patch.plural_note = null
    patch.conj = null
    patch.extras_auto = false
  }
  const { error } = await mine(supabase.from('words').update(patch).eq('id', id))
  if (error) throw error
}

/* ---------- Vokabel löschen ----------
   Die zwei zugehörigen Karten werden in der DB automatisch mit
   gelöscht (on delete cascade). */
export async function deleteWordCloud(id) {
  const { error } = await mine(supabase.from('words').delete().eq('id', id))
  if (error) throw error
}

/* ============================================================
   DER ALGORITHMUS (SM-2, vereinfacht, tagesgenau)
   ============================================================ */
export function applyRating(card, rating) {
  /* Ab Migration 011 rechnet FSRS (fsrs.js); der SM-2-Weg darunter
     bleibt als Rückfalleben erhalten (vor der Migration, und als
     Notausgang, falls FSRS je zurückgedreht werden soll). */
  if (istFsrsAktiv()) return applyRatingFsrs(card, rating)
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
    } else if (rating === 'hard') {
      /* "Schwer" heisst: knapp gewusst — bald wiedersehen, nicht
         spaeter (Fall 화장실, Franz 01.09.): Das alte SM-2-Verhalten
         (Intervall x 1,2) machte aus 47 Tagen 56 — laenger statt
         kuerzer, ohne Mittelweg zwischen "Nochmal" und 2 Monaten.
         Jetzt: ein VIERTEL des alten Abstands, mindestens 2 Tage.
         Aus 47 Tagen werden ~12, aus 8 Tagen 2. */
      intervalDays = fuzzDays(Math.max(2, Math.round(intervalDays * 0.25)), seed)
    } else {
      const factor = rating === 'easy' ? ease * 1.3 : ease
      intervalDays = fuzzDays(Math.max(1, Math.round(intervalDays * factor)), seed)
    }
    reps = reps + 1

    /* Wiederholungstaeter-Deckel: Eine Karte mit 3+ Aussetzern
       darf nach dem Wieder-Aufbau nicht sofort fuer 2 Monate
       verschwinden. Bis sie seit dem letzten Aussetzer 2 saubere
       Durchgaenge hat (reps zaehlt genau das — "Nochmal" setzt
       es auf 0), bleibt das Intervall bei maximal 21 Tagen. */
    if (lapses >= 3 && reps <= 2) {
      intervalDays = Math.min(intervalDays, 21)
    }
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

/* ---------- FSRS-Weg (sanfte Umstellung, Franz 02.09.) ----------
   Jede Karte wird in dem Moment konvertiert, in dem sie das
   nächste Mal bewertet wird — kein Massen-Umbau. Die SM-2-Felder
   (ease/reps/lapses) werden weiter gepflegt: reps/lapses steuern
   die Stapel-Logik (neu/Nochmal/Tagespensum), und ease hält den
   Notausgang zurück zu SM-2 offen. */
function applyRatingFsrs(card, rating) {
  const klemme = (x, lo, hi) => Math.min(hi, Math.max(lo, x))
  let { ease, reps, lapses, stab, diff } = card
  const heute = todayStr()

  /* Alte Karte ohne FSRS-Zustand: Startwerte aus dem SM-2-Stand
     schätzen. Das Intervall, das SM-2 der Karte gegeben hat, ist
     ein brauchbarer Näherungswert für ihre Stabilität; die
     Schwierigkeit entsteht aus Leichtigkeits-Faktor + Aussetzern
     (so macht es auch Anki bei der Umstellung). */
  if (stab == null && (card.reps > 0 || card.lastReviewed)) {
    stab = Math.max(0.5, card.intervalDays || 1)
    diff = klemme(5 + (2.5 - (ease || 2.5)) * 3 + (lapses || 0) * 0.4, 1, 10)
  }

  const elapsed = card.lastReviewed ? Math.max(0, tageZwischen(card.lastReviewed, heute)) : 0
  const erg = fsrsSchritt({ stab, diff, elapsed, rating })

  /* Buchhaltung wie gehabt — die Stapel-Logik hängt daran */
  if (rating === 'again') {
    ease = Math.max(MIN_EASE, (ease || START_EASE) - 0.2)
    reps = 0
    lapses = (lapses || 0) + 1
  } else {
    if (rating === 'hard') ease = Math.max(MIN_EASE, (ease || START_EASE) - 0.15)
    else if (rating === 'easy') ease = (ease || START_EASE) + 0.15
    reps = reps + 1
  }

  /* Streuung gegen Termin-Klumpen — wie beim alten Weg */
  let intervalDays = erg.intervalDays
  if (intervalDays > 0) intervalDays = fuzzDays(intervalDays, seeded(card.id, reps, rating))

  return {
    ...card,
    ease,
    reps,
    lapses,
    stab: erg.stab,
    diff: erg.diff,
    intervalDays,
    due: addDays(heute, intervalDays),
    lastReviewed: heute,
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
   Der Stapel besteht aus drei Gruppen:

   1) WIEDERHOLUNGEN (reps > 0) – die regulär wieder dran sind.
      Auf den Tages-Deckel (reviewCap) gedeckelt; ausgewählt werden die
      überfälligsten zuerst, damit nichts liegen bleibt.
   2) NOCHMAL-KARTEN (reps 0, aber schon mal gesehen) – bei denen
      "Nochmal" gedrückt wurde. Die gehören zum heutigen Pensum und
      werden nicht gedeckelt.
   3) NEUE KARTEN (noch nie wiederholt) – heute frisch dazugekommen,
      über "Vokabel des Tages" oder von Hand angelegt.

   Reihenfolge: 1) + 2) werden zusammen gemischt, 3) hängt hinten dran
   (in normaler Reihenfolge). So kommt eine Vokabel, die man gerade
   erst dreimal eingetippt hat, nicht Sekunden später schon wieder –
   und der Rest des Tages bleibt trotzdem gut durchmischt. */
/* Beginn des aktuellen LERNtages in Millisekunden (04:00 Uhr). */
function learningDayStartMs() {
  const d = new Date()
  if (d.getHours() < 4) d.setDate(d.getDate() - 1)
  d.setHours(4, 0, 0, 0)
  return d.getTime()
}

export function dueCards(words, cards) {
  const t = todayStr()
  const byId = Object.fromEntries(words.map((w) => [w.id, w]))
  const all = cards
    .filter((c) => c.due <= t && byId[c.wordId])
    .map((c) => ({
      ...c,
      en: byId[c.wordId].en,
      ko: byId[c.wordId].ko,
      ex: byId[c.wordId].ex || null,
      exTr: byId[c.wordId].exTr || null,
      createdAt: byId[c.wordId].createdAt || 0,
    }))

  // Noch nie wiederholt = wirklich neu. (Nur reps === 0 reicht nicht:
  // "Nochmal" setzt reps ebenfalls auf 0, und die importierten
  // Anki-Karten haben zwar kein lastReviewed, aber reps > 0.)
  const isNew = (c) => c.reps === 0 && !c.lastReviewed

  const fresh = all.filter(isNew)
  const again = all.filter((c) => c.reps === 0 && c.lastReviewed)

  /* Der Deckel ist ein TAGESPENSUM, keine Stapelgroesse (Fix
     31.08., gemeldet von 해인 mit 100+ Rueckstand): Vorher wurden
     nach 50 erledigten Wiederholungen einfach die naechsten 50
     Ueberfaelligen nachgeschoben — der Tag war nie zu Ende.
     Jetzt zaehlen HEUTE schon erledigte Wiederholungen gegen den
     Deckel: Karten tragen nach dem Bewerten lastReviewed = heute,
     das laesst sich also direkt aus den (synchronisierten) Karten
     ablesen — kein extra Zaehler, funktioniert auf jedem Geraet.

     reps >= 2 heisst: Das war eine echte WIEDERHOLUNG. Heute zum
     ersten Mal gelernte Karten stehen nach dem Bewerten bei
     reps 1 — die duerfen den Deckel nicht anfressen, sonst
     wuerden die 3 Tages-Woerter vom 50er-Pensum abgezogen. */
  const heuteErledigt = cards.filter((c) => c.lastReviewed === t && c.reps >= 2).length
  const restDeckel = Math.max(0, reviewCap() - heuteErledigt)
  const review = all
    .filter((c) => c.reps > 0)
    .sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0))
    .slice(0, restDeckel)

  /* Prio-Regel fuer NEUE Karten (Entscheidung Franz 01.09., nach
     해인s Buecher-Massen-Eintrag):
     1. Regulaere Wiederholungen + heutige Nochmal-Karten haben
        Vorrang und fuellen den 50er-Deckel.
     2. On top kommen IMMER bis zu 6 heute erstellte Karten
        (= die 3 Tages-Woerter mit je 2 Karten) -> Tagesmaximum 56.
        (Die App kann Tages-Woerter nicht von handischen Eintraegen
        unterscheiden — die NEUESTEN 6 des Tages sind an normalen
        Tagen exakt die Tages-Woerter.)
     3. Alle uebrigen neuen Karten (Massen-Eintraege, alter
        Rueckstand) ruecken nur NACH, wenn unter dem Deckel Platz
        frei ist — aelteste zuerst, Stueck fuer Stueck. Einmal
        gelernt, sind sie normale Karten im regulaeren Rhythmus.
     Selbst ein 150-Woerter-Bulk macht den Tag damit nie groesser
     als 56 Karten. */
  /* Nachzieh-Woerter (Goethe/TOPIK-Stapel) erkennt die App an der
     kuratierten Pool-Liste selbst — ein Wort, das dort steht, kam
     (sehr wahrscheinlich) uebers Nachziehen, nicht von Hand. */
  const poolListe = new Set(poolFor(activeProfile).map((e) => e.ko.trim()))
  const ausPool = (c) => (poolListe.has((((byId[c.wordId] || {}).ko ?? c.ko) || '').trim()) ? 1 : 0)

  /* Heute ERSTMALS gelernte Karten (reps genau 1) zaehlen gegen
     ihre jeweiligen Toepfe — sonst gibt jede erledigte neue Karte
     ihren Platz sofort wieder frei und der naechste Schwung rueckt
     nach, endlos (Bug-Meldung 해인, 01.09.). */
  const ersteHeute = cards.filter((c) => c.lastReviewed === t && c.reps === 1)
  const poolHeuteGelernt = ersteHeute.filter(ausPool).length
  const neuHeuteGelernt = ersteHeute.length - poolHeuteGelernt

  /* 6 RESERVIERTE Slots (3 Woerter x 2 Karten), die AUSSCHLIESSLICH
     Pool-Woerter belegen koennen (Entscheidung Franz 01.09.) — die
     Tages-Woerter landen damit garantiert sofort im Stapel, egal
     wie gross der haendische Rueckstand ist. Haendische Eintraege
     kommen NIE in diese Slots. */
  const bonus = fresh
    .filter((c) => ausPool(c))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, Math.max(0, dailyNew() * 2 - poolHeuteGelernt))
  const bonusIds = new Set(bonus.map((c) => c.id))

  /* Alles uebrige Neue rueckt nur in freie Deckel-Plaetze nach —
     und heute schon Gelerntes haelt seinen Platz besetzt. */
  const nachrueckPool = fresh
    .filter((c) => !bonusIds.has(c.id))
    .sort((a, b) => ausPool(b) - ausPool(a) || (a.createdAt || 0) - (b.createdAt || 0))
  const slots = Math.max(0, restDeckel - review.length - again.length - neuHeuteGelernt)
  const freshCapped = [...bonus, ...nachrueckPool.slice(0, slots)]

  return [
    ...spaceOutPairs(shuffleForToday([...again, ...review])),
    ...spaceOutPairs(freshCapped),
  ]
}

/* ============================================================
   VOKABEL DES TAGES (Nachziehstapel)
   ============================================================ */

// Tageszaehler — Schluessel getrennt je Lernendem (siehe cacheKey)
const DAILY_KEY = () => cacheKey(`daily`)

function getDailyProgress() {
  try {
    const d = JSON.parse(localStorage.getItem(DAILY_KEY()))
    if (d && d.date === todayStr()) return d
  } catch {
    /* egal */
  }
  return { date: todayStr(), introduced: 0 }
}
function bumpDailyProgress() {
  const p = getDailyProgress()
  const next = { date: todayStr(), introduced: p.introduced + 1 }
  localStorage.setItem(DAILY_KEY(), JSON.stringify(next))
}

// Die nächsten Pool-Einträge, die noch NICHT in der Bibliothek sind.
function nextFromPool(words, count) {
  const have = new Set(words.map((w) => w.ko.trim()))
  const list = []
  for (const e of poolFor(activeProfile)) {
    if (list.length >= count) break
    if (!have.has(e.ko.trim())) list.push(e)
  }
  return list
}

// Was steht heute an? left = wie viele heute noch, candidates = Einträge.
export function dailyStatus(words) {
  const introduced = getDailyProgress().introduced
  const left = Math.max(0, dailyNew() - introduced)
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
    pos: poolEntry.pos || null,
    plural: poolEntry.plural || null,
    pluralNote: poolEntry.pluralNote || null,
    conj: poolEntry.conj || null,
    ex: poolEntry.ex || null,
    exTr: poolEntry.exEn || null,
    extrasAuto: false,
    createdAt: Date.now(),
  }
  // newCard setzt due = heute, reps = 0 -> neue Karte, sofort fällig
  return { word, c1: newCard(word.id, 'en'), c2: newCard(word.id, 'ko') }
}

export function countIntroductionToday() {
  bumpDailyProgress()
}

/* ---------- A2-Belege (Migration 012) ----------
   Jede A2-Übung meldet nach Abschluss ihr Ergebnis: Modul
   (lesen/hoeren/schreiben/sprechen/wortschatz), Teil, Punkte.
   Grundlage für Stärken-Radar und Bestehens-Prognose.
   Feuer-und-vergessen: fehlt die Tabelle noch, passiert still
   nichts — eine Übung scheitert nie am Beleg. */
export function schreibeA2Beleg({ modul, teil, punkte, max, details }) {
  try {
    supabase
      .from('a2_belege')
      .insert(
        stamp({
          modul,
          teil: teil ?? null,
          punkte,
          max,
          details: details ?? null,
        })
      )
      .then(() => {})
  } catch {
    /* still */
  }
}

/* ---------- "Kenn ich schon" (A2-Sprint, Phase 0) ----------
   해인 kennt aus ihrer Deutschland-Zeit viele Woerter des
   Nachziehstapels. Ein Tipp bucht das Wort als ANGELERNT statt
   neu: Wiedersehen in ~1 Woche als ehrlicher Kontrolltermin,
   danach normale FSRS-Leiter. Zaehlt NICHT auf die 5 neuen des
   Tages — dafuer zieht die App sofort einen Ersatz-Kandidaten
   nach, damit taeglich wirklich 5 Unbekannte gelernt werden.

   Wichtig: lastReviewed bleibt leer (wie bei den Anki-Importen) —
   so zaehlt die Buchung weder als heutige Wiederholung gegen den
   Deckel noch als "heute gelernt" gegen die Nachrueck-Plaetze. */
export function makeKnownWord(poolEntry) {
  const word = {
    id: crypto.randomUUID(),
    en: poolEntry.en,
    ko: poolEntry.ko,
    pos: poolEntry.pos || null,
    plural: poolEntry.plural || null,
    pluralNote: poolEntry.pluralNote || null,
    conj: poolEntry.conj || null,
    ex: poolEntry.ex || null,
    exTr: poolEntry.exEn || null,
    extrasAuto: false,
    createdAt: Date.now(),
  }
  const karte = (front) => ({
    id: crypto.randomUUID(),
    wordId: word.id,
    front,
    ease: START_EASE,
    intervalDays: 7,
    reps: 2,
    lapses: 0,
    due: addDays(todayStr(), 7),
    lastReviewed: null,
    /* FSRS-Startwerte: Stabilitaet ~1 Woche, mittlere Schwierigkeit */
    stab: 7,
    diff: 5,
  })
  return { word, c1: karte('en'), c2: karte('ko') }
}

/* Ersatz-Kandidat fuer den "Kenn ich schon"-Fluss: der naechste
   Pool-Eintrag, der weder in der Bibliothek noch in der uebergebenen
   Ausschlussliste (die aktuelle Tages-Warteschlange) steht. */
export function ersatzKandidat(words, ausgeschlossen) {
  const have = new Set(words.map((w) => w.ko.trim()))
  const tabu = new Set((ausgeschlossen ?? []).map((k) => String(k).trim()))
  for (const e of poolFor(activeProfile)) {
    const k = e.ko.trim()
    if (!have.has(k) && !tabu.has(k)) return e
  }
  return null
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

const NUMBER_KEY = () => cacheKey(`number`)

// Die Zahl des Tages (einmal pro Tag festgelegt, damit man nicht
// neu würfeln kann, bis eine leichte kommt).
export function getNumberChallenge() {
  try {
    const d = JSON.parse(localStorage.getItem(NUMBER_KEY()))
    if (d && d.date === todayStr()) return d
  } catch {
    /* egal */
  }
  const fresh = { date: todayStr(), number: 1 + Math.floor(Math.random() * 99), done: false }
  localStorage.setItem(NUMBER_KEY(), JSON.stringify(fresh))
  return fresh
}

export function completeNumberChallenge() {
  const c = getNumberChallenge()
  const next = { ...c, done: true }
  localStorage.setItem(NUMBER_KEY(), JSON.stringify(next))
  return next
}

/* ============================================================
   ARTIKEL DES TAGES (nur deutsche Seite)

   Deutsche Zahlen sind fuer 해인 zu leicht — der/die/das dagegen
   ist der groesste Brocken, weil es im Koreanischen keine Artikel
   gibt. Die Aufgabe zieht Substantive aus IHRER Bibliothek: dort
   steht der Artikel ohnehin schon mit im Wort.
   ============================================================ */

const ARTICLE_KEY = () => cacheKey(`article`)
const ARTICLE_ROUNDS = 5

/* "die Wohnung" -> { article: 'die', noun: 'Wohnung' }
   Gibt null zurueck, wenn kein sauberer Artikel davorsteht. */
export function splitArticle(word) {
  const m = /^(der|die|das)\s+(.+)$/.exec(word.trim())
  return m ? { article: m[1], noun: m[2] } : null
}

/* Welche Substantive kommen heute dran? Fest je Tag, damit man
   nicht neu wuerfeln kann, bis leichte kommen. */
function pickNouns(words) {
  const nouns = words
    .map((w) => ({ ...splitArticle(w.ko), id: w.id, en: w.en }))
    .filter((n) => n.article)
  /* Gleicher Seed wie beim Mischen des Stapels: Datum + Id */
  return nouns
    .map((n) => ({ n, k: seeded('article', todayStr(), n.id) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, ARTICLE_ROUNDS)
    .map((x) => x.n)
}

export function getArticleChallenge(words) {
  const rounds = pickNouns(words)
  let done = false
  try {
    const d = JSON.parse(localStorage.getItem(ARTICLE_KEY()))
    if (d && d.date === todayStr()) done = !!d.done
  } catch {
    /* egal */
  }
  /* Zu wenige Substantive in der Bibliothek -> Aufgabe entfaellt,
     sonst haenge die Streak an etwas Unmoeglichem. */
  return { rounds, done, enough: rounds.length >= 3 }
}

/* ---------- Plural des Tages ----------
   Zweite Aufgabe, die sich mit den Artikeln abwechselt. Nimmt nur
   Substantive, bei denen eine Pluralform hinterlegt ist. */
function pickPlurals(words) {
  const nouns = words
    .filter((w) => w.pos === 'noun' && w.plural && splitArticle(w.ko))
    /* "die Leute" -> Plural "die Leute": nach dem Plural eines
       Pluralworts zu fragen ist sinnlos */
    .filter((w) => w.plural.trim().toLowerCase() !== w.ko.trim().toLowerCase())
    .map((w) => ({
      id: w.id,
      singular: w.ko,
      plural: w.plural,
      en: w.en,
      /* "die Häuser" -> "Häuser", damit man nicht am Artikel ablesen kann */
      pluralNoun: (splitArticle(w.plural) || {}).noun || w.plural,
    }))
  return nouns
    .map((n) => ({ n, k: seeded('plural', todayStr(), n.id) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, ARTICLE_ROUNDS)
    .map((x) => x.n)
}

export function getPluralChallenge(words) {
  const rounds = pickPlurals(words)
  let done = false
  try {
    const d = JSON.parse(localStorage.getItem(cacheKey('plural')))
    if (d && d.date === todayStr()) done = !!d.done
  } catch {
    /* egal */
  }
  return { rounds, done, enough: rounds.length >= 3 }
}

export function completePluralChallenge() {
  const next = { date: todayStr(), done: true }
  localStorage.setItem(cacheKey('plural'), JSON.stringify(next))
  return next
}

/* ---------- Konjugation des Tages ----------
   Dritte Aufgabe der Rotation. Ein Verb, eine Person, die Form
   wird eingetippt. Die Formen kommen aus der conj-Spalte, die der
   Nachtlauf fuellt. */
const CONJ_PERSONS = [
  { key: 'ich', label: 'ich' },
  { key: 'du', label: 'du' },
  { key: 'er', label: 'er / sie / es' },
  { key: 'wir', label: 'wir' },
  { key: 'ihr', label: 'ihr' },
  { key: 'sie', label: 'sie (Plural)' },
]

export function getConjChallenge(words) {
  const verbs = words.filter((w) => w.pos === 'verb' && w.conj)
  const rounds = verbs
    .map((w) => ({ w, k: seeded('conj', todayStr(), w.id) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, ARTICLE_ROUNDS)
    .map(({ w }) => {
      /* Auch die Person ist je Tag+Wort fest ausgewuerfelt */
      const p = CONJ_PERSONS[pick(seeded('conjP', todayStr(), w.id), 0, CONJ_PERSONS.length - 1)]
      return { id: w.id, verb: w.ko, en: w.en, person: p.label, answer: w.conj[p.key] || '' }
    })
    .filter((r) => r.answer)
  let done = false
  try {
    const d = JSON.parse(localStorage.getItem(cacheKey('conj')))
    if (d && d.date === todayStr()) done = !!d.done
  } catch {
    /* egal */
  }
  return { rounds, done, enough: rounds.length >= 3 }
}

export function completeConjChallenge() {
  const next = { date: todayStr(), done: true }
  localStorage.setItem(cacheKey('conj'), JSON.stringify(next))
  return next
}

/* ---------- Welche der beiden Aufgaben ist heute dran? ----------
   Gewechselt wird nach jedem ERFOLGREICHEN Abschluss. Wer einen
   Tag auslaesst, bekommt also dieselbe Aufgabe noch einmal — so
   ist es nicht moeglich, eine Art dauerhaft zu ueberspringen. */
const KIND_KEY = () => cacheKey('challengeKind')

/* Rotation der Tagesaufgaben. Nach jedem erfolgreichen Abschluss
   kommt am NAECHSTEN Tag die naechste. */
const CHALLENGE_ORDER = ['article', 'plural', 'conj']
const prevKind = (k) =>
  CHALLENGE_ORDER[(CHALLENGE_ORDER.indexOf(k) + CHALLENGE_ORDER.length - 1) % CHALLENGE_ORDER.length]
const nextKind = (k) => CHALLENGE_ORDER[(CHALLENGE_ORDER.indexOf(k) + 1) % CHALLENGE_ORDER.length]

export function todaysChallengeKind() {
  try {
    const d = JSON.parse(localStorage.getItem(KIND_KEY()))
    if (d && CHALLENGE_ORDER.includes(d.kind)) {
      /* "from" = ab wann der gespeicherte Wechsel gilt. Vorher gilt
         noch die ANDERE Aufgabe. Ohne diese Verzoegerung sprang die
         Kachel direkt nach dem Abschluss auf die zweite Aufgabe um —
         und der Tag liess sich nur mit BEIDEN Quizzen schliessen. */
      if (d.from && todayStr() < d.from) {
        return prevKind(d.kind)
      }
      return d.kind
    }
  } catch {
    /* egal */
  }
  return 'article'
}

export function flipChallengeKind() {
  const next = nextKind(todaysChallengeKind())
  localStorage.setItem(KIND_KEY(), JSON.stringify({ kind: next, from: addDays(todayStr(), 1) }))
  return next
}

export function completeArticleChallenge() {
  const next = { date: todayStr(), done: true }
  localStorage.setItem(ARTICLE_KEY(), JSON.stringify(next))
  return next
}

/* ============================================================
   STREAK (Tage in Folge) + Kalender

   In der Cloud-Tabelle daily_log steht je erledigtem Lerntag eine
   Zeile { day, done }. Ein Tag gilt als erledigt, wenn ALLE drei
   Tagesaufgaben fertig sind (Vokabel des Tages + Wiederholungsstapel
   leer + Zahlen-Challenge). Die Streak = wie viele Tage am Stück.
   ============================================================ */

const LOG_CACHE = () => cacheKey(`log`)

function writeLogCache(rows) {
  localStorage.setItem(LOG_CACHE(), JSON.stringify(rows))
}
function readLogCache() {
  try {
    return JSON.parse(localStorage.getItem(LOG_CACHE())) || []
  } catch {
    return []
  }
}

// Alle erledigten Tage laden (mit Offline-Puffer).
export async function loadDailyLog() {
  try {
    const { data, error } = await mine(supabase.from('daily_log').select('*'))
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
  /* Das Kürzel MUSS mit, sonst wäre der Tag für beide Lernenden
     derselbe Eintrag — und ein erledigter Tag von ihr würde den
     Tag des anderen mit abhaken. */
  supabase
    .from('daily_log')
    .upsert(stamp({ day, done: true }))
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
/* Wochentagskuerzel (Index = getDay(), 0 = Sonntag) in der
   Sprache, die gerade gelernt wird. */
const WEEKDAY_LABELS = {
  ko: ['일', '월', '화', '수', '목', '금', '토'],
  de: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
}

// 7 Tage rund um heute: heute steht immer an 3. Stelle (2 Tage davor,
// 4 Tage danach) und ist mit isToday markiert. Zukünftige Tage sind
// noch nicht erledigt (done = false).
export function last7Days(logRows, partnerRows) {
  const done = new Set(logRows.filter((r) => r.done).map((r) => r.day))
  const partner = new Set((partnerRows || []).filter((r) => r.done).map((r) => r.day))
  const today = todayStr()
  const out = []
  for (let offset = -2; offset <= 4; offset++) {
    const ds = addDays(today, offset)
    const labels = WEEKDAY_LABELS[activeProfile] || WEEKDAY_LABELS.ko
    const label = labels[new Date(ds + 'T00:00:00').getDay()]
    out.push({
      day: ds,
      label,
      done: done.has(ds),
      partnerDone: partner.has(ds),
      isToday: ds === today,
    })
  }
  return out
}

/* ---------- Partner-Log ----------
   BEWUSSTE Ausnahme von der mine()-Regel: hier wird das Log der
   ANDEREN Seite gelesen — nur gelesen, nie geschrieben. Grundlage
   fuer die geteilten Streak-Punkte und die Zeile im Kalender
   ("해인 ist heute schon fertig"). */
export async function loadPartnerLog() {
  const other = activeProfile === 'ko' ? 'de' : 'ko'
  try {
    const { data, error } = await supabase
      .from('daily_log')
      .select('*')
      .eq('profile', other)
    if (error) throw error
    return data
  } catch {
    /* Ohne Netz fehlt eben die Partneranzeige — kein Beinbruch */
    return []
  }
}

// Set der erledigten Tage (für den Kalender).
export function doneDaysSet(logRows) {
  return new Set(logRows.filter((r) => r.done).map((r) => r.day))
}

/* ---------- Grammatik-Skills (füttern den Trainer) ----------
   Jede Zeile ein Punkt, den der Lernende schon beherrscht. Die
   Edge Function liest diese Tabelle vor jedem Gespräch — was hier
   steht, darf der Trainer aktiv benutzen. Kein Offline-Puffer:
   gepflegt wird selten und bewusst, da ist eine ehrliche
   Fehlermeldung besser als stille Warteschlangen. */
export async function loadSkills() {
  const { data, error } = await mine(
    supabase.from('skills').select('*')
  ).order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addSkill(topic, note) {
  const { data, error } = await supabase
    .from('skills')
    .insert(stamp({ topic, note: note || null }))
    .select()
  if (error) throw error
  return data[0]
}

export async function deleteSkill(id) {
  const { error } = await mine(supabase.from('skills').delete().eq('id', id))
  if (error) throw error
}

/* Mehrere bestätigte Vorschläge auf einmal (KI-Analyse) */
export async function addSkills(list) {
  const { data, error } = await supabase
    .from('skills')
    .insert(list.map((it) => stamp({ topic: it.topic, note: it.note || null })))
    .select()
  if (error) throw error
  return data
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
