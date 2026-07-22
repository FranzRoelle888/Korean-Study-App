import { useState } from 'react'
import { previewInterval, formatInterval } from './storage'
import Confetti from './Confetti'

/* ============================================================
   REVIEW STACK

   Two card types:
   - front 'en': English shown -> type the Korean answer
   - front 'ko': Korean shown, hidden -> tap to flip to English

   Both end with the same 4 rating buttons. When you type an answer,
   the card border flashes green (correct) or red (wrong) for a
   satisfying moment of feedback.
   ============================================================ */

const RATINGS = [
  { key: 'again', label: 'Again', cls: 'rate-again' },
  { key: 'hard', label: 'Hard', cls: 'rate-hard' },
  { key: 'good', label: 'Good', cls: 'rate-good' },
  { key: 'easy', label: 'Easy', cls: 'rate-easy' },
]

function Review({ initialQueue, onRate, onExit }) {
  const [queue, setQueue] = useState(initialQueue)
  const [total] = useState(initialQueue.length)
  const [revealed, setRevealed] = useState(false)
  const [typed, setTyped] = useState('')
  const [checked, setChecked] = useState(false)
  const [flash, setFlash] = useState(null) // 'ok' | 'bad' | null

  const done = total - queue.length
  const card = queue[0]

  // Finished screen
  if (!card) {
    const celebrate = total > 0
    return (
      <div className="review">
        <ReviewHeader done={total} total={total} onExit={onExit} />
        {celebrate && <Confetti />}
        <div className="review-done">
          {celebrate ? (
            <>
              <div className="done-emoji pop">🎉</div>
              <p className="done-title done-ko pop" lang="ko">
                좋아요!
              </p>
              <p className="done-sub">You've cleared all your cards for today.</p>
            </>
          ) : (
            <>
              <div className="done-emoji">☕</div>
              <p className="done-title">Nothing to review</p>
              <p className="done-sub">Your stack is already empty for today.</p>
            </>
          )}
          <button className="done-btn" onClick={onExit}>
            Back to home
          </button>
        </div>
      </div>
    )
  }

  const isTyping = card.front === 'en'
  const answerShown = isTyping ? checked : revealed
  const correct = typed.trim() === card.ko.trim()

  function nextCard(afterRequeue) {
    setQueue((q) => {
      const [first, ...rest] = q
      return afterRequeue ? [...rest, first] : rest
    })
    setRevealed(false)
    setTyped('')
    setChecked(false)
    setFlash(null)
  }

  function handleRate(rating) {
    onRate(card.id, rating)
    nextCard(rating === 'again')
  }

  function checkTyping(e) {
    e.preventDefault()
    setChecked(true)
    setFlash(correct ? 'ok' : 'bad')
    setTimeout(() => setFlash(null), 700)
  }

  const flashClass = flash === 'ok' ? 'flash-ok' : flash === 'bad' ? 'flash-bad' : ''

  return (
    <div className="review">
      <ReviewHeader done={done} total={total} onExit={onExit} />

      <div className="review-body">
        <div className={`flashcard ${flashClass}`}>
          <span className="card-tag">
            {isTyping ? '🇬🇧 → 🇰🇷  type' : '🇰🇷 → 🇬🇧  flip'}
          </span>

          {isTyping ? (
            <>
              <div className="card-front" lang="en">
                {card.en}
              </div>
              {answerShown && (
                <div className={correct ? 'card-answer ok' : 'card-answer bad'}>
                  <span lang="ko" className="answer-ko">
                    {card.ko}
                  </span>
                  <span className="answer-note">
                    {correct ? 'Correct ✓' : "Your answer wasn't right"}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="card-front" lang="ko">
                {card.ko}
              </div>
              {answerShown && (
                <div className="card-answer neutral">
                  <span lang="en" className="answer-en">
                    {card.en}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {!answerShown && isTyping && (
          <form className="type-area" onSubmit={checkTyping}>
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Type Korean…"
              lang="ko"
              autoComplete="off"
            />
            <button type="submit" className="check-btn">
              Check
            </button>
          </form>
        )}

        {!answerShown && !isTyping && (
          <button className="reveal-btn" onClick={() => setRevealed(true)}>
            Flip
          </button>
        )}
      </div>

      {answerShown && (
        <div className="ratings">
          {RATINGS.map((r) => (
            <button key={r.key} className={`rate ${r.cls}`} onClick={() => handleRate(r.key)}>
              <span className="rate-label">{r.label}</span>
              <span className="rate-when">{formatInterval(previewInterval(card, r.key))}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ReviewHeader({ done, total, onExit }) {
  const pct = total > 0 ? (done / total) * 100 : 0
  return (
    <div className="review-header">
      <button className="back-btn" onClick={onExit} aria-label="Back">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <div className="progress">
        <div className="progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <span className="progress-count">
        {done}/{total}
      </span>
    </div>
  )
}

export default Review
