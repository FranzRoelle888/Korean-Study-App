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
async function callModel(system: string, messages: { role: string; content: unknown }[], maxTokens = 1600) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      /* WICHTIG: Das Modell denkt standardmäßig unsichtbar VOR der
         Antwort, und diese Denk-Tokens zählen gegen max_tokens.
         Ohne die Effort-Bremse frisst das Denken kleine Budgets
         komplett auf -> leere Antworten (Bug beim Übersetzungs-
         Vorschlag, 31.08.). Trainer-Arbeit braucht kein tiefes
         Grübeln — medium reicht und ist schneller. */
      output_config: { effort: 'medium' },
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
    `trainer_usage?profile=eq.${profile}&action=in.(chat,summary,extract,uebung,satz,schreiben,studio_erklaerung,studio_aufgaben,studio_antwort,studio_bilanz,nachfrage,a2frage,a2schreiben,a2hoeren,a2lesen,a2sprechen1,a2sprechen2)&created_at=gt.${oneHourAgo}&select=id`
  )
  return rows.length >= MAX_CALLS_PER_HOUR
}

/* ---------- Vokabelstand der Lernerin (Wunsch Franz 04.09.) ----------
   Zieht eine Zufalls-Stichprobe ihrer GELERNTEN Wörter (words-
   Tabelle, mind. 1x wiederholt) und baut daraus eine weiche
   Prompt-Vorgabe: Übungen und Muster BEVORZUGEN bekannte Wörter,
   erzwingen sie aber nie (Natürlichkeit geht vor). Unter 30
   gelernten Wörtern (z. B. frische Sandbox) bleibt sie leer. */
