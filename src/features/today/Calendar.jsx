import { StatistikInhalt } from '../profil/Statistik'
import { logout } from '../../core/auth'

/* ============================================================
   KALENDER — hinter der Wochenstreak (Umbau 06.09., Franz)

   Ein Tipp auf die Streak-Karte öffnet diese Seite: die drei
   ehrlichen Zahlen + der IMMER GETEILTE Monats-Kalender (nur
   den eigenen Fortschritt zeigen gibt es nicht mehr). Im
   Notizbuch-Theme schauen an erledigten Tagen die Tiere aus den
   Zellen (Hase = 해인, Bär = Franz, beide = halb/halb).
   ============================================================ */

function Calendar({ profile, t, words, onExit }) {
  return (
    <div className="calendar">
      <div className="review-header">
        <button className="back-btn" onClick={onExit} aria-label={t.back}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>
        <span className="daily-label" lang="ko">{t.learningDays}</span>
      </div>

      <div className="kalender-inhalt">
        <StatistikInhalt profile={profile} t={t} words={words} />
      </div>

      {/* Abmelden — bewusst unauffällig hier unten, bis es eine
          richtige Einstellungen-Seite gibt. */}
      <button className="cal-logout" onClick={() => logout()}>
        Sign out · 로그아웃
      </button>
    </div>
  )
}

export default Calendar
