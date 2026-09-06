/* ============================================================
   WORT-VERGLEICH — Eingabe gegen Lösung, je nach Sprache
   (Vokabel-Motor V2, Konzept §3.2)

   Koreanisch: Silbe für Silbe, Abweichungen als Jamo (hangul.js).
   Deutsch: Artikel getrennt bewertet (der/die/das ist Teil des
   Wortes), dann Buchstabe für Buchstabe — Groß/Klein und Umlaute
   sind echte Fehler und werden markiert.

   Rückgabe in beiden Fällen dieselbe Form, damit EINE Anzeige reicht:
     { teile: [{ ist, soll, ok, jamo? }], artikel: { ist, soll, ok } | null }
   ============================================================ */
import { jamoDiff, normKo } from './hangul.js'

const ARTIKEL = /^(der|die|das)\s+/i

export function normDe(s) {
  return String(s ?? '').normalize('NFC').trim().replace(/\s+/g, ' ')
}

/* Gleichheit: Koreanisch nach NFC; Deutsch exakt inkl. Artikel und
   Groß/Klein — nur Leerraum wird verziehen */
export function istRichtig(eingabe, richtig, lang) {
  if (lang === 'de') return normDe(eingabe) === normDe(richtig)
  return normKo(eingabe) === normKo(richtig)
}

function trenneArtikel(s) {
  const m = s.match(ARTIKEL)
  return m ? { artikel: m[1], rest: s.slice(m[0].length) } : { artikel: '', rest: s }
}

export function wortDiff(eingabe, richtig, lang) {
  if (lang !== 'de') return { teile: jamoDiff(eingabe, richtig), artikel: null }

  const e = trenneArtikel(normDe(eingabe))
  const r = trenneArtikel(normDe(richtig))
  const artikel = r.artikel
    ? { ist: e.artikel, soll: r.artikel, ok: e.artikel.toLowerCase() === r.artikel.toLowerCase() }
    : null
  const a = [...e.rest]
  const b = [...r.rest]
  const n = Math.max(a.length, b.length)
  const teile = []
  for (let i = 0; i < n; i++) {
    const ist = a[i] ?? ''
    const soll = b[i] ?? ''
    teile.push({ ist, soll, ok: ist === soll })
  }
  return { teile, artikel }
}
