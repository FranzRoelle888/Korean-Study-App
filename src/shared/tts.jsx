/* ============================================================
   VORLESEN (Text-to-Speech)

   Zwei Stufen:
   1. WUNSCH: natürliche Cloud-Stimme (OpenAI, über die
      speech-Edge-Function). Jeder Satz wird genau einmal erzeugt
      und liegt danach als MP3 im öffentlichen Cache — die App
      prüft die Cache-URL selbst und ruft die Funktion nur bei
      einem Fehltreffer. Wiederholtes Anhören kostet nichts.
   2. NOTNAGEL: die eingebaute Browser-Stimme. Greift, wenn etwas
      schiefgeht (offline, nicht eingeloggt, Funktion nicht
      erreichbar) — eiserne Regel: die App degradiert sanft,
      statt stumm zu bleiben.

   Der Cache-Pfad (Version/Sprache/Stimme/Hash) muss zur
   speech-Funktion passen — bei Änderungen BEIDE Seiten anfassen.
   ============================================================ */
import { SUPABASE_URL, SUPABASE_KEY } from '../core/supabaseClient'
import { accessToken } from '../core/auth'

const CACHE_VERSION = 'v1'
const VOICES = { ko: 'nova', de: 'echo' }
const LANG_TAGS = { ko: 'ko-KR', de: 'de-DE', en: 'en-US' }

/* Ein einziges Audio-Element für die ganze App — so unterbricht
   ein neuer Tipp aufs Lautsprecher-Symbol den vorigen Satz,
   statt dass sich alles überlagert. */
let player = null

async function sha256Hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/* ---------- Stufe 2: Browser-Stimme ---------- */
function browserStimme(text, lang) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const tag = LANG_TAGS[lang] || lang
  u.lang = tag
  const voices = synth.getVoices()
  const voice =
    voices.find((v) => v.lang === tag) ||
    voices.find((v) => v.lang && v.lang.startsWith(tag.slice(0, 2)))
  if (voice) u.voice = voice
  u.rate = 0.9
  synth.speak(u)
}

/* ---------- Stufe 1: Cloud-Stimme mit Cache ---------- */
export async function speak(text, lang) {
  const t = (text || '').trim()
  if (!t) return
  const voice = VOICES[lang]
  /* Für Sprachen ohne Cloud-Stimme (z. B. Englisch) direkt der Notnagel */
  if (!voice) return browserStimme(t, lang)

  try {
    const hash = await sha256Hex(t)
    const cacheUrl = `${SUPABASE_URL}/storage/v1/object/public/tts-cache/${CACHE_VERSION}/${lang}/${voice}/${hash}.mp3`

    if (!player) player = new Audio()
    player.pause()

    /* Erst der Cache — der Normalfall nach dem ersten Anhören */
    const kopf = await fetch(cacheUrl, { method: 'HEAD' })
    let src = cacheUrl
    if (!kopf.ok) {
      /* Fehltreffer: die Funktion erzeugt den Satz einmalig */
      const token = await accessToken()
      const r = await fetch(`${SUPABASE_URL}/functions/v1/speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'tts',
          text: t,
          lang,
          /* fürs Nutzungs-Log: ko-Audio gehört zu Franz' Seite,
             de-Audio zu 해인s */
          profile: lang === 'de' ? 'de' : 'ko',
        }),
      })
      if (!r.ok) throw new Error(`speech ${r.status}`)
      src = (await r.json()).url
    }

    player.src = src
    await player.play()
  } catch {
    /* Offline, ausgeloggt, iOS blockt das späte Abspielen, … —
       Hauptsache, es kommt überhaupt eine Stimme */
    browserStimme(t, lang)
  }
}

export function SpeakButton({ text, lang, className }) {
  return (
    <button
      type="button"
      className={className ? `speak-btn ${className}` : 'speak-btn'}
      onClick={(e) => {
        e.stopPropagation()
        speak(text, lang)
      }}
      aria-label="🔊"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5 6.5 9H3v6h3.5L11 19z" fill="currentColor" stroke="none" />
        <path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a8 8 0 0 1 0 11" />
      </svg>
    </button>
  )
}
