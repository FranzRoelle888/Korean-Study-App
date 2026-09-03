/* ============================================================
   STICKER — die SVG-Assets des Notizbuch-Themes
   (Claude-Design-Spec „Haein Handoff", 05.09., Abschnitt 5)

   Regeln aus dem Playbook: Sticker sind immer „gestanzt"
   (weißer Rand bzw. Kontur + drop-shadow) und leicht rotiert.
   Bär & Hase erscheinen AUSSCHLIESSLICH als Tagesmarker in der
   Wochenzeile (Entscheidung Franz: dort, nirgendwo sonst),
   nie als Button, nie animiert. Stern nur in Erfolgs-Momenten.
   Rollen: Haein = Hase, Franz = Bär (global festgelegt).
   Der Mund wird erst ab ~36px gezeigt (mitMund) — in der
   kleinen Wochenzeile bleiben die Gesichter ohne.
   ============================================================ */

const SCHATTEN = { filter: 'drop-shadow(0 1px 2px rgba(74,60,110,.25))' }

export function BaerIcon({ size = 26, mitMund = false, dreh = -5 }) {
  return (
    <svg width={size} height={size * (30 / 32)} viewBox="0 0 32 30" style={{ ...SCHATTEN, transform: `rotate(${dreh}deg)` }} aria-hidden="true">
      <circle cx="8" cy="8" r="4.5" fill="#e9d4bb" stroke="#fffdf7" strokeWidth="1.6" />
      <circle cx="24" cy="8" r="4.5" fill="#e9d4bb" stroke="#fffdf7" strokeWidth="1.6" />
      <path
        d="M16.2 6.6c7-.3 12.3 4.3 12.2 10.7-.1 6.7-5.6 11.3-12.6 11.1C9 28.2 3.6 23.9 3.7 17.2 3.8 10.8 9.2 6.9 16.2 6.6z"
        fill="#e9d4bb" stroke="#fffdf7" strokeWidth="1.6" strokeLinejoin="round"
      />
      <circle cx="11.5" cy="15" r="1.4" fill="#3a3145" />
      <circle cx="20.5" cy="15" r="1.4" fill="#3a3145" />
      {mitMund && (
        <path d="M14.3 18.7c.6.7 1.2.9 1.8.8.6.1 1.3-.1 1.9-.9" fill="none" stroke="#3a3145" strokeWidth="1.2" strokeLinecap="round" />
      )}
      <circle cx="8.6" cy="18.6" r="2" fill="#f4b8c1" opacity=".75" />
      <circle cx="23.4" cy="18.6" r="2" fill="#f4b8c1" opacity=".75" />
    </svg>
  )
}

export function HaseIcon({ size = 26, mitMund = false, dreh = 5 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ ...SCHATTEN, transform: `rotate(${dreh}deg)` }} aria-hidden="true">
      <path
        d="M10.8 2.8c2.5-.3 4.3 1.9 4.4 5 .1 3-1.4 5.4-3.8 5.6-2.4.2-4.2-2-4.3-5.1-.1-2.9 1.4-5.2 3.7-5.5z"
        fill="#fffdf7" stroke="#d9cfbf" strokeWidth="1.4" strokeLinejoin="round" transform="rotate(-10 11 8)"
      />
      <path
        d="M21.2 2.8c-2.5-.3-4.3 1.9-4.4 5-.1 3 1.4 5.4 3.8 5.6 2.4.2 4.2-2 4.3-5.1.1-2.9-1.4-5.2-3.7-5.5z"
        fill="#fffdf7" stroke="#d9cfbf" strokeWidth="1.4" strokeLinejoin="round" transform="rotate(10 21 8)"
      />
      <path
        d="M16.2 11.7c6.7-.2 11.5 3.8 11.4 9.4-.1 5.7-5.2 9.7-11.6 9.5-6.2-.2-11-4-10.9-9.6.1-5.5 4.9-9.1 11.1-9.3z"
        fill="#fffdf7" stroke="#d9cfbf" strokeWidth="1.4" strokeLinejoin="round"
      />
      <circle cx="11.5" cy="19.5" r="1.4" fill="#3a3145" />
      <circle cx="20.5" cy="19.5" r="1.4" fill="#3a3145" />
      {mitMund && (
        <path d="M14.3 22.7c.6.7 1.2.9 1.8.8.6.1 1.3-.1 1.9-.9" fill="none" stroke="#3a3145" strokeWidth="1.2" strokeLinecap="round" />
      )}
      <circle cx="8.8" cy="23" r="2" fill="#f4b8c1" opacity=".75" />
      <circle cx="23.2" cy="23" r="2" fill="#f4b8c1" opacity=".75" />
    </svg>
  )
}

/* Heute-Kringel (handgezeichneter Kreis, Slot sonst leer) */
export function HeuteKringel({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true">
      <path
        d="M17 4.5C9 4 4.5 9.5 5 17s6 12.5 12.5 12S29.5 23 29 16 24 4.5 16 5"
        fill="none" stroke="var(--primary)" strokeWidth="2.2" strokeLinecap="round"
      />
    </svg>
  )
}

/* Streak-Herz (ersetzt die Flamme; aus = Papierfarben) */
export function StreakHerz({ size = 22, aktiv = true }) {
  return (
    <svg width={size} height={size * (22 / 24)} viewBox="0 0 24 22" style={{ filter: 'drop-shadow(0 1px 1px rgba(74,60,110,.2))' }} aria-hidden="true">
      <path
        d="M12 19.4C8.4 16.8 3.6 13.4 3 9.2 2.5 6 4.6 3.7 7.4 3.8c1.9.1 3.4 1.2 4.6 3 1.2-1.8 2.8-3 4.7-2.9 2.8.1 4.8 2.5 4.3 5.7-.7 4.1-5.4 7.3-9 9.8z"
        fill={aktiv ? '#f2b9c4' : 'var(--surface-2)'}
        stroke={aktiv ? '#b44f62' : 'var(--border)'}
        strokeWidth="1.5" strokeLinejoin="round"
      />
    </svg>
  )
}

/* Kringel unter dem Gruß */
export function GrussKringel() {
  return (
    <svg width="150" height="10" viewBox="0 0 150 10" aria-hidden="true">
      <path
        d="M2 6C25 1 50 9 75 5s50-3 71 1"
        fill="none" stroke="var(--primary)" strokeWidth="2.2" strokeLinecap="round" opacity=".5"
      />
    </svg>
  )
}

/* Goldstern — NUR für Erfolgs-Momente, nicht im Kalender */
export function Goldstern({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ ...SCHATTEN, transform: 'rotate(-8deg)' }} aria-hidden="true">
      <path
        d="M12 2l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6-5.9-3.2-5.9 3.2 1.3-6.6L2.5 9l6.6-.8z"
        fill="var(--gold)" stroke="#fffdf7" strokeWidth="1.6" strokeLinejoin="round"
      />
    </svg>
  )
}
