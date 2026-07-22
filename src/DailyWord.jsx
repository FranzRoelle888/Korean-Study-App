import { useState } from 'react'

/* ============================================================
   VOKABEL DES TAGES

   Zeigt die heutige(n) neue(n) Vokabel(n). Für jede musst du das
   Wort 3× korrekt auf Koreanisch eintippen – danach wird es sofort
   in die Bibliothek + auf den Wiederholungsstapel übernommen.

   Props:
   - candidates: die heute einzuführenden Pool-Einträge (Snapshot)
   - onIntroduce(entry): speichert das Wort (Bibliothek + Cloud)
   - onExit(): zurück zur Startseite
   ============================================================ */

const NEEDED = 3 // so oft korrekt eintippen

function DailyWord({ candidates, onIntroduce, onExit }) {
  const [queue] = useState(candidates) // beim Start festgehalten
  const [index, setIndex] = useState(0)
  const [typed, setTyped] = useState(0) // wie oft schon korrekt getippt
  const [input, setInput] = useState('')
  const [wrong, setWrong] = useState(false)
  const [learned, setLearned] = useState(0) // wie viele heute geschafft

  const entry = queue[index]

  // Nichts (mehr) zu tun
  if (!entry) {
    const nothingAtAll = queue.length === 0
    return (
      <div className="daily">
        <DailyHeader onExit={onExit} label="Vokabel des Tages" />
        <div className="daily-done">
          <div className="done-emoji">{nothingAtAll ? '☕' : '🌱'}</div>
          <p className="done-title">
            {nothingAtAll ? 'Für heute erledigt' : `${learned} neue gelernt!`}
          </p>
          <p className="done-sub">
            {nothingAtAll
              ? 'Komm morgen wieder für neue Vokabeln.'
              : 'Sie sind jetzt in deiner Bibliothek und auf dem Stapel.'}
          </p>
          <button className="done-btn" onClick={onExit}>
            Zurück zur Startseite
          </button>
        </div>
      </div>
    )
  }

  function submit(e) {
    e.preventDefault()
    if (input.trim() === entry.ko.trim()) {
      const n = typed + 1
      setInput('')
      setWrong(false)
      if (n >= NEEDED) {
        onIntroduce(entry) // speichern (Bibliothek + Cloud)
        setLearned((l) => l + 1)
        setTyped(0)
        setIndex((i) => i + 1)
      } else {
        setTyped(n)
      }
    } else {
      setWrong(true)
      setInput('')
    }
  }

  return (
    <div className="daily">
      <DailyHeader onExit={onExit} label={`Neue Vokabel ${index + 1}/${queue.length}`} />

      <div className="daily-body">
        {/* Die neue Vokabel + Beispielsatz */}
        <div className="daily-card">
          <div className="daily-ko" lang="ko">
            {entry.ko}
          </div>
          {entry.roman && <div className="daily-roman">{entry.roman}</div>}
          <div className="daily-en">{entry.en}</div>
          {entry.ex && (
            <div className="daily-example">
              <span lang="ko">{entry.ex}</span>
              <span className="daily-example-en">{entry.exEn}</span>
            </div>
          )}
        </div>

        {/* 3× eintippen */}
        <form className="type-area" onSubmit={submit}>
          <div className="type-progress">
            {Array.from({ length: NEEDED }).map((_, i) => (
              <span key={i} className={i < typed ? 'tp-dot tp-on' : 'tp-dot'} />
            ))}
            <span className="type-hint">{typed}/{NEEDED} · auf Koreanisch eintippen</span>
          </div>
          <input
            autoFocus
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setWrong(false)
            }}
            placeholder="한국어…"
            lang="ko"
            autoComplete="off"
            className={wrong ? 'shake' : ''}
          />
          {wrong && <p className="add-msg add-error">Stimmt noch nicht – versuch's nochmal.</p>}
          <button type="submit" className="check-btn">
            Bestätigen
          </button>
        </form>
      </div>
    </div>
  )
}

function DailyHeader({ onExit, label }) {
  return (
    <div className="review-header">
      <button className="back-btn" onClick={onExit} aria-label="Zurück">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <span className="daily-label">{label}</span>
    </div>
  )
}

export default DailyWord
