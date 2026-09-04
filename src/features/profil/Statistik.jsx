import { useEffect, useState } from 'react'
import { loadDailyLog, loadPartnerLog, computeStreak, doneDaysSet } from '../../core/storage'
import { PROFILES, otherProfile } from '../../core/profiles'
import { targetTextFor } from '../../shared/i18n'

/* ============================================================
   STATISTIK — der gemeinsame Lern-Kalender (Wunsch Franz, 05.09.)

   Liegt seit dem Profil-Umbau OFFEN im persönlichen Bereich
   (nicht mehr hinter einem Knopf). Drei ehrliche Zahlen und der
   Monats-Kalender, in dem BEIDE sichtbar sind. Im Notizbuch-
   Theme tragen die Vierecke die Tierfarben: Hase-Weiß = sie,
   Bär-Braun = er, gemeinsame Tage diagonal geteilt.
   Partner-Log über die dokumentierte Ausnahme loadPartnerLog()
   NUR GELESEN — Profiltrennung bleibt heilig. Kein Vergleich,
   keine Wertung (Zielbild: Kalender verbinden, keine Pflichten).
   ============================================================ */

const pad = (n) => String(n).padStart(2, '0')

export function StatistikInhalt({ profile, t, words }) {
  const tt = targetTextFor(profile.targetLang)
  const [log, setLog] = useState(null) /* null = lädt */
  const [partnerLog, setPartnerLog] = useState([])
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    let weg = false
    Promise.all([loadDailyLog(), loadPartnerLog()]).then(([eigen, partner]) => {
      if (weg) return
      setLog(eigen)
      setPartnerLog(partner)
    })
    return () => {
      weg = true
    }
  }, [profile.id])

  if (log === null) {
    return <p className="a2-radar-leer" lang="ko">달력을 여는 중…</p>
  }

  const partnerName = PROFILES[otherProfile(profile.id)].name
  const eigene = doneDaysSet(log)
  const partner = doneDaysSet(partnerLog)
  const streak = computeStreak(log)

  /* ---------- Monatsraster (Montag zuerst, wie im Streak-Kalender) */
  const base = new Date()
  const view = new Date(base.getFullYear(), base.getMonth() + offset, 1)
  const year = view.getFullYear()
  const month = view.getMonth()
  const todayIso = `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`
  const startWeekday = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${pad(month + 1)}-${pad(d)}`
    cells.push({ d, iso, ich: eigene.has(iso), er: partner.has(iso), today: iso === todayIso })
  }

  const ichMonat = cells.filter((c) => c && c.ich).length
  const erMonat = cells.filter((c) => c && c.er).length

  return (
    <>
      {/* ---------- Drei ehrliche Zahlen ---------- */}
      <div className="stat-reihe">
        <div className="stat-chip">
          <span className="stat-zahl">🔥 {streak}</span>
          <span className="stat-label" lang="ko">{t.statsStreak}</span>
        </div>
        <div className="stat-chip">
          <span className="stat-zahl">📚 {words.length}</span>
          <span className="stat-label" lang="ko">{t.statsWords}</span>
        </div>
        <div className="stat-chip">
          <span className="stat-zahl">✅ {eigene.size}</span>
          <span className="stat-label" lang="ko">{t.statsDays}</span>
        </div>
      </div>

      {/* ---------- Gemeinsamer Kalender ---------- */}
      <div className="stat-kalender">
        <div className="cal-nav">
          <button className="cal-arrow" onClick={() => setOffset((o) => o - 1)} aria-label={t.prevMonth}>
            ‹
          </button>
          <span className="cal-month">{tt.monthLabel(year, month)}</span>
          <button
            className="cal-arrow"
            onClick={() => setOffset((o) => Math.min(0, o + 1))}
            disabled={offset >= 0}
            aria-label={t.nextMonth}
          >
            ›
          </button>
        </div>

        <div className="cal-grid cal-head">
          {tt.calWeekdays.map((w) => (
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
                  'cal-day' +
                  (c.ich && c.er ? ' stat-beide' : c.ich ? ' stat-ich' : c.er ? ' stat-er' : '') +
                  (c.today ? ' cal-today' : '')
                }
              >
                {c.d}
              </div>
            ) : (
              <div key={`e${i}`} className="cal-empty" />
            )
          )}
        </div>

        {/* Legende mit Monats-Zählern — sofort durchblicken */}
        <div className="stat-legende">
          <span className="stat-legende-eintrag">
            <span className="stat-farbe stat-farbe-ich" /> {profile.name} · {t.statsMonthDays(ichMonat)}
          </span>
          <span className="stat-legende-eintrag">
            <span className="stat-farbe stat-farbe-er" /> {partnerName} · {t.statsMonthDays(erMonat)}
          </span>
        </div>
      </div>
    </>
  )
}
