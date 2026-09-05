/* ============================================================
   VOKABEL-MOTOR V2 — reine Helfer (kein Datenbank-Zugriff)
   Konzept: docs/VOKABEL-KONZEPT.md

   Hier liegt, was sich ohne Speicher rechnen lässt:
   - welche Vorratswörter als Nächstes dran sind (§5.3)
   - die Vorschlagsliste für Erkennen/Hören (§3.1)
   - die Stufen-Punkte je Wort für die Bibliothek (§7)
   Der Lebenslauf der Karten (Warmstart, Hör-Verwandlung) steht in
   storage.js bei der Bewertung, weil er Karten anlegt und schreibt.

   Gilt nur für Franz' Seite — die Weiche ist istMotor().
   ============================================================ */
import { normKo } from './hangul.js'

export const istMotor = (profileId) => profileId === 'ko'

/* Stabilität, ab der die Erkennen-Karte zur Hör-Karte wird (Tage) */
export const HOER_SCHWELLE = 21
/* Nach dem Wechsel: erster Hör-Termin spätestens in so vielen Tagen */
export const HOER_ERSTER_TERMIN = 7
/* Produktion frei: so viele Erkennen-Erfolge ODER Intervall darüber */
export const PRODUKTION_ERFOLGE = 2
export const PRODUKTION_INTERVALL = 14

/* ---------- Auswahl (§5.3, bewusst simpel) ----------
   Bereit + vertont, nicht übersprungen, kein Zahlwort, nach Rang
   (ohne Rang ganz hinten). Pflichtprüfung gegen die Bibliothek
   doppelt: Inventar-Id UND koreanisches Wort. */
export function vorratKandidaten(vorrat, words, n) {
  if (!Array.isArray(vorrat) || n <= 0) return []
  const habenKo = new Set(words.map((w) => normKo(w.ko)))
  const habenInv = new Set(words.map((w) => w.invId).filter(Boolean))
  return vorrat
    .filter((v) => v.bereit && v.audioOk && !v.uebersprungen && v.pos !== 'number')
    .filter((v) => !habenKo.has(normKo(v.ko)) && !habenInv.has(v.invId))
    .sort((a, b) => (a.rang ?? 99999) - (b.rang ?? 99999))
    .slice(0, n)
}

/* ---------- Vorschlagsliste (§3.1) ----------
   Ab dem 2. Zeichen, höchstens `max` Treffer aus der EIGENEN
   Bibliothek, Englisch und Deutsch, Präfix zuerst, dann "enthält".
   Kein Fuzzy: getroffen ist nur, was wirklich so anfängt oder so
   heißt. Zurück kommt je Wort ein Eintrag (nie das koreanische
   Wort selbst — die Liste darf die Antwort nicht verraten). */
export function vorschlaege(words, eingabe, max = 5) {
  const q = String(eingabe ?? '').trim().toLowerCase()
  if (q.length < 2) return []
  const praefix = []
  const enthaelt = []
  for (const w of words) {
    const en = (w.en || '').toLowerCase()
    const de = (w.de || '').toLowerCase()
    /* "to eat" soll auch über "eat" gefunden werden */
    const enOhneTo = en.startsWith('to ') ? en.slice(3) : en
    if (en.startsWith(q) || enOhneTo.startsWith(q) || de.startsWith(q)) praefix.push(w)
    else if (en.includes(q) || de.includes(q)) enthaelt.push(w)
  }
  return [...praefix, ...enthaelt].slice(0, max).map((w) => ({
    id: w.id,
    text: w.de ? `${w.en} (${w.de})` : w.en,
    nuance: w.nuance || null,
  }))
}

/* Anzeige-Bedeutung auf der Karte: `water (Wasser)` — Englisch
   bleibt Hauptanker, Deutsch in Klammern */
export function bedeutung(word) {
  if (!word) return ''
  return word.de ? `${word.en} (${word.de})` : word.en || ''
}

/* ---------- Stufen je Wort (§7) ----------
   0 = noch nicht da · 1 = aktiv · 2 = gefestigt
   Erkennen gefestigt = Karte ist schon Hör-Karte oder stab ≥ 21;
   Produktion gefestigt = stab ≥ 21; Hören gefestigt = Hör-Karte mit
   mindestens einer bestandenen Hör-Wiederholung. */
export function stufenFuer(cards) {
  const map = {}
  for (const c of cards) {
    const s = map[c.wordId] ?? { erkennen: 0, produktion: 0, hoeren: 0 }
    if (c.front === 'ko' || c.front === 'flip') {
      const fest = c.modus === 'audio' || (c.stab ?? 0) >= HOER_SCHWELLE
      s.erkennen = fest ? 2 : 1
      if (c.modus === 'audio') s.hoeren = c.hoerFehler === 0 && c.lastReviewed ? 2 : 1
    } else {
      s.produktion = (c.stab ?? 0) >= HOER_SCHWELLE ? 2 : 1
    }
    map[c.wordId] = s
  }
  return map
}
