/* ============================================================
   Baut src/core/inventare/topik1-woerter.json aus zwei Quellen:

   1. julienshim/combined_korean_vocabulary_list — die
      digitalisierte offizielle TOPIK-Liste (NIKL 2003 + TOPIK
      2015): Wort, Wortart, Hanja, Haeufigkeitsrang, TOPIK-Stufe.
      Gefiltert auf Stufe A (= TOPIK I, Anfaenger).
   2. jemdiggity/hanja-wordlist "Korean Vocab 6000" (MIT) —
      liefert die englischen Bedeutungen per Wort-Join.

   Woerter ohne Treffer behalten en=null — die fuellt spaeter der
   Nacht-Batch (mit Validierung), wie bei den Goethe-ko-Feldern.

   Aufruf:  node scripts/baue-topik-inventar.mjs
   ============================================================ */
import { writeFileSync } from 'node:fs'

const QUELLE_TOPIK =
  'https://raw.githubusercontent.com/julienshim/combined_korean_vocabulary_list/master/results.tsv'
const QUELLE_EN =
  'https://raw.githubusercontent.com/jemdiggity/hanja-wordlist/master/Korean%20Vocab%206000%20-%20Sheet1.tsv'

const POS_MAP = {
  '명사': 'noun',
  '동사': 'verb',
  '형용사': 'adj',
  '부사': 'adv',
  '대명사': 'pronoun',
  '수사': 'number',
  '관형사': 'determiner',
  '감탄사': 'interjection',
  '의존명사': 'noun',
}

/* ---------- 1. Offizielle Liste, Stufe A ---------- */
const topikText = (await (await fetch(QUELLE_TOPIK)).text()).replace(/\r\n/g, '\n')
const topikZeilen = topikText.split('\n').slice(1) /* Kopfzeile weg */

const roh = []
for (const zeile of topikZeilen) {
  const t = zeile.split('\t')
  if (t.length < 7) continue
  /* Achtung, die Spaltennamen der Quelle fuehren in die Irre:
     Spalte 6 (초급/중급/고급) ist die TOPIK-2015-Stufe,
     Spalte 7 (A/B/C) der NIKL-Grad. Wir wollen TOPIK-초급. */
  const [rank, wort, pos, hanja, hinweis, topikStufe] = t
  if (topikStufe.trim() !== '초급') continue
  /* Suffix-Eintraege wie "-되다" sind Grammatik, keine Vokabeln */
  if (wort.trim().startsWith('-')) continue
  roh.push({
    /* Homographen-Nummern wie "가격03" abstreifen */
    ko: wort.trim().replace(/\d+$/, ''),
    rang: parseInt(rank, 10) || 99999,
    pos: POS_MAP[pos.trim()] || null,
    hanja: hanja.trim() || null,
    hinweis: hinweis.trim() || null,
  })
}
console.log(`TOPIK-Stufe-A-Zeilen: ${roh.length}`)

/* ---------- 2. Englische Bedeutungen ---------- */
const enText = (await (await fetch(QUELLE_EN)).text()).replace(/\r\n/g, '\n')
const enMap = new Map()
for (const zeile of enText.split('\n')) {
  const t = zeile.split('\t')
  if (t.length < 3) continue
  const wort = t[1].trim()
  const en = t[2].trim()
  /* erste (haeufigste) Bedeutung gewinnt */
  if (wort && en && !enMap.has(wort)) enMap.set(wort, en)
}
console.log(`Englisch-Woerterbuch: ${enMap.size} Eintraege`)

/* ---------- 3. Zusammenfuehren, entdoppeln, sortieren ---------- */
const gesehen = new Set()
const eintraege = []
/* nach Haeufigkeit sortieren — genau die Reihenfolge, die die
   Wisch-Kalibrierung und die Woerter-Warteschlange brauchen */
roh.sort((a, b) => a.rang - b.rang)
for (const e of roh) {
  if (gesehen.has(e.ko)) continue
  gesehen.add(e.ko)
  eintraege.push({
    id: `t-${eintraege.length + 1}`,
    ko: e.ko,
    en: enMap.get(e.ko) ?? null,
    pos: e.pos,
    hanja: e.hanja,
    hinweis: e.hinweis,
    rang: e.rang,
  })
}

/* ---------- Plausibilitaets-Checks ---------- */
const fehler = []
if (eintraege.length < 1300 || eintraege.length > 2100)
  fehler.push(`Anzahl verdaechtig: ${eintraege.length}`)
const mitEn = eintraege.filter((e) => e.en).length
if (mitEn < eintraege.length * 0.5)
  fehler.push(`nur ${mitEn} mit Englisch — Join kaputt?`)
const hangulOk = eintraege.every((e) => /^[가-힣\s]+$/.test(e.ko))
if (!hangulOk) fehler.push('Nicht-Hangul-Eintraege gefunden')
if (fehler.length) {
  console.error('ABBRUCH:\n' + fehler.join('\n'))
  process.exit(1)
}

const ziel = 'src/core/inventare/topik1-woerter.json'
writeFileSync(ziel, JSON.stringify(eintraege, null, 1), 'utf8')
console.log(
  `ok — ${eintraege.length} Eintraege, ${mitEn} mit Englisch ` +
    `(${Math.round((mitEn / eintraege.length) * 100)} %), ` +
    `${eintraege.filter((e) => e.hanja).length} mit Hanja -> ${ziel}`
)
