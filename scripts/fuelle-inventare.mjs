/* ============================================================
   Füllt die Lücken in den Wort-Inventaren per Claude:
   - goethe-woerter.json: ko (koreanische Wort-Bedeutung) — ~1.361
   - topik1-woerter.json: en (englische Bedeutung) — ~186

   Läuft in GitHub Actions (.github/workflows/inventare.yml),
   der Schlüssel kommt aus dem Actions-Secret ANTHROPIC_API_KEY.

   Validierung statt Vertrauen: Koreanisch muss reines Hangul
   sein, Englisch kurz und ASCII. Was durchfällt, bleibt leer
   und wird beim nächsten Lauf erneut versucht. Ergebnis wird
   als extras_auto=true markiert (KI-generiert, korrigierbar —
   aber bewusst OHNE Prüfpflicht für irgendwen).

   Aufruf:  node scripts/fuelle-inventare.mjs [--dry]
   ============================================================ */
import { readFileSync, writeFileSync } from 'node:fs'

const API_KEY = process.env.ANTHROPIC_API_KEY
const TROCKEN = process.argv.includes('--dry')
if (!API_KEY) {
  console.error('ANTHROPIC_API_KEY fehlt.')
  process.exit(1)
}

const MODEL = 'claude-sonnet-5'
const BATCH = 40
const DECKEL = 2000 /* Sicherheitsgrenze pro Lauf */

async function frage(system, nutzer) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 3000,
      system,
      messages: [{ role: 'user', content: nutzer }],
    }),
  })
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 200)}`)
  const data = await r.json()
  const text = (data.content ?? []).map((c) => c.text ?? '').join('')
  const raw = text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim()
  return JSON.parse(raw)
}

function ladeJson(pfad) {
  return JSON.parse(readFileSync(pfad, 'utf8'))
}

/* ---------- Goethe: deutsche Wörter -> koreanische Bedeutung ---------- */
async function goetheKo() {
  const pfad = 'src/core/inventare/goethe-woerter.json'
  const daten = ladeJson(pfad)
  const offen = daten.filter((e) => !e.ko).slice(0, DECKEL)
  console.log(`Goethe: ${offen.length} Einträge ohne ko`)
  if (!offen.length) return

  const system = [
    'You translate German vocabulary entries into Korean for a Korean native speaker (A1-A2 German learner).',
    'For each entry return the KOREAN MEANING of the German word (not of the sentence).',
    'Rules:',
    '- Korean only (Hangul), 1-4 words, the most common everyday meaning.',
    '- The example sentence shows WHICH sense is meant — translate that sense.',
    '- For verbs use the dictionary form (하다-form where natural).',
    '- Reply with ONLY a JSON array: [{"id":"g-1","ko":"..."}, ...] — nothing else.',
  ].join('\n')

  let gefuellt = 0
  for (let i = 0; i < offen.length; i += BATCH) {
    const stueck = offen.slice(i, i + BATCH)
    const nutzer = JSON.stringify(
      stueck.map((e) => ({
        id: e.id,
        de: e.artikel ? `${e.artikel} ${e.de}` : e.de,
        beispiel: e.bsp,
      }))
    )
    try {
      const antwort = await frage(system, nutzer)
      for (const a of antwort) {
        const ziel = daten.find((e) => e.id === a.id)
        if (!ziel || ziel.ko) continue
        const ko = String(a.ko ?? '').trim()
        /* Validierung: reines Hangul (plus Leerzeichen/Komma), kurz */
        if (!/^[가-힣\s,·()~]+$/.test(ko) || ko.length > 30) continue
        ziel.ko = ko
        ziel.extras_auto = true
        gefuellt++
      }
      console.log(`  Goethe ${i + stueck.length}/${offen.length} — gefüllt: ${gefuellt}`)
    } catch (e) {
      console.warn(`  Batch übersprungen: ${e.message}`)
    }
  }
  if (!TROCKEN) writeFileSync(pfad, JSON.stringify(daten, null, 1), 'utf8')
  console.log(`Goethe fertig: ${gefuellt} neu gefüllt${TROCKEN ? ' (TROCKEN — nichts geschrieben)' : ''}`)
}

/* ---------- TOPIK: koreanische Wörter -> englische Bedeutung ---------- */
async function topikEn() {
  const pfad = 'src/core/inventare/topik1-woerter.json'
  const daten = ladeJson(pfad)
  const offen = daten.filter((e) => !e.en).slice(0, DECKEL)
  console.log(`TOPIK: ${offen.length} Einträge ohne en`)
  if (!offen.length) return

  const system = [
    'You provide short English glosses for Korean beginner vocabulary (TOPIK I).',
    'Rules:',
    '- 1-5 English words, the most common everyday meaning.',
    '- The usage hint (Korean collocation) shows which sense is meant.',
    '- Reply with ONLY a JSON array: [{"id":"t-1","en":"..."}, ...] — nothing else.',
  ].join('\n')

  let gefuellt = 0
  for (let i = 0; i < offen.length; i += BATCH) {
    const stueck = offen.slice(i, i + BATCH)
    const nutzer = JSON.stringify(
      stueck.map((e) => ({ id: e.id, ko: e.ko, pos: e.pos, hinweis: e.hinweis }))
    )
    try {
      const antwort = await frage(system, nutzer)
      for (const a of antwort) {
        const ziel = daten.find((e) => e.id === a.id)
        if (!ziel || ziel.en) continue
        const en = String(a.en ?? '').trim()
        if (!/^[A-Za-z0-9\s,;'()/-]+$/.test(en) || en.length > 60) continue
        ziel.en = en
        ziel.extras_auto = true
        gefuellt++
      }
      console.log(`  TOPIK ${i + stueck.length}/${offen.length} — gefüllt: ${gefuellt}`)
    } catch (e) {
      console.warn(`  Batch übersprungen: ${e.message}`)
    }
  }
  if (!TROCKEN) writeFileSync(pfad, JSON.stringify(daten, null, 1), 'utf8')
  console.log(`TOPIK fertig: ${gefuellt} neu gefüllt${TROCKEN ? ' (TROCKEN — nichts geschrieben)' : ''}`)
}

await goetheKo()
await topikEn()
console.log('ok')
