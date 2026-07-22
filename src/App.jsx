import './App.css'

/* ============================================================
   STARTSEITE der Koreanisch-App (Schritt 1)

   Ein "Baustein" (React-Komponente) heißt hier App. Er beschreibt,
   WAS auf dem Bildschirm zu sehen ist. Alles zwischen return( ... )
   ist eine HTML-ähnliche Beschreibung der Oberfläche ("JSX").

   Die Zahlen unten (Streak, offene Wiederholungen, Name) sind noch
   PLATZHALTER. In späteren Schritten kommen sie aus der Datenbank.
   ============================================================ */

// --- Platzhalter-Daten (später aus der Datenbank) ---
const name = 'Franz'
const streakDays = 7
const reviewsRemaining = 12
const dailyWordDone = false // wurde die Vokabel des Tages heute schon gemacht?

// Die letzten 7 Tage: true = an dem Tag gelernt. Nur zur Anzeige.
const lastWeek = [true, true, false, true, true, true, false]
const weekdayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function App() {
  return (
    <div className="screen">
      {/* ---------- Kopfbereich: Begrüßung + Streak ---------- */}
      <header className="header">
        <div className="greeting">
          <p className="greeting-hello">안녕하세요, {name} 👋</p>
          <p className="greeting-sub">Bereit für heute?</p>
        </div>

        {/* Streak-Karte */}
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

      {/* ---------- Hauptbereich: die zwei großen Buttons ---------- */}
      <main className="actions">
        {/* Button 1: Vokabel des Tages */}
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

        {/* Button 2: Wiederholen */}
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
      </main>

      {/* ---------- Untere Leiste: Navigation ---------- */}
      <nav className="tabbar">
        <button className="tab tab-active">
          <HomeIcon />
          <span>Start</span>
        </button>
        <button className="tab">
          <BookIcon />
          <span>Bibliothek</span>
        </button>
      </nav>
    </div>
  )
}

/* ============================================================
   Icons als kleine SVG-Bausteine. So bleiben wir unabhängig von
   externen Icon-Bibliotheken (nichts muss nachgeladen werden).
   ============================================================ */

function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d="M12 2c1 3-1 4-2 6-1 1.5-1 3 .5 4 .8-.6 1-1.6 1-2.5 2 1.5 3 3.5 3 5.5a5.5 5.5 0 1 1-11 0c0-2.3 1.3-4.2 2.8-5.8C10.6 6.8 12 5 12 2z" />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
    </svg>
  )
}

function CardsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="6" width="13" height="14" rx="2" />
      <path d="M8 3h9a2 2 0 0 1 2 2v11" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5M5 9.5V20h14V9.5" />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h11a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H4z" />
      <path d="M4 4v13.5" />
    </svg>
  )
}

export default App
