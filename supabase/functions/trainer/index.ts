/* ============================================================
   DER TRAINER — Supabase Edge Function

   Warum hier und nicht in der App: Die App liegt öffentlich auf
   GitHub Pages; ein API-Schlüssel im Frontend wäre für jeden
   lesbar. Diese Funktion läuft bei Supabase, hält den Anthropic-
   Schlüssel als Secret und ist der einzige Weg zum Modell.

   Drei Aktionen:
     chat     eine Trainer-Antwort auf den bisherigen Verlauf
     summary  Einheit beenden -> Zusammenfassung ins Lernjournal
     extract  Grammatik-Erklärung (Text/Foto) -> Skill-Vorschläge

   Schutz:
     - Ratenlimit: max. 40 Modell-Aufrufe pro Stunde je Profil
       (gezählt über die Tabelle trainer_usage)
     - dazu das harte Ausgabenlimit im Anthropic-Konto (5 €/Monat)

   Einrichtung (einmalig, im Supabase-Dashboard):
     Edge Functions -> Deploy new function -> Name: trainer
     -> diesen Code einfügen -> "Verify JWT" AUSschalten
     Secrets -> ANTHROPIC_API_KEY hinterlegen
   ============================================================ */

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const SB_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const MODEL = 'claude-sonnet-5'
const MAX_CALLS_PER_HOUR = 40

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/* ---------- Supabase (Service-Schlüssel, nur serverseitig) ---------- */
const dbHead = {
  apikey: SB_SERVICE,
  Authorization: `Bearer ${SB_SERVICE}`,
  'Content-Type': 'application/json',
}

async function dbGet(path: string) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: dbHead })
  if (!r.ok) throw new Error(`DB ${r.status}: ${await r.text()}`)
  return r.json()
}

async function dbInsert(table: string, row: unknown) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...dbHead, Prefer: 'return=minimal' },
    body: JSON.stringify(row),
  })
  if (!r.ok) throw new Error(`DB insert ${r.status}: ${await r.text()}`)
}

