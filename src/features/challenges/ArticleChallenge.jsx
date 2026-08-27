import { useState } from 'react'

/* ============================================================
   ARTIKEL DES TAGES (nur auf der deutschen Seite)

   Fünf Substantive aus der eigenen Bibliothek, jeweils ohne
   Artikel gezeigt. Man tippt der / die / das an.

   Wie bei der Zahl des Tages gilt: falsch ist nicht verloren.
   Die richtige Antwort wird gezeigt, das Wort kommt aber ans Ende
   der Runde zurück und muss einmal richtig beantwortet werden.
   ============================================================ */

const ARTICLES = ['der', 'die', 'das']

function ArticleChallenge({ rounds, alreadyDone, onComplete, onExit, t }) {
  const [queue, setQueue] = useState(rounds)
  const [picked, setPicked] = useState(null)
  const total = rounds.length

  if (alreadyDone || queue.length === 0) {
    return (
      <div className="number">
        <div className="number-done">
          <div className="done-emoji">🇩🇪</div>
          <p className="done-title">{t.doneForToday}</p>
          <div className="number-recap">
            {rounds.map((r) => (
              <span className="recap-line" key={r.noun}>
                <b>{r.article}</b> {r.noun}
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

  const current = queue[0]
  const correct = picked === current.article

  function choose(a) {
    if (picked) return
    setPicked(a)
    /* Richtig -> raus aus der Runde. Falsch -> ans Ende, damit man
       es noch einmal sieht. */
    setTimeout(() => {
      setQueue((q) => (a === current.article ? q.slice(1) : [...q.slice(1), q[0]]))
      setPicked(null)
      if (a === current.article && queue.length === 1) onComplete()
    }, a === current.article ? 550 : 1400)
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
        <p className="number-prompt">{t.whichArticle}</p>
        <div className="article-word" lang="de">
          {current.noun}
        </div>
        <p className="article-meaning">{current.en}</p>

        <div className="article-picks">
          {ARTICLES.map((a) => {
            let cls = 'article-pick'
            if (picked) {
              if (a === current.article) cls += ' article-pick-ok'
              else if (a === picked) cls += ' article-pick-bad'
            }
            return (
              <button key={a} className={cls} onClick={() => choose(a)} lang="de">
                {a}
              </button>
            )
          })}
        </div>

        {picked && !correct && (
          <p className="add-msg add-error">{t.articleWrong(current.article)}</p>
        )}
      </div>
    </div>
  )
}

export default ArticleChallenge
