/* ============================================================
   VORLESEN (Text-to-Speech)

   Zwei Stufen:
   1. WUNSCH: natürliche Cloud-Stimme (OpenAI, über die
      speech-Edge-Function). Jeder Satz wird genau einmal erzeugt
      und liegt danach als MP3 im öffentlichen Cache.
   2. NOTNAGEL: die eingebaute Browser-Stimme, wenn etwas
      schiefgeht (offline, ausgeloggt, Funktion down).

   Drei Kniffe gegen Trägheit und iOS-Zicken:
   - ENTSPERREN: iOS erlaubt Audio nur als direkte Folge einer
     Berührung. Der Lautsprecher-Knopf spielt deshalb SOFORT beim
     Tipp einen lautlosen Schnipsel — danach darf dasselbe
     Audio-Element auch nach Netz-Wartezeiten weiterspielen.
   - DIREKT ABSPIELEN: Im Normalfall (Satz schon im Cache) wird
     die Cache-URL ohne Vorab-Anfrage abgespielt. Nur wenn das
     scheitert (Datei fehlt), wird einmalig erzeugt.
   - VORWÄRMEN: Bildschirme melden ihre Texte vorab an
     (prewarmSpeech) — die Erzeugung läuft im Hintergrund,
     während man noch liest. Beim Tipp ist alles schon da.

   Der Cache-Pfad (Version/Sprache/Stimme/Hash) muss zur
   speech-Funktion passen — bei Änderungen BEIDE Seiten anfassen.
   ============================================================ */
import { SUPABASE_URL, SUPABASE_KEY } from '../core/supabaseClient'
import { accessToken } from '../core/auth'

const CACHE_VERSION = 'v1'
const VOICES = { ko: 'nova', de: 'echo' }
const LANG_TAGS = { ko: 'ko-KR', de: 'de-DE', en: 'en-US' }

/* Winziges lautloses WAV — nur zum Entsperren des Audio-Elements */
const SILENT =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA='

/* Ein einziges Audio-Element für die ganze App — ein neuer Tipp
   unterbricht den vorigen Satz, statt dass sich alles überlagert. */
let player = null
let entsperrt = false

function entsperren() {
  if (!player) player = new Audio()
  if (entsperrt) return
  player.src = SILENT
  player.play().catch(() => {})
  entsperrt = true
}

async function sha256Hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function cacheUrlFuer(text, lang) {
  const hash = await sha256Hex(text)
  return `${SUPABASE_URL}/storage/v1/object/public/tts-cache/${CACHE_VERSION}/${lang}/${VOICES[lang]}/${hash}.mp3`
}

/* Die Funktion erzeugt den Satz einmalig und gibt die Cache-URL zurück */
async function erzeugen(text, lang) {
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
      text,
      lang,
      /* fürs Nutzungs-Log: ko-Audio gehört zu Franz' Seite */
      profile: lang === 'de' ? 'de' : 'ko',
    }),
  })
  if (!r.ok) throw new Error(`speech ${r.status}`)
  return (await r.json()).url
}

async function abspielen(src) {
  player.src = src
  await player.play()
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
  if (!VOICES[lang]) return browserStimme(t, lang)
  if (!player) player = new Audio()

  try {
    const url = await cacheUrlFuer(t, lang)
    try {
      /* Normalfall: liegt schon im Cache — sofort los */
      await abspielen(url)
    } catch {
      /* Fehltreffer: einmalig erzeugen, dann abspielen */
      await abspielen(await erzeugen(t, lang))
    }
  } catch {
    browserStimme(t, lang)
  }
}

/* ---------- Vorwärmen (ohne Abspielen) ----------
   Bildschirme rufen das auf, sobald ein Text sichtbar wird.
   Läuft still im Hintergrund; Fehler sind egal — dann wird eben
   beim Tipp erzeugt. */
const laufend = new Set()
export async function prewarmSpeech(text, lang) {
  const t = (text || '').trim()
  if (!t || !VOICES[lang]) return
  const key = `${lang}|${t}`
  if (laufend.has(key)) return
  laufend.add(key)
  try {
    const url = await cacheUrlFuer(t, lang)
    const kopf = await fetch(url, { method: 'HEAD' })
    if (!kopf.ok) await erzeugen(t, lang)
  } catch {
    /* still bleiben */
  } finally {
    laufend.delete(key)
  }
}

export function SpeakButton({ text, lang, className }) {
  return (
    <button
      type="button"
      className={className ? `speak-btn ${className}` : 'speak-btn'}
      onClick={(e) => {
        e.stopPropagation()
        /* WICHTIG: synchron im Tipp — das ist der iOS-Türöffner */
        entsperren()
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
