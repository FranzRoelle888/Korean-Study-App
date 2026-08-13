import { setList } from './setsData'
import { ChevronIcon } from './icons'

/* ============================================================
   SETS — Übersicht der Themen-Blätter

   Nur ein Menü: jede Karte führt auf ein Nachschlage-Blatt.
   Nichts davon berührt den Lernstapel oder die Datenbank.
   ============================================================ */

function Sets({ onOpen }) {
  return (
    <div className="screen sets-screen">
      <header className="header">
        <h1 className="sets-title">Sets</h1>
        <p className="sets-sub">Topic sheets to look things up</p>
      </header>

      <main className="set-grid">
        {setList.map((s) => (
          <button className="set-card" key={s.id} onClick={() => onOpen(s.id)}>
            <div className="set-card-top">
              <span className="set-card-ko" lang="ko">
                {s.ko}
              </span>
              <span className="set-card-count">{s.count}</span>
            </div>
            <span className="set-card-title">{s.title}</span>
            <span className="set-card-hint">{s.hint}</span>
            <span className="set-card-go">
              <ChevronIcon />
            </span>
          </button>
        ))}
      </main>
    </div>
  )
}

export default Sets
