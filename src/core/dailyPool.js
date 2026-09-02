/* ============================================================
   NACHZIEHSTAPEL — Auswahl je nach Lernendem

   koreanPool.js   Koreanisch fuer Franz (kuratiert, nach
                   Haeufigkeit sortiert)

   Deutsch fuer 해인 (A2-Sprint, Phase 0, 02.09.2026):
   Erst der kuratierte germanPool (die haeufigsten Woerter, mit
   'English (한국어)'-Bedeutung), danach die KOMPLETTE offizielle
   Goethe-A2-Wortliste — erst alle A1-, dann alle A2-Eintraege.
   Die Goethe-Liste ist alphabetisch; damit die Tages-Woerter
   nicht "ab, aber, Abend…" heissen, wird sie innerhalb jeder
   Stufe DETERMINISTISCH gemischt (fester Seed: jede Installation
   sieht dieselbe Reihenfolge, nextFromPool bleibt stabil).

   nextFromPool() in storage.js geht die Liste von oben durch und
   ueberspringt jedes Wort, das schon in der Bibliothek steht.
   ============================================================ */
import { koreanPool } from './koreanPool'
import { germanPool } from './germanPool'
import goethe from './inventare/goethe-woerter.json'

export { koreanPool, germanPool }

/* Deterministisches Mischen (fester Seed statt Math.random):
   dieselbe Reihenfolge auf jedem Geraet und an jedem Tag */
function stabilGemischt(liste, seed) {
  const a = [...liste]
  let h = seed
  const zufall = () => {
    /* xorshift — klein und voellig ausreichend fuers Mischen */
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    return (h >>> 0) / 4294967296
  }
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(zufall() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* Goethe-Eintrag -> Pool-Format der App. Bedeutung ist das
   koreanische Feld der Liste (ihre Muttersprache); die kuratierten
   germanPool-Eintraege behalten ihr 'English (한국어)'-Format. */
function alsPoolEintrag(e) {
  return {
    ko: e.artikel ? `${e.artikel} ${e.de}` : e.de,
    en: e.ko || e.bsp_en || '',
    pos: e.artikel ? 'noun' : e.konj ? 'verb' : null,
    plural: e.artikel && e.plural ? e.plural : null,
    ex: e.bsp || null,
    exEn: e.bsp_en || null,
  }
}

const goetheBrauchbar = goethe.filter((e) => e.de && (e.ko || e.bsp))
const goetheA1 = stabilGemischt(goetheBrauchbar.filter((e) => e.stufe === 'A1'), 20260902)
const goetheA2 = stabilGemischt(goetheBrauchbar.filter((e) => e.stufe !== 'A1'), 20260903)

/* Zusammensetzen + Doppelte entfernen (germanPool-Woerter stehen
   fast alle auch in der Goethe-Liste — der kuratierte Eintrag mit
   der besseren Bedeutungszeile gewinnt) */
const gesehen = new Set()
const deutschKomplett = []
for (const e of [...germanPool, ...goetheA1.map(alsPoolEintrag), ...goetheA2.map(alsPoolEintrag)]) {
  const k = e.ko.trim()
  if (gesehen.has(k)) continue
  gesehen.add(k)
  deutschKomplett.push(e)
}

export function poolFor(profile) {
  /* sb = Sandbox (Testkopie der de-Seite) */
  return profile === 'de' || profile === 'sb' ? deutschKomplett : koreanPool
}
