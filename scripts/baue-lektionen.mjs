/* ============================================================
   GRAMMATIK-LEKTIONEN BAUEN (Konzept: Chat 28.08.2026)

   Erzeugt vollständige Lektionen im 5-Schritte-Bogen und legt
   sie als Datei ins Repo (src/core/lektionen/<profil>.json):
   Erklärung + 3 Beispiele + 2 Erkennen-Aufgaben + 3 geblockte
   Lücken + 1 Produzieren-Auftrag. Einmal erzeugt, für immer da —
   offline-fähig, nachlesbar, korrigierbar.

   Die ALLereinfachsten Punkte (Skip-Liste) bekommen bewusst
   keine Lektion — die rührt niemand mehr an (Entscheidung Franz).

   Aufruf:
     node scripts/baue-lektionen.mjs --profil ko --nur auto   Pilot:
        wählt automatisch den nächsten anstehenden Punkt (liest
        den Lernstand aus der DB)
     node scripts/baue-lektionen.mjs --profil ko --nur tg-wenn-myeon
     node scripts/baue-lektionen.mjs --profil ko --alle       Massenlauf
   Läuft in GitHub Actions (lektionen.yml), committet selbst.
   ============================================================ */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const SUPABASE_URL = 'https://gkrubhwwzgekmbiltslt.supabase.co'
const DB_KEY = process.env.SUPABASE_SERVICE_KEY
const KI_KEY = process.env.ANTHROPIC_API_KEY
if (!DB_KEY || !KI_KEY) {
  console.error('SUPABASE_SERVICE_KEY oder ANTHROPIC_API_KEY fehlt.')
  process.exit(1)
}

const MODEL = 'claude-sonnet-5'
const argWert = (name) => {
  const i = process.argv.indexOf(name)
  return i === -1 ? null : process.argv[i + 1]
}
const PROFIL = argWert('--profil') ?? 'ko'
const NUR = argWert('--nur')
const ALLE = process.argv.includes('--alle')

/* Die Basics, die niemand mehr lernen muss */
const SKIP = {
  ko: ['ident', 'fragew', 'dies-i-geu-jeo'],
  de: ['sein-haben', 'janein-frage', 'w-fragen', 'du-sie', 'zahlen-uhrzeit'],
}

const dbKopf = { apikey: DB_KEY, Authorization: `Bearer ${DB_KEY}` }
async function dbGet(pfad) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${pfad}`, { headers: dbKopf })
  if (!r.ok) throw new Error(`DB ${r.status}: ${(await r.text()).slice(0, 150)}`)
  return r.json()
}

async function ladeInventar(profil) {
  if (profil === 'ko') {
    const m = await import('../src/core/inventare/topik1-grammatik.js')
    return m.TOPIK1_GRAMMATIK.map((g) => ({
      id: `tg-${g.id}`, kurz: g.id, muster: g.muster, name: g.name, beispiel: g.beispiel.ko,
    }))
  }
  const m = await import('../src/core/inventare/ger-grammatik.js')
  return m.GER_GRAMMATIK.map((g) => ({
    id: `gg-${g.id}`, kurz: g.id, muster: g.muster, name: g.name_en, beispiel: g.beispiel.de,
  }))
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
      model: MODEL,
      max_tokens: 8000,
      output_config: { effort: 'medium' },
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: nutzer }],
    }),
  })
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 150)}`)
  const data = await r.json()
  const text = (data.content ?? []).map((c) => c.text ?? '').join('')
  if (data.stop_reason === 'max_tokens') throw new Error('Antwort abgeschnitten (max_tokens)')
  if (!text.trim()) throw new Error(`leere Antwort (stop_reason: ${data.stop_reason})`)
  return JSON.parse(text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim())
}

/* ---------- Validierung ---------- */
function pruefe(l, profil) {
  const hangul = (s) => /[가-힣]/.test(s)
  const ziel = profil === 'ko' ? hangul : (s) => !hangul(s)
  if (typeof l.erklaerung !== 'string' || l.erklaerung.length < 120 || l.erklaerung.length > 1200)
    return 'Erklärung-Länge'
  if (!Array.isArray(l.beispiele) || l.beispiele.length !== 3) return 'nicht 3 Beispiele'
  for (const b of l.beispiele) {
    if (typeof b.satz !== 'string' || !ziel(b.satz)) return 'Beispiel-Satz'
    if (typeof b.tr !== 'string' || !b.tr.trim()) return 'Beispiel-Übersetzung'
  }
  if (!Array.isArray(l.erkennen) || l.erkennen.length !== 2) return 'nicht 2 Erkennen'
  for (const e of l.erkennen) {
    if (typeof e.richtig !== 'string' || typeof e.falsch !== 'string') return 'Erkennen-Sätze'
    if (e.richtig.trim() === e.falsch.trim()) return 'Erkennen identisch'
    if (typeof e.tr !== 'string') return 'Erkennen-Übersetzung'
  }
  if (!Array.isArray(l.luecken) || l.luecken.length !== 3) return 'nicht 3 Lücken'
  for (const g of l.luecken) {
    if (typeof g.satz !== 'string' || (g.satz.match(/___/g) || []).length !== 1)
      return 'Lücke: nicht genau ein ___'
    if (typeof g.loesung !== 'string' || !g.loesung.trim()) return 'Lücke: Lösung'
    if (typeof g.hinweis !== 'string' || !g.hinweis.trim()) return 'Lücke: Hinweis'
    if (typeof g.basis === 'string' && g.basis && g.satz.includes(g.basis)) return 'Basis im Satz'
  }
  if (typeof l.produzieren !== 'string' || !l.produzieren.trim()) return 'Produzieren-Auftrag'
  return null
}

