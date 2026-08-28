/* ============================================================
   AUFGABEN-BANK FÜLLEN — V2 (Konzept: docs/TAGESAUFGABEN.md §5,
   überarbeitet nach Franz' Test-Feedback vom 28.08.2026)

   Erzeugt LÜCKENTEXTE: zusammenhängende Alltags-Miniaturen
   (2–4 Sätze) mit 6–8 Lücken aus GEMISCHTEN Grammatikpunkten —
   fordernder als Einzelsätze, weil Kontext trägt.

   Zwei Lücken-Arten (die V1-Verwirrung ist damit behoben):
   - form:     Umformung. Die Grundform steht NUR als Hinweis in
               der Lücke selbst (die App zeigt sie grau im Feld) —
               der Validator verbietet sie im Text.
   - partikel: Die Lücke ist NUR die Partikel/das Wörtchen
               (kurz, ohne Hinweis).

   Schwierigkeit: bevorzugt die SPÄTEREN (schwereren) der
   beherrschten Kanon-Punkte, wacklige zuerst. 1–2 Streckwörter
   außerhalb der Whitelist sind erwünscht — mit Glossar (in der
   App antippbar).

   Läuft in GitHub Actions (aufgaben.yml).
   Aufruf:  node scripts/baue-aufgaben.mjs [--dry]
   ============================================================ */

const SUPABASE_URL = 'https://gkrubhwwzgekmbiltslt.supabase.co'
const DB_KEY = process.env.SUPABASE_SERVICE_KEY
const KI_KEY = process.env.ANTHROPIC_API_KEY
const TROCKEN = process.argv.includes('--dry')
if (!DB_KEY || !KI_KEY) {
  console.error('SUPABASE_SERVICE_KEY oder ANTHROPIC_API_KEY fehlt.')
  process.exit(1)
}

const MODEL = 'claude-sonnet-5'
const ZIEL_TEXTE = 8 /* so viele "neu"-Texte je Profil vorrätig halten */
const PUNKTE_JE_TEXT = 4 /* aus so vielen Grammatikpunkten mischt ein Text */

const dbKopf = {
  apikey: DB_KEY,
  Authorization: `Bearer ${DB_KEY}`,
  'Content-Type': 'application/json',
}

/* Wurde in diesem Lauf überhaupt Nachschub gebraucht? (Für die
   Ehrlichkeits-Prüfung am Ende: voller Puffer ist kein Fehler.) */
let brauchteNachschub = false

