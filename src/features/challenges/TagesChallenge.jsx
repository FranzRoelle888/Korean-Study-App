import { useState } from 'react'
import ClearableInput from '../../shared/ClearableInput'
import SatzTeil from './SatzTeil'

/* ============================================================
   TAGES-CHALLENGE (Franz 07.09.) — ersetzt die Zahl des Tages

   Zwei Teile auf einem Bildschirm:
   1. die Zahl in beiden Zählweisen (sino + rein koreanisch)
   2. fünf Sätze aus dem eigenen Wortschatz (SatzTeil)

   Erledigt = Zahl richtig UND fünf Antworten abgeschickt. Gibt es
   keine Sätze (Bank leer, kein Netz), zählt die Zahl allein — der
   Streak hängt nie am Trainer.
   ============================================================ */

const norm = (s) => s.replace(/\s+/g, '').trim()

function TagesChallenge({ number, sino, native, numberDone, onNumberDone, saetzeDone, onSaetzeDone, words, profile, onExit, t }) {
  const [sinoIn, setSinoIn] = useState('')
  const [nativeIn, setNativeIn] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [zahlOk, setZahlOk] = useState(numberDone)
  const [saetzeFertig, setSaetzeFertig] = useState(saetzeDone)

  function pruefeZahl(e) {
    e.preventDefault()
    const sOk = norm(sinoIn) === norm(sino)
    const nOk = norm(nativeIn) === norm(native)
    if (sOk && nOk) {
      onNumberDone()
      setZahlOk(true)
    } else {
      setFeedback({ sino: sOk, native: nOk })
    }
  }

  function satzTeilFertig() {
    if (!saetzeFertig) onSaetzeDone()
    setSaetzeFertig(true)
  }

  const sinoMark = feedback ? (feedback.sino ? 'ok' : 'bad') : ''
  const nativeMark = feedback ? (feedback.native ? 'ok' : 'bad') : ''

  return (
    <div className="number tc">
      <div className="review-header">
        <button className="back-btn" onClick={onExit} aria-label={t.back}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>
        <span className="daily-label">{t.tagesChallenge}</span>
      </div>

      <div className="number-body tc-body">
        {/* ---------- Teil 1: Zahl ---------- */}
        <section className="tc-teil">
          <h2 className="tc-titel">
            <span className="tc-nr">1</span> {t.numberOfDay}
            {zahlOk && <span className="tc-haken">✓</span>}
          </h2>
          {zahlOk ? (
            <div className="number-recap tc-recap">
              <span className="recap-num">{number}</span>
              <span className="recap-line">
                <b lang="ko">{sino}</b> · Sino-Korean
              </span>
              <span className="recap-line">
                <b lang="ko">{native}</b> · Native Korean
              </span>
            </div>
          ) : (
            <>
              <div className="big-number">{number}</div>
              <form className="number-form" onSubmit={pruefeZahl}>
                <label className={`num-field ${sinoMark}`}>
                  <span className="num-label">
                    Sino-Korean <em>(일, 이, 삼 …)</em>
                  </span>
                  <ClearableInput
                    value={sinoIn}
                    onChange={(e) => {
                      setSinoIn(e.target.value)
                      setFeedback(null)
                    }}
                    onClear={() => setSinoIn('')}
                    placeholder="e.g. 이십일"
                    lang="ko"
                    autoComplete="off"
                  />
                </label>
                <label className={`num-field ${nativeMark}`}>
                  <span className="num-label">
                    Native Korean <em>(하나, 둘, 셋 …)</em>
                  </span>
                  <ClearableInput
                    value={nativeIn}
                    onChange={(e) => {
                      setNativeIn(e.target.value)
                      setFeedback(null)
                    }}
                    onClear={() => setNativeIn('')}
                    placeholder="e.g. 스물하나"
                    lang="ko"
                    autoComplete="off"
                  />
                </label>
                {feedback && (
                  <p className="add-msg add-error">{feedback.sino || feedback.native ? t.almostFixRed : t.notQuite}</p>
                )}
                <button type="submit" className="check-btn">
                  {t.check}
                </button>
              </form>
            </>
          )}
        </section>

        {/* ---------- Teil 2: fünf Sätze ---------- */}
        <section className="tc-teil">
          <h2 className="tc-titel">
            <span className="tc-nr">2</span> {t.challengeSaetze}
            {saetzeFertig && <span className="tc-haken">✓</span>}
          </h2>
          <SatzTeil
            profile={profile}
            words={words}
            onFertig={satzTeilFertig}
            onKeineSaetze={satzTeilFertig}
            t={t}
          />
        </section>

        {zahlOk && saetzeFertig && (
          <button className="done-btn tc-fertig" onClick={onExit}>
            {t.back}
          </button>
        )}
      </div>
    </div>
  )
}

export default TagesChallenge