/* Upsert (z. B. Grammatik-Zustände: neuer Beleg überschreibt alten) */
async function dbUpsert(table: string, rows: unknown, konflikt: string) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?on_conflict=${konflikt}`, {
    method: 'POST',
    headers: { ...dbHead, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  })
  if (!r.ok) throw new Error(`DB upsert ${r.status}: ${await r.text()}`)
}

/* ---------- Der Lernstand-Steckbrief (Konzept §3) ----------
   Strukturiert statt Rohliste: sicher / wackelig / frisch, dazu
   Skills und die letzten Einheiten aus dem Lernjournal. */
async function buildProfile(profile: string) {
  const [words, cards, skills, sessions, kalibriert] = await Promise.all([
    dbGet(`words?profile=eq.${profile}&select=id,ko,en,created_at`),
    dbGet(`cards?profile=eq.${profile}&select=word_id,reps,lapses`),
    dbGet(`skills?profile=eq.${profile}&select=topic,note&order=created_at.desc&limit=60`),
    dbGet(`sessions?profile=eq.${profile}&select=summary,errors,created_at&order=created_at.desc&limit=5`),
    /* Kalibrierungs-Ergebnisse (Migration 009). Schema-Toleranz:
       fehlt die Tabelle noch, läuft alles ohne sie weiter. */
    dbGet(
      `inventory_status?profile=eq.${profile}&status=eq.sicher&select=kind,label&limit=900`
    ).catch(() => []),
  ])

  /* Je Wort den besten Lernstand über beide Karten bestimmen */
  const stat: Record<string, { reps: number; lapses: number }> = {}
  for (const c of cards) {
    const s = stat[c.word_id] ?? { reps: 0, lapses: 0 }
    s.reps = Math.max(s.reps, c.reps)
    s.lapses = Math.max(s.lapses, c.lapses)
    stat[c.word_id] = s
  }

  const secure: string[] = []
  const shaky: string[] = []
  const fresh: string[] = []
  for (const w of words) {
    const s = stat[w.id] ?? { reps: 0, lapses: 0 }
    const entry = `${w.ko} (${w.en})`
    if (s.lapses >= 3) shaky.push(entry)
    else if (s.reps >= 4) secure.push(entry)
    else fresh.push(entry)
  }

  /* Dauerfehler: Fehlerlisten der letzten Einheiten zusammenführen */
  const errorSet = new Set<string>()
  for (const s of sessions) {
    for (const e of s.errors ?? []) errorSet.add(String(e))
  }

  /* Die ~20 zuletzt gelernten Wörter: Ein Wort braucht 8–10
     Begegnungen im Kontext — der Trainer webt sie gezielt ein */
  const frischGelernt = [...words]
    .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))
    .slice(0, 20)
    .map((w) => `${w.ko} (${w.en})`)

  /* Kalibrierung: als "sicher" gewischte Inventar-Wörter erweitern
     den nutzbaren Wortschatz; sichere Grammatikpunkte ergänzen die
     Skills-Liste. label ist bereits lesbar ("가다 (to go)"). */
  const kalibrierteWoerter = kalibriert
    .filter((k: { kind: string }) => k.kind === 'wort')
    .map((k: { label: string }) => k.label)
  const kalibrierteGrammatik = kalibriert
    .filter((k: { kind: string }) => k.kind === 'grammatik')
    .map((k: { label: string }) => k.label)

  return {
    /* sicher = gereifte Karten + kalibriert-bekannte Wörter (gedeckelt) */
    secure: [...secure, ...kalibrierteWoerter].slice(0, 800),
    shaky,
    fresh,
    frischGelernt,
    /* Notiz mitgeben, wenn vorhanden — oft steckt dort die
       Einschränkung ("nur gesprochen", "nur mit Vokal") */
    skills: [
      ...skills.map((s: { topic: string; note?: string }) =>
        s.note ? `${s.topic} (${s.note})` : s.topic
      ),
      ...kalibrierteGrammatik,
    ],
    journal: sessions.map(
      (s: { created_at: string; summary: string }) =>
        `${s.created_at.slice(0, 10)}: ${s.summary}`
    ),
    errors: [...errorSet].slice(0, 12),
  }
}

/* ---------- System-Prompts ---------- */
function chatSystem(profile: string, mode: string, scenario: string, p: Awaited<ReturnType<typeof buildProfile>>) {
  const learnsKorean = profile === 'ko'
  const target = learnsKorean ? 'Korean' : 'German'
  const explain = learnsKorean ? 'English' : 'Korean'
  const learner = learnsKorean ? 'Franz' : 'Haein (해인)'
  const partner = learnsKorean ? 'Haein (해인), his Korean girlfriend' : 'Franz, her German boyfriend'

  return [
    `You are the personal ${target} trainer inside a private vocabulary app used by a couple. The learner is ${learner}, level A1-A2. You are warm and encouraging, and you know language didactics.`,
    '',
    '## What the learner knows — STAY INSIDE THIS',
    `Secure vocabulary (use freely): ${p.secure.join(', ') || '(none yet)'}`,
    `Shaky vocabulary (weave in deliberately so it gets practice): ${p.shaky.join(', ') || '(none)'}`,
    `Fresh vocabulary (use sparingly, they are still learning these): ${p.fresh.join(', ') || '(none)'}`,
    `RECENTLY LEARNED (important: a word needs 8-10 encounters to stick — naturally weave 2-4 of these into this conversation): ${p.frischGelernt.join(', ') || '(none)'}`,
    `Grammar the learner knows: ${p.skills.join('; ') || '(nothing recorded yet — assume bare basics: polite present tense, simple statements and questions)'}`,
    p.journal.length ? `Recent sessions:\n${p.journal.join('\n')}` : '',
    p.errors.length ? `Recurring mistakes to gently work on: ${p.errors.join('; ')}` : '',
    '',
    '## Hard rules',
    `- Write your conversational messages in ${target} ONLY, at the learner's level. Use ONLY known grammar and overwhelmingly known vocabulary.`,
    `- At most 1-2 new words per session, and mark each new word like *this* on first use.`,
    '- Messages are SHORT: 1-3 sentences, like a real chat partner. Never lecture in the chat message.',
    `- Corrections and explanations go in the correction field, in ${explain}, brief and kind.`,
    '',
    '## Mode',
    mode === 'scenario'
      ? `Roleplay this everyday scenario naturally: "${scenario}". Play your role (shopkeeper, driver, or — for partner scenarios — ${partner}). Corrections still speak in your trainer voice via the correction field. After 3-4 successful exchanges from the learner, set canEnd to true and keep it true.`
      : 'Open-ended free conversation for practice. Follow the learner\'s topics, keep them talking with easy questions. canEnd is always false in this mode.',
    '',
    '## Output contract — reply with ONLY this JSON, nothing else',
    '{"message": "<your chat message in ' + target + '>",',
    ' "correction": null OR {"fixed": "<corrected version of the learner\'s LAST message>", "note": "<one short ' + explain + ' explanation>"},',
    ' "canEnd": true|false}',
    'Set correction ONLY when the learner\'s last message contains a real error. Minor style is not an error. If the learner wrote in another language or asked a question about the language, answer briefly via correction.note and keep message in role.',
    '',
    '## Correction policy (tiered — research-based)',
    '- Error in grammar the learner KNOWS (it is on the list above): prefer a PROMPT — begin your chat message with a very short, friendly nudge toward self-correction in ' + target + ' (e.g. repeat the phrase questioningly, or offer the two options), then continue the conversation. Self-repair beats being corrected. Use this at most every other turn; otherwise fall back to the quiet correction field.',
    '- Error in grammar ABOVE the learner\'s level (not on the list): do NOT correct it. Silently use the correct form in your own reply if natural, or ignore it entirely. It is not learnable yet.',
    '- Never more than ONE correction focus per learner message. Communication comes first.',
  ]
    .filter(Boolean)
    .join('\n')
}

