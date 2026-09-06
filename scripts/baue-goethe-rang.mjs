/* ============================================================
   GOETHE-RANG — echte Häufigkeit für die Goethe-A2-Wortliste
   (Entscheidung Franz 06.09.: Nachziehen nach Häufigkeit, A1 vor A2)

   Quelle: Wiktionary, „German frequency list" von Matthias
   Buchmeier — erzeugt 2009 aus TV- und Film-Untertiteln (25 Mio.
   Wörter), lizenziert CC-BY-SA / GFDL / LGPL. Untertitel sind
   gesprochene Alltagssprache, genau das, was eine A2-Lernerin
   braucht. Wir lesen die ersten 20 000 Wortformen.

   Die Liste enthält WORTFORMEN (ist, war, Tische…), unsere Liste
   LEMMATA (sein, Tisch). Je Goethe-Wort summieren wir die Treffer
   seiner Formen: Grundform, Pluralform, die Konjugationsform aus
   der Liste (ruft an -> ruft) — schreibweisenunabhängig. Was nicht
   vorkommt, gilt als selten und landet hinten.

   Funktionswörter (Modalpartikeln, Konjunktionen, Pronomen ohne
   greifbare Bedeutung — der 'doch'-Fall) werden markiert und vom
   Nachziehen ausgeschlossen; sie bekommen später ein Themenblatt.

   Ergebnis: src/core/inventare/goethe-rang.json
     { "_quelle": "...", "rang": { "g-4": 812, ... },
       "funktionswort": ["g-790", ...] }

   Aufruf: node scripts/baue-goethe-rang.mjs  (braucht nur Netz)
   ============================================================ */
import { readFileSync, writeFileSync } from 'node:fs'

const SEITEN = [
  'User:Matthias_Buchmeier/German_frequency_list-1-5000',
  'User:Matthias_Buchmeier/German_frequency_list-5001-10000',
  'User:Matthias_Buchmeier/German_frequency_list-10001-15000',
  'User:Matthias_Buchmeier/German_frequency_list-15001-20000',
]
const KOPF = { headers: { 'User-Agent': 'korean-study-app/1.0 (persönliches Lernprojekt)' } }

/* Wörter ohne greifbare Bedeutung: Modalpartikeln, Konjunktionen,
   Artikel/Pronomen/Präpositionen, die man nur im Satz versteht */
const FUNKTIONSWOERTER = new Set([
  'doch', 'mal', 'ja', 'eben', 'halt', 'denn', 'wohl', 'schon', 'bloß', 'überhaupt', 'eigentlich',
  'also', 'ob', 'als', 'dass', 'damit', 'obwohl', 'weil', 'wenn', 'falls', 'sondern', 'zwar', 'etwa',
  'aber', 'oder', 'und', 'denn', 'sowie', 'sowohl', 'weder', 'noch', 'bevor', 'nachdem', 'während',
  'seit', 'seitdem', 'sobald', 'solange', 'indem', 'trotzdem', 'deshalb', 'deswegen', 'darum', 'daher',
  'der', 'die', 'das', 'ein', 'eine', 'kein', 'keine', 'dieser', 'diese', 'dieses', 'jener', 'jeder',
  'jede', 'jedes', 'welcher', 'welche', 'welches', 'mancher', 'solcher', 'derselbe', 'dieselbe',
  'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'man', 'mich', 'dich', 'sich', 'uns', 'euch', 'mir', 'dir',
  'ihm', 'ihnen', 'mein', 'dein', 'sein', 'unser', 'euer', 'ihr', 'wer', 'was', 'wem', 'wen', 'wessen',
  'an', 'auf', 'aus', 'bei', 'bis', 'durch', 'für', 'gegen', 'in', 'mit', 'nach', 'ohne', 'um', 'von',
  'vor', 'zu', 'zwischen', 'über', 'unter', 'hinter', 'neben', 'trotz', 'wegen', 'statt', 'außer',
  'ab', 'am', 'im', 'ins', 'zum', 'zur', 'vom', 'beim',
])

const norm = (s) => String(s ?? '').normalize('NFC').trim().toLowerCase()

