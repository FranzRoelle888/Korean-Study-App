import { useEffect, useState } from 'react'
import { loadDailyLog, loadPartnerLog, computeStreak, doneDaysSet } from '../../core/storage'
import { PROFILES, otherProfile, istNotizbuch } from '../../core/profiles'
import { BaerIcon, HaseIcon } from '../../shared/sticker'
import { targetTextFor } from '../../shared/i18n'
import { istMotor, stufenFuer, vorratKandidaten } from '../../core/motor'

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

export function StatistikInhalt({ profile, t, words, cards = [], vorrat = [] }) {
  /* Vokabel-Motor V2 (Franz): Wörter je Stufe + Vorratsstand */
  const motor = istMotor(profile.id)
  let stufenZahlen = null
  if (motor) {
    const s = stufenFuer(cards)
    const alle = Object.values(s)
    stufenZahlen = {
      erkennen: alle.filter((x) => x.erkennen > 0).length,
      produktion: alle.filter((x) => x.produktion > 0).length,
      hoeren: alle.filter((x) => x.hoeren > 0).length,
      vorrat: vorratKandidaten(vorrat, words, 9999).length,
    }
  }
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
    /* Lade-Schimmer in der Form des Inhalts (Premium-Runde 06.09.) */
    return (
      <>
        <div className="stat-reihe">
          <div className="stat-chip skelett" style={{ height: 66 }} />
          <div className="stat-chip skelett" style={{ height: 66 }} />
          <div className="stat-chip skelett" style={{ height: 66 }} />
        </div>
        <div className="stat-kalender skelett" style={{ height: 300 }} />
      </>
    )
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

      {/* Vokabel-Motor V2: Wörter je Stufe + Vorrat (nur Franz) */}
      {stufenZahlen && (
        <div className="stat-reihe stat-stufen">
          <div className="stat-chip">
            <span className="stat-zahl">👀 {stufenZahlen.erkennen}</span>
            <span className="stat-label">{t.stufeErkennen}</span>
          </div>
          <div className="stat-chip">
            <span className="stat-zahl">✍️ {stufenZahlen.produktion}</span>
            <span className="stat-label">{t.stufeProduktion}</span>
          </div>
          <div className="stat-chip">
            <span className="stat-zahl">👂 {stufenZahlen.hoeren}</span>
            <span className="stat-label">{t.stufeHoeren}</span>
          </div>
          <div className="stat-chip">
            <span className="stat-zahl">📦 {stufenZahlen.vorrat}</span>
            <span className="stat-label">{t.statsVorrat}</span>
          </div>
        </div>
      )}

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
          {cells.map((c, i) => {
            if (!c) return <div key={`e${i}`} className="cal-empty" />
            /* Notizbuch (Entscheidung Franz 06.09.): an erledigten
               Tagen verschwindet die Zahl — stattdessen schauen
               die Tiere aus der Zelle (beide = halb/halb). */
            const notiz = istNotizbuch(profile.id)
            const tier = notiz && (c.ich || c.er)
            return (
              <div
                key={c.iso}
                className={
                  'cal-day' +
                  (tier
                    ? ' stat-tier'
                    : c.ich && c.er ? ' stat-beide' : c.ich ? ' stat-ich' : c.er ? ' stat-er' : '') +
                  (c.today ? ' cal-today' : '')
                }
              >
                {tier ? (
                  c.ich && c.er ? (
                    <>
                      <HaseIcon size={16} dreh={-4} />
                      <BaerIcon size={16} dreh={4} />
                    </>
                  ) : c.ich ? (
                    <HaseIcon size={22} dreh={-3} />
                  ) : (
                    <BaerIcon size={22} dreh={3} />
                  )
                ) : (
                  c.d
                )}
              </div>
            )
          })}
        </div>

        {/* Legende mit Monats-Zählern — sofort durchblicken */}
        <div className="stat-legende">
          {istNotizbuch(profile.id) ? (
            <>
              <span className="stat-legende-eintrag">
                <HaseIcon size={17} dreh={-3} /> {profile.name} · {t.statsMonthDays(ichMonat)}
              </span>
              <span className="stat-legende-eintrag">
                <BaerIcon size={17} dreh={3} /> {partnerName} · {t.statsMonthDays(erMonat)}
              </span>
            </>
          ) : (
            <>
              <span className="stat-legende-eintrag">
                <span className="stat-farbe stat-farbe-ich" /> {profile.name} · {t.statsMonthDays(ichMonat)}
              </span>
              <span className="stat-legende-eintrag">
                <span className="stat-farbe stat-farbe-er" /> {partnerName} · {t.statsMonthDays(erMonat)}
              </span>
            </>
          )}
        </div>
      </div>
    </>
  )
}
