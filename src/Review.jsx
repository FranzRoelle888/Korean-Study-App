import { useState } from 'react'
import { previewInterval, formatInterval } from './storage'
import Confetti from './Confetti'
import { MoonIcon, CardRidge, CardSkyline } from './icons'
import ClearableInput from './ClearableInput'
import { SpeakButton } from './tts'

/* ============================================================
   REVIEW STACK

   Two card types:
   - front 'en': English shown -> type the Korean answer
   - front 'ko': Korean shown, hidden -> tap to flip to English

   Both end with the same 4 rating buttons. When you type an answer,
   the card border flashes green (correct) or red (wrong) for a
   satisfying moment of feedback.
   ============================================================ */

const RATING_KEYS = [
  { key: 'again', cls: 'rate-again' },
  { key: 'hard', cls: 'rate-hard' },
  { key: 'good', cls: 'rate-good' },
  { key: 'easy', cls: 'rate-easy' },
]

function Review({ initialQueue, onRate, onUndo, onExit, profile, t, tt }) {
  const [queue, setQueue] = useState(initialQueue)
  const [total] = useState(initialQueue.length)
  const [revealed, setRevealed] = useState(false)
  const [typed, setTyped] = useState('')
  const [checked, setChecked] = useState(false)
  const [flash, setFlash] = useState(null) // 'ok' | 'bad' | null
  const [exiting, setExiting] = useState(false) // Karte fliegt gerade nach rechts weg
  /* Ein Schritt Rueckgaengig: Stapel-Schnappschuss + Karte VOR der
     Bewertung. Ein Verklicker auf "Einfach" statt "Nochmal" wuerde
     eine nicht gekonnte Karte sonst unumkehrbar um Wochen
     verschieben. */
  const [last, setLast] = useState(null)

  const done = total - queue.length
  const card = queue[0]

  // Finished screen
  if (!card) {
    const celebrate = total > 0
    return (
      <div className="review">
        {celebrate && <Confetti />}
        <div className="review-done">
          {celebrate ? (
            <>
              <div className="done-emoji pop">🎉</div>
              <p className="done-title done-ko pop" lang="ko">
                좋아요!
              </p>
              <p className="done-sub">{t.clearedAll}</p>
            </>
          ) : (
            <>
              <div className="success-mark">
                <MoonIcon />
              </div>
              <p className="done-title">{t.nothingToReview}</p>
              <p className="done-sub">{t.stackEmpty}</p>
            </>
          )}
          <button className="done-btn" onClick={onExit}>
            {t.back}
          </button>
          {last && (
            <button className="undo-chip" onClick={undo}>
              ↩ {t.undo}
            </button>
          )}
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
    setExiting(false)
  }

  function undo() {
    if (!last) return
    onUndo(last.card)
    setQueue(last.queue)
    setRevealed(false)
    setTyped('')
    setChecked(false)
    setFlash(null)
    setExiting(false)
    setLast(null)
  }

  function handleRate(rating) {
    if (exiting) return
    setLast({ queue, card })
    // Bei richtiger Antwort (bzw. gewusster Flip-Karte) fliegt die Karte
    // erst nach rechts weg, dann kommt die nächste. "Again" (nicht gewusst)
    // wechselt direkt ohne Flug.
    const knewIt = isTyping ? correct : rating !== 'again'
    if (knewIt) {
      setExiting(true)
      setTimeout(() => {
        onRate(card.id, rating)
        nextCard(rating === 'again')
      }, 320)
    } else {
      onRate(card.id, rating)
      nextCard(rating === 'again')
    }
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
      <ReviewHeader done={done} total={total} onExit={onExit} t={t} />

      {last && !answerShown && (
        <button className="undo-chip" onClick={undo}>
          ↩ {t.undo}
        </button>
      )}

      <div className="review-body">
        <div className={`flashcard ${flashClass} ${exiting ? 'card-fly-right' : ''}`}>
          {profile.id === 'de' ? <CardSkyline /> : <CardRidge />}
          <span className="card-tag">
            {isTyping ? tt.tagType : tt.tagFlip}
          </span>

          {isTyping ? (
            <>
              <div className="card-front" lang={profile.knownLang}>
                {card.en}
              </div>
              {answerShown && (
                <div className={correct ? 'card-answer ok' : 'card-answer bad'}>
                  <span lang={profile.targetLang} className="answer-ko">
                    {card.ko}
                    <SpeakButton text={card.ko} lang={profile.targetLang} className="speak-inline" />
                  </span>
                  <span className="answer-note">
                    {correct ? t.correct : t.wrong}
                  </span>
                  {card.ex && (
                    <span className="card-example">
                      <span lang={profile.targetLang}>{card.ex}</span>
                      {card.exTr && <span className="card-example-tr">{card.exTr}</span>}
                    </span>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="card-front" lang={profile.targetLang}>
                {card.ko}
              </div>
              <SpeakButton text={card.ko} lang={profile.targetLang} />
              {answerShown && (
                <div className="card-answer neutral">
                  <span lang={profile.knownLang} className="answer-en">
                    {card.en}
                  </span>
                  {card.ex && (
                    <span className="card-example">
                      <span lang={profile.targetLang}>{card.ex}</span>
                      {card.exTr && <span className="card-example-tr">{card.exTr}</span>}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {!answerShown && isTyping && (
          <form className="type-area" onSubmit={checkTyping}>
            <ClearableInput
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onClear={() => setTyped('')}
              placeholder={tt.typePlaceholder}
              lang={profile.targetLang}
              autoComplete="off"
            />
            <button type="submit" className="check-btn">
              {t.check}
            </button>
          </form>
        )}

        {!answerShown && !isTyping && (
          <button className="reveal-btn" onClick={() => setRevealed(true)}>
            {t.showAnswer}
          </button>
        )}
      </div>

      {answerShown && (
        <div className="ratings">
          {RATING_KEYS.map((r) => (
            <button key={r.key} className={`rate ${r.cls}`} onClick={() => handleRate(r.key)}>
              <span className="rate-label">{t[r.key]}</span>
              <span className="rate-when">{formatInterval(previewInterval(card, r.key))}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ReviewHeader({ done, total, onExit, t }) {
  const pct = total > 0 ? (done / total) * 100 : 0
  return (
    <div className="review-header">
      <button className="back-btn" onClick={onExit} aria-label={t.back}>
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