/* ---------- Hauptlauf ---------- */
const inventar = await ladeInventar(PROFIL)
const dateiPfad = `src/core/lektionen/${PROFIL}.json`
const bestand = existsSync(dateiPfad) ? JSON.parse(readFileSync(dateiPfad, 'utf8')) : {}
const skip = new Set(SKIP[PROFIL] ?? [])

/* Ziel-Punkte bestimmen */
let ziele = []
if (NUR === 'auto') {
  /* Pilot: der nächste anstehende Punkt laut Lernstand */
  const status = new Map(
    (await dbGet(`inventory_status?profile=eq.${PROFIL}&kind=eq.grammatik&select=item_id,status`).catch(() => []))
      .map((z) => [z.item_id, z.status])
  )
  const naechster = inventar.find(
    (g) => !skip.has(g.kurz) && status.get(g.id) !== 'sicher' && !bestand[g.id]
  )
  if (!naechster) {
    console.log('Kein anstehender Punkt gefunden.')
    process.exit(0)
  }
  ziele = [naechster]
} else if (NUR) {
  const p = inventar.find((g) => g.id === NUR)
  if (!p) {
    console.error(`Punkt ${NUR} nicht im Inventar.`)
    process.exit(1)
  }
  ziele = [p]
} else if (ALLE) {
  ziele = inventar.filter((g) => !skip.has(g.kurz) && !bestand[g.id])
} else {
  console.error('Bitte --nur auto | --nur <id> | --alle angeben.')
  process.exit(1)
}

/* Wort-Whitelist für die Übungsteile */
const woerter = await dbGet(`words?profile=eq.${PROFIL}&select=ko`)
const sicherWoerter = await dbGet(
  `inventory_status?profile=eq.${PROFIL}&kind=eq.wort&status=eq.sicher&select=label&limit=700`
).catch(() => [])
const whitelist = [...new Set([
  ...woerter.map((w) => w.ko),
  ...sicherWoerter.map((w) => String(w.label).split(' (')[0]),
])].slice(0, 700).join(', ')

const zielsprache = PROFIL === 'ko' ? 'Korean' : 'German'
const erklaersprache = PROFIL === 'ko' ? 'English' : 'Korean'
const system = [
  `You write ONE complete grammar mini-lesson for an A1-A2 ${zielsprache} learner in a private app, following established language didactics (TTMIK-style micro-lessons).`,
  '',
  'Lesson parts:',
  `1. "erklaerung": 4-8 friendly ${erklaersprache} sentences: what the pattern does, when to use it, how it attaches/conjugates, and THE one typical pitfall. Concrete, warm, no jargon walls.`,
  `2. "beispiele": exactly 3 natural ${zielsprache} sentences${PROFIL === 'ko' ? ' (해요체)' : ''} showing the pattern in different situations, each with ${erklaersprache} translation "tr".`,
  `3. "erkennen": exactly 2 pairs {"richtig": correct sentence, "falsch": same idea with a TYPICAL learner error in the target pattern, "tr": translation of the correct one}. The error must be plausible, not absurd.`,
  `4. "luecken": exactly 3 single-gap sentences {"satz": with ONE ___, "hinweis": ${erklaersprache} meaning of the word to insert, "basis": dictionary form (must NOT appear in satz; empty string if the gap is a particle), "loesung", "auch_ok":[]}. The gap tests THIS pattern.`,
  `5. "produzieren": one short ${erklaersprache} writing prompt asking the learner to build their own sentence with the pattern (give a relatable everyday topic).`,
  '',
  `Vocabulary for parts 2-4: prefer the learner's words: ${whitelist || '(basic everyday words)'} — a few common extra words are fine.`,
  '',
  'Reply with ONLY the JSON object {"erklaerung":...,"beispiele":[...],"erkennen":[...],"luecken":[...],"produzieren":"..."}.',
].join('\n')

let gebaut = 0
for (const punkt of ziele) {
  try {
    let l = await frage(system, `The pattern to teach: "${punkt.muster}" (${punkt.name}). Canonical example: ${punkt.beispiel}`)
    let fehler = pruefe(l, PROFIL)
    if (fehler) {
      console.warn(`${punkt.muster}: 1. Versuch (${fehler}) — zweiter Versuch`)
      l = await frage(system, `The pattern: "${punkt.muster}" (${punkt.name}). Example: ${punkt.beispiel}\nYour previous attempt was rejected: ${fehler}. Fix exactly that.`)
      fehler = pruefe(l, PROFIL)
    }
    if (fehler) {
      console.warn(`${punkt.muster}: verworfen — ${fehler}`)
      continue
    }
    bestand[punkt.id] = {
      titel: `${punkt.muster} (${punkt.name})`,
      erklaerung: l.erklaerung.trim(),
      beispiele: l.beispiele,
      erkennen: l.erkennen,
      luecken: l.luecken,
      produzieren: l.produzieren.trim(),
      extras_auto: true,
    }
    gebaut++
    console.log(`${punkt.muster}: Lektion gebaut`)
  } catch (e) {
    console.warn(`${punkt.muster}: übersprungen — ${e.message}`)
  }
}

writeFileSync(dateiPfad, JSON.stringify(bestand, null, 1), 'utf8')
console.log(`\n${gebaut} Lektion(en) gebaut -> ${dateiPfad} (gesamt: ${Object.keys(bestand).length})`)
if (gebaut === 0 && ziele.length > 0) {
  console.error('ABBRUCH: nichts gebaut — Gründe oben.')
  process.exit(1)
}
