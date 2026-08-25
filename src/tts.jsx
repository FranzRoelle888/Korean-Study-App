/* ============================================================
   VORLESEN (Text-to-Speech)

   Nutzt die eingebaute Sprachausgabe des Browsers — kein Konto,
   keine Kosten, nichts wird irgendwohin geschickt.

   Ehrliche Einschränkung: ob eine koreanische bzw. deutsche
   Stimme installiert ist, entscheidet das Gerät. Auf dem iPhone
   ggf. unter Einstellungen -> Bedienungshilfen -> Gesprochene
   Inhalte die Stimme laden. Fehlt sie, passiert beim Tippen auf
   den Knopf schlicht nichts.
   ============================================================ */

const LANG_TAGS = { ko: 'ko-KR', de: 'de-DE', en: 'en-US' }

function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function pickVoice(tag) {
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((v) => v.lang === tag) ||
    voices.find((v) => v.lang && v.lang.startsWith(tag.slice(0, 2))) ||
    null
  )
}

export function speak(text, lang) {
  if (!canSpeak() || !text) return
  const synth = window.speechSynthesis
  /* Laufendes abbrechen, sonst stauen sich die Ansagen */
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const tag = LANG_TAGS[lang] || lang
  u.lang = tag
  const voice = pickVoice(tag)
  if (voice) u.voice = voice
  /* Etwas langsamer als Normaltempo — zum Lernen angenehmer */
  u.rate = 0.9
  synth.speak(u)
}

export function SpeakButton({ text, lang, className }) {
  if (!canSpeak()) return null
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