function summarySystem(profile: string) {
  const learnsKorean = profile === 'ko'
  return [
    `You are the ${learnsKorean ? 'Korean' : 'German'} trainer. The session just ended. Given the transcript, produce a compact learning-journal entry.`,
    '',
    'Reply with ONLY this JSON:',
    '{"summary": "<2-3 sentences: what was practiced, how it went — written for YOUR OWN memory before the next session>",',
    ' "errors": ["<recurring error pattern>", ...max 3, empty array if none],',
    ` "feedback": "<warm feedback FOR THE LEARNER in ${learnsKorean ? 'English' : 'Korean'}: what went well, then AT MOST 3 error patterns — each with the correct form, a one-line why, and one tiny try-it-again example. FOCUSED beats complete: pick the patterns that matter, let the rest go. End with one encouragement. 5-8 sentences.>"}`,
  ].join('\n')
}

/* ---------- Skills aus einer Erklärung herausziehen ----------
   Der Lernende erzählt frei (oder fotografiert ein Übungsblatt),
   das Modell macht daraus kurze, atomare Einträge und fasst
   zusammen, was es verstanden hat. Gespeichert wird erst, wenn
   der Lernende die Vorschläge in der App bestätigt. */
function extractSystem(profile: string) {
  const learnsKorean = profile === 'ko'
  const target = learnsKorean ? 'Korean' : 'German'
  const explain = learnsKorean ? 'English' : 'Korean'
  return [
    `You maintain the grammar-skills list of an A1-A2 ${target} learner inside a private vocabulary app. The learner just explained — as free text and/or a photo of a textbook or worksheet page — which grammar they have learned.`,
    '',
    'Extract the grammar as SHORT, ATOMIC entries:',
    `- topic: the pattern itself plus a 2-5 word gloss, e.g. ${learnsKorean ? '"-았/었어요 (past tense)"' : '"Perfekt mit haben (spoken past)"'}`,
    `- note: at most one short ${explain} sentence with a detail worth remembering (usage restriction, tiny example). Empty string if there is nothing to add.`,
    '- Only include grammar the learner clearly LEARNED. Ignore plain vocabulary — the app tracks words separately. Never invent points that are not in the input.',
    '- Split combined explanations into separate atomic entries. At most 12.',
    '',
    'Reply with ONLY this JSON:',
    `{"reply": "<1-2 warm sentences in ${explain}: say what you understood and ask the learner to confirm>",`,
    ' "items": [{"topic": "...", "note": "..."}, ...]}',
    'If the input contains no recognizable grammar, return an empty items array and use reply to kindly ask for a clearer description.',
  ].join('\n')
}

function parseExtract(text: string) {
  const raw = text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim()
  try {
    const j = JSON.parse(raw)
    const items = Array.isArray(j.items)
      ? j.items
          .filter((it: { topic?: unknown }) => typeof it.topic === 'string' && (it.topic as string).trim())
          .slice(0, 12)
          .map((it: { topic: string; note?: unknown }) => ({
            topic: it.topic.trim().slice(0, 120),
            note: typeof it.note === 'string' ? it.note.trim().slice(0, 200) : '',
          }))
      : []
    return { reply: typeof j.reply === 'string' ? j.reply : '', items }
  } catch {
    /* Unlesbar: Text als Antwort zeigen, nichts vorschlagen */
    return { reply: raw.slice(0, 300), items: [] }
  }
}

/* ---------- Anthropic ---------- */
/* content ist meist ein String, beim Foto-Upload ein Array aus
   Bild- und Textblöcken — die API akzeptiert beides. */
