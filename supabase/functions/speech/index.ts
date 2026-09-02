/* ============================================================
   SPEECH — Supabase Edge Function für Stimmen & Spracherkennung

   Zwei Aktionen:
     tts   Text -> natürliche OpenAI-Stimme (MP3). Das Ergebnis
           wird im Storage-Bucket "tts-cache" abgelegt — jeder
           Satz wird genau EINMAL erzeugt und danach für immer
           kostenlos aus dem Cache bedient. Die App prüft den
           Cache selbst (öffentliche URL) und ruft diese Funktion
           nur bei einem Fehltreffer.
     stt   Audio-Aufnahme (Base64) -> Text (Whisper-Nachfolger).
           Grundstein für Sprachnachrichten im Trainer.

   Schutz:
     - Nur eingeloggte Nutzer (eigene Prüfung, wie beim Trainer)
     - Ratenlimit über die Tabelle speech_usage (getrennt vom
       Trainer, damit sich die Limits nicht in die Quere kommen):
       tts max. 300 Neuerzeugungen/Stunde, stt max. 60/Stunde
     - dazu das harte Ausgabenlimit im OpenAI-Konto

   Einrichtung (einmalig, im Supabase-Dashboard):
     1. SQL aus supabase/migrations/008-speech.sql ausführen
        (legt Bucket "tts-cache" und Tabelle speech_usage an)
     2. Edge Functions -> Deploy new function -> Name: speech
        -> diesen Code einfügen -> deployen
     3. Secret OPENAI_API_KEY muss hinterlegt sein
   ============================================================ */

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY') ?? ''
const SB_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const TTS_MODEL = 'gpt-4o-mini-tts'
const STT_MODEL = 'gpt-4o-mini-transcribe'

/* Feste Standard-Stimme je Sprache. Weitere Stimmen sind erlaubt
   (für spätere Minimalpaar-Übungen mit mehreren Sprechern) —
   aber nur aus dieser Liste, damit niemand Unsinn bestellt. */
const DEFAULT_VOICE: Record<string, string> = { ko: 'nova', de: 'echo' }
const ALLOWED_VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer']

/* Muss zur App passen (src/shared/tts.jsx berechnet dieselben
   Pfade). Bei einem Modellwechsel v1 -> v2 hochzählen, dann
   entsteht ein frischer Cache. */
const CACHE_VERSION = 'v1'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/* ---------- Helfer ---------- */
async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const dbHead = {
  apikey: SB_SERVICE,
  Authorization: `Bearer ${SB_SERVICE}`,
}

async function logUsage(profile: string, action: string, amount: number) {
  await fetch(`${SB_URL}/rest/v1/speech_usage`, {
    method: 'POST',
    headers: { ...dbHead, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ profile, action, amount }),
  })
}

