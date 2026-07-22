/* ============================================================
   SPEICHERLOGIK + WIEDERHOLUNGS-ALGORITHMUS ("Datenschicht")

   Diese Datei weiß als Einzige, WO die Daten liegen (aktuell im
   Browser-Speicher) und WIE der Anki-artige Algorithmus rechnet.
   Später tauschen wir nur das Speichern gegen eine Cloud-DB.

   Zwei Arten von Daten:
   - WÖRTER (words): je Vokabel ein Eintrag {id, en, ko}. Grundlage
     für Bibliothek + Duplikat-Sperre.
   - KARTEN (cards): pro Wort ZWEI Karten mit eigener Fälligkeit:
       front 'en' -> Vorderseite Englisch, Antwort eintippen
       front 'ko' -> Vorderseite Koreanisch, umdrehen zum Aufdecken
   ============================================================ */

const WORDS_KEY = 'korean-app:vocab'
const CARDS_KEY = 'korean-app:cards'

const START_EASE = 2.5 // Anfangs-Leichtigkeit einer neuen Karte
const MIN_EASE = 1.3 // tiefer sinkt die Leichtigkeit nie

// --- Start-Vokabeln, damit nichts leer ist ---
const SEED = [
  { id: 's1', en: 'hello (formal)', ko: '안녕하세요' },
  { id: 's2', en: 'thank you', ko: '감사합니다' },
  { id: 's3', en: 'water', ko: '물' },
  { id: 's4', en: 'book', ko: '책' },
  { id: 's5', en: 'friend', ko: '친구' },
].map((v) => ({ ...v, createdAt: Date.now() }))

/* ---------- kleine Datums-Helfer (tagesgenau) ---------- */
// Ergibt z. B. "2026-07-22" für das lokale Datum.
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

/* ---------- Wörter laden/speichern ---------- */
export function loadVocab() {
  const raw = localStorage.getItem(WORDS_KEY)
  if (!raw) {
    saveVocab(SEED)
    return SEED
  }
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}
export function saveVocab(list) {
  localStorage.setItem(WORDS_KEY, JSON.stringify(list))
}

/* ---------- Karten laden/speichern ---------- */
// Eine frische, "neue" Karte (sofort fällig).
function newCard(wordId, front) {
  return {
    id: crypto.randomUUID(),
    wordId,
    front, // 'en' (tippen) oder 'ko' (umdrehen)
    ease: START_EASE,
    intervalDays: 0,
    reps: 0, // erfolgreiche Antworten in Folge
    lapses: 0, // wie oft "Nochmal" gedrückt wurde
    due: todayStr(), // heute fällig
    lastReviewed: null,
  }
}

// Karten laden. Beim ersten Mal werden pro Wort zwei Karten erzeugt.
export function loadCards(words) {
  const raw = localStorage.getItem(CARDS_KEY)
  if (raw) {
    try {
      return JSON.parse(raw)
    } catch {
      /* fällt unten auf Neu-Erzeugung zurück */
    }
  }
  const cards = words.flatMap((w) => [newCard(w.id, 'en'), newCard(w.id, 'ko')])
  saveCards(cards)
  return cards
}
export function saveCards(list) {
  localStorage.setItem(CARDS_KEY, JSON.stringify(list))
}

/* ---------- Duplikat-Sperre (auf Wortebene) ---------- */
export function isDuplicate(words, ko) {
  const needle = ko.trim()
  return words.some((w) => w.ko.trim() === needle)
}

/* ---------- Vokabel hinzufügen (Wort + zwei Karten) ---------- */
export function addWord(words, cards, en, ko) {
  const cleanEn = en.trim()
  const cleanKo = ko.trim()

  if (!cleanEn || !cleanKo) {
    return { error: 'Bitte beide Felder ausfüllen.' }
  }
  if (isDuplicate(words, cleanKo)) {
    return { error: `„${cleanKo}" ist schon in deiner Bibliothek.` }
  }

  const word = { id: crypto.randomUUID(), en: cleanEn, ko: cleanKo, createdAt: Date.now() }
  const newWords = [word, ...words]
  // automatisch BEIDE Karten erzeugen:
  const newCards = [newCard(word.id, 'en'), newCard(word.id, 'ko'), ...cards]

  saveVocab(newWords)
  saveCards(newCards)
  return { words: newWords, cards: newCards, word }
}

/* ============================================================
   DER ALGORITHMUS (SM-2, vereinfacht, tagesgenau)

   Nimmt eine Karte + Bewertung, gibt die Karte mit neuen Werten
   zurück (Leichtigkeit, Intervall, nächste Fälligkeit).
   ============================================================ */
export function applyRating(card, rating) {
  let { ease, intervalDays, reps, lapses } = card

  if (rating === 'again') {
    // Nochmal: kommt heute wieder, Leichtigkeit sinkt.
    ease = Math.max(MIN_EASE, ease - 0.2)
    reps = 0
    lapses = lapses + 1
    intervalDays = 0
  } else {
    // Leichtigkeit je nach Knopf anpassen ("good" lässt sie gleich).
    if (rating === 'hard') ease = Math.max(MIN_EASE, ease - 0.15)
    else if (rating === 'easy') ease = ease + 0.15

    if (reps === 0) {
      // erste erfolgreiche Antwort
      intervalDays = rating === 'easy' ? 4 : 1
    } else if (reps === 1) {
      // zweite
      intervalDays = rating === 'hard' ? 2 : rating === 'easy' ? 6 : 3
    } else {
      // ab dann: bisheriges Intervall * Faktor
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

// Bewertung auf die richtige Karte in der Liste anwenden + speichern.
export function rateCard(cards, cardId, rating) {
  const next = cards.map((c) => (c.id === cardId ? applyRating(c, rating) : c))
  saveCards(next)
  return next
}

/* ---------- Für die Wiederholung: heute fällige Karten ---------- */
// Verbindet jede fällige Karte mit ihrem Wort (en/ko), damit die
// Oberfläche sie anzeigen kann. Frisch-neue Karten (die man noch nie
// gesehen hat) lassen wir bewusst weg – die kommen über "Vokabel des
// Tages" bzw. beim ersten echten Lernen dazu (späterer Schritt). Für
// jetzt zählen ALLE fälligen Karten.
export function dueCards(words, cards) {
  const t = todayStr()
  const byId = Object.fromEntries(words.map((w) => [w.id, w]))
  return cards
    .filter((c) => c.due <= t && byId[c.wordId])
    .map((c) => ({ ...c, en: byId[c.wordId].en, ko: byId[c.wordId].ko }))
}

/* ---------- Intervall-Vorschau für die Button-Beschriftung ---------- */
export function previewInterval(card, rating) {
  return applyRating(card, rating).intervalDays
}
export function formatInterval(days) {
  if (days <= 0) return 'heute'
  if (days === 1) return '1 Tag'
  return `${days} Tage`
}