async function callModel(system: string, messages: { role: string; content: unknown }[], maxTokens = 800) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages,
    }),
  })
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${await r.text()}`)
  const data = await r.json()
  const text = (data.content ?? []).map((c: { text?: string }) => c.text ?? '').join('')
  return {
    text,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  }
}

/* Der Umschlag kommt als JSON — zur Not in einem Codeblock.
   Scheitert das Parsen, wird der ganze Text als Nachricht
   behandelt statt einen Fehler zu werfen. */
function parseEnvelope(text: string) {
  const raw = text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim()
  try {
    const j = JSON.parse(raw)
    return {
      message: typeof j.message === 'string' ? j.message : raw,
      correction:
        j.correction && typeof j.correction.fixed === 'string'
          ? { fixed: j.correction.fixed, note: String(j.correction.note ?? '') }
          : null,
      canEnd: !!j.canEnd,
    }
  } catch {
    return { message: raw, correction: null, canEnd: false }
  }
}

/* ---------- Ratenlimit ---------- */
async function overLimit(profile: string) {
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString()
  /* Nur die eigenen Aktionen zählen — die speech-Funktion führt
     ihr eigenes Limit in speech_usage */
  const rows = await dbGet(
    `trainer_usage?profile=eq.${profile}&action=in.(chat,summary,extract,uebung,satz,schreiben,studio_erklaerung,studio_aufgaben,studio_bilanz)&created_at=gt.${oneHourAgo}&select=id`
  )
  return rows.length >= MAX_CALLS_PER_HOUR
}

/* ---------- Handler ---------- */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  try {
    if (!ANTHROPIC_KEY) return json({ error: 'no-key' }, 500)

    /* ---------- Nur eingeloggte Nutzer ----------
       Der Dashboard-Schalter "Verify JWT (legacy)" lässt den
       öffentlichen App-Schlüssel durch — der steht aber für alle
       sichtbar im GitHub-Pages-Code. Deshalb prüfen WIR selbst:
       Wir fragen Supabase Auth, ob das mitgeschickte Token zu
       einem echten angemeldeten Nutzer gehört (es gibt genau
       zwei; Registrierung ist abgeschaltet). Der öffentliche
       Schlüssel fällt hier durch. */
    const auth = req.headers.get('Authorization') ?? ''
    const userToken = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    const wer = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: { apikey: SB_SERVICE, Authorization: `Bearer ${userToken}` },
    })
    if (!wer.ok) return json({ error: 'auth' }, 401)

    const body = await req.json()
    const { action, profile, mode, scenario, messages } = body

    if (profile !== 'ko' && profile !== 'de') return json({ error: 'bad-profile' }, 400)
    /* extract und uebung haben keinen Verlauf — die Prüfung gilt
       nur für chat und summary */
    if (
      action !== 'extract' &&
      action !== 'uebung' &&
      action !== 'satz' &&
      action !== 'schreiben' &&
      !String(action).startsWith('studio_') &&
      (!Array.isArray(messages) || messages.length > 60)
    )
      return json({ error: 'bad-messages' }, 400)

    if (await overLimit(profile)) return json({ error: 'rate-limit' }, 429)

    /* ---------- Übungs-Abschluss: Feedback + Beleg-Rückfluss ----------
       Kommt nach jeder ABGESCHLOSSENEN Übungsrunde (Konzept:
       Abgebrochenes zählt nicht). Drei Wirkungen:
       1. kurzes KI-Feedback für den Fertig-Bildschirm
       2. Eintrag ins Lernjournal (sessions) — der Trainer weiß
          morgen, was heute geübt wurde
       3. Grammatik-Zustände: alle Versuche eines Punkts richtig
          -> sicher (Quelle: uebung, macht den Balken "satt");
          ein Fehler -> wackelig */
    if (action === 'uebung') {
      const ergebnisse = Array.isArray(body.ergebnisse) ? body.ergebnisse.slice(0, 20) : []
      if (!ergebnisse.length) return json({ error: 'empty' }, 400)

      /* je Grammatikpunkt bündeln */
      const punkte = new Map<string, { name: string; richtig: number; falsch: number }>()
      for (const e of ergebnisse) {
        const id = String(e.grammatik_id ?? '')
        if (!id) continue
        const p = punkte.get(id) ?? { name: String(e.grammatik_name ?? id), richtig: 0, falsch: 0 }
        e.richtig ? p.richtig++ : p.falsch++
        punkte.set(id, p)
      }

      /* Entschärft (Feedback Franz 30.08.): EIN Ausrutscher bei
         sonst richtigen Antworten ist meist ein Tippfehler — der
         Punkt bleibt dann unangetastet, statt auf wackelig zu
         fallen. Zurückgestuft wird erst bei 2+ Fehlern oder wenn
         mehr daneben ging als saß. */
      const urteile = [...punkte.entries()]
        .map(([id, p]) => ({
          id,
          p,
          status:
            p.falsch === 0
              ? 'sicher'
              : p.falsch >= 2 || p.falsch > p.richtig
                ? 'wackelig'
                : null /* einzelner Ausrutscher: kein Urteil */,
        }))
        .filter((u) => u.status !== null)
      if (urteile.length) {
        await dbUpsert(
          'inventory_status',
          urteile.map((u) => ({
            profile,
            item_id: u.id,
            kind: 'grammatik',
            status: u.status,
            label: u.p.name,
            source: 'uebung',
          })),
          'profile,item_id'
        )
      }

      const learnsKorean = profile === 'ko'
      const explain = learnsKorean ? 'English' : 'Korean'
      const zusammenfassung = ergebnisse
        .map(
          (e) =>
            `${e.grammatik_name}: expected "${e.loesung}", answered "${e.antwort}" (${e.richtig ? 'correct' : 'WRONG'})`
        )
        .join('\n')

      const out = await callModel(
        [
          `You are the learner's warm ${learnsKorean ? 'Korean' : 'German'} trainer. They just finished a cloze exercise round. Based on the results, write SHORT feedback in ${explain}:`,
          '2-4 sentences: name what clearly sits, then the ONE pattern most worth practicing (with the correct form and a tiny why), end encouraging. No lists, no lecture.',
          'Reply with ONLY this JSON: {"feedback":"...","summary":"<1 sentence for YOUR OWN memory: what was practiced, which pattern needs work>","errors":["<error pattern>", ...max 2, empty if none]}',
        ].join('\n'),
        [{ role: 'user', content: `Results:\n${zusammenfassung}` }]
      )
      let feedback = ''
      let summary = 'Cloze round completed.'
      let errs: string[] = []
      try {
        const j = JSON.parse(
          out.text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim()
        )
        feedback = typeof j.feedback === 'string' ? j.feedback : out.text
        if (typeof j.summary === 'string') summary = j.summary
        if (Array.isArray(j.errors)) errs = j.errors.map(String).slice(0, 2)
      } catch {
        feedback = out.text
      }

      await dbInsert('trainer_usage', {
        profile,
        action: 'uebung',
        input_tokens: out.inputTokens,
        output_tokens: out.outputTokens,
      })
      await dbInsert('sessions', {
        profile,
        mode: 'lueckentext',
        scenario: null,
        summary,
        errors: errs,
      })
      return json({ feedback })
    }

    /* ---------- Eigener Satz in der Lektion (Produzieren-Schritt) ----------
       Der Lernende baut einen freien Satz mit dem Ziel-Muster;
       die KI beurteilt und gibt eine kurze, freundliche Erklärung. */
    if (action === 'satz') {
      const satz = typeof body.satz === 'string' ? body.satz.trim().slice(0, 200) : ''
      const muster = typeof body.muster === 'string' ? body.muster.slice(0, 80) : ''
      if (!satz || !muster) return json({ error: 'empty' }, 400)
      const learnsKorean = profile === 'ko'
      const explain = learnsKorean ? 'English' : 'Korean'
      const out = await callModel(
        [
          `You judge one sentence written by an A1-A2 ${learnsKorean ? 'Korean' : 'German'} learner practicing the pattern "${muster}".`,
          'Be encouraging and forgiving of minor spelling slips. The sentence passes if it is understandable, grammatical enough for the level, AND actually uses the target pattern.',
          `Reply with ONLY this JSON: {"ok":true|false,"feedback":"<1-2 warm ${explain} sentences: what works / what to fix and why>","korrektur":"<the corrected sentence, or empty string if ok>"}`,
        ].join('\n'),
        [{ role: 'user', content: satz }]
      )
      let urteil = { ok: false, feedback: out.text, korrektur: '' }
      try {
        const j = JSON.parse(out.text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim())
        urteil = {
          ok: !!j.ok,
          feedback: typeof j.feedback === 'string' ? j.feedback : '',
          korrektur: typeof j.korrektur === 'string' ? j.korrektur : '',
        }
      } catch {
        /* Rohtext als Feedback lassen */
      }
      await dbInsert('trainer_usage', {
        profile,
        action: 'satz',
        input_tokens: out.inputTokens,
        output_tokens: out.outputTokens,
      })
      return json(urteil)
    }

    /* ---------- Schreibwerkstatt: freien Text bewerten ----------
       Die wertvollste Übungsform (selbst formulieren) und zugleich
       der beste Verifikations-Kanal: Je Pflicht-Muster gibt es ein
       Urteil, das als Beleg ins Wissensmodell fließt. Dreistufiges
       Feedback statt Rotstift: Muster-Bilanz, die 1-2 wichtigsten
       Fehler, eine Muttersprachler-Version zum Vergleichen. */
    if (action === 'schreiben') {
      const text = typeof body.text === 'string' ? body.text.trim().slice(0, 1200) : ''
      const thema = typeof body.thema === 'string' ? body.thema.slice(0, 120) : ''
      const muster = (Array.isArray(body.muster) ? body.muster : [])
        .slice(0, 3)
        .filter((m) => m && typeof m.id === 'string' && typeof m.muster === 'string')
        .map((m) => ({
          id: m.id.slice(0, 60),
          muster: String(m.muster).slice(0, 80),
          name: String(m.name ?? '').slice(0, 80),
          min: Math.max(1, Math.min(5, Number(m.min) || 1)),
        }))
      if (text.length < 20 || !muster.length) return json({ error: 'empty' }, 400)

      const learnsKorean = profile === 'ko'
      const explain = learnsKorean ? 'English' : 'Korean'
      const out = await callModel(
        [
          `You are the learner's warm ${learnsKorean ? 'Korean' : 'German'} trainer. They wrote a short free text (level A1-A2) about: "${thema}".`,
          'Required grammar patterns for this task:',
          ...muster.map((m) => `- id "${m.id}": ${m.muster} (${m.name}), required at least ${m.min}x`),
          '',
          'Evaluate:',
          '1. For EACH required pattern: how often was it actually used ("verwendet"), and were those uses grammatically correct ("korrekt")? A minor spelling slip does not make a use incorrect. If a pattern was not used at all: verwendet 0, korrekt false, no kommentar.',
          `2. "feedback": 2-4 warm ${explain} sentences — name what genuinely works, then the ONE or TWO most important errors with the correct form and a tiny why. Not every small mistake; the important ones.`,
          `3. "muster_version": rewrite THEIR text (same content, same length) the way a natural native ${learnsKorean ? 'Korean (해요체)' : 'German'} speaker would put it.`,
          `4. "summary": 1 ${explain} sentence for YOUR OWN memory: what was written about, which pattern needs work.`,
          '',
          `Reply with ONLY this JSON: {"muster":[{"id":"...","verwendet":0,"korrekt":true,"kommentar":"<short ${explain} note, empty if fine>"}],"feedback":"...","muster_version":"...","summary":"..."}`,
        ].join('\n'),
        [{ role: 'user', content: text }],
        2000
      )

      let ergebnis: {
        muster: { id: string; verwendet: number; korrekt: boolean; kommentar: string }[]
        feedback: string
        muster_version: string
        summary: string
      } = { muster: [], feedback: out.text, muster_version: '', summary: 'Writing task completed.' }
      try {
        const j = JSON.parse(out.text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim())
        ergebnis = {
          muster: (Array.isArray(j.muster) ? j.muster : [])
            .filter((m: { id?: unknown }) => muster.some((s) => s.id === m.id))
            .map((m: { id: string; verwendet?: unknown; korrekt?: unknown; kommentar?: unknown }) => ({
              id: m.id,
              verwendet: Math.max(0, Number(m.verwendet) || 0),
              korrekt: !!m.korrekt,
              kommentar: typeof m.kommentar === 'string' ? m.kommentar.slice(0, 200) : '',
            })),
          feedback: typeof j.feedback === 'string' ? j.feedback : out.text,
          muster_version: typeof j.muster_version === 'string' ? j.muster_version : '',
          summary: typeof j.summary === 'string' ? j.summary : 'Writing task completed.',
        }
      } catch {
        /* Rohtext als Feedback lassen, keine Belege buchen */
      }

      /* Beleg-Rückfluss: korrekt angewandt -> sicher; versucht,
         aber fehlerhaft -> wackelig; GAR NICHT verwendet -> kein
         Urteil (Vermeidung ist nur ein schwaches Signal, dafür
         wird niemand zurückgestuft). */
      const belege = ergebnis.muster
        .filter((m) => m.verwendet > 0)
        .map((m) => ({
          profile,
          item_id: m.id,
          kind: 'grammatik',
          status: m.korrekt ? 'sicher' : 'wackelig',
          label: muster.find((s) => s.id === m.id)?.muster ?? m.id,
          source: 'uebung',
        }))
      if (belege.length) await dbUpsert('inventory_status', belege, 'profile,item_id')

      await dbInsert('trainer_usage', {
        profile,
        action: 'schreiben',
        input_tokens: out.inputTokens,
        output_tokens: out.outputTokens,
      })
      await dbInsert('sessions', {
        profile,
        mode: 'schreibwerkstatt',
        scenario: thema || null,
        summary: ergebnis.summary,
        errors: [],
      })
      return json({
        muster: ergebnis.muster,
        feedback: ergebnis.feedback,
        muster_version: ergebnis.muster_version,
      })
    }

    /* ---------- Grammatik-Studio (Konzept: Chat 31.08.) ----------
       Drei Etappen statt eines Riesen-Aufrufs (Zeitlimits + echter
       Fortschritt in der App):
       1. studio_erklaerung  — die Mini-Lektion (wann / wie bauen /
          3 Beispiele)
       2. studio_aufgaben    — 8 lehrbuchartige Drills + 3 Reserve
          (die App prüft jede Antwort sofort lokal)
       3. studio_bilanz      — KI-Gesamturteil über alle Antworten
          + Einstufung ins Wissensmodell + Journal-Eintrag */
    if (String(action).startsWith('studio_')) {
      const punkt = body.punkt ?? {}
      const pMuster = typeof punkt.muster === 'string' ? punkt.muster.slice(0, 80) : ''
      const pName = typeof punkt.name === 'string' ? punkt.name.slice(0, 80) : ''
      const pId = typeof punkt.id === 'string' ? punkt.id.slice(0, 60) : ''
      if (!pMuster || !pId) return json({ error: 'empty' }, 400)
      const learnsKorean = profile === 'ko'
      const ziel = learnsKorean ? 'Korean' : 'German'
      const explain = learnsKorean ? 'English' : 'Korean'
      const hatZielschrift = (s: string) =>
        learnsKorean ? /[가-힣]/.test(s) : !/[가-힣]/.test(s)

      if (action === 'studio_erklaerung') {
        const beispiel = typeof punkt.beispiel === 'string' ? punkt.beispiel.slice(0, 160) : ''
        const out = await callModel(
          [
            `You write a MINI grammar lesson for an ambitious A1-A2 ${ziel} learner in a private app. Target pattern: "${pMuster}" (${pName}).${beispiel ? ` Canon example: ${beispiel}` : ''}`,
            'Reply with ONLY this JSON:',
            `{"wann":"<1-2 friendly ${explain} sentences: WHEN this pattern is used, what it expresses>",`,
            ` "bau":"<how to BUILD it, short and concrete, incl. the important stem/sound rules, in ${explain}>",`,
            ` "beispiele":[{"satz":"...","tr":"..."},{"satz":"...","tr":"..."},{"satz":"...","tr":"..."}]}`,
            `Rules: examples use very common everyday words${learnsKorean ? ', 해요체 politeness' : ''}, natural, from short to slightly longer. "tr" is the ${explain} translation.`,
          ].join('\n'),
          [{ role: 'user', content: 'Write the mini lesson now.' }],
          1400
        )
        let l: { wann?: unknown; bau?: unknown; beispiele?: unknown } = {}
        try {
          l = JSON.parse(out.text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim())
        } catch {
          return json({ error: 'parse' }, 502)
        }
        const beispiele = (Array.isArray(l.beispiele) ? l.beispiele : [])
          .filter((b: { satz?: unknown; tr?: unknown }) =>
            typeof b.satz === 'string' && typeof b.tr === 'string' && hatZielschrift(b.satz))
          .slice(0, 3)
        if (
          typeof l.wann !== 'string' || l.wann.length < 15 ||
          typeof l.bau !== 'string' || l.bau.length < 10 ||
          beispiele.length < 2
        )
          return json({ error: 'invalid' }, 502)
        await dbInsert('trainer_usage', {
          profile,
          action: 'studio_erklaerung',
          input_tokens: out.inputTokens,
          output_tokens: out.outputTokens,
        })
        return json({ wann: l.wann.slice(0, 400), bau: l.bau.slice(0, 500), beispiele })
      }

      if (action === 'studio_aufgaben') {
        const bau = typeof body.bau === 'string' ? body.bau.slice(0, 500) : ''
        const out = await callModel(
          [
            `You create textbook-style DRILLS for the ${ziel} pattern "${pMuster}" (${pName}) for an A1-A2 learner.${bau ? ` The learner just read this build rule: ${bau}` : ''}`,
            'Create 11 short tasks in ONE uniform format — deliberately repetitive (that is the point of drilling). Vary only the content words.',
            `Each task: "frage" = a short ${explain} instruction the learner answers by TYPING one short ${ziel} form or sentence${learnsKorean ? ' (해요체)' : ''} — e.g. 'Say it in ${ziel}: I met a friend yesterday.' or 'Combine: <A> + <B>'.`,
            '"loesung" = the expected answer. "auch_ok" = acceptable variants (different spacing, optional pronoun dropped, natural synonyms) — be GENEROUS, typed answers vary.',
            'Use only very common everyday vocabulary; every content word in a frage must be guessable at A1-A2.',
            'Reply with ONLY this JSON:',
            '{"aufgaben":[{"frage":"...","loesung":"...","auch_ok":["..."]}, ... 8 items],',
            ' "reserve":[{"frage":"...","loesung":"...","auch_ok":[]}, ... 3 items]}',
          ].join('\n'),
          [{ role: 'user', content: 'Create the drills now.' }],
          3000
        )
        let l: { aufgaben?: unknown; reserve?: unknown } = {}
        try {
          l = JSON.parse(out.text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim())
        } catch {
          return json({ error: 'parse' }, 502)
        }
        const sauber = (roh: unknown) =>
          (Array.isArray(roh) ? roh : [])
            .filter((a: { frage?: unknown; loesung?: unknown }) =>
              typeof a.frage === 'string' && a.frage.length >= 8 && a.frage.length <= 220 &&
              typeof a.loesung === 'string' && a.loesung.trim().length >= 1 &&
              a.loesung.length <= 90 && hatZielschrift(a.loesung))
            .map((a: { frage: string; loesung: string; auch_ok?: unknown }) => ({
              frage: a.frage.trim(),
              loesung: a.loesung.trim(),
              auch_ok: (Array.isArray(a.auch_ok) ? a.auch_ok : []).map(String).slice(0, 5),
            }))
        const aufgaben = sauber(l.aufgaben).slice(0, 8)
        const reserve = sauber(l.reserve).slice(0, 3)
        if (aufgaben.length < 5) return json({ error: 'invalid' }, 502)
        await dbInsert('trainer_usage', {
          profile,
          action: 'studio_aufgaben',
          input_tokens: out.inputTokens,
          output_tokens: out.outputTokens,
        })
        return json({ aufgaben, reserve })
      }

      /* studio_bilanz */
      const antworten = (Array.isArray(body.antworten) ? body.antworten : [])
        .slice(0, 12)
        .filter((a: { loesung?: unknown; antwort?: unknown }) =>
          typeof a.loesung === 'string' && typeof a.antwort === 'string')
      if (!antworten.length) return json({ error: 'empty' }, 400)
      const richtig = antworten.filter((a: { richtig?: unknown }) => !!a.richtig).length
      const bestanden = richtig / antworten.length >= 0.5

      const out = await callModel(
        [
          `You are the learner's warm ${ziel} trainer. They just finished a drill session for the pattern "${pMuster}" (${pName}): ${richtig}/${antworten.length} correct.`,
          `Write SHORT feedback in ${explain} (2-4 sentences): overall verdict; whether the mistakes look SYSTEMATIC (rule not yet understood — say what exactly goes wrong) or just slips; one concrete tip. Encouraging, no lecture.`,
          'Reply with ONLY this JSON: {"feedback":"...","summary":"<1 sentence for your own memory: what was drilled, how it went>"}',
        ].join('\n'),
        [{
          role: 'user',
          content: antworten
            .map((a: { frage?: string; loesung: string; antwort: string; richtig?: boolean }) =>
              `${a.frage ?? ''} -> expected "${a.loesung}", answered "${a.antwort}" (${a.richtig ? 'ok' : 'WRONG'})`)
            .join('\n'),
        }],
        900
      )
      let feedback = out.text
      let summary = `Studio drill for ${pMuster}: ${richtig}/${antworten.length}.`
      try {
        const j = JSON.parse(out.text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim())
        if (typeof j.feedback === 'string') feedback = j.feedback
        if (typeof j.summary === 'string') summary = j.summary
      } catch { /* Rohtext als Feedback lassen */ }

      /* Einstufung: bestanden -> wackelig (frisch Gelerntes ist nie
         "sicher" — sicher machen es erst die Belege der Folgetage).
         Nie ein bestehendes "sicher" überschreiben. Nicht bestanden
         -> kein Eintrag, der Punkt bleibt offen und wird wieder
         vorgeschlagen. */
      if (bestanden) {
        const vorhanden = await dbGet(
          `inventory_status?profile=eq.${profile}&item_id=eq.${encodeURIComponent(pId)}&select=status`
        ).catch(() => [])
        if (!vorhanden.some((z: { status?: string }) => z.status === 'sicher')) {
          await dbUpsert(
            'inventory_status',
            [{ profile, item_id: pId, kind: 'grammatik', status: 'wackelig', label: `${pMuster} (${pName})`, source: 'lektion' }],
            'profile,item_id'
          )
        }
      }
      await dbInsert('trainer_usage', {
        profile,
        action: 'studio_bilanz',
        input_tokens: out.inputTokens,
        output_tokens: out.outputTokens,
      })
      await dbInsert('sessions', {
        profile,
        mode: 'studio',
        scenario: pMuster,
        summary,
        errors: [],
      })
      return json({ feedback, bestanden })
    }

    /* ---------- Grammatik aus einer Erklärung ziehen ---------- */
    if (action === 'extract') {
      const text = typeof body.text === 'string' ? body.text.slice(0, 2000) : ''
      const image = body.image
      const blocks: unknown[] = []
      /* Bild nur in bekannten Formaten und begrenzter Größe —
         die App verkleinert vor dem Hochladen auf JPEG */
      if (
        image &&
        typeof image.data === 'string' &&
        image.data.length < 7_000_000 &&
        ['image/jpeg', 'image/png', 'image/webp'].includes(image.media_type)
      ) {
        blocks.push({
          type: 'image',
          source: { type: 'base64', media_type: image.media_type, data: image.data },
        })
      }
      if (text) blocks.push({ type: 'text', text })
      if (blocks.length === 0) return json({ error: 'empty' }, 400)

      const out = await callModel(extractSystem(profile), [{ role: 'user', content: blocks }], 1500)
      await dbInsert('trainer_usage', {
        profile,
        action: 'extract',
        input_tokens: out.inputTokens,
        output_tokens: out.outputTokens,
      })
      return json(parseExtract(out.text))
    }

    /* Verlauf in das API-Format bringen; Texte hart begrenzen,
       damit niemand die Funktion als Gratis-Proxy missbraucht */
    const history = messages
      .filter((m: { role: string; text: string }) => (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
      .map((m: { role: string; text: string }) => ({
        role: m.role,
        content: m.text.slice(0, 600),
      }))

    if (action === 'chat') {
      const p = await buildProfile(profile)
      const system = chatSystem(profile, mode === 'scenario' ? 'scenario' : 'free', String(scenario ?? ''), p)
      /* Die Anthropic-API verlangt einen Verlauf, der mit einer
         NUTZER-Nachricht beginnt. Beim Gesprächsstart ist er leer
         (der Trainer eröffnet ja), danach beginnt er mit der
         Trainer-Eröffnung — in beiden Fällen schieben wir eine
         unsichtbare Auftakt-Zeile davor. */
      const forModel =
        history.length === 0 || history[0].role !== 'user'
          ? [{ role: 'user', content: '(Please open or continue our conversation.)' }, ...history]
          : history
      const out = await callModel(system, forModel)
      await dbInsert('trainer_usage', {
        profile,
        action: 'chat',
        input_tokens: out.inputTokens,
        output_tokens: out.outputTokens,
      })
      return json(parseEnvelope(out.text))
    }

    if (action === 'summary') {
      const transcript = history
        .map((m) => `${m.role === 'user' ? 'LEARNER' : 'TRAINER'}: ${m.content}`)
        .join('\n')
      const out = await callModel(summarySystem(profile), [
        { role: 'user', content: `Transcript:\n${transcript}` },
      ])
      await dbInsert('trainer_usage', {
        profile,
        action: 'summary',
        input_tokens: out.inputTokens,
        output_tokens: out.outputTokens,
      })
      const parsed = parseEnvelope(out.text) as unknown as {
        message: string
      }
      /* summary hat ein eigenes Format — separat parsen */
      let summary = 'Session completed.'
      let errors: string[] = []
      let feedback = parsed.message
      try {
        const raw = out.text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim()
        const j = JSON.parse(raw)
        if (typeof j.summary === 'string') summary = j.summary
        if (Array.isArray(j.errors)) errors = j.errors.map(String).slice(0, 4)
        if (typeof j.feedback === 'string') feedback = j.feedback
      } catch {
        /* Fallback: Volltext als Feedback */
      }
      await dbInsert('sessions', {
        profile,
        mode: String(mode ?? 'free'),
        scenario: scenario ? String(scenario) : null,
        summary,
        errors,
      })
      return json({ feedback })
    }

    return json({ error: 'bad-action' }, 400)
  } catch (e) {
    console.error(e)
    return json({ error: 'internal', detail: String(e) }, 500)
  }
})
