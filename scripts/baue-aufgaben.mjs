/* ============================================================
   AUFGABEN-BANK FÜLLEN (Konzept: docs/TAGESAUFGABEN.md §5)

   Erzeugt Lückentext-Aufgaben, exakt zugeschnitten auf den
   Lernstand des jeweiligen Profils:
   - Ziel-Grammatik: wacklige Punkte zuerst, dann sichere
     (Erhaltung) — aus inventory_status. Gibt es noch keine
     Kalibrierung, die ersten Punkte des Kanons.
   - Wort-Whitelist: eigene Bibliothek + kalibriert-sichere Wörter.
   - Jede Aufgabe: Satz mit EINER Lücke, Basis-Wort in Klammern
     (macht die Lösung eindeutig — Konzept-Entscheidung), englische
     bzw. koreanische Übersetzung, GLOSSAR für Wörter außerhalb
     der Whitelist (in der App antippbar).

   Validierung vor dem Speichern (Skript, nicht KI): genau eine
   Lücke, Lösung vorhanden, Längen-Grenzen, Hangul-Check bei
   Koreanisch. Durchgefallenes wird verworfen, nie repariert.
   Alles extras_auto — korrigierbar, ohne Prüfpflicht.

   Läuft in GitHub Actions (aufgaben.yml) mit den Secrets
   SUPABASE_SERVICE_KEY und ANTHROPIC_API_KEY.
   Aufruf:  node scripts/baue-aufgaben.mjs [--dry]
   ============================================================ */
import { readFileSync } from 'node:fs'

const SUPABASE_URL = 'https://gkrubhwwzgekmbiltslt.supabase.co'
const DB_KEY = process.env.SUPABASE_SERVICE_KEY
const KI_KEY = process.env.ANTHROPIC_API_KEY
const TROCKEN = process.argv.includes('--dry')
if (!DB_KEY || !KI_KEY) {
  console.error('SUPABASE_SERVICE_KEY oder ANTHROPIC_API_KEY fehlt.')
  process.exit(1)
}

const MODEL = 'claude-sonnet-5'
const ZIEL_JE_PUNKT = 6 /* Puffer: so viele "neu"-Aufgaben je Grammatikpunkt */
const MAX_PUNKTE = 8 /* pro Lauf und Profil */
const JE_ANFRAGE = 4 /* Aufgaben pro Modell-Aufruf */

const dbKopf = {
  apikey: DB_KEY,
  Authorization: `Bearer ${DB_KEY}`,
  'Content-Type': 'application/json',
}

async function dbGet(pfad) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${pfad}`, { headers: dbKopf })
  if (!r.ok) throw new Error(`DB ${r.status}: ${(await r.text()).slice(0, 150)}`)
  return r.json()
}

/* Grammatik-Inventare direkt aus den App-Dateien lesen (kein
   doppelter Datenbestand). Die Dateien sind ES-Module — für den
   schlichten Import hier reicht ein Regex-freies eval über den
   Export nicht; stattdessen dynamischer Import. */
async function ladeInventar(profil) {
  if (profil === 'ko') {
    const m = await import('../src/core/inventare/topik1-grammatik.js')
    return m.TOPIK1_GRAMMATIK.map((g) => ({ id: `tg-${g.id}`, muster: g.muster, name: g.name, beispiel: g.beispiel.ko }))
  }
  const m = await import('../src/core/inventare/ger-grammatik.js')
  return m.GER_GRAMMATIK.map((g) => ({ id: `gg-${g.id}`, muster: g.muster, name: g.name_en, beispiel: g.beispiel.de }))
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
      max_tokens: 2500,
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: nutzer }],
    }),
  })
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 150)}`)
  const data = await r.json()
  const text = (data.content ?? []).map((c) => c.text ?? '').join('')
  return JSON.parse(text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim())
}

/* ---------- Validierung (streng, verwirft statt repariert) ---------- */
function pruefe(a, profil) {
  if (!a || typeof a !== 'object') return 'kein Objekt'
  const { satz, loesung, basis, uebersetzung } = a
  if (typeof satz !== 'string' || satz.length < 8 || satz.length > 140) return 'Satz-Länge'
  if ((satz.match(/___/g) || []).length !== 1) return 'nicht genau eine Lücke'
  if (typeof loesung !== 'string' || !loesung.trim() || loesung.length > 40) return 'Lösung'
  if (typeof basis !== 'string' || !basis.trim() || basis.length > 30) return 'Basis'
  if (typeof uebersetzung !== 'string' || !uebersetzung.trim()) return 'Übersetzung'
  if (satz.includes(loesung.trim())) return 'Lösung steht schon im Satz'
  if (profil === 'ko' && !/[가-힣]/.test(satz)) return 'kein Hangul'
  if (profil === 'de' && /[가-힣]/.test(satz)) return 'Hangul im deutschen Satz'
  if (a.glossar && !Array.isArray(a.glossar)) return 'Glossar kein Array'
  for (const g of a.glossar ?? []) {
    if (typeof g.wort !== 'string' || typeof g.bedeutung !== 'string') return 'Glossar-Eintrag'
  }
  return null
}

