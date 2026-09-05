import { useState, useEffect } from 'react'
import { SuccessMark, MoonIcon } from '../../shared/icons'
import ClearableInput from '../../shared/ClearableInput'
import { SpeakButton, speak, prewarmSpeech } from '../../shared/tts'
import { HanjaZeile, Bedeutung, JamoVergleich } from '../../shared/motorTeile'
import { useTastaturZu } from '../../shared/tastatur'
import { istGleich } from '../../core/hangul'

/* ============================================================
   EINFÜHRUNGSRITUAL (Vokabel-Motor V2, Konzept §4) — nur Franz

   ~25 Sekunden je Wort:
   1. Wort groß, Stimme spielt von selbst, Hanja-Chips (antippbar),
      Bedeutung `water (Wasser·)` mit Nuance-Punkt, Beispielsatz
      prominent mit eigener Stimme und Übersetzung.
   2. Kein Raten, kein Zwischentest. Nach 10 s erscheint
      „Jetzt schreiben" — das Wort wird DREIMAL aus dem Kopf getippt
      (Franz 06.09.). Sobald das Feld Fokus hat, verschwindet alles
      außer der Bedeutung (auch die Lautsprecher). Feld verlassen,
      Tastatur einklappen oder Karte antippen -> alles wieder da,
      damit die Schreibweise nie verloren geht.
   3. Falsch -> Jamo-Vergleich, zählt nicht; weiter bis drei
      richtige. Das Ritual ist keine FSRS-Bewertung — die Erkennen-
      Karte kommt heute noch einmal am Ende des Stapels dran.

   Die Wortliste wird beim Start EINMAL eingefroren: die Eltern-
   Komponente rechnet sie nach jedem Wort neu (Kandidaten rücken
   nach), und ein laufender Index auf einer schrumpfenden Liste
   übersprang jedes zweite Wort (Fund Franz 06.09.).
   ============================================================ */

const SCHAU_SEKUNDEN = 10
const NEEDED = 3

function Einfuehrung({ candidates, onIntroduce, onExit, profile, t }) {
  const [queue] = useState(candidates)
  const [index, setIndex] = useState(0)
  const [schreiben, setSchreiben] = useState(false) /* Eingabefeld sichtbar */
  const [bereit, setBereit] = useState(false) /* 10 s vorbei */
  const [tippt, setTippt] = useState(false) /* Feld hat Fokus */
  const [input, setInput] = useState('')
  const [typed, setTyped] = useState(0) /* richtige Durchgänge */
  const [diff, setDiff] = useState(null) /* letzte Fehleingabe */
  const [flash, setFlash] = useState(null)
  const [learned, setLearned] = useState(0)
  const lang = profile.targetLang

  const entry = queue[index]

  /* Tastatur eingeklappt (iOS ohne blur) -> alles wieder zeigen */
  useTastaturZu(() => setTippt(false))

  /* Je Wort: Stimme automatisch, Satz vorwärmen, Uhr auf 10 s */
  useEffect(() => {
    if (!entry) return
    setSchreiben(false)
    setBereit(false)
    setTippt(false)
    setInput('')
    setTyped(0)
    setDiff(null)
    speak(entry.ko, lang)
    if (entry.ex) prewarmSpeech(entry.ex, lang)
    const id = setTimeout(() => setBereit(true), SCHAU_SEKUNDEN * 1000)
    return () => clearTimeout(id)
  }, [index])

  if (!entry) {
    const nichts = queue.length === 0
    return (
      <div className="daily">
        <div className="daily-done">
          <div className="success-mark pop">{nichts ? <MoonIcon /> : <SuccessMark />}</div>
          <p className="done-title">{nichts ? t.doneForToday : t.newLearned(learned)}</p>
          <p className="done-sub">{nichts ? t.comeBackTomorrow : t.nowInLibrary}</p>
          <button className="done-btn" onClick={onExit}>
            {t.back}
          </button>
        </div>
      </div>
    )
  }

  function flashThen(kind) {
    setFlash(kind)
    setTimeout(() => setFlash(null), 600)
  }

  function zeigen() {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur()
    setTippt(false)
  }

  function weiter() {
    onIntroduce(entry)
    setLearned((l) => l + 1)
    setIndex((i) => i + 1)
  }

  function submit(e) {
    e.preventDefault()
    if (!input.trim()) return
    if (istGleich(input, entry.ko)) {
      const n = typed + 1
      setInput('')
      setDiff(null)
      flashThen('ok')
      if (n >= NEEDED) {
        setTyped(n)
        setTimeout(weiter, 350)
      } else {
        setTyped(n)
      }
      return
    }
    flashThen('bad')
    setDiff(input)
    setInput('')
    /* Feld loslassen, damit das Wort wieder sichtbar wird */
    zeigen()
  }

  const flashClass = flash === 'ok' ? 'flash-ok' : flash === 'bad' ? 'flash-bad' : ''

  return (
    <div className="daily">
      <div className="review-header">
        <button className="back-btn" onClick={onExit} aria-label={t.back}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>
        <span className="daily-label">
          {t.newWord} {index + 1}/{queue.length}
        </span>
      </div>

      <div className="daily-body">
        {/* Antippen der Karte holt Wort + Satz zurück (Fokus-Regel aufheben) */}
        <div className={`daily-card einf-karte ${flashClass} ${tippt ? 'tippt' : ''}`} onClick={tippt ? zeigen : undefined}>
          {/* Wort + Stimme — verschwinden beim Tippen */}
          <div className="daily-ko verbergbar" lang={lang}>
            {entry.ko}
            <SpeakButton text={entry.ko} lang={lang} className="speak-on-dark" />
          </div>
          <HanjaZeile hanja={entry.hanja} ko={entry.ko} className="verbergbar einf-hanja" />

          {/* Die Bedeutung bleibt immer stehen */}
          <Bedeutung word={entry} className="daily-en" />

          {entry.ex && (
            <div className="daily-example verbergbar">
              <span lang={lang} className="einf-satz">
                {entry.ex}
                <SpeakButton text={entry.ex} lang={lang} className="speak-on-dark speak-inline" />
              </span>
              <span className="daily-example-en">{entry.exTr}</span>
            </div>
          )}
          {tippt && <span className="einf-zeigen-hinweis">{t.einfZeigen}</span>}
        </div>

        {!schreiben ? (
          <div className="einf-schritt">
            <p className="einf-hinweis">{t.einfSchauen}</p>
            {bereit ? (
              <button className="check-btn einf-los" onClick={() => setSchreiben(true)}>
                ✍️ {t.jetztSchreiben}
              </button>
            ) : (
              <div className="einf-zeit" aria-hidden="true">
                <div className="einf-zeit-balken" style={{ animationDuration: `${SCHAU_SEKUNDEN}s` }} />
              </div>
            )}
          </div>
        ) : (
          <form className="type-area" onSubmit={submit}>
            <div className="type-progress">
              {Array.from({ length: NEEDED }).map((_, i) => (
                <span key={i} className={i < typed ? 'tp-dot tp-on' : 'tp-dot'} />
              ))}
              <span className="type-hint">
                {typed}/{NEEDED} · {t.einfDreimal}
              </span>
            </div>
            {diff && <JamoVergleich eingabe={diff} richtig={entry.ko} t={t} />}
            <ClearableInput
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onClear={() => setInput('')}
              onFocus={() => setTippt(true)}
              onBlur={() => setTippt(false)}
              placeholder={t.typeKorean}
              lang={lang}
              autoComplete="off"
              className={flash === 'bad' ? 'shake' : ''}
            />
            <button type="submit" className="check-btn">
              {t.check}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default Einfuehrung
