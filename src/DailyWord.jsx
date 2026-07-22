import { useState } from 'react'

/* ============================================================
   WORD OF THE DAY

   Shows today's new word(s). Type each one correctly 3× in Korean;
   then it's added to your library and review stack right away.
   The card border flashes green on a correct entry, red on a wrong
   one, for a satisfying moment of feedback.
   ============================================================ */

const NEEDED = 3

function DailyWord({ candidates, onIntroduce, onExit }) {
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
        <DailyHeader onExit={onExit} label="Word of the Day" />
        <div className="daily-done">
          <div className="done-emoji">{nothingAtAll ? '☕' : '🌱'}</div>
          <p className="done-title">
            {nothingAtAll ? 'Done for today' : `${learned} new learned!`}
          </p>
          <p className="done-sub">
            {nothingAtAll
              ? 'Come back tomorrow for new words.'
              : "They're now in your library and on your stack."}
          </p>
          <button className="done-btn" onClick={onExit}>
            Back to home
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
      <DailyHeader onExit={onExit} label={`New word ${index + 1}/${queue.length}`} />

      <div className="daily-body">
        <div className={`daily-card ${flashClass}`}>
          <div className="daily-ko" lang="ko">
            {entry.ko}
          </div>
          <div className="daily-en">{entry.en}</div>
          {entry.ex && (
            <div className="daily-example">
              <span lang="ko">{entry.ex}</span>
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
              {typed}/{NEEDED} · type in Korean
            </span>
          </div>
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="한국어…"
            lang="ko"
            autoComplete="off"
            className={flash === 'bad' ? 'shake' : ''}
          />
          <button type="submit" className="check-btn">
            Confirm
          </button>
        </form>
      </div>
    </div>
  )
}

function DailyHeader({ onExit, label }) {
  return (
    <div className="review-header">
      <button className="back-btn" onClick={onExit} aria-label="Back">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <span className="daily-label">{label}</span>
    </div>
  )
}

export default DailyWord
