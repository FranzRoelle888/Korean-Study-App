import { useState } from 'react'

/* ============================================================
   NUMBER OF THE DAY

   A random number (1–99) must be typed correctly in BOTH systems:
   - Sino-Korean (일, 이, 삼 …)
   - Native Korean (하나, 둘, 셋 …)

   A wrong answer is NOT a "loss" – you can retry as often as you
   like. The task is only checked off once both are correct. There
   is deliberately no reveal.
   ============================================================ */

const norm = (s) => s.replace(/\s+/g, '').trim()

function NumberChallenge({ number, sino, native, alreadyDone, onComplete, onExit, t }) {
  const [sinoIn, setSinoIn] = useState('')
  const [nativeIn, setNativeIn] = useState('')
  const [feedback, setFeedback] = useState(null)
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
        <div className="number-done">
          <div className="done-emoji">🔢</div>
          <p className="done-title">{t.doneForToday}</p>
          <div className="number-recap">
            <span className="recap-num">{number}</span>
            <span className="recap-line">
              <b lang="ko">{sino}</b> · Sino-Korean
            </span>
            <span className="recap-line">
              <b lang="ko">{native}</b> · Native Korean
            </span>
          </div>
          <button className="done-btn" onClick={onExit}>
            Back to home
          </button>
        </div>
      </div>
    )
  }

  const sinoMark = feedback ? (feedback.sino ? 'ok' : 'bad') : ''
  const nativeMark = feedback ? (feedback.native ? 'ok' : 'bad') : ''

  return (
    <div className="number">
      <NumberHeader onExit={onExit} t={t} />

      <div className="number-body">
        <p className="number-prompt">{t.typeTheNumber}</p>
        <div className="big-number">{number}</div>

        <form className="number-form" onSubmit={submit}>
          <label className={`num-field ${sinoMark}`}>
            <span className="num-label">
              Sino-Korean <em>(일, 이, 삼 …)</em>
            </span>
            <input
              autoFocus
              value={sinoIn}
              onChange={(e) => {
                setSinoIn(e.target.value)
                setFeedback(null)
              }}
              placeholder="e.g. 이십일"
              lang="ko"
              autoComplete="off"
            />
          </label>

          <label className={`num-field ${nativeMark}`}>
            <span className="num-label">
              Native Korean <em>(하나, 둘, 셋 …)</em>
            </span>
            <input
              value={nativeIn}
              onChange={(e) => {
                setNativeIn(e.target.value)
                setFeedback(null)
              }}
              placeholder="e.g. 스물하나"
              lang="ko"
              autoComplete="off"
            />
          </label>

          {feedback && (
            <p className="add-msg add-error">
              {feedback.sino || feedback.native
                ? t.almostFixRed
                : t.notQuite}
            </p>
          )}

          <button type="submit" className="check-btn">
            {t.check}
          </button>
        </form>
      </div>
    </div>
  )
}

function NumberHeader({ onExit, t }) {
  return (
    <div className="review-header">
      <button className="back-btn" onClick={onExit} aria-label={t.back}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <span className="daily-label">{t.numberOfDay}</span>
    </div>
  )
}

export default NumberChallenge
