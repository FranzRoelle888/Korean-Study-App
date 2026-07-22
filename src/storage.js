import { supabase } from './supabaseClient'

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
  return toISO(new Date())
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

/* ---------- Neue Karte (neu = sofort fällig) ---------- */
function newCard(wordId, front) {
  return {
    id: crypto.randomUUID(),
    wordId,
    front,
    ease: START_EASE,
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
    return { error: 'Bitte beide Felder ausfüllen.' }
  }
  if (isDuplicate(words, cleanKo)) {
    return { error: `„${cleanKo}" ist schon in deiner Bibliothek.` }
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

/* ============================================================
   DER ALGORITHMUS (SM-2, vereinfacht, tagesgenau)
   ============================================================ */
export function applyRating(card, rating) {
  let { ease, intervalDays, reps, lapses } = card

  if (rating === 'again') {
    ease = Math.max(MIN_EASE, ease - 0.2)
    reps = 0
    lapses = lapses + 1
    intervalDays = 0
  } else {
    if (rating === 'hard') ease = Math.max(MIN_EASE, ease - 0.15)
    else if (rating === 'easy') ease = ease + 0.15

    if (reps === 0) {
      intervalDays = rating === 'easy' ? 4 : 1
    } else if (reps === 1) {
      intervalDays = rating === 'hard' ? 2 : rating === 'easy' ? 6 : 3
    } else {
      const factor = rating === 'hard' ? 1.2 : rating === 'easy' ? ease * 1.3 : ease
      intervalDays = Math.max(1, Math.round(intervalDays * factor))
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

/* ---------- Heute fällige Karten (mit en/ko verbunden) ---------- */
export function dueCards(words, cards) {
  const t = todayStr()
  const byId = Object.fromEntries(words.map((w) => [w.id, w]))
  return cards
    .filter((c) => c.due <= t && byId[c.wordId])
    .map((c) => ({ ...c, en: byId[c.wordId].en, ko: byId[c.wordId].ko }))
}

/* ---------- Intervall-Vorschau für die Buttons ---------- */
export function previewInterval(card, rating) {
  return applyRating(card, rating).intervalDays
}
export function formatInterval(days) {
  if (days <= 0) return 'heute'
  if (days === 1) return '1 Tag'
  return `${days} Tage`
}
