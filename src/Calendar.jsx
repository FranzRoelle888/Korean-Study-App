import { useState } from 'react'
import { doneDaysSet } from './storage'

/* ============================================================
   CALENDAR – shows which days you completed all daily tasks.
   ============================================================ */

const pad = (n) => String(n).padStart(2, '0')
// Wochentage Mo–So auf Koreanisch (die Woche startet hier montags)
const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

function Calendar({ log, onExit }) {
  const done = doneDaysSet(log)
  const [offset, setOffset] = useState(0) // 0 = current month, -1 = previous …

  const base = new Date()
  const view = new Date(base.getFullYear(), base.getMonth() + offset, 1)
  const year = view.getFullYear()
  const month = view.getMonth()
  // Monat/Jahr auf Koreanisch, z.B. "2026년 7월"
  const monthName = `${year}년 ${month + 1}월`

  const todayIso = `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`
  const startWeekday = (new Date(year, month, 1).getDay() + 6) % 7 // 0 = Monday
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${pad(month + 1)}-${pad(d)}`
    cells.push({ d, iso, done: done.has(iso), today: iso === todayIso })
  }

  const doneThisMonth = cells.filter((c) => c && c.done).length

  return (
    <div className="calendar">
      <div className="review-header">
        <button className="back-btn" onClick={onExit} aria-label="Back">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>
        <span className="daily-label">Your learning days</span>
      </div>

      <div className="cal-nav">
        <button className="cal-arrow" onClick={() => setOffset((o) => o - 1)} aria-label="Previous month">
          ‹
        </button>
        <span className="cal-month">{monthName}</span>
        <button
          className="cal-arrow"
          onClick={() => setOffset((o) => Math.min(0, o + 1))}
          disabled={offset >= 0}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="cal-grid cal-head">
        {WEEKDAYS.map((w) => (
          <span key={w} className="cal-wd">
            {w}
          </span>
        ))}
      </div>

      <div className="cal-grid">
        {cells.map((c, i) =>
          c ? (
            <div
              key={c.iso}
              className={
                'cal-day' + (c.done ? ' cal-done' : '') + (c.today ? ' cal-today' : '')
              }
            >
              {c.d}
            </div>
          ) : (
            <div key={`e${i}`} className="cal-empty" />
          )
        )}
      </div>

      <p className="cal-summary">
        {doneThisMonth} {doneThisMonth === 1 ? 'day' : 'days'} completed this month
      </p>
    </div>
  )
}

export default Calendar
