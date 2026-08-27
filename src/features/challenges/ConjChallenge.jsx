import { useState } from 'react'
import ClearableInput from '../../shared/ClearableInput'

/* ============================================================
   KONJUGATION DES TAGES (nur auf der deutschen Seite)

   Dritte Aufgabe der Rotation. Gezeigt werden Person und
   Grundform ("du" + "fahren"), eingetippt wird die Form
   ("fährst"). Trennbare Verben verlangen beide Teile
   ("stehe auf").

   Falsch ist nicht verloren: die richtige Form wird gezeigt, das
   Verb kommt ans Ende der Runde zurück.
   ============================================================ */

function ConjChallenge({ rounds, alreadyDone, onComplete, onExit, t, tt }) {
  const [queue, setQueue] = useState(rounds)
  const [eingabe, setEingabe] = useState('')
  const [geprueft, setGeprueft] = useState(false)
  const total = rounds.length

  if (alreadyDone || queue.length === 0) {
    return (
      <div className="number">
        <div className="number-done">
          <div className="done-emoji">✍️</div>
          <p className="done-title">{t.doneForToday}</p>
          <div className="number-recap">
            {rounds.map((r) => (
              <span className="recap-line" key={r.id}>
                {r.person}: <b>{r.answer}</b> ({r.verb})
              </span>
            ))}
          </div>
          <button className="done-btn" onClick={onExit}>
            {t.back}
          </button>
        </div>
      </div>
    )
  }

  const aktuell = queue[0]
  const sauber = eingabe.trim().replace(/\s+/g, ' ').toLowerCase()
  const richtig = sauber === aktuell.answer.trim().toLowerCase()

  function pruefen(e) {
    e.preventDefault()
    if (geprueft) return
    setGeprueft(true)
    setTimeout(
      () => {
        setQueue((q) => (richtig ? q.slice(1) : [...q.slice(1), q[0]]))
        setEingabe('')
        setGeprueft(false)
        if (richtig && queue.length === 1) onComplete()
      },
      richtig ? 650 : 1600
    )
  }

  const done = total - queue.length

  return (
    <div className="number">
      <div className="review-header">
        <button className="back-btn" onClick={onExit} aria-label={t.back}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>
        <div className="progress">
          <div className="progress-bar" style={{ width: `${(done / total) * 100}%` }} />
        </div>
        <span className="progress-count">
          {done}/{total}
        </span>
      </div>

      <div className="number-body">
        <p className="number-prompt">{t.whichConj}</p>
        <span className="conj-chip" lang="de">
          {aktuell.person}
        </span>
        <div className="article-word" lang="de">
          {aktuell.verb}
        </div>
        <p className="article-meaning">{aktuell.en}</p>

        {geprueft ? (
          <div className={richtig ? 'plural-result plural-ok' : 'plural-result plural-bad'}>
            <span className="plural-answer" lang="de">
              {aktuell.answer}
            </span>
            <span className="plural-note">{richtig ? t.correct : t.conjWrong}</span>
          </div>
        ) : (
          <form className="type-area" onSubmit={pruefen}>
            <ClearableInput
              autoFocus
              value={eingabe}
              onChange={(e) => setEingabe(e.target.value)}
              onClear={() => setEingabe('')}
              placeholder={tt.typePlaceholder}
              lang="de"
              autoComplete="off"
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

export default ConjChallenge
