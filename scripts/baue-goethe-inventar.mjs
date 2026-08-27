/* ============================================================
   Baut src/core/inventare/goethe-woerter.json aus den
   Goethe-A1/A2-Wortlisten (ilkermeliksitki/goethe-institute-
   wordlist — TSV-Fassung der offiziellen Goethe-PDFs).

   Aufruf:  node scripts/baue-goethe-inventar.mjs

   Jeder Eintrag: { id, de, artikel, plural, konj, stufe, en, bsp }
   - de:      Grundform ohne Artikel ("Adresse", "abholen")
   - artikel: der/die/das oder null
   - plural:  Suffix-Notation aus der Liste ("-en", "¨-er") oder null
   - konj:    Konjugationshinweis bei A2-Verben ("macht, hat gemacht")
   - ko:      bleibt leer — wird spaeter im Nacht-Batch uebersetzt
              und von 해인 stichprobengeprueft (extras_auto-Muster)
   ============================================================ */
import { writeFileSync } from 'node:fs'

const BASIS =
  'https://raw.githubusercontent.com/ilkermeliksitki/goethe-institute-wordlist/main'
const BUCHSTABEN = 'abcdefghijklmnopqrstuvwxyz'.split('')

async function holeStufe(stufe) {
  const zeilen = []
  for (const b of BUCHSTABEN) {
    const r = await fetch(`${BASIS}/${stufe}/${b}.tsv`)
    if (!r.ok) continue /* nicht jeder Buchstabe existiert */
    const text = (await r.text()).replace(/\r\n/g, '\n')
    for (const zeile of text.split('\n')) {
      const teile = zeile.split('\t')
      if (teile.length < 2) continue
      /* Kopfzeilen der A2-Dateien ueberspringen */
      if (teile[0].trim().toLowerCase() === 'german word') continue
      zeilen.push({
        roh: teile[0].trim(),
        bsp: (teile[1] || '').trim(),
        en: (teile[2] || '').trim(),
      })
    }
  }
  return zeilen
}

/* Spalte 1 zerlegen: "die Adresse,-en" / "abholen(1)" /
   "machen, macht, hat gemacht" / "das Bad, ¨-er" */
function zerlege(roh) {
  let rest = roh
  /* Mehrdeutigkeits-Nummern "(1)" entfernen, aber merken */
  const sinnNr = /\((\d)\)\s*$/.exec(rest)?.[1] ?? null
  rest = rest.replace(/\(\d\)\s*$/, '').trim()

  let artikel = null
  const art = /^(der|die|das)\s+/.exec(rest)
  if (art) {
    artikel = art[1]
    rest = rest.slice(art[0].length)
  }

  let plural = null
  let konj = null
  /* Nach dem ersten Komma: entweder Plural-Suffix ("-en", " ¨-er")
     oder Verb-Konjugation ("macht, hat gemacht") */
  const komma = rest.indexOf(',')
  if (komma !== -1) {
    const dahinter = rest.slice(komma + 1).trim()
    rest = rest.slice(0, komma).trim()
    if (artikel) {
      plural = dahinter || null
    } else if (dahinter) {
      konj = dahinter
    }
  }

  return { wort: rest.trim(), artikel, plural, konj, sinnNr }
}

const a1 = await holeStufe('a1')
const a2 = await holeStufe('a2')
console.log(`geladen: A1 ${a1.length} Zeilen, A2 ${a2.length} Zeilen`)

const eintraege = []
const gesehen = new Map() /* wort(+artikel) -> Index, fuer Dedupe */

function verarbeite(zeilen, stufe) {
  for (const z of zeilen) {
    const { wort, artikel, plural, konj, sinnNr } = zerlege(z.roh)
    if (!wort) continue
    const schluessel = `${artikel ?? ''}|${wort.toLowerCase()}`
    if (gesehen.has(schluessel)) {
      /* Mehrfachsinn oder A1/A2-Doppel: ersten Eintrag behalten,
         nur fehlende Formen-Angaben ergaenzen */
      const alt = eintraege[gesehen.get(schluessel)]
      if (!alt.plural && plural) alt.plural = plural
      if (!alt.konj && konj) alt.konj = konj
      continue
    }
    gesehen.set(schluessel, eintraege.length)
    eintraege.push({
      id: `g-${eintraege.length + 1}`,
      de: wort,
      artikel,
      plural,
      konj,
      stufe,
      /* Die Quelle uebersetzt den SATZ, nicht das Wort — deshalb
         heisst das Feld ehrlich bsp_en. Die Wort-Bedeutung auf
         Koreanisch (ko) erzeugt spaeter der Nacht-Batch. */
      bsp: z.bsp,
      bsp_en: z.en,
      ko: null,
    })
  }
}

verarbeite(a1, 'A1')
verarbeite(a2, 'A2')

/* Plausibilitaets-Checks, bevor irgendwas geschrieben wird */
const fehler = []
const nA1 = eintraege.filter((e) => e.stufe === 'A1').length
const nA2 = eintraege.filter((e) => e.stufe === 'A2').length
if (nA1 < 500 || nA1 > 1100) fehler.push(`A1-Anzahl verdaechtig: ${nA1}`)
/* Die offizielle A2-Liste ENTHAELT den A1-Wortschatz — nach dem
   Entdoppeln bleiben nur die echten Neuzugaenge (~650-700) uebrig */
if (nA2 < 450 || nA2 > 1200) fehler.push(`A2-Anzahl verdaechtig: ${nA2}`)
const ohneEn = eintraege.filter((e) => !e.bsp_en).length
if (ohneEn > eintraege.length * 0.05) fehler.push(`${ohneEn} Eintraege ohne Satz-Uebersetzung`)
const mitArtikel = eintraege.filter((e) => e.artikel).length
if (mitArtikel < eintraege.length * 0.25) fehler.push(`nur ${mitArtikel} mit Artikel — Parser kaputt?`)
if (fehler.length) {
  console.error('ABBRUCH:\n' + fehler.join('\n'))
  process.exit(1)
}

const ziel = 'src/core/inventare/goethe-woerter.json'
writeFileSync(ziel, JSON.stringify(eintraege, null, 1), 'utf8')
console.log(
  `ok — ${eintraege.length} Eintraege (A1 ${nA1}, A2 ${nA2}), ` +
    `${mitArtikel} mit Artikel, ${eintraege.filter((e) => e.plural).length} mit Plural, ` +
    `${eintraege.filter((e) => e.konj).length} mit Konjugation -> ${ziel}`
)