/* ---------- Hauptlauf je Profil ---------- */
async function fuelleProfil(profil) {
  console.log(`\n=== Profil ${profil} ===`)

  /* 1. Lernstand einsammeln */
  const [inventar, statusZeilen, eigeneWoerter, vorhandene] = await Promise.all([
    ladeInventar(profil),
    dbGet(`inventory_status?profile=eq.${profil}&kind=eq.grammatik&select=item_id,status`).catch(() => []),
    dbGet(`words?profile=eq.${profil}&select=ko,en`),
    dbGet(`exercise_bank?profile=eq.${profil}&typ=eq.lueckentext&status=eq.neu&select=grammatik_id`),
  ])
  const wortStatus = await dbGet(
    `inventory_status?profile=eq.${profil}&kind=eq.wort&status=eq.sicher&select=label&limit=800`
  ).catch(() => [])

  /* 2. Ziel-Punkte wählen: wackelig zuerst, dann sicher; ohne
     Kalibrierung die ersten Kanon-Punkte. Nur Punkte, deren
     Puffer unter dem Ziel liegt. */
  const stand = new Map(statusZeilen.map((z) => [z.item_id, z.status]))
  const puffer = {}
  for (const v of vorhandene) puffer[v.grammatik_id] = (puffer[v.grammatik_id] || 0) + 1

  const kandidaten = [
    ...inventar.filter((g) => stand.get(g.id) === 'wackelig'),
    ...inventar.filter((g) => stand.get(g.id) === 'sicher'),
  ]
  const ziele = (kandidaten.length ? kandidaten : inventar.slice(0, MAX_PUNKTE))
    .filter((g) => (puffer[g.id] || 0) < ZIEL_JE_PUNKT)
    .slice(0, MAX_PUNKTE)

  if (!ziele.length) {
    console.log('Puffer voll — nichts zu tun.')
    return 0
  }

  /* 3. Wort-Whitelist: Bibliothek + kalibriert-sicher (Wortteil
     vor der Klammer aus dem Label) */
  const whitelist = [
    ...eigeneWoerter.map((w) => w.ko),
    ...wortStatus.map((w) => String(w.label).split(' (')[0]),
  ]
  const whitelistText = [...new Set(whitelist)].slice(0, 700).join(', ')

  const zielsprache = profil === 'ko' ? 'Korean' : 'German'
  const erklaersprache = profil === 'ko' ? 'English' : 'Korean'
  const system = [
    `You create cloze (fill-the-gap) exercises for an A1-A2 ${zielsprache} learner in a private app.`,
    '',
    'Rules for every exercise:',
    `- ONE natural everyday sentence in ${zielsprache}${profil === 'ko' ? ' (해요체 politeness level only)' : ''}, max ~15 words.`,
    '- Exactly ONE gap, written as ___ — the gap tests the TARGET GRAMMAR POINT.',
    '- "basis" = the dictionary form the learner must transform (shown in brackets — this makes the solution unambiguous).',
    '- "loesung" = the single correct fill. "auch_ok" = array of other acceptable spellings (often empty).',
    `- "uebersetzung" = ${erklaersprache} translation of the full sentence (with the gap filled).`,
    '- Use ONLY words from the learner\'s word list below. If a word outside the list is truly needed for naturalness, you MUST list it in "glossar" with a short ' + erklaersprache + ' meaning.',
    '- Keep glossar small (0-2 entries). Vary topics and sentence patterns.',
    '',
    `Learner's words: ${whitelistText || '(list empty — use only the most basic everyday words and put EVERY content word in glossar)'}`,
    '',
    'Reply with ONLY a JSON array:',
    '[{"satz":"...___...","basis":"...","loesung":"...","auch_ok":[],"uebersetzung":"...","glossar":[{"wort":"...","bedeutung":"..."}]}, ...]',
  ].join('\n')

  /* 4. Erzeugen, validieren, speichern */
  let gespeichert = 0
  let verworfen = 0
  for (const punkt of ziele) {
    const fehlen = ZIEL_JE_PUNKT - (puffer[punkt.id] || 0)
    const anzahl = Math.min(JE_ANFRAGE, fehlen)
    try {
      const antwort = await frage(
        system,
        `Target grammar point: "${punkt.muster}" (${punkt.name}). Example: ${punkt.beispiel}\n` +
          `Create ${anzahl} exercises where the gap tests exactly this point.`
      )
      const gueltig = []
      for (const a of Array.isArray(antwort) ? antwort : []) {
        const fehler = pruefe(a, profil)
        if (fehler) {
          verworfen++
          continue
        }
        gueltig.push({
          profile: profil,
          typ: 'lueckentext',
          grammatik_id: punkt.id,
          payload: {
            satz: a.satz.trim(),
            basis: a.basis.trim(),
            loesung: a.loesung.trim(),
            auch_ok: (a.auch_ok ?? []).map(String).slice(0, 4),
            uebersetzung: a.uebersetzung.trim(),
            glossar: (a.glossar ?? []).slice(0, 3),
            grammatik_name: `${punkt.muster} (${punkt.name})`,
          },
        })
      }
      if (gueltig.length && !TROCKEN) {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/exercise_bank`, {
          method: 'POST',
          headers: { ...dbKopf, Prefer: 'return=minimal' },
          body: JSON.stringify(gueltig),
        })
        if (!r.ok) throw new Error(`Insert ${r.status}: ${(await r.text()).slice(0, 150)}`)
      }
      gespeichert += gueltig.length
      console.log(`${punkt.muster}: +${gueltig.length}${TROCKEN ? ' (trocken)' : ''}`)
    } catch (e) {
      console.warn(`${punkt.muster}: übersprungen — ${e.message}`)
    }
  }
  console.log(`Profil ${profil}: ${gespeichert} gespeichert, ${verworfen} verworfen`)
  return gespeichert
}

const summe = (await fuelleProfil('ko')) + (await fuelleProfil('de'))
console.log(`\nok — ${summe} neue Aufgaben insgesamt${TROCKEN ? ' (Trockenlauf)' : ''}`)