/* ---------- Häufigkeiten laden ---------- */
const zaehl = new Map() /* form (klein) -> Summe */
for (const seite of SEITEN) {
  const r = await fetch(`https://en.wiktionary.org/w/index.php?title=${encodeURIComponent(seite)}&action=raw`, KOPF)
  if (!r.ok) throw new Error(`${seite}: ${r.status}`)
  const text = await r.text()
  let n = 0
  for (const m of text.matchAll(/^(\d+)\s+\[\[([^\]|]+)/gm)) {
    const form = norm(m[2])
    zaehl.set(form, (zaehl.get(form) ?? 0) + Number(m[1]))
    n++
  }
  console.log(`${seite}: ${n} Formen`)
}

/* ---------- Goethe-Wörter bewerten ---------- */
const goethe = JSON.parse(readFileSync('src/core/inventare/goethe-woerter.json', 'utf8'))

/* Pluralform aus der Kurzschreibweise: "-e" -> Tische, "¨-e" -> Bäume,
   "-" -> unverändert, sonst volle Form */
function pluralForm(de, plural) {
  if (!plural) return null
  let p = plural.trim()
  if (p.startsWith('die ')) p = p.slice(4)
  if (/^¨/.test(p) || /^-¨/.test(p)) {
    const rest = p.replace(/^-?¨-?/, '')
    const um = { a: 'ä', o: 'ö', u: 'ü', A: 'Ä', O: 'Ö', U: 'Ü' }
    let i = -1
    for (let k = de.length - 1; k >= 0; k--) if (um[de[k]]) { i = k; break }
    const stamm = i === -1 ? de : de.slice(0, i) + um[de[i]] + de.slice(i + 1)
    return stamm + rest
  }
  if (p === '-') return de
  if (p.startsWith('-')) return de + p.slice(1)
  return p
}

const bewertet = goethe.map((e) => {
  /* Schreibvarianten "leidtun/leid tun" -> erste; Stämme "ander-" -> ander */
  const grund = norm(e.de).split('/')[0].replace(/\(sich\)/g, '').trim().replace(/-$/, '')
  const woerter = grund.split(/\s+/).filter(Boolean)
  let summe = 0
  if (woerter.length === 1) {
    const formen = new Set([grund])
    const pl = pluralForm(e.de, e.plural)
    if (pl) formen.add(norm(pl))
    if (e.konj) for (const teil of String(e.konj).split(/\s+/)) if (teil.length > 2) formen.add(norm(teil))
    for (const f of formen) summe += zaehl.get(f) ?? 0
  } else {
    /* Mehrwort-Einträge ("gültig sein", "packt ein"): das SELTENSTE
       Inhaltswort zählt — sonst hebt "sein" oder "ein" alles nach oben */
    const inhalt = woerter.filter((w) => !FUNKTIONSWOERTER.has(w) && !['sein', 'ist', 'tun', 'haben'].includes(w))
    summe = inhalt.length ? Math.min(...inhalt.map((w) => zaehl.get(w) ?? 0)) : 0
  }
  return { id: e.id, de: e.de, stufe: e.stufe, summe, funktionswort: FUNKTIONSWOERTER.has(grund) }
})

/* A1 vor A2, darin nach Häufigkeit; ohne Treffer ganz hinten */
bewertet.sort((a, b) => {
  const sa = a.stufe === 'A1' ? 0 : 1
  const sb = b.stufe === 'A1' ? 0 : 1
  if (sa !== sb) return sa - sb
  return b.summe - a.summe
})
const rang = {}
const funktionswort = []
bewertet.forEach((e, i) => {
  rang[e.id] = i + 1
  if (e.funktionswort) funktionswort.push(e.id)
})

const ohne = bewertet.filter((e) => e.summe === 0)
console.log(`\n${bewertet.length} Wörter bewertet, ${ohne.length} ohne Treffer (hinten), ${funktionswort.length} Funktionswörter`)
console.log('Top 25 A1:', bewertet.filter((e) => e.stufe === 'A1' && !e.funktionswort).slice(0, 25).map((e) => e.de).join(', '))
console.log('Top 15 A2:', bewertet.filter((e) => e.stufe !== 'A1' && !e.funktionswort).slice(0, 15).map((e) => e.de).join(', '))
console.log('Ohne Treffer (Beispiele):', ohne.slice(0, 20).map((e) => e.de).join(', '))

writeFileSync(
  'src/core/inventare/goethe-rang.json',
  JSON.stringify(
    {
      _quelle:
        'Wiktionary, German frequency list (Matthias Buchmeier, TV/Film-Untertitel 2009, CC-BY-SA); Summe der Wortformen je Goethe-Lemma; A1 vor A2',
      _stand: new Date().toISOString().slice(0, 10),
      rang,
      funktionswort,
    },
    null,
    0
  )
)
console.log('geschrieben: src/core/inventare/goethe-rang.json')