async function vokabelVorgabe(profile: string): Promise<string> {
  try {
    const rows = await dbGet(`words?profile=eq.${profile}&reps=gte.1&select=ko&limit=400`)
    const woerter = rows
      .map((r: { ko?: unknown }) => String(r.ko ?? '').trim())
      .filter((w: string) => w && w.length <= 40)
    if (woerter.length < 30) return ''
    for (let i = woerter.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[woerter[i], woerter[j]] = [woerter[j], woerter[i]]
    }
    return `Where natural, PREFER words the learner already knows: ${woerter.slice(0, 50).join(', ')}. Natural phrasing and required grammar words always take priority — never force these words in.`
  } catch {
    return ''
  }
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

    /* sb = Franz' Sandbox (Testkopie der de-Seite, eigene Daten) */
    if (profile !== 'ko' && profile !== 'de' && profile !== 'sb') return json({ error: 'bad-profile' }, 400)
    /* extract und uebung haben keinen Verlauf — die Prüfung gilt
       nur für chat und summary */
    if (
      action !== 'extract' &&
      action !== 'uebung' &&
      action !== 'satz' &&
      action !== 'schreiben' &&
      action !== 'a2schreiben' &&
      action !== 'a2hoeren' &&
      action !== 'a2lesen' &&
      action !== 'a2sprechen1' &&
      action !== 'a2sprechen2' &&
      action !== 'uebersetzung' &&
      !String(action).startsWith('studio_') &&
      (!Array.isArray(messages) || messages.length > 60)
    )
      return json({ error: 'bad-messages' }, 400)

    /* Der Übersetzungs-Vorschlag hat einen EIGENEN, großzügigen
       Topf (winzige Aufrufe, ~0,05 Cent): Beim Massen-Eintragen
       von Vokabeln fraß er sonst das 40er-Stundenlimit leer und
       ab Wort 41 blieb der Vorschlag stumm (Bug-Meldung Haein). */
    if (action === 'uebersetzung') {
      const oneHourAgo = new Date(Date.now() - 3600_000).toISOString()
      const rows = await dbGet(
        `trainer_usage?profile=eq.${profile}&action=eq.uebersetzung&created_at=gt.${oneHourAgo}&select=id`
      )
      if (rows.length >= 200) return json({ error: 'rate-limit' }, 429)
    } else if (await overLimit(profile)) {
      return json({ error: 'rate-limit' }, 429)
    }

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
        2600
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
            `You write a MINI grammar lesson for an ambitious A1-A2 ${ziel} learner in a private app. Their base language is ${explain}. Target pattern: "${pMuster}" (${pName}).${beispiel ? ` Canon example: ${beispiel}` : ''}`,
            '',
            `FIRST, silently judge how confusing this pattern is FROM THE ${explain} SPEAKER'S PERSPECTIVE. Patterns that map 1:1 onto ${explain} need only a short explanation. But if the distinction does NOT exist in ${explain} (e.g. two ${ziel} words that both translate to the same ${explain} word, or a grammatical category ${explain} lacks), you MUST invest extra effort: explain the difference through the lens of what the ${explain} speaker already knows, with contrasting examples.`,
            '',
            'Reply with ONLY this JSON:',
            `{"wann":"<friendly ${explain} sentences: WHEN this pattern is used, what it expresses. As long as the concept needs — a hard concept deserves 3-5 sentences>",`,
            ` "bau":"<how to BUILD it, concrete, incl. the important stem/sound rules, in ${explain}>",`,
            ` "abgrenzung":"<ONLY if the pattern is easily confused with a sibling pattern or has no ${explain} equivalent: the contrast, explained via a minimal pair of example sentences showing when to use WHICH. Empty string if genuinely not needed>",`,
            ` "beispiele":[{"satz":"...","tr":"..."},{"satz":"...","tr":"..."},{"satz":"...","tr":"..."}]}`,
            `Rules: examples use very common everyday words${learnsKorean ? ', 해요체 politeness' : ''}, natural, from short to slightly longer. "tr" is the ${explain} translation.`,
          ].join('\n'),
          [{ role: 'user', content: 'Write the mini lesson now.' }],
          2200
        )
        let l: { wann?: unknown; bau?: unknown; beispiele?: unknown } = {}
        try {
          l = JSON.parse(out.text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim())
        } catch {
          return json({ error: 'parse' }, 502)
        }
        const le = l as { wann?: unknown; bau?: unknown; abgrenzung?: unknown; beispiele?: unknown }
        const beispiele = (Array.isArray(le.beispiele) ? le.beispiele : [])
          .filter((b: { satz?: unknown; tr?: unknown }) =>
            typeof b.satz === 'string' && typeof b.tr === 'string' && hatZielschrift(b.satz))
          .slice(0, 3)
        if (
          typeof le.wann !== 'string' || le.wann.length < 15 ||
          typeof le.bau !== 'string' || le.bau.length < 10 ||
          beispiele.length < 2
        )
          return json({ error: 'invalid' }, 502)
        await dbInsert('trainer_usage', {
          profile,
          action: 'studio_erklaerung',
          input_tokens: out.inputTokens,
          output_tokens: out.outputTokens,
        })
        return json({
          wann: le.wann.slice(0, 900),
          bau: le.bau.slice(0, 700),
          abgrenzung: typeof le.abgrenzung === 'string' ? le.abgrenzung.slice(0, 900) : '',
          beispiele,
        })
      }

      if (action === 'studio_aufgaben') {
        const bau = typeof body.bau === 'string' ? body.bau.slice(0, 700) : ''
        /* OFFENE Aufgaben (Entscheidung Franz 31.08.): keine
           hartkodierte Lösung mehr — jede Antwort wird einzeln von
           der KI bewertet (studio_antwort). "muster" ist nur EIN
           Beispiel, wie man antworten könnte. */
        const out = await callModel(
          [
            `You create textbook-style DRILLS for the ${ziel} pattern "${pMuster}" (${pName}) for an A1-A2 learner.${bau ? ` The learner just read this build rule: ${bau}` : ''}`,
            'Create 11 short tasks in ONE uniform format — deliberately repetitive (that is the point of drilling). Vary only the content words.',
            `Each task: "frage" = a short ${explain} instruction or question the learner answers by TYPING one short ${ziel} sentence${learnsKorean ? ' (해요체)' : ''} that USES the target pattern. The task must be OPEN: many different correct answers exist (answer a question about themselves, form a sentence from given words, react to a small situation). NOT a pure translation with exactly one solution.`,
            '"muster" = ONE natural example of a correct answer (shown to the learner only after grading).',
            'Use only very common everyday vocabulary; every content word in a frage must be guessable at A1-A2.',
            'Reply with ONLY this JSON:',
            '{"aufgaben":[{"frage":"...","muster":"..."}, ... 8 items],',
            ' "reserve":[{"frage":"...","muster":"..."}, ... 3 items]}',
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
            .filter((a: { frage?: unknown; muster?: unknown }) =>
              typeof a.frage === 'string' && a.frage.length >= 8 && a.frage.length <= 260 &&
              typeof a.muster === 'string' && a.muster.trim().length >= 1 &&
              a.muster.length <= 120 && hatZielschrift(a.muster))
            .map((a: { frage: string; muster: string }) => ({
              frage: a.frage.trim(),
              muster: a.muster.trim(),
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

      /* Eine einzelne Drill-Antwort bewerten — läuft im HINTERGRUND,
         sobald der Lernende ✓ tippt (Idee Franz: Wartezeit
         verschwindet, weil die nächste Aufgabe schon dran ist).
         Ampel statt richtig/falsch:
           gruen = grammatisch korrekt UND passt zur Aufgabe —
                   welche Wörter, ist egal
           gelb  = Ziel-Muster im Kern richtig angewandt, aber
                   falsche Vokabel / Tippfehler / Kleinkram
           rot   = Muster falsch verstanden oder schwere
                   Grammatik-/Satzbaufehler */
      if (action === 'studio_antwort') {
        const frage = typeof body.frage === 'string' ? body.frage.slice(0, 300) : ''
        const antwort = typeof body.antwort === 'string' ? body.antwort.trim().slice(0, 200) : ''
        if (!frage || !antwort) return json({ error: 'empty' }, 400)
        const out = await callModel(
          [
            `You grade ONE answer from an A1-A2 ${ziel} learner drilling the pattern "${pMuster}" (${pName}).`,
            'Traffic-light verdict:',
            '- "gruen": grammatically correct AND fits the task. There is NO single expected answer — any fitting sentence counts. Ignore which content words they chose.',
            `- "gelb": the TARGET PATTERN is applied correctly at its core, but there is a wrong/odd vocabulary choice, a typo, or a small unrelated slip.`,
            '- "rot": the target pattern is misunderstood/misapplied, or the sentence has severe grammar/word-order errors.',
            `"kommentar": for gelb/rot ONE short ${explain} sentence naming the issue; empty string for gruen.`,
            'Reply with ONLY this JSON: {"ampel":"gruen","kommentar":""}',
          ].join('\n'),
          [{ role: 'user', content: `Task: ${frage}\nLearner's answer: ${antwort}` }],
          1200
        )
        let ampel = 'rot'
        let kommentar = ''
        try {
          const j = JSON.parse(out.text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim())
          if (j.ampel === 'gruen' || j.ampel === 'gelb' || j.ampel === 'rot') ampel = j.ampel
          if (typeof j.kommentar === 'string') kommentar = j.kommentar.slice(0, 200)
        } catch { /* bei Parse-Fehler lieber rot als geraten grün */ }
        await dbInsert('trainer_usage', {
          profile,
          action: 'studio_antwort',
          input_tokens: out.inputTokens,
          output_tokens: out.outputTokens,
        })
        return json({ ampel, kommentar })
      }

      /* studio_bilanz — Ampel-Wertung (Entscheidung Franz): Grün
         UND Gelb zählen als "Konzept angewandt" (Vokabelfehler sind
         kein Grammatik-Urteil); nur Rot zählt dagegen. */
      const antworten = (Array.isArray(body.antworten) ? body.antworten : [])
        .slice(0, 12)
        .filter((a: { frage?: unknown; antwort?: unknown }) =>
          typeof a.frage === 'string' && typeof a.antwort === 'string')
      if (!antworten.length) return json({ error: 'empty' }, 400)
      const gekonnt = antworten.filter(
        (a: { ampel?: unknown }) => a.ampel === 'gruen' || a.ampel === 'gelb'
      ).length
      const bestanden = gekonnt / antworten.length >= 0.5

      const out = await callModel(
        [
          `You are the learner's warm ${ziel} trainer. They just finished a drill session for the pattern "${pMuster}" (${pName}): ${gekonnt}/${antworten.length} answers applied the pattern correctly (green = fully correct, yellow = pattern right but vocabulary/typo slip, red = pattern misapplied).`,
          `Write SHORT feedback in ${explain} (2-4 sentences): overall verdict; whether the red answers look SYSTEMATIC (rule not yet understood — say what exactly goes wrong) or just slips; one concrete tip. Encouraging, no lecture.`,
          'Reply with ONLY this JSON: {"feedback":"...","summary":"<1 sentence for your own memory: what was drilled, how it went>"}',
        ].join('\n'),
        [{
          role: 'user',
          content: antworten
            .map((a: { frage: string; antwort: string; ampel?: string }) =>
              `${a.frage} -> "${a.antwort}" (${a.ampel ?? '?'})`)
            .join('\n'),
        }],
        1500
      )
      let feedback = out.text
      let summary = `Studio drill for ${pMuster}: ${gekonnt}/${antworten.length}.`
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

    /* ---------- Übersetzungs-Vorschlag beim Vokabel-Eintragen ----------
       (Wunsch 해인, 31.08.) Die App schickt das getippte Wort der
       Zielsprache; zurück kommt EIN knapper Bedeutungs-Vorschlag im
       Format des jeweiligen Stapels. Übernehmen bleibt freiwillig. */
    if (action === 'uebersetzung') {
      const wort = typeof body.wort === 'string' ? body.wort.trim().slice(0, 60) : ''
      if (!wort) return json({ error: 'empty' }, 400)
      const learnsKorean = profile === 'ko'
      const out = await callModel(
        learnsKorean
          ? [
              'You suggest the dictionary meaning for ONE Korean word a learner is adding to their vocabulary app.',
              'Reply with ONLY this JSON: {"vorschlag":"<concise English meaning, like a dictionary gloss: \'to meet\', \'weather\', \'spicy\'. If the word has 2 common meanings, separate with \', \'>"}',
              'If the input is not a real Korean word (typo, gibberish), reply {"vorschlag":""}.',
            ].join('\n')
          : [
              'You suggest the meaning for ONE German word a Korean learner is adding to her vocabulary app.',
              'Her card format is: English meaning followed by Korean in parentheses — e.g. "to meet (만나다)", "the weather (날씨)".',
              'ALSO check the German entry itself. Put a corrected dictionary form into "korrektur" when the entry is: an obvious MISSPELLING of a standard German word (e.g. "Toillette" -> "die Toilette"), a PLURAL of a countable noun (e.g. "die Lebensmittel" -> "das Lebensmittel"), a noun MISSING its article ("Tisch" -> "der Tisch"), or a noun with the WRONG article. For nouns: korrektur = article + singular; for verbs/adjectives: the corrected form alone. Be conservative: slang, colloquialisms, names and anything plausibly intentional are NOT errors. For plural-only nouns (die Leute, die Eltern, die Ferien) and correct entries: korrektur = "".',
              'Reply with ONLY this JSON: {"vorschlag":"<English (한국어)> in exactly that format","korrektur":""}',
              'If the input is not a real German word (typo, gibberish), reply {"vorschlag":"","korrektur":""}.',
            ].join('\n'),
        [{ role: 'user', content: wort }],
        1200
      )
      let vorschlag = ''
      let korrektur = ''
      try {
        const j = JSON.parse(out.text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim())
        if (typeof j.vorschlag === 'string') vorschlag = j.vorschlag.slice(0, 120)
        /* Korrektur nur, wenn sie wie ein Wörterbuch-Eintrag
           aussieht (Artikel+Nomen ODER einzelnes Wort, z. B. ein
           korrigiertes Verb) und sich vom Getippten unterscheidet */
        if (
          typeof j.korrektur === 'string' &&
          /^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß-]*( [A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß-]*){0,2}$/.test(
            j.korrektur.trim()
          ) &&
          j.korrektur.trim() !== wort
        )
          korrektur = j.korrektur.trim().slice(0, 60)
      } catch {
        /* Notnagel: Antwort kam als blanker Text statt JSON —
           kurze Phrasen trotzdem als Vorschlag durchreichen */
        const roh = out.text.trim()
        if (roh && roh.length <= 120 && !roh.includes('{')) vorschlag = roh.replace(/^"|"$/g, '')
      }
      await dbInsert('trainer_usage', {
        profile,
        action: 'uebersetzung',
        input_tokens: out.inputTokens,
        output_tokens: out.outputTokens,
      })
      return json({ vorschlag, korrektur })
    }

    /* ---------- A2-Schreib-Training: Bewertung nach Goethe-Raster ----------
       Bewertet SMS (Teil 1) bzw. halb offizielle E-Mail (Teil 2)
       EXAKT wie die Prüferblätter: je Leitpunkt voll/teilweise/
       fehlt, Register (Anrede/Gruß/du-Sie), daraus Aufgaben-
       erfüllung A-E und Sprache A-E (5/3,5/2/0,5/0 Punkte).
       Die Wortzahl-Nullregel prüft die APP vorher deterministisch.
       Geeicht mit den Original-Leistungsbeispielen aus dem
       Übungssatz (echte, BESTANDENE Lernertexte mit Fehlern). */
    /* Musterlösungs-Grundsatz (Franz 04.09., gilt app-weit):
       Vorbilder müssen für eine A2-Lernerin ERREICHBAR sein.
       Ein perfekter, wortgewandter Text, den sie nicht versteht,
       lehrt nichts — einfach, aber gut und passend. */
    const MUSTER_EINFACH =
      'IMPORTANT for every model text/answer you produce: keep it SIMPLE and reachable for an A2 learner — only A1/A2 grammar (present tense, simple perfect, main clauses, at most weil/dass), common everyday words, short sentences. Plain but natural and task-appropriate — NOT eloquent, NOT native-polished. A model she cannot understand teaches nothing.'

    if (action === 'a2schreiben') {
      const text = typeof body.text === 'string' ? body.text.trim().slice(0, 900) : ''
      const teil = body.teil === 2 ? 2 : 1
      const situation = typeof body.situation === 'string' ? body.situation.slice(0, 400) : ''
      const leitpunkte = (Array.isArray(body.leitpunkte) ? body.leitpunkte : [])
        .slice(0, 3)
        .map((l: unknown) => String(l).slice(0, 160))
      if (!text || leitpunkte.length !== 3) return json({ error: 'empty' }, 400)

      const register = teil === 1 ? 'informal (du), SMS to a friend' : 'semi-formal (Sie), e-mail'
      const vokabeln = await vokabelVorgabe(profile)
      const out = await callModel(
        [
          `You are a certified Goethe-Zertifikat A2 examiner grading SCHREIBEN Teil ${teil} (${register}). Grade EXACTLY like the official criteria — and remember: at A2, examiners are LENIENT about grammar. Real passing examples from the official Übungssatz contain errors like "dass ich kann nicht am Freitag anreisen", "Ich will dir am Samstagabend einladen", "ein neuen Preisangebot" — such texts still score well when content and register are right.`,
          '',
          `Task: ${situation}`,
          'Required content points:',
          ...leitpunkte.map((l, i) => `${i + 1}. ${l}`),
          '',
          'Evaluate:',
          '1. Each content point: "voll" (clearly addressed), "teil" (only touched), "fehlt" (missing). Short Korean comment for teil/fehlt.',
          `2. Register: greeting + closing + consistent ${teil === 1 ? 'du' : 'Sie'}? ok true/false + short Korean comment if not.`,
          '3. "aufgabenerfuellung" A-E per official table: A = all 3 points fully addressed AND register fits · B = 2 full or 1 full + 2 partial · C = 1 full + 1 partial, or all partial · D = only 1 point addressed at all, or register clearly wrong · E = topic missed.',
          '4. "sprache" A-E: A = occasional slips, never blocking understanding · B = several slips, understanding intact · C = errors partly block understanding · D = errors severely block understanding · E = incomprehensible. Judge at A2 level — leniently!',
          `5. "feedback": 2-4 KOREAN sentences: what was good, what to fix first (with the correct German form). Warm, concrete.`,
          `6. "muster": a model answer in German (${teil === 1 ? '20-30' : '30-40'} words, correct greeting/closing) covering all 3 points. ${MUSTER_EINFACH}`,
          ...(vokabeln ? [`For the "muster" only: ${vokabeln}`] : []),
          '',
          'Reply with ONLY this JSON:',
          '{"leitpunkte":[{"status":"voll","kommentar":""},{"status":"teil","kommentar":"..."},{"status":"fehlt","kommentar":"..."}],',
          ' "register":{"ok":true,"kommentar":""},',
          ' "aufgabenerfuellung":"B","sprache":"B","feedback":"...","muster":"..."}',
        ].join('\n'),
        [{ role: 'user', content: text }],
        2200
      )

      const NOTEN: Record<string, number> = { A: 5, B: 3.5, C: 2, D: 0.5, E: 0 }
      let ergebnis: Record<string, unknown> = {}
      try {
        const j = JSON.parse(out.text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim())
        const ae = typeof j.aufgabenerfuellung === 'string' && j.aufgabenerfuellung in NOTEN ? j.aufgabenerfuellung : 'C'
        const sp = typeof j.sprache === 'string' && j.sprache in NOTEN ? j.sprache : 'C'
        /* Original-Regel: Aufgabenerfüllung E -> ganze Aufgabe 0 */
        const punkte = ae === 'E' ? 0 : NOTEN[ae] + NOTEN[sp]
        ergebnis = {
          leitpunkte: (Array.isArray(j.leitpunkte) ? j.leitpunkte : []).slice(0, 3).map(
            (l: { status?: unknown; kommentar?: unknown }) => ({
              status: l.status === 'voll' || l.status === 'teil' || l.status === 'fehlt' ? l.status : 'teil',
              kommentar: typeof l.kommentar === 'string' ? l.kommentar.slice(0, 200) : '',
            })
          ),
          register: {
            ok: !!j.register?.ok,
            kommentar: typeof j.register?.kommentar === 'string' ? j.register.kommentar.slice(0, 200) : '',
          },
          aufgabenerfuellung: ae,
          sprache: sp,
          punkte,
          max: 10,
          feedback: typeof j.feedback === 'string' ? j.feedback : '',
          muster: typeof j.muster === 'string' ? j.muster : '',
        }
      } catch {
        return json({ error: 'parse' }, 502)
      }

      await dbInsert('trainer_usage', {
        profile,
        action: 'a2schreiben',
        input_tokens: out.inputTokens,
        output_tokens: out.outputTokens,
      })
      return json(ergebnis)
    }

    /* ---------- A2-Hörverstehen: Übung erzeugen ----------
       Erzeugt EIN prüfungsechtes Hör-Paket je Teil-Format des
       Goethe-Zertifikats A2. Nur Skripte + Fragen als Text —
       vertont wird clientseitig über den TTS-Cache (Dialoge als
       abwechselnde Stimmen-Clips). Wortschatz strikt A2. */
    if (action === 'a2hoeren') {
      const teil = [1, 2, 3, 4].includes(body.teil) ? body.teil : 1
      const spezifikation =
        /* Stil-Vorgaben verschärft nach Analyse BEIDER offizieller
           Prüfungssätze (docs/GOETHE-A2-REFERENZ.md, 03.09.) */
        teil === 1
          ? [
              'TEIL 1: five short monologue texts, 40-70 words each, ONE speaker. Use this genre palette (one each, order shuffled): event/parking announcement · private voicemail reminding of 2-3 things · business voicemail changing an appointment (place+time) · weather report with a REGION contrast (north/south) or day contrast · radio game/traffic notice.',
              'CRUCIAL exam trap: each text mentions SEVERAL numbers/places/times; only one fits the question. All three answer options quote words that literally occur in the audio.',
              'Reply: {"teil":1,"texte":[{"stil":"durchsage|anrufbeantworter|radio","skript":"...","frage":"...","optionen":["...","...","..."],"loesung":0}] } — exactly 5 items, frage+optionen in German, loesung = index 0-2.',
            ]
          : teil === 2
            ? [
                'TEIL 2: ONE longer dialog: a couple/two friends PLAN or retell their week (10-14 turns, speakers A and B, casual spoken German with markers like "Sag mal", "Klar", "Mhh"). Each day ends with exactly ONE agreed activity.',
                'CRUCIAL exam trap: on 2-3 days an activity is PROPOSED but REJECTED ("Schwimmen? Das mache ich nicht gerne — lieber Rad fahren") — the rejected activities must appear among the options as distractors.',
                'Reply: {"teil":2,"dialog":[{"s":"A","text":"..."}],"tage":["Samstag","Sonntag","Montag","Dienstag","Mittwoch"],"optionen":["ins Kino gehen","..."],"loesungen":[0,3,1,5,2]} — 8 short activity options (3 distractors = the rejected ones), loesungen = option index per day, all different.',
              ]
            : teil === 3
              ? [
                  'TEIL 3: five short everyday dialogs (2-4 turns each, speakers A and B): buying something (size/colour not available -> alternative), club/course registration (what is still missing?), repairs (what is STILL broken?), appointment arrangements, choosing food/transport.',
                  'CRUCIAL exam trap: two options are explicitly mentioned in the dialog and rejected/changed; the remaining one is correct — or the first offer wins and the alternatives are rejected.',
                  'Reply: {"teil":3,"gespraeche":[{"dialog":[{"s":"A","text":"..."}],"frage":"...","optionen":["...","...","..."],"loesung":0}] } — exactly 5, optionen are SHORT noun phrases (2-4 words).',
                ]
              : [
                  'TEIL 4: ONE radio interview (moderator M, guest G, 10-14 turns; guest has an interesting everyday story: unusual job, sport, move to Germany). CHRONOLOGICAL build-up: origin/beginning -> development -> today -> future plans. Guest answers 20-40 words with ONE fact per turn.',
                  'The 5 statements must PARAPHRASE the audio (never quote verbatim); false statements twist exactly one detail (a number, person, or time).',
                  'Reply: {"teil":4,"dialog":[{"s":"M","text":"..."}],"aussagen":[{"text":"...","wahr":true}] } — exactly 5 statements, mixed true/false, in German.',
                ]

      const vokabeln = await vokabelVorgabe(profile)
      const out = await callModel(
        [
          'You create a listening exercise for the Goethe-Zertifikat A2 exam (German, level A2). Natural spoken German, 해요체-equivalent politeness (normal Sie/du), ONLY common A2 vocabulary, numbers/times/prices welcome.',
          ...(vokabeln ? [vokabeln] : []),
          ...spezifikation,
          'No markdown, ONLY the JSON object.',
        ].join('\n'),
        [{ role: 'user', content: 'Create the exercise now. Vary topics from typical exam ones (travel, shopping, appointments, weather, work, free time).' }],
        3500
      )

      let daten: Record<string, unknown>
      try {
        daten = JSON.parse(out.text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim())
      } catch {
        return json({ error: 'parse' }, 502)
      }
      /* Struktur-Validierung: verwerfen statt reparieren */
      const istText = (x: unknown, max = 400) => typeof x === 'string' && x.trim().length > 0 && x.length <= max
      const optOk = (o: unknown, n: number) => Array.isArray(o) && o.length === n && o.every((x) => istText(x, 120))
      let gueltig = false
      if (teil === 1 && Array.isArray(daten.texte) && daten.texte.length === 5) {
        gueltig = daten.texte.every(
          (x: { skript?: unknown; frage?: unknown; optionen?: unknown; loesung?: unknown }) =>
            istText(x.skript) && istText(x.frage, 160) && optOk(x.optionen, 3) &&
            typeof x.loesung === 'number' && x.loesung >= 0 && x.loesung <= 2
        )
      } else if (teil === 2) {
        gueltig =
          Array.isArray(daten.dialog) && daten.dialog.length >= 8 &&
          daten.dialog.every((d: { s?: unknown; text?: unknown }) => (d.s === 'A' || d.s === 'B') && istText(d.text, 250)) &&
          optOk(daten.tage, 5) && Array.isArray(daten.optionen) && daten.optionen.length >= 6 &&
          Array.isArray(daten.loesungen) && daten.loesungen.length === 5 &&
          daten.loesungen.every((l: unknown) => typeof l === 'number' && l >= 0 && l < (daten.optionen as unknown[]).length) &&
          new Set(daten.loesungen as number[]).size === 5
      } else if (teil === 3 && Array.isArray(daten.gespraeche) && daten.gespraeche.length === 5) {
        gueltig = daten.gespraeche.every(
          (g: { dialog?: unknown; frage?: unknown; optionen?: unknown; loesung?: unknown }) =>
            Array.isArray(g.dialog) && g.dialog.length >= 2 &&
            (g.dialog as { s?: unknown; text?: unknown }[]).every((d) => (d.s === 'A' || d.s === 'B') && istText(d.text, 250)) &&
            istText(g.frage, 160) && optOk(g.optionen, 3) &&
            typeof g.loesung === 'number' && g.loesung >= 0 && g.loesung <= 2
        )
      } else if (teil === 4) {
        gueltig =
          Array.isArray(daten.dialog) && daten.dialog.length >= 8 &&
          daten.dialog.every((d: { s?: unknown; text?: unknown }) => (d.s === 'M' || d.s === 'G') && istText(d.text, 300)) &&
          Array.isArray(daten.aussagen) && daten.aussagen.length === 5 &&
          daten.aussagen.every((a: { text?: unknown; wahr?: unknown }) => istText(a.text, 200) && typeof a.wahr === 'boolean')
      }
      if (!gueltig) return json({ error: 'invalid' }, 502)

      await dbInsert('trainer_usage', {
        profile,
        action: 'a2hoeren',
        input_tokens: out.inputTokens,
        output_tokens: out.outputTokens,
      })
      return json({ teil, daten })
    }

    /* ---------- A2-Leseverstehen: Übung erzeugen ----------
       Erzeugt EIN prüfungsechtes Lese-Paket je Teil-Format,
       Stil-DNA aus dem Modellsatz (docs/GOETHE-A2-REFERENZ.md,
       04.09.). Jede Frage bekommt ein "warum" (Koreanisch) —
       der Lernmotor in der Auflösung. */
    if (action === 'a2lesen') {
      const teil = [1, 2, 3, 4].includes(body.teil) ? body.teil : 1
      const spezifikation =
        teil === 1
          ? [
              'TEIL 1: ONE newspaper portrait/report (150-200 words, e.g. a person with an interesting job/hobby: chronological career + one quote). Then 5 multiple-choice questions following the text order; the LAST question asks globally ("Dieser Text informiert über …").',
              'CRUCIAL exam style: options PARAPHRASE the text (never quote whole sentences); wrong options twist exactly one detail or combine text words wrongly.',
              'Reply: {"teil":1,"titel":"...","text":"...","fragen":[{"frage":"...","optionen":["...","...","..."],"loesung":0,"warum":"<short Korean explanation>"}]} — exactly 5 fragen.',
            ]
          : teil === 2
            ? [
                'TEIL 2: ONE information board with 6-7 rows (department store floors OR an event/course program with rooms), each row: a location label and a comma-separated list of 8-14 items/offers. Then 5 situation questions ("Sie möchten … Wohin gehen Sie?") with 3 options: two location labels + one "anderer Stock"/"anderer Raum" option.',
                'CRUCIAL exam trap: situations require RE-THINKING categories (roses -> flower shop -> ground floor; running trousers -> sports clothing -> electronics floor if listed there). In 1-2 of the 5 questions the "anderer …" option is correct.',
                'Reply: {"teil":2,"titel":"Kaufhaus …","zeilen":[{"ort":"4. Stock","inhalt":"Bücher, Geschenke, …"}],"fragen":[{"situation":"...","optionen":["1. Stock","4. Stock","anderer Stock"],"loesung":0,"warum":"<short Korean explanation>"}]} — exactly 5 fragen.',
              ]
            : teil === 3
              ? [
                  'TEIL 3: ONE private e-mail (~180-220 words, personal narrative tone, 4-5 topic blocks: settling in, flat/colleagues, language, plans, an invitation). Then 5 multiple-choice questions in text order.',
                  'CRUCIAL exam style: questions strongly PARAPHRASE; wrong options twist persons or details ("kocht jeder einmal" vs "kochen alle zusammen").',
                  'Reply: {"teil":3,"von":"<first name>","text":"Liebe/r …","fragen":[{"frage":"...","optionen":["...","...","..."],"loesung":0,"warum":"<short Korean explanation>"}]} — exactly 5 fragen.',
                ]
              : [
                  'TEIL 4: 5 person situations (name + 1-2 sentences with 1-2 HARD conditions: place, occasion, number of people, budget) and 6 compact web ads (id a-f: shop/restaurant/service with concrete details). Each situation matches exactly ONE ad — except ONE situation that matches NO ad (loesung "x").',
                  'CRUCIAL exam trap: surface word matches must mislead ("Wein zu Hause anbieten" must NOT match a Weinhaus RESTAURANT — the delivery service is right). One ad stays unused.',
                  'Reply: {"teil":4,"situationen":[{"name":"Sarah","text":"..."}],"anzeigen":[{"id":"a","titel":"www.…","text":"..."}],"loesungen":["c","x","a","f","b"],"warum":["<short Korean explanation per situation>"]} — exactly 5 situationen, 6 anzeigen, loesungen aligned with situationen.',
                ]

      const vokabeln = await vokabelVorgabe(profile)
      const out = await callModel(
        [
          'You create a READING exercise for the Goethe-Zertifikat A2 exam (German, level A2). ONLY common A2 vocabulary, natural written German, numbers/times/prices welcome.',
          ...(vokabeln ? [vokabeln] : []),
          ...spezifikation,
          'No markdown, ONLY the JSON object.',
        ].join('\n'),
        [{ role: 'user', content: 'Create the exercise now. Vary topics from typical exam ones (jobs, hobbies, moving, shopping, courses, celebrations, travel).' }],
        3500
      )

      let daten: Record<string, unknown>
      try {
        daten = JSON.parse(out.text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim())
      } catch {
        return json({ error: 'parse' }, 502)
      }
      const istText = (x: unknown, max = 400) => typeof x === 'string' && x.trim().length > 0 && x.length <= max
      const optOk = (o: unknown, n: number) => Array.isArray(o) && o.length === n && o.every((x) => istText(x, 120))
      const frageOk = (f: { frage?: unknown; situation?: unknown; optionen?: unknown; loesung?: unknown }) =>
        (istText(f.frage, 200) || istText(f.situation, 300)) && optOk(f.optionen, 3) &&
        typeof f.loesung === 'number' && f.loesung >= 0 && f.loesung <= 2
      let gueltig = false
      if ((teil === 1 || teil === 3) && Array.isArray(daten.fragen) && daten.fragen.length === 5) {
        gueltig = istText(daten.text, 2000) && (daten.fragen as Record<string, unknown>[]).every(frageOk)
      } else if (teil === 2 && Array.isArray(daten.fragen) && daten.fragen.length === 5) {
        gueltig =
          Array.isArray(daten.zeilen) && daten.zeilen.length >= 5 &&
          (daten.zeilen as { ort?: unknown; inhalt?: unknown }[]).every((z) => istText(z.ort, 40) && istText(z.inhalt, 400)) &&
          (daten.fragen as Record<string, unknown>[]).every(frageOk)
      } else if (teil === 4) {
        const ids = ['a', 'b', 'c', 'd', 'e', 'f']
        gueltig =
          Array.isArray(daten.situationen) && daten.situationen.length === 5 &&
          (daten.situationen as { name?: unknown; text?: unknown }[]).every((s) => istText(s.name, 40) && istText(s.text, 300)) &&
          Array.isArray(daten.anzeigen) && daten.anzeigen.length === 6 &&
          (daten.anzeigen as { id?: unknown; titel?: unknown; text?: unknown }[]).every(
            (a) => typeof a.id === 'string' && ids.includes(a.id) && istText(a.titel, 80) && istText(a.text, 400)
          ) &&
          Array.isArray(daten.loesungen) && daten.loesungen.length === 5 &&
          (daten.loesungen as unknown[]).every((l) => l === 'x' || (typeof l === 'string' && ids.includes(l))) &&
          (daten.loesungen as string[]).includes('x')
      }
      if (!gueltig) return json({ error: 'invalid' }, 502)

      await dbInsert('trainer_usage', {
        profile,
        action: 'a2lesen',
        input_tokens: out.inputTokens,
        output_tokens: out.outputTokens,
      })
      return json({ teil, daten })
    }

    /* ---------- A2-Sprechen Teil 1: Fragen-Spiel ----------
       Bewertet eine EINGESPROCHENE Frage (zu einer Stichwortkarte)
       oder Antwort (auf die Partnerfrage). Grundsatz (Franz 04.09.):
       AUSSPRACHE wird NIEMALS bewertet oder kommentiert — bewertet
       wird nur die Sprache im Transkript, dort aber genau (Artikel,
       Endungen, Verbstellung). Das Transkript kommt wortgetreu
       (speech-Function bittet ausdrücklich darum, Fehler NICHT zu
       glätten). */
    if (action === 'a2sprechen1') {
      const modus = body.modus === 'antwort' ? 'antwort' : 'frage'
      const transkript = typeof body.transkript === 'string' ? body.transkript.trim().slice(0, 300) : ''
      const stichwort = typeof body.stichwort === 'string' ? body.stichwort.slice(0, 60) : ''
      const partnerFrage = typeof body.frage === 'string' ? body.frage.slice(0, 160) : ''
      if (!transkript) return json({ error: 'empty' }, 400)

      const out = await callModel(
        modus === 'frage'
          ? [
              `Goethe A2 Sprechen Teil 1: the learner drew the keyword card "${stichwort}" and had to ASK a question about it. You see the verbatim speech-to-text transcript of what she said.`,
              'Judge the QUESTION: does it fit the keyword and work as an A2 question?',
              'Be PRECISE about grammar: a wrong article, a wrong declension ending, wrong verb position or a missing word in the transcript is HER mistake — name even small ones (quote the German bit) in kommentar and show the fixed question in korrektur. Small slips still keep ok=true (exam-style: a comprehensible question scores), but the kommentar must mention them. ok=false only if the question is incomprehensible or does not fit the keyword.',
              'NEVER comment on pronunciation or accent — not a word about it. Ignore punctuation and casing. If the transcript is garbled non-German nonsense, set ok=false and ask in kommentar to try again slowly.',
              'Also: answer her question briefly and naturally (1-2 sentences, simple German, du-form) as her exam partner would.',
              '"fehler": every REAL grammar mistake from the transcript as a short pair {"falsch":"<her words>","richtig":"<fixed>","warum":"<one-clause Korean rule>"} — empty array if flawless.',
              MUSTER_EINFACH,
              'Reply ONLY JSON: {"ok":true,"fragetyp":"w|janein","kommentar":"<1 short Korean sentence; empty ONLY if the German is flawless>","korrektur":"<the corrected or model question, always>","fehler":[],"partnerAntwort":"<your 1-2 sentence answer in German>"}',
            ].join('\n')
          : [
              `Goethe A2 Sprechen Teil 1: the exam partner asked: "${partnerFrage}". The learner ANSWERED; you see the verbatim speech-to-text transcript.`,
              'Judge: does the answer fit the question? A short sentence is enough at A2; single words are "teilweise" (ok=false).',
              'Be PRECISE about grammar: wrong articles, declension endings or verb position in the transcript are HER mistakes — name even small ones (quote the German bit) in kommentar and show the fixed answer in korrektur. Small slips still keep ok=true, but the kommentar must mention them.',
              'NEVER comment on pronunciation or accent. Ignore punctuation and casing. If the transcript is garbled nonsense, set ok=false and ask in kommentar to try again slowly.',
              '"fehler": every REAL grammar mistake from the transcript as a short pair {"falsch":"<her words>","richtig":"<fixed>","warum":"<one-clause Korean rule>"} — empty array if flawless.',
              MUSTER_EINFACH,
              'Reply ONLY JSON: {"ok":true,"kommentar":"<1 short Korean sentence; empty ONLY if the German is flawless>","korrektur":"<the corrected or model answer in German, always>","fehler":[]}',
            ].join('\n'),
        [{ role: 'user', content: transkript }],
        900
      )
      let erg: Record<string, unknown> = { ok: false, kommentar: '', korrektur: '', partnerAntwort: '', fragetyp: null, fehler: [] }
      try {
        const j = JSON.parse(out.text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim())
        erg = {
          ok: !!j.ok,
          fragetyp: j.fragetyp === 'w' || j.fragetyp === 'janein' ? j.fragetyp : null,
          kommentar: typeof j.kommentar === 'string' ? j.kommentar.slice(0, 200) : '',
          korrektur: typeof j.korrektur === 'string' ? j.korrektur.slice(0, 200) : '',
          fehler: (Array.isArray(j.fehler) ? j.fehler : []).slice(0, 3).map(
            (f: { falsch?: unknown; richtig?: unknown; warum?: unknown }) => ({
              falsch: typeof f.falsch === 'string' ? f.falsch.slice(0, 140) : '',
              richtig: typeof f.richtig === 'string' ? f.richtig.slice(0, 140) : '',
              warum: typeof f.warum === 'string' ? f.warum.slice(0, 160) : '',
            })
          ),
          partnerAntwort: typeof j.partnerAntwort === 'string' ? j.partnerAntwort.slice(0, 300) : '',
        }
      } catch {
        return json({ error: 'parse' }, 502)
      }
      await dbInsert('trainer_usage', {
        profile,
        action: 'a2sprechen1',
        input_tokens: out.inputTokens,
        output_tokens: out.outputTokens,
      })
      return json(erg)
    }

    /* ---------- A2-Sprechen Teil 2: Monolog ----------
       Bewertet den eingesprochenen Monolog zu einer Themenkarte
       mit 4 Stichwörtern: Abdeckungs-Checkliste, präzise
       Grammatik-Hinweise (NIE Aussprache), 2 personalisierte
       Prüfer-Zusatzfragen und ein EINFACHES Muster. */
    if (action === 'a2sprechen2') {
      const thema = typeof body.thema === 'string' ? body.thema.slice(0, 120) : ''
      const stichworte = (Array.isArray(body.stichworte) ? body.stichworte : [])
        .slice(0, 4)
        .map((s: unknown) => String(s).slice(0, 60))
      const transkript = typeof body.transkript === 'string' ? body.transkript.trim().slice(0, 1500) : ''
      if (!transkript || !thema || stichworte.length !== 4) return json({ error: 'empty' }, 400)

      const vokabeln = await vokabelVorgabe(profile)
      const out = await callModel(
        [
          `Goethe A2 Sprechen Teil 2: the learner spoke a short monologue about the topic card "${thema}" with the four keywords: ${stichworte.map((s, i) => `${i + 1}. ${s}`).join(' · ')}. You see the verbatim speech-to-text transcript.`,
          'Evaluate:',
          '1. "abgedeckt": for EACH keyword in card order, did she say something about it? true/false.',
          '2. "fehler": grammar, PRECISELY — wrong articles, declension endings, verb position or verb forms in the transcript are HER mistakes. List up to 5 as {"falsch":"<her words>","richtig":"<fixed>","warum":"<ONE short Korean clause naming the rule, e.g. 여성 명사 + mit → 3격: meiner>"}, most instructive first; empty array if flawless. NEVER comment on pronunciation or accent. Ignore punctuation/casing. If the transcript is garbled non-German nonsense, set all abgedeckt to false and ask in kommentar to try again slowly.',
          '3. "kommentar": she invested real effort in this monologue — give SUBSTANTIAL feedback, 3-5 Korean sentences: (a) name concretely what she did WELL, quoting her own German words, (b) the ONE most valuable improvement with a short explanation WHY and a ready-to-use example sentence she could say next time. Warm, specific, never generic.',
          '4. "zusatzfragen": exactly 2 short follow-up questions a friendly examiner would now ask, in simple German, each referring to something SHE ACTUALLY SAID (or gently to a missed keyword).',
          `5. "muster": a first-person model monologue (40-60 words) covering all four keywords. ${MUSTER_EINFACH}`,
          ...(vokabeln ? [`For "zusatzfragen" and "muster": ${vokabeln}`] : []),
          'Reply ONLY JSON: {"abgedeckt":[true,false,true,true],"fehler":[{"falsch":"...","richtig":"...","warum":"..."}],"kommentar":"...","zusatzfragen":["...","..."],"muster":"..."}',
        ].join('\n'),
        [{ role: 'user', content: transkript }],
        2200
      )
      let erg2: Record<string, unknown>
      try {
        const j = JSON.parse(out.text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim())
        erg2 = {
          abgedeckt: (Array.isArray(j.abgedeckt) ? j.abgedeckt : []).slice(0, 4).map((x: unknown) => !!x),
          fehler: (Array.isArray(j.fehler) ? j.fehler : []).slice(0, 5).map(
            (f: { falsch?: unknown; richtig?: unknown; warum?: unknown }) => ({
              falsch: typeof f.falsch === 'string' ? f.falsch.slice(0, 140) : '',
              richtig: typeof f.richtig === 'string' ? f.richtig.slice(0, 140) : '',
              warum: typeof f.warum === 'string' ? f.warum.slice(0, 160) : '',
            })
          ),
          kommentar: typeof j.kommentar === 'string' ? j.kommentar.slice(0, 800) : '',
          zusatzfragen: (Array.isArray(j.zusatzfragen) ? j.zusatzfragen : [])
            .slice(0, 2)
            .map((z: unknown) => String(z).slice(0, 160)),
          muster: typeof j.muster === 'string' ? j.muster.slice(0, 600) : '',
        }
      } catch {
        return json({ error: 'parse' }, 502)
      }
      await dbInsert('trainer_usage', {
        profile,
        action: 'a2sprechen2',
        input_tokens: out.inputTokens,
        output_tokens: out.outputTokens,
      })
      return json(erg2)
    }

    /* ---------- A2-Fragen-Ecke (Wunsch Franz 02.09.) ----------
       Der Prüfungs-Assistent im A2-Reiter: kennt 해인s kompletten
       Lernstand (buildProfile), alle Fakten zum Goethe-Zertifikat
       A2 und die Funktionen der App — und verweist bei Fragen zu
       Aufgabentypen auf die passende Übung. Antwortet auf
       Koreanisch (Sprachregel: Verstehen-müssen-Texte). */
    if (action === 'a2frage') {
      const verlauf = (Array.isArray(messages) ? messages : [])
        .slice(-24)
        .filter((m: { role?: unknown; text?: unknown }) =>
          (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
        .map((m: { role: string; text: string }) => ({
          role: m.role,
          content: String(m.text).slice(0, 600),
        }))
      if (!verlauf.length || verlauf[verlauf.length - 1].role !== 'user')
        return json({ error: 'empty' }, 400)

      const p = await buildProfile(profile)
      const out = await callModel(
        [
          'You are 해인\'s personal exam coach for the Goethe-Zertifikat A2 (German, exam in Seoul in ~8 weeks). Warm, concrete, honest. She is Korean, level ~A2, preparing intensively with this app.',
          '',
          '## Exam facts (authoritative — from the official Übungssatz)',
          '- 100 points total, 25 per module. Pass: 60/100 overall AND written (Lesen+Hören+Schreiben) >= 45/75 AND Sprechen >= 15/25. Below 15 in Sprechen = whole exam failed.',
          '- LESEN 30 min, 4 parts/20 items: newspaper article (MC), info boards ("Wohin gehen Sie?"), personal e-mail (MC), matching 5 people to ads incl. one X (no match). Trap: all options quote words from the text — the MEANING decides.',
          '- HÖREN 30 min, 4 parts/20 items: 5 short announcements/voicemails (heard 2x, MC), one long conversation (heard ONCE, picture matching), 5 short dialogs (heard ONCE, MC with pictures), interview (2x, yes/no).',
          '- SCHREIBEN 30 min: SMS to a friend (20-30 words, du) + semi-formal e-mail (30-40 words, Sie), each with 3 required content points. Under 50% of the word count or off-topic = 0 points for that task. Small A2-level grammar slips are forgiven; missing content points and wrong register are not.',
          '- SPRECHEN ~15 min in pairs: asking/answering with question cards (4 P), monologue from a topic card with 4 keywords (8 P), planning something together (8 P), pronunciation (5 P). Partner is usually another candidate; scoring is individual.',
          '',
          '## App features she can use (this app, A2 tab)',
          '- ACTIVE NOW (A2 tab): Hören — all 4 exam formats with 🐢/⏱ modes + Zahlen-Diktat · Lesen — all 4 formats incl. the Anzeigen-Detektiv (Teil 4, with the "X = no match" trap), 🐢/⏱ with a soft 7-min clock · Schreiben — SMS & e-mail with real Goethe-raster grading (3 levels up to the timed exam pair) · Sprechen — Fragen-Spiel (Teil 1, speaking with an AI partner), Erzählen/monologue (Teil 2, guided or full run with 2 examiner follow-up questions), Aussprache-Shadowing (listen & compare, never machine-graded) · Grundlagen — Artikel-Spiel, Satz-Baukasten (word-order ladder with Korean translations), Redemittel drill · the Stärken-Radar with score prediction, D-day countdown and a daily recommendation at the top of the A2 tab · 🎯 Generalprobe (full Hören or Lesen module in one exam-real run, Lesen with the real 30-min clock) · 📕 Fehler-Heft (실수 노트, Grundlagen): her own corrected mistakes collect automatically, she retypes the correct form to clear them.',
          '- ALSO: daily words (5/day from the official Goethe list) · review stack · "Grammatik mitteilen" and placement check in the Profil tab · after every exercise she can ask follow-up questions right under the feedback.',
          '- NOT in the app (deliberate): Sprechen Teil 3 partner negotiation — best practiced live with a real person.',
          'When her question relates to a task type, point her to the matching exercise — honestly marked as active or coming soon.',
          '',
          '## Her current state',
          `Words in her deck: secure ${p.secure.length}, still fresh ${p.fresh.length}, shaky: ${p.shaky.slice(0, 15).join(', ') || '(none)'}`,
          `Grammar she knows: ${p.skills.slice(0, 40).join('; ') || '(little recorded yet)'}`,
          p.journal.length ? `Recent sessions:\n${p.journal.join('\n')}` : '',
          '',
          '## How to answer',
          '- Answer in KOREAN (her mother tongue — these are understand-first texts), with German example words/sentences where helpful.',
          '- Be concise: 2-6 sentences for simple questions. Use short bullet lists for structured answers. No walls of text.',
          '- Be honest about difficulty and priorities (Sprechen is the knockout hurdle; Schreiben is the cheapest points).',
        ].join('\n'),
        verlauf,
        1600
      )
      await dbInsert('trainer_usage', {
        profile,
        action: 'a2frage',
        input_tokens: out.inputTokens,
        output_tokens: out.outputTokens,
      })
      return json({ text: out.text })
    }

    /* ---------- Nachfrage aufs Feedback (Idee Franz 31.08.) ----------
       Unter jedem Übungs-Feedback kann der Lernende antworten oder
       Folgefragen stellen — unmittelbarer Lerneffekt statt stummem
       Abnicken. Der Trainer kennt den Übungs-Kontext (Aufgaben +
       Antworten + Feedback) und bleibt beim Thema. */
    if (action === 'nachfrage') {
      const kontext = typeof body.kontext === 'string' ? body.kontext.slice(0, 3000) : ''
      const verlauf = (Array.isArray(messages) ? messages : [])
        .slice(-24)
        .filter((m: { role?: unknown; text?: unknown }) =>
          (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
        .map((m: { role: string; text: string }) => ({
          role: m.role,
          content: String(m.text).slice(0, 600),
        }))
      if (!verlauf.length || verlauf[verlauf.length - 1].role !== 'user')
        return json({ error: 'empty' }, 400)
      const learnsKorean = profile === 'ko'
      const explain = learnsKorean ? 'English' : 'Korean'
      const out = await callModel(
        [
          `You are the learner's warm ${learnsKorean ? 'Korean' : 'German'} trainer. They just finished an exercise and are asking follow-up questions about your feedback.`,
          `Exercise context:\n${kontext || '(none provided)'}`,
          `Answer in ${explain}, SHORT and concrete (2-5 sentences), with ${learnsKorean ? 'Korean' : 'German'} example sentences where they help. Stay on the topic of this exercise and its grammar; if asked something unrelated, gently point to the free chat.`,
        ].join('\n'),
        verlauf,
        1400
      )
      await dbInsert('trainer_usage', {
        profile,
        action: 'nachfrage',
        input_tokens: out.inputTokens,
        output_tokens: out.outputTokens,
      })
      return json({ text: out.text })
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

      const out = await callModel(extractSystem(profile), [{ role: 'user', content: blocks }], 2500)
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
