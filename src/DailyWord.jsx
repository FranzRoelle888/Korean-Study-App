import { useState } from 'react'
import { SuccessMark, MoonIcon } from './icons'

/* ============================================================
   WORD OF THE DAY

   Shows today's new word(s). Type each one correctly 3× in Korean;
   then it's added to your library and review stack right away.
   The card border flashes green on a correct entry, red on a wrong
   one, for a satisfying moment of feedback.
   ============================================================ */

const NEEDED = 3

function DailyWord({ candidates, onIntroduce, onExit, profile, t, tt }) {
  const [queue] = useState(candidates)
  const [index, setIndex] = useState(0)
  const [typed, setTyped] = useState(0)
  const [input, setInput] = useState('')
  const [flash, setFlash] = useState(null) // 'ok' | 'bad' | null
  const [learned, setLearned] = useState(0)

  const entry = queue[index]

  if (!entry) {
    const nothingAtAll = queue.length === 0
    return (
      <div className="daily">
        <div className="daily-done">
          {nothingAtAll ? (
            <div className="success-mark pop">
              <MoonIcon />
            </div>
          ) : (
            <div className="success-mark pop">
              <SuccessMark />
            </div>
          )}
          <p className="done-title">
            {nothingAtAll ? t.doneForToday : t.newLearned(learned)}
          </p>
          <p className="done-sub">
            {nothingAtAll
              ? t.comeBackTomorrow
              : t.nowInLibrary}
          </p>
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

  function submit(e) {
    e.preventDefault()
    if (input.trim() === entry.ko.trim()) {
      const n = typed + 1
      setInput('')
      flashThen('ok')
      if (n >= NEEDED) {
        onIntroduce(entry)
        setLearned((l) => l + 1)
        setTyped(0)
        setIndex((i) => i + 1)
      } else {
        setTyped(n)
      }
    } else {
      setInput('')
      flashThen('bad')
    }
  }

  const flashClass = flash === 'ok' ? 'flash-ok' : flash === 'bad' ? 'flash-bad' : ''

  return (
    <div className="daily">
      <DailyHeader t={t} onExit={onExit} label={`New word ${index + 1}/${queue.length}`} />

      <div className="daily-body">
        <div className={`daily-card ${flashClass}`}>
          <div className="daily-ko" lang={profile.targetLang}>
            {entry.ko}
          </div>
          <div className="daily-en">{entry.en}</div>
          {entry.ex && (
            <div className="daily-example">
              <span lang={profile.targetLang}>{entry.ex}</span>
              <span className="daily-example-en">{entry.exEn}</span>
            </div>
          )}
        </div>

        <form className="type-area" onSubmit={submit}>
          <div className="type-progress">
            {Array.from({ length: NEEDED }).map((_, i) => (
              <span key={i} className={i < typed ? 'tp-dot tp-on' : 'tp-dot'} />
            ))}
            <span className="type-hint">
              {typed}/{NEEDED} · {tt.typeHint}
            </span>
          </div>
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={tt.typePlaceholder}
            lang={profile.targetLang}
            autoComplete="off"
            className={flash === 'bad' ? 'shake' : ''}
          />
          <button type="submit" className="check-btn">
            {t.confirm}
          </button>
        </form>
      </div>
    </div>
  )
}

function DailyHeader({ onExit, label, t }) {
  return (
    <div className="review-header">
      <button className="back-btn" onClick={onExit} aria-label={t.back}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <span className="daily-label">{label}</span>
    </div>
  )
}

export default DailyWord
