/* ============================================================
   NOMEN-BEREINIGUNG — falsche Plural-Einträge finden & fixen
   (Anlass 01.09.: 해인 hat beim Bücher-Import Nomen im Plural
   eingetragen, z. B. "die Lebensmittel" statt "das Lebensmittel".
   Im Artikel-Spiel setzt das falsche Denkmuster.)

   Zwei Stufen — bewusst getrennt, weil hier ECHTE Lerndaten
   angefasst werden:
     ohne --anwenden   NUR Vorschläge auflisten (Standard)
     mit  --anwenden   die gelisteten Änderungen in words schreiben

   Geprüft werden nur "die …"-Einträge der de-Seite (falsche
   Plurale stehen praktisch immer so da). Plurale tantum
   (die Leute, die Eltern, die Ferien …) bleiben unangetastet —
   das entscheidet das Modell, und die Validierung lässt nur
   Ergebnisse der Form "der/die/das Singular" durch.

   Aufruf: node scripts/bereinige-nomen.mjs [--anwenden]
   Läuft in GitHub Actions (bereinigen.yml).
   ============================================================ */

const SUPABASE_URL = 'https://gkrubhwwzgekmbiltslt.supabase.co'
const DB_KEY = process.env.SUPABASE_SERVICE_KEY
const KI_KEY = process.env.ANTHROPIC_API_KEY
const ANWENDEN = process.argv.includes('--anwenden')
if (!DB_KEY || !KI_KEY) {
  console.error('SUPABASE_SERVICE_KEY oder ANTHROPIC_API_KEY fehlt.')
  process.exit(1)
}

const dbKopf = {
  apikey: DB_KEY,
  Authorization: `Bearer ${DB_KEY}`,
  'Content-Type': 'application/json',
}

async function frage(system, nutzer) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': KI_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 4000,
      /* Denk-Token-Bremse — gebrannte Kinder */
      output_config: { effort: 'medium' },
      system: [{ type: 'text', text: system }],
      messages: [{ role: 'user', content: nutzer }],
    }),
  })
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 150)}`)
  const data = await r.json()
  const text = (data.content ?? []).map((c) => c.text ?? '').join('')
  if (!text.trim()) throw new Error(`leere Antwort (stop_reason: ${data.stop_reason})`)
  return JSON.parse(text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim())
}

/* ---------- Kandidaten laden: alle "die …"-Einträge ---------- */
const r = await fetch(
  `${SUPABASE_URL}/rest/v1/words?profile=eq.de&select=id,ko&ko=like.die*`,
  { headers: dbKopf }
)
if (!r.ok) throw new Error(`DB ${r.status}`)
const kandidaten = (await r.json()).filter((w) => /^die\s+\S/.test(String(w.ko).trim()))
console.log(`${kandidaten.length} "die …"-Einträge werden geprüft.`)

const SYSTEM = [
  'You are a German lexicon expert. You get a list of German vocabulary entries of the form "die X".',
  'For EACH entry decide:',
  '- If X is the PLURAL form of a countable noun, the entry is wrong for a vocabulary card. Give the singular dictionary form with its correct article, e.g. "die Lebensmittel" -> "das Lebensmittel", "die Autos" -> "das Auto".',
  '- If X is a plural-only noun (die Leute, die Eltern, die Ferien, die Geschwister …) OR a correct feminine singular (die Tasche) OR anything else that is fine as-is: do NOT include it.',
  'Reply with ONLY a JSON array of the entries that need fixing:',
  '[{"alt":"die Lebensmittel","neu":"das Lebensmittel"}, ...]',
  'Empty array [] if nothing needs fixing. Never invent entries that were not in the list.',
].join('\n')

/* ---------- in Häppchen prüfen ---------- */
const vorschlaege = []
for (let von = 0; von < kandidaten.length; von += 60) {
  const gruppe = kandidaten.slice(von, von + 60)
  const antwort = await frage(SYSTEM, gruppe.map((w) => w.ko.trim()).join('\n'))
  for (const a of Array.isArray(antwort) ? antwort : []) {
    const alt = String(a.alt ?? '').trim()
    const neu = String(a.neu ?? '').trim()
    const zeile = gruppe.find((w) => w.ko.trim() === alt)
    /* Validierung: muss aus der Gruppe stammen, neue Form muss wie
       ein Wörterbuch-Eintrag aussehen und sich unterscheiden */
    if (zeile && /^(der|die|das) \S/.test(neu) && neu !== alt) {
      vorschlaege.push({ id: zeile.id, alt, neu })
    }
  }
}

if (!vorschlaege.length) {
  console.log('Nichts zu bereinigen — alle Einträge sehen gut aus.')
  console.log('ok')
  process.exit(0)
}

console.log(`\n${vorschlaege.length} Korrektur-Vorschläge:`)
for (const v of vorschlaege) console.log(`  ${v.alt}  ->  ${v.neu}`)

if (!ANWENDEN) {
  console.log(
    '\nNUR VORSCHAU — nichts geändert. Zum Anwenden den Lauf mit anwenden=true starten.'
  )
  console.log('ok')
  process.exit(0)
}

/* ---------- anwenden (je Zeile per id, nichts Pauschales) ---------- */
let geaendert = 0
for (const v of vorschlaege) {
  const up = await fetch(`${SUPABASE_URL}/rest/v1/words?id=eq.${v.id}&profile=eq.de`, {
    method: 'PATCH',
    headers: { ...dbKopf, Prefer: 'return=minimal' },
    body: JSON.stringify({ ko: v.neu }),
  })
  if (up.ok) geaendert++
  else console.warn(`  Fehler bei "${v.alt}": ${up.status}`)
}
console.log(`\n${geaendert}/${vorschlaege.length} Einträge geändert.`)
if (geaendert < vorschlaege.length) process.exit(1)
console.log('ok')
