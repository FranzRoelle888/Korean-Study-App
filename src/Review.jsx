import { useState } from 'react'
import { previewInterval, formatInterval } from './storage'
import Confetti from './Confetti'

/* ============================================================
   WIEDERHOLUNGSSTAPEL

   Bekommt:
   - initialQueue: die heute fälligen Karten (mit en/ko), Reihenfolge
   - onRate(cardId, rating): speichert die Bewertung (in App/Speicher)
   - onExit(): zurück zur Startseite

   Zwei Kartentypen:
   - front 'en': Englisch vorne -> koreanische Antwort EINTIPPEN
   - front 'ko': Koreanisch vorne, verdeckt -> KLICK dreht auf Englisch

   Beide enden mit denselben 4 Bewertungs-Buttons.
   Unterbrechbar: bewertete Karten sind sofort gespeichert; wer
   rausgeht und wiederkommt, sieht nur noch die restlichen fälligen.
   ============================================================ */

const RATINGS = [
  { key: 'again', label: 'Nochmal', cls: 'rate-again' },
  { key: 'hard', label: 'Schwer', cls: 'rate-hard' },
  { key: 'good', label: 'Gut', cls: 'rate-good' },
  { key: 'easy', label: 'Einfach', cls: 'rate-easy' },
]

function Review({ initialQueue, onRate, onExit }) {
  // Sitzungs-Warteschlange (Kopie, die wir hier abarbeiten).
  // Beides wird EINMAL beim Start festgehalten – die live nachgerechnete
  // Fälligkeitsliste draußen darf den Sitzungszähler nicht verändern.
  const [queue, setQueue] = useState(initialQueue)
  const [total] = useState(initialQueue.length)
  const [revealed, setRevealed] = useState(false) // Karte aufgedeckt?
  const [typed, setTyped] = useState('') // eingetippte Antwort
  const [checked, setChecked] = useState(false) // schon geprüft?

  const done = total - queue.length
  const card = queue[0]

  // Fertig-Ansicht, wenn keine Karten mehr übrig sind.
  if (!card) {
    // Konfetti + Jubel nur, wenn wirklich Karten geschafft wurden.
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
              <p className="done-sub">Du hast heute alle fälligen Karten geschafft.</p>
            </>
          ) : (
            <>
              <div className="done-emoji">☕</div>
              <p className="done-title">Nichts zu wiederholen</p>
              <p className="done-sub">Für heute ist dein Stapel schon leer.</p>
            </>
          )}
          <button className="done-btn" onClick={onExit}>
            Zurück zur Startseite
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
  }

  function handleRate(rating) {
    onRate(card.id, rating) // dauerhaft speichern
    nextCard(rating === 'again') // bei "Nochmal" hinten wieder anstellen
  }

  return (
    <div className="review">
      <ReviewHeader done={done} total={total} onExit={onExit} />

      <div className="review-body">
        {/* -------- Die Karte -------- */}
        <div className="flashcard">
          <span className="card-tag">
            {isTyping ? '🇬🇧 → 🇰🇷  eintippen' : '🇰🇷 → 🇬🇧  umdrehen'}
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
                    {correct ? 'Richtig getippt ✓' : 'Deine Eingabe stimmte nicht'}
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

        {/* -------- Eingabe / Aufdecken -------- */}
        {!answerShown && isTyping && (
          <form
            className="type-area"
            onSubmit={(e) => {
              e.preventDefault()
              setChecked(true)
            }}
          >
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Koreanisch eintippen…"
              lang="ko"
              autoComplete="off"
            />
            <button type="submit" className="check-btn">
              Prüfen
            </button>
          </form>
        )}

        {!answerShown && !isTyping && (
          <button className="reveal-btn" onClick={() => setRevealed(true)}>
            Umdrehen
          </button>
        )}
      </div>

      {/* -------- Die 4 Bewertungs-Buttons (erst nach dem Aufdecken) -------- */}
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
      <button className="back-btn" onClick={onExit} aria-label="Zurück">
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
