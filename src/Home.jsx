import { FlameIcon, SparkIcon, CardsIcon, ChevronIcon } from './icons'

/* ============================================================
   STARTSEITE (Begrüßung, Streak, zwei Aktions-Buttons)
   Bekommt von außen "vocabCount" (Anzahl Vokabeln) übergeben.
   Streak- und Wiederholungszahlen sind noch Platzhalter.
   ============================================================ */

const name = 'Franz'
const streakDays = 7
const reviewsRemaining = 12
const dailyWordDone = false

const lastWeek = [true, true, false, true, true, true, false]
const weekdayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function Home({ vocabCount }) {
  return (
    <div className="screen">
      {/* ---------- Begrüßung + Streak ---------- */}
      <header className="header">
        <div className="greeting">
          <p className="greeting-hello">안녕하세요, {name} 👋</p>
          <p className="greeting-sub">Bereit für heute?</p>
        </div>

        <div className="streak-card">
          <div className="streak-top">
            <FlameIcon />
            <span className="streak-count">{streakDays}</span>
            <span className="streak-label">Tage in Folge</span>
          </div>
          <div className="streak-days">
            {lastWeek.map((done, i) => (
              <div key={i} className="streak-day">
                <div className={done ? 'dot dot-on' : 'dot'} />
                <span className="dot-label">{weekdayLabels[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ---------- Zwei große Buttons ---------- */}
      <main className="actions">
        <button className="action action-primary">
          <div className="action-icon">
            <SparkIcon />
          </div>
          <div className="action-text">
            <span className="action-title">Vokabel des Tages</span>
            <span className="action-sub">
              {dailyWordDone ? 'Heute schon erledigt ✓' : 'Eine neue Vokabel lernen'}
            </span>
          </div>
          <ChevronIcon />
        </button>

        <button className="action action-secondary">
          <div className="action-icon action-icon-accent">
            <CardsIcon />
          </div>
          <div className="action-text">
            <span className="action-title">Wiederholen</span>
            <span className="action-sub">
              {reviewsRemaining > 0
                ? `Noch ${reviewsRemaining} heute offen`
                : 'Alles erledigt für heute ✓'}
            </span>
          </div>
          {reviewsRemaining > 0 && <span className="badge">{reviewsRemaining}</span>}
        </button>

        <p className="vocab-count-note">{vocabCount} Vokabeln in deiner Bibliothek</p>
      </main>
    </div>
  )
}

export default Home
