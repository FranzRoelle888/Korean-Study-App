import { FlameIcon, SparkIcon, CardsIcon, ChevronIcon, HashIcon } from './icons'

/* ============================================================
   HOME SCREEN (greeting, streak, three action buttons)
   ============================================================ */

const name = 'Franz'

function Home({
  vocabCount,
  dueCount,
  dailyDone,
  dailyLeft,
  numberDone,
  streak,
  week,
  onReview,
  onDaily,
  onNumber,
  onCalendar,
}) {
  return (
    <div className="screen">
      {/* ---------- Greeting + streak ---------- */}
      <header className="header">
        <div className="greeting">
          <p className="greeting-hello">안녕하세요, {name} 👋</p>
          <p className="greeting-sub">Ready for today?</p>
        </div>

        <button className="streak-card" onClick={onCalendar}>
          <div className="streak-top">
            <FlameIcon />
            <span className="streak-count">{streak}</span>
            <span className="streak-label">day streak</span>
            <ChevronIcon />
          </div>
          <div className="streak-days">
            {week.map((d) => (
              <div key={d.day} className="streak-day">
                <div className={d.done ? 'dot dot-on' : 'dot'} />
                <span className="dot-label">{d.label}</span>
              </div>
            ))}
          </div>
        </button>
      </header>

      {/* ---------- Three action buttons ---------- */}
      <main className="actions">
        <button className="action action-primary" onClick={onDaily}>
          <div className="action-icon">
            <SparkIcon />
          </div>
          <div className="action-text">
            <span className="action-title">Word of the Day</span>
            <span className="action-sub">
              {dailyDone
                ? 'Done for today ✓'
                : `Learn ${dailyLeft} new ${dailyLeft === 1 ? 'word' : 'words'}`}
            </span>
          </div>
          <ChevronIcon />
        </button>

        <button className="action action-secondary" onClick={onReview}>
          <div className="action-icon action-icon-accent">
            <CardsIcon />
          </div>
          <div className="action-text">
            <span className="action-title">Review</span>
            <span className="action-sub">
              {dueCount > 0 ? `${dueCount} left today` : 'All done for today ✓'}
            </span>
          </div>
          {dueCount > 0 && <span className="badge">{dueCount}</span>}
        </button>

        <button className="action action-secondary" onClick={onNumber}>
          <div className="action-icon action-icon-number">
            <HashIcon />
          </div>
          <div className="action-text">
            <span className="action-title">Number of the Day</span>
            <span className="action-sub">
              {numberDone ? 'Done for today ✓' : 'Type a number in Korean'}
            </span>
          </div>
          {!numberDone && <ChevronIcon />}
        </button>

        <p className="vocab-count-note">{vocabCount} words in your library</p>
      </main>
    </div>
  )
}

export default Home
