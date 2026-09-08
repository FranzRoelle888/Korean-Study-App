import { useState } from 'react'
import SatzTeil from './SatzTeil'

/* ============================================================
   TAGES-CHALLENGE für 해인 (Franz 08.09.)

   Ihr dritter Knopf hat jetzt zwei Teile — wie Franz' Challenge:
   1. das Tagesquiz (Artikel · Plural · Konjugation, wechselt täglich)
   2. fünf koreanische Sätze, die sie auf Deutsch schreibt

   Teil 1 öffnet den bestehenden Quiz-Bildschirm (die drei Quizze
   bleiben unangetastet); danach landet man wieder hier.
   Erledigt ist der Tag, wenn beide Teile einen Haken haben.
   ============================================================ */

function TagesChallengeDe({ quizTitel, quizDone, onQuizOeffnen, saetzeDone, onSaetzeDone, words, profile, onExit, t }) {
  const [saetzeFertig, setSaetzeFertig] = useState(saetzeDone)

  function satzTeilFertig() {
    if (!saetzeFertig) onSaetzeDone()
    setSaetzeFertig(true)
  }

  return (
    <div className="number tc">
      <div className="review-header">
        <button className="back-btn" onClick={onExit} aria-label={t.back}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>
        <span className="daily-label">{t.tagesChallenge}</span>
      </div>

      <div className="number-body tc-body">
        {/* ---------- Teil 1: das Tagesquiz ---------- */}
        <section className="tc-teil">
          <h2 className="tc-titel">
            <span className="tc-nr">1</span> {quizTitel}
            {quizDone && <span className="tc-haken">✓</span>}
          </h2>
          <button className="skills-entry" onClick={onQuizOeffnen}>
            <span className="skills-entry-emoji">{quizDone ? '✓' : '🃏'}</span>
            <div className="action-text">
              <span className="action-title">{quizDone ? t.doneForToday : quizTitel}</span>
              <span className="action-sub" lang="ko">
                {quizDone ? t.challengeNochmal : t.challengeQuizOeffnen}
              </span>
            </div>
          </button>
        </section>

        {/* ---------- Teil 2: fünf Sätze ---------- */}
        <section className="tc-teil">
          <h2 className="tc-titel">
            <span className="tc-nr">2</span> {t.challengeSaetze}
            {saetzeFertig && <span className="tc-haken">✓</span>}
          </h2>
          <SatzTeil
            profile={profile}
            words={words}
            onFertig={satzTeilFertig}
            onKeineSaetze={satzTeilFertig}
            t={t}
          />
        </section>

        {quizDone && saetzeFertig && (
          <button className="done-btn tc-fertig" onClick={onExit}>
            {t.back}
          </button>
        )}
      </div>
    </div>
  )
}

export default TagesChallengeDe