async function overLimit(profile: string, action: string, max: number) {
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString()
  const r = await fetch(
    `${SB_URL}/rest/v1/speech_usage?profile=eq.${profile}&action=eq.${action}&created_at=gt.${oneHourAgo}&select=id`,
    { headers: dbHead }
  )
  const rows = await r.json()
  return Array.isArray(rows) && rows.length >= max
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
    if (!OPENAI_KEY) return json({ error: 'no-key' }, 500)

    /* Nur eingeloggte Nutzer — gleiche Prüfung wie beim Trainer */
    const auth = req.headers.get('Authorization') ?? ''
    const userToken = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    const wer = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: { apikey: SB_SERVICE, Authorization: `Bearer ${userToken}` },
    })
    if (!wer.ok) return json({ error: 'auth' }, 401)

    const body = await req.json()
    const { action, profile } = body
    /* sb = Franz' Sandbox (Testkopie der de-Seite) */
    if (profile !== 'ko' && profile !== 'de' && profile !== 'sb') return json({ error: 'bad-profile' }, 400)

    /* ---------- Text -> Stimme ---------- */
    if (action === 'tts') {
      const text = typeof body.text === 'string' ? body.text.trim().slice(0, 300) : ''
      const lang = body.lang === 'de' ? 'de' : 'ko'
      const voice = ALLOWED_VOICES.includes(body.voice) ? body.voice : DEFAULT_VOICE[lang]
      if (!text) return json({ error: 'empty' }, 400)

      const hash = await sha256Hex(text)
      const pfad = `${CACHE_VERSION}/${lang}/${voice}/${hash}.mp3`
      const publicUrl = `${SB_URL}/storage/v1/object/public/tts-cache/${pfad}`

      /* Falls es die Datei doch schon gibt (z. B. zwei Geräte
         gleichzeitig): nichts neu erzeugen */
      const kopf = await fetch(publicUrl, { method: 'HEAD' })
      if (kopf.ok) return json({ url: publicUrl })

      if (await overLimit(profile, 'tts', 300)) return json({ error: 'rate-limit' }, 429)

      const r = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: TTS_MODEL,
          voice,
          input: text,
          response_format: 'mp3',
          /* Für Lernende: deutlich und in natürlichem Tempo */
          instructions:
            lang === 'ko'
              ? 'Speak this Korean text clearly and naturally, at a comfortable pace for a language learner. Standard Seoul pronunciation.'
              : 'Speak this German text clearly and naturally, at a comfortable pace for a language learner. Standard High German pronunciation.',
        }),
      })
      if (!r.ok) throw new Error(`OpenAI TTS ${r.status}: ${(await r.text()).slice(0, 200)}`)
      const mp3 = new Uint8Array(await r.arrayBuffer())

      /* In den Cache legen (upsert: doppelt schadet nicht) */
      const up = await fetch(`${SB_URL}/storage/v1/object/tts-cache/${pfad}`, {
        method: 'POST',
        headers: { ...dbHead, 'Content-Type': 'audio/mpeg', 'x-upsert': 'true' },
        body: mp3,
      })
      if (!up.ok) throw new Error(`Storage ${up.status}: ${(await up.text()).slice(0, 200)}`)

      await logUsage(profile, 'tts', text.length)
      return json({ url: publicUrl })
    }

    /* ---------- Aufnahme -> Text ---------- */
    if (action === 'stt') {
      const audio = body.audio
      if (
        !audio ||
        typeof audio.data !== 'string' ||
        audio.data.length > 3_000_000 ||
        typeof audio.media_type !== 'string'
      )
        return json({ error: 'bad-audio' }, 400)

      if (await overLimit(profile, 'stt', 60)) return json({ error: 'rate-limit' }, 429)

      const bytes = Uint8Array.from(atob(audio.data), (c) => c.charCodeAt(0))
      const endung =
        audio.media_type.includes('mp4') ? 'mp4'
        : audio.media_type.includes('webm') ? 'webm'
        : audio.media_type.includes('wav') ? 'wav'
        : 'mp3'

      const form = new FormData()
      form.append('file', new Blob([bytes], { type: audio.media_type }), `aufnahme.${endung}`)
      form.append('model', STT_MODEL)
      form.append('language', body.lang === 'de' ? 'de' : 'ko')
      /* WICHTIG (Franz 04.09.): wortgetreu transkribieren. Die
         Sprecherin ist Sprachlernerin — das Modell darf ihre
         Grammatikfehler (Artikel, Endungen, Wortstellung) NICHT
         stillschweigend glattbügeln, sonst kann der Trainer sie
         nie korrigieren. */
      form.append(
        'prompt',
        body.lang === 'de'
          ? 'Der Sprecher lernt Deutsch (Niveau A2). Transkribiere wortgetreu, inklusive Grammatikfehlern, falscher Artikel und falscher Endungen. Nichts korrigieren, nichts ergänzen, nichts weglassen.'
          : '화자는 한국어 학습자입니다. 문법 오류를 고치지 말고 들리는 그대로 받아 적으세요.'
      )

      const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_KEY}` },
        body: form,
      })
      if (!r.ok) throw new Error(`OpenAI STT ${r.status}: ${(await r.text()).slice(0, 200)}`)
      const data = await r.json()

      await logUsage(profile, 'stt', Math.round(audio.data.length / 1000))
      return json({ text: typeof data.text === 'string' ? data.text : '' })
    }

    return json({ error: 'bad-action' }, 400)
  } catch (e) {
    console.error(e)
    return json({ error: 'internal', detail: String(e) }, 500)
  }
})