async function dbGet(pfad) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${pfad}`, { headers: dbKopf })
  if (!r.ok) throw new Error(`DB ${r.status}: ${(await r.text()).slice(0, 150)}`)
  return r.json()
}

async function ladeInventar(profil) {
  if (profil === 'ko') {
    const m = await import('../src/core/inventare/topik1-grammatik.js')
    return m.TOPIK1_GRAMMATIK.map((g, i) => ({
      id: `tg-${g.id}`, muster: g.muster, name: g.name, beispiel: g.beispiel.ko, rang: i,
    }))
  }
  const m = await import('../src/core/inventare/ger-grammatik.js')
  return m.GER_GRAMMATIK.map((g, i) => ({
    id: `gg-${g.id}`, muster: g.muster, name: g.name_en, beispiel: g.beispiel.de, rang: i,
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

/* ---------- Validierung V2 (verwirft statt repariert) ---------- */
function pruefe(a, profil, erlaubteIds) {
  if (!a || typeof a !== 'object') return 'kein Objekt'
  const { text, luecken, uebersetzung } = a
  if (typeof text !== 'string' || text.length < 40 || text.length > 420) return 'Text-Länge'
  const marker = (text.match(/___/g) || []).length
  if (!Array.isArray(luecken) || luecken.length < 5 || luecken.length > 9) return 'Lücken-Anzahl'
  if (marker !== luecken.length) return `Marker (${marker}) != Lücken (${luecken.length})`
  if (typeof uebersetzung !== 'string' || !uebersetzung.trim()) return 'Übersetzung'
  if (profil === 'ko' && !/[가-힣]/.test(text)) return 'kein Hangul'
  if (profil === 'de' && /[가-힣]/.test(text)) return 'Hangul im deutschen Text'

  for (const l of luecken) {
    if (typeof l.loesung !== 'string' || !l.loesung.trim() || l.loesung.length > 40) return 'Lösung'
    if (!erlaubteIds.has(l.grammatik_id)) return `fremde grammatik_id ${l.grammatik_id}`
    if (l.art === 'form') {
      if (typeof l.basis !== 'string' || !l.basis.trim() || l.basis.length > 30) return 'Basis fehlt'
      /* Die V1-Verwirrung: die Grundform darf NICHT im Text stehen */
      if (text.includes(l.basis.trim())) return `Basis "${l.basis}" steht im Text`
    } else if (l.art === 'partikel') {
      if (l.loesung.trim().length > 6 || /\s/.test(l.loesung.trim())) return 'Partikel-Lösung zu lang'
    } else {
      return `unbekannte Art ${l.art}`
    }
  }
  if (a.glossar && !Array.isArray(a.glossar)) return 'Glossar kein Array'
  for (const g of a.glossar ?? []) {
    if (typeof g.wort !== 'string' || typeof g.bedeutung !== 'string') return 'Glossar-Eintrag'
    if (!a.text.includes(g.wort)) return `Glossar-Wort "${g.wort}" nicht im Text`
  }
  return null
}

/* ---------- Hauptlauf je Profil ---------- */
async function fuelleProfil(profil) {
  console.log(`\n=== Profil ${profil} ===`)

  const [inventar, statusZeilen, eigeneWoerter, vorhandene] = await Promise.all([
    ladeInventar(profil),
    dbGet(`inventory_status?profile=eq.${profil}&kind=eq.grammatik&select=item_id,status`).catch(() => []),
    dbGet(`words?profile=eq.${profil}&select=ko,en`),
    dbGet(
      `exercise_bank?profile=eq.${profil}&typ=eq.lueckentext&status=eq.neu&payload->>version=eq.2&select=id`
    ),
  ])
  const wortStatus = await dbGet(
    `inventory_status?profile=eq.${profil}&kind=eq.wort&status=eq.sicher&select=label&limit=800`
  ).catch(() => [])

  const fehlen = ZIEL_TEXTE - vorhandene.length
  if (fehlen <= 0) {
    console.log(`Puffer voll (${vorhandene.length}/${ZIEL_TEXTE}) — nichts zu tun.`)
    return 0
  }
  brauchteNachschub = true

  /* Punkte-Pool: wackelig zuerst, dann sicher — innerhalb dessen
     die SPÄTEREN Kanon-Punkte (= schwereren) bevorzugt. Ohne
     Kalibrierung: die ersten 12 Kanon-Punkte. */
  const stand = new Map(statusZeilen.map((z) => [z.item_id, z.status]))
  const wacklig = inventar.filter((g) => stand.get(g.id) === 'wackelig').sort((a, b) => b.rang - a.rang)
  const sicher = inventar.filter((g) => stand.get(g.id) === 'sicher').sort((a, b) => b.rang - a.rang)
  const pool = [...wacklig, ...sicher]
  const basisPool = pool.length >= PUNKTE_JE_TEXT ? pool : inventar.slice(0, 12)

  const whitelist = [
    ...eigeneWoerter.map((w) => w.ko),
    ...wortStatus.map((w) => String(w.label).split(' (')[0]),
  ]
  const whitelistText = [...new Set(whitelist)].slice(0, 700).join(', ')

  const zielsprache = profil === 'ko' ? 'Korean' : 'German'
  const erklaersprache = profil === 'ko' ? 'English' : 'Korean'
  const system = [
    `You create CONNECTED cloze texts for an ambitious A2 ${zielsprache} learner in a private app.`,
    '',
    'Each exercise is ONE coherent everyday mini-story or situation:',
    `- 2-4 natural, flowing ${zielsprache} sentences${profil === 'ko' ? ' (해요체 politeness level)' : ''} that belong together.`,
    '- 6-8 gaps written as ___ , spread across the text, each testing one of the TARGET grammar points given per request. Use each target point at least once.',
    '- Two gap kinds:',
    '  * "form": the learner must produce a transformed form. Give "basis" (the dictionary form). The basis must NOT appear anywhere in the text — only the gap.',
    '  * "partikel": the gap is ONLY a particle/small function word (short, no basis).',
    '- Make it CHALLENGING within known material: natural register, connectors, varied sentence length — no baby sentences.',
    `- Vocabulary: use the learner's word list below. 1-2 words beyond the list are WELCOME for naturalness — but every such word MUST appear in "glossar" with a short ${erklaersprache} meaning.`,
    `- "uebersetzung": ${erklaersprache} translation of the COMPLETE text (gaps filled).`,
    '',
    `Learner's words: ${whitelistText || '(list empty — use only the most basic everyday words and gloss every content word)'}`,
    '',
    'Reply with ONLY a JSON object:',
    '{"text":"... ___ ... ___ ...",',
    ' "luecken":[{"art":"form","basis":"...","loesung":"...","auch_ok":[],"grammatik_id":"..."}, {"art":"partikel","loesung":"...","auch_ok":[],"grammatik_id":"..."}, ...],',
    ' "uebersetzung":"...",',
    ' "glossar":[{"wort":"...","bedeutung":"..."}]}',
    'luecken must be in the same order as the ___ markers appear in the text.',
  ].join('\n')

  let gespeichert = 0
  let verworfen = 0
  for (let i = 0; i < fehlen; i++) {
    /* Für jeden Text eine andere Punkt-Mischung (rotierend durch
       den Pool, damit alles drankommt) */
    const punkte = []
    for (let k = 0; k < PUNKTE_JE_TEXT; k++) {
      punkte.push(basisPool[(i * PUNKTE_JE_TEXT + k) % basisPool.length])
    }
    const erlaubteIds = new Set(punkte.map((p) => p.id))
    try {
      const a = await frage(
        system,
        'Target grammar points for THIS text:\n' +
          punkte.map((p) => `- ${p.id}: "${p.muster}" (${p.name}), example: ${p.beispiel}`).join('\n') +
          '\nCreate ONE connected cloze text now.'
      )
      const fehler = pruefe(a, profil, erlaubteIds)
      if (fehler) {
        verworfen++
        /* Grund + Probe ausgeben — sonst rät man im Log nur herum */
        console.warn(
          `Text ${i + 1}: verworfen — ${fehler}\n  Probe: ${JSON.stringify(a).slice(0, 260)}`
        )
        continue
      }
      const zeile = {
        profile: profil,
        typ: 'lueckentext',
        grammatik_id: punkte[0].id,
        payload: {
          version: 2,
          text: a.text.trim(),
          luecken: a.luecken.map((l) => ({
            art: l.art,
            basis: l.art === 'form' ? l.basis.trim() : null,
            loesung: l.loesung.trim(),
            auch_ok: (l.auch_ok ?? []).map(String).slice(0, 4),
            grammatik_id: l.grammatik_id,
          })),
          uebersetzung: a.uebersetzung.trim(),
          glossar: (a.glossar ?? []).slice(0, 4),
          punkte: punkte.map((p) => ({ id: p.id, name: `${p.muster} (${p.name})` })),
        },
      }
      if (!TROCKEN) {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/exercise_bank`, {
          method: 'POST',
          headers: { ...dbKopf, Prefer: 'return=minimal' },
          body: JSON.stringify(zeile),
        })
        if (!r.ok) throw new Error(`Insert ${r.status}: ${(await r.text()).slice(0, 150)}`)
      }
      gespeichert++
      console.log(`Text ${i + 1}: +1 (${a.luecken.length} Lücken, ${(a.glossar ?? []).length} Glossar)${TROCKEN ? ' (trocken)' : ''}`)
    } catch (e) {
      console.warn(`Text ${i + 1}: übersprungen — ${e.message}`)
    }
  }
  console.log(`Profil ${profil}: ${gespeichert} Texte gespeichert, ${verworfen} verworfen`)
  return gespeichert
}

const summe = (await fuelleProfil('ko')) + (await fuelleProfil('de'))
console.log(`\n${summe} neue Texte insgesamt${TROCKEN ? ' (Trockenlauf)' : ''}`)

/* Ehrlichkeit des Laufs: Wenn NICHTS gespeichert wurde, obwohl
   etwas fehlte, soll der Lauf ROT sein — grün muss "Aufgaben
   liegen bereit" bedeuten, nicht "Skript ist durchgelaufen". */
if (summe === 0 && brauchteNachschub && !TROCKEN) {
  console.error('ABBRUCH: Nachschub war nötig, aber 0 Texte gespeichert — Gründe stehen oben im Log.')
  process.exit(1)
}
console.log('ok')
