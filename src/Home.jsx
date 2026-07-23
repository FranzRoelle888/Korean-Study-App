import { FlameIcon, SparkIcon, CardsIcon, ChevronIcon, HashIcon, CheckIcon } from './icons'

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
          <h1 className="greeting-hello">
            <span className="greeting-ko" lang="ko">
              안녕하세요
            </span>
            <span className="greeting-name">{name}</span>
          </h1>
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
              <div key={d.day} className={d.isToday ? 'streak-day streak-day-today' : 'streak-day'}>
                <div className={d.done ? 'dot dot-on' : 'dot'} />
                <span className="dot-label" lang="ko">
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </button>
      </header>

      {/* ---------- Three action buttons ---------- */}
      <main className="actions">
        <button
          className={dailyDone ? 'action action-secondary' : 'action action-full action-full-purple'}
          onClick={onDaily}
        >
          <div className="action-icon">
            <SparkIcon />
          </div>
          <div className="action-text">
            <span className="action-title">Word of the Day</span>
            <span className="action-sub" lang="ko">
              오늘의 단어
            </span>
          </div>
          {dailyDone ? (
            <span className="done-check">
              <CheckIcon />
            </span>
          ) : (
            <ChevronIcon />
          )}
        </button>

        <button
          className={dueCount > 0 ? 'action action-full action-full-orange' : 'action action-secondary'}
          onClick={onReview}
        >
          <div className="action-icon action-icon-accent">
            <CardsIcon />
          </div>
          <div className="action-text">
            <span className="action-title">Review</span>
            <span className="action-sub" lang="ko">
              복습
            </span>
          </div>
          {dueCount > 0 ? (
            <span className="badge">{dueCount}</span>
          ) : (
            <span className="done-check">
              <CheckIcon />
            </span>
          )}
        </button>

        <button
          className={numberDone ? 'action action-secondary' : 'action action-full action-full-green'}
          onClick={onNumber}
        >
          <div className="action-icon action-icon-number">
            <HashIcon />
          </div>
          <div className="action-text">
            <span className="action-title">Number of the Day</span>
            <span className="action-sub" lang="ko">
              오늘의 숫자
            </span>
          </div>
          {numberDone ? (
            <span className="done-check">
              <CheckIcon />
            </span>
          ) : (
            <ChevronIcon />
          )}
        </button>

        <p className="vocab-count-note">{vocabCount} words in your library</p>
      </main>
    </div>
  )
}

export default Home
