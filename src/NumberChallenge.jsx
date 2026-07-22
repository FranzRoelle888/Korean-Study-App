import { useState } from 'react'

/* ============================================================
   ZAHLEN DES TAGES

   Eine Zufallszahl (1–99) muss in BEIDEN Zahlensystemen richtig
   eingetippt werden:
   - sino-koreanisch (일, 이, 삼 …)
   - nativ-koreanisch (하나, 둘, 셋 …)

   Regel: Falsch ist NICHT "verloren" – man darf beliebig oft neu
   versuchen. Erst wenn beide einmal korrekt sind, ist die Aufgabe
   für heute abgehakt. Es gibt bewusst keine Auflösung.

   Props:
   - number: die Zahl
   - sino / native: die korrekten Schreibweisen
   - alreadyDone: heute schon geschafft?
   - onComplete(): markiert die Tagesaufgabe als erledigt
   - onExit(): zurück
   ============================================================ */

const norm = (s) => s.replace(/\s+/g, '').trim()

function NumberChallenge({ number, sino, native, alreadyDone, onComplete, onExit }) {
  const [sinoIn, setSinoIn] = useState('')
  const [nativeIn, setNativeIn] = useState('')
  const [feedback, setFeedback] = useState(null) // null | { sino, native }
  const [done, setDone] = useState(alreadyDone)

  function submit(e) {
    e.preventDefault()
    const sOk = norm(sinoIn) === norm(sino)
    const nOk = norm(nativeIn) === norm(native)
    if (sOk && nOk) {
      onComplete()
      setDone(true)
    } else {
      setFeedback({ sino: sOk, native: nOk })
    }
  }

  if (done) {
    return (
      <div className="number">
        <NumberHeader onExit={onExit} />
        <div className="number-done">
          <div className="done-emoji">🔢</div>
          <p className="done-title">Heute erledigt!</p>
          <div className="number-recap">
            <span className="recap-num">{number}</span>
            <span className="recap-line">
              <b lang="ko">{sino}</b> · sino-koreanisch
            </span>
            <span className="recap-line">
              <b lang="ko">{native}</b> · nativ-koreanisch
            </span>
          </div>
          <button className="done-btn" onClick={onExit}>
            Zurück zur Startseite
          </button>
        </div>
      </div>
    )
  }

  // Feld-Markierung: nur nach einem Versuch, und nur wenn falsch/richtig
  const sinoMark = feedback ? (feedback.sino ? 'ok' : 'bad') : ''
  const nativeMark = feedback ? (feedback.native ? 'ok' : 'bad') : ''

  return (
    <div className="number">
      <NumberHeader onExit={onExit} />

      <div className="number-body">
        <p className="number-prompt">Tippe die Zahl auf Koreanisch</p>
        <div className="big-number">{number}</div>

        <form className="number-form" onSubmit={submit}>
          <label className={`num-field ${sinoMark}`}>
            <span className="num-label">
              sino-koreanisch <em>(일, 이, 삼 …)</em>
            </span>
            <input
              autoFocus
              value={sinoIn}
              onChange={(e) => {
                setSinoIn(e.target.value)
                setFeedback(null)
              }}
              placeholder="z. B. 이십일"
              lang="ko"
              autoComplete="off"
            />
          </label>

          <label className={`num-field ${nativeMark}`}>
            <span className="num-label">
              nativ-koreanisch <em>(하나, 둘, 셋 …)</em>
            </span>
            <input
              value={nativeIn}
              onChange={(e) => {
                setNativeIn(e.target.value)
                setFeedback(null)
              }}
              placeholder="z. B. 스물하나"
              lang="ko"
              autoComplete="off"
            />
          </label>

          {feedback && (
            <p className="add-msg add-error">
              {feedback.sino || feedback.native
                ? 'Fast! Korrigier das rot markierte Feld und versuch es nochmal.'
                : 'Stimmt noch nicht – versuch es nochmal.'}
            </p>
          )}

          <button type="submit" className="check-btn">
            Prüfen
          </button>
        </form>
      </div>
    </div>
  )
}

function NumberHeader({ onExit }) {
  return (
    <div className="review-header">
      <button className="back-btn" onClick={onExit} aria-label="Zurück">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <span className="daily-label">Zahlen des Tages</span>
    </div>
  )
}

export default NumberChallenge
