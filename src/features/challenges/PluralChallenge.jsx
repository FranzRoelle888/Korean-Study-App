import { useState } from 'react'
import ClearableInput from '../../shared/ClearableInput'

/* ============================================================
   PLURAL DES TAGES (nur auf der deutschen Seite)

   Zweite Aufgabe, die sich mit den Artikeln abwechselt. Gezeigt
   wird die Einzahl, eingetippt wird die Mehrzahl.

   Der Artikel wird mitgeprüft, aber großzügig: "die Häuser" und
   "Häuser" gelten beide. Der Plural-Artikel ist immer "die", ihn
   abzufragen bringt nichts — es geht um die Wortform.

   Falsch ist nicht verloren: die richtige Form wird gezeigt, das
   Wort kommt ans Ende und muss einmal richtig eingetippt werden.
   ============================================================ */

function PluralChallenge({ rounds, alreadyDone, onComplete, onExit, t, tt }) {
  const [queue, setQueue] = useState(rounds)
  const [eingabe, setEingabe] = useState('')
  const [geprueft, setGeprueft] = useState(false)
  const total = rounds.length

  if (alreadyDone || queue.length === 0) {
    return (
      <div className="number">
        <div className="number-done">
          <div className="done-emoji">📚</div>
          <p className="done-title">{t.doneForToday}</p>
          <div className="number-recap">
            {rounds.map((r) => (
              <span className="recap-line" key={r.id}>
                {r.singular} → <b>{r.plural}</b>
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
  const sauber = eingabe.trim().replace(/\s+/g, ' ')
  const richtig =
    sauber.toLowerCase() === aktuell.plural.toLowerCase() ||
    sauber.toLowerCase() === aktuell.pluralNoun.toLowerCase()

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
        <p className="number-prompt">{t.whichPlural}</p>
        <div className="article-word" lang="de">
          {aktuell.singular}
        </div>
        <p className="article-meaning">{aktuell.en}</p>

        {geprueft ? (
          <div className={richtig ? 'plural-result plural-ok' : 'plural-result plural-bad'}>
            <span className="plural-answer" lang="de">
              {aktuell.plural}
            </span>
            <span className="plural-note">{richtig ? t.correct : t.pluralWrong}</span>
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
              autoCapitalize="off"
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

export default PluralChallenge
