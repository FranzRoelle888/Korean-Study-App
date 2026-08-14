/* ============================================================
   Alle Icons an einem Ort, als kleine SVG-Bausteine.
   So können Startseite und Bibliothek dieselben Icons benutzen,
   ohne eine externe Icon-Bibliothek nachzuladen.
   ============================================================ */

export function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d="M12 2c1 3-1 4-2 6-1 1.5-1 3 .5 4 .8-.6 1-1.6 1-2.5 2 1.5 3 3.5 3 5.5a5.5 5.5 0 1 1-11 0c0-2.3 1.3-4.2 2.8-5.8C10.6 6.8 12 5 12 2z" />
    </svg>
  )
}

export function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
    </svg>
  )
}

export function CardsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="6" width="13" height="14" rx="2" />
      <path d="M8 3h9a2 2 0 0 1 2 2v11" />
    </svg>
  )
}

export function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

/* Hanok-Tor: geschwungenes Dach auf drei Säulen. */
export function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 11.5C6 5.5 18 5.5 22 11.5" />
      <path d="M7 11.5v8M12 11.5v8M17 11.5v8" />
      <path d="M4.5 19.5h15" />
    </svg>
  )
}

/* Vier Kacheln — steht für die Themen-Sets. */
export function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </svg>
  )
}

export function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 6.5v14" />
      <path d="M3 5.5c2.5-1 6-1 9 1 3-2 6.5-2 9-1v13c-2.5-1-6-1-9 1-3-2-6.5-2-9-1z" />
    </svg>
  )
}

export function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  )
}

export function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  )
}

export function SuccessMark() {
  return (
    <svg width="92" height="92" viewBox="0 0 92 92" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="successGrad" x1="16" y1="16" x2="76" y2="76" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c1443b" />
          <stop offset="1" stopColor="#2a4a8b" />
        </linearGradient>
      </defs>
      <circle cx="46" cy="46" r="30" fill="url(#successGrad)" />
      <path d="M34 46.5 42.5 55 60 37" stroke="#fbf7ef" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M73 15l1.7 4.6 4.6 1.7-4.6 1.7L73 27.6l-1.7-4.6-4.6-1.7 4.6-1.7z" fill="#b4863c" />
      <circle cx="16" cy="30" r="3" fill="#2a4a8b" />
      <circle cx="24" cy="71" r="2.5" fill="#4f6b54" />
      <circle cx="73" cy="67" r="2.5" fill="#c1443b" />
    </svg>
  )
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5 10 17 19 7" />
    </svg>
  )
}

export function MoonIcon() {
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="moonGrad" x1="20" y1="20" x2="68" y2="68" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2a4a8b" />
          <stop offset="1" stopColor="#3c5f9e" />
        </linearGradient>
      </defs>
      <circle cx="44" cy="44" r="30" fill="url(#moonGrad)" />
      <circle cx="41" cy="44" r="13" fill="#fbf7ef" />
      <circle cx="47" cy="40" r="12" fill="url(#moonGrad)" />
      <circle cx="56" cy="52" r="1.8" fill="#fbf7ef" />
      <circle cx="59" cy="45" r="1.2" fill="#fbf7ef" opacity="0.85" />
      <circle cx="52" cy="59" r="1.1" fill="#fbf7ef" opacity="0.7" />
    </svg>
  )
}

export function HashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 4 7 20M17 4l-2 16M4 9h16M3 15h16" />
    </svg>
  )
}

/* ============================================================
   Korea-Motive: Flagge im Header, Bergketten als Hintergrund.
   ============================================================ */

/* Taegukgi (koreanische Flagge), klein oben rechts. */
export function KoreanFlag({ width = 30 }) {
  const bars = (kind, y) =>
    kind
      ? [<rect key={y} x="-3.5" y={y - 0.53} width="7" height="1.05" rx="0.3" />]
      : [
          <rect key={y + 'a'} x="-3.5" y={y - 0.53} width="2.75" height="1.05" rx="0.3" />,
          <rect key={y + 'b'} x="0.75" y={y - 0.53} width="2.75" height="1.05" rx="0.3" />,
        ]
  const trigram = (x, y, rot, lines) => (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} fill="#1f1b18">
      {lines.map((t, k) => bars(t, -2.1 + k * 2.1))}
    </g>
  )
  return (
    <svg
      viewBox="0 0 36 24"
      width={width}
      height={(width / 36) * 24}
      style={{ flex: 'none', borderRadius: 2, border: '1px solid rgba(31,27,24,.1)' }}
      aria-hidden="true"
    >
      <rect width="36" height="24" fill="#fbf7ef" />
      <g transform="rotate(-33.69 18 12)">
        <circle cx="18" cy="12" r="5.4" fill="#2a4a8b" />
        <path d="M12.6 12 A5.4 5.4 0 0 0 23.4 12 A2.7 2.7 0 0 1 18 12 A2.7 2.7 0 0 0 12.6 12 Z" fill="#c1443b" />
      </g>
      {trigram(8, 6.2, -59.9, [1, 1, 1])}
      {trigram(28, 6.2, 59.9, [0, 1, 0])}
      {trigram(8, 17.8, 59.9, [1, 0, 1])}
      {trigram(28, 17.8, -59.9, [0, 0, 0])}
    </svg>
  )
}

/* Deutsche Flagge, gleiche Größe wie die Taegukgi. */
export function GermanFlag({ width = 30 }) {
  return (
    <svg
      viewBox="0 0 36 24"
      width={width}
      height={(width / 36) * 24}
      style={{ flex: 'none', borderRadius: 2, border: '1px solid rgba(31,27,24,.1)' }}
      aria-hidden="true"
    >
      <rect width="36" height="8" fill="#1f1b18" />
      <rect y="8" width="36" height="8" fill="#c1443b" />
      <rect y="16" width="36" height="8" fill="#e0b040" />
    </svg>
  )
}

/* Bergkette mit Schnee und Kiefern, liegt hinter dem Inhalt am
   unteren Rand von .screen und läuft weich in die Tab-Leiste aus. */
export function MountainBand() {
  const pine = (x, base, h, w) => (
    <g key={x} fill="#9e8c71">
      <path d={`M${x} ${base - h} L${x + w} ${base} L${x - w} ${base} Z`} />
      <rect x={x - 0.6} y={base} width="1.2" height="2" />
    </g>
  )
  return (
    <div className="mountain-band" aria-hidden="true">
      <svg viewBox="0 0 390 74" preserveAspectRatio="none">
        <path d="M0 40 L56 16 L96 30 L150 8 L206 34 L262 14 L318 36 L390 20 L390 74 L0 74 Z" fill="#e7dece" />
        <path d="M150 8 L141 20 L146 18 L151 22 L157 17 L162 20 Z" fill="#faf6ee" />
        <path d="M262 14 L254 24 L258 22 L263 26 L268 21 L273 24 Z" fill="#faf6ee" />
        <path d="M0 56 L48 38 L102 52 L160 32 L220 50 L272 36 L326 54 L390 45 L390 74 L0 74 Z" fill="#daceb9" />
        <path d="M160 32 L152 43 L157 41 L162 45 L167 40 L172 43 Z" fill="#f2ebdd" />
        <path d="M0 67 L62 60 L132 65 L202 58 L282 67 L348 61 L390 65 L390 74 L0 74 Z" fill="#cbbba0" />
        {pine(84, 62, 8, 3.6)}
        {pine(95, 63, 6, 2.8)}
        {pine(250, 63, 7, 3.2)}
      </svg>
      <div className="mountain-fade" />
    </div>
  )
}

/* Kleine Bergkante mit Vogelpaar für den Fuß der Lernkarte. */
export function CardRidge() {
  const bird = (x, y, s) => (
    <path
      key={x}
      d={`M${x} ${y} q${(3.2 * s).toFixed(1)} ${(-3 * s).toFixed(1)} ${(6.4 * s).toFixed(1)} 0 q${(3.2 * s).toFixed(1)} ${(-3 * s).toFixed(1)} ${(6.4 * s).toFixed(1)} 0`}
      fill="none"
      stroke="#b0a188"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  )
  return (
    <svg className="card-ridge" viewBox="0 0 342 60" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 46 L62 22 L112 44 L172 12 L230 42 L288 20 L342 40 L342 60 L0 60 Z" fill="#efe5d3" />
      <path d="M172 12 L162 22 L167 20 L172 24 L178 19 L184 23 Z" fill="#fbf8f1" />
      {bird(36, 20, 1.7)}
      {bird(66, 13, 1.15)}
    </svg>
  )
}

/* ============================================================
   Icons für die Themen-Sets. Gleicher Strichstil wie oben,
   damit sie sich nicht vom Rest der App abheben.
   ============================================================ */

/* Gemeinsames Grundgerüst — spart bei acht Icons viel Wiederholung. */
function SetIcon({ children }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

/* Zählstriche — für die Zahlen */
export function TallyIcon() {
  return (
    <SetIcon>
      <path d="M5 5v14M10 5v14M15 5v14M19 5v14" />
      <path d="M3 8l18 8" />
    </SetIcon>
  )
}

export function CalendarIcon() {
  return (
    <SetIcon>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </SetIcon>
  )
}

/* Sprechblase — für die Pronomen (über Personen reden) */
export function SpeechIcon() {
  return (
    <SetIcon>
      <path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-6.5A8 8 0 0 1 11 4h2a8 8 0 0 1 8 8z" />
    </SetIcon>
  )
}

/* Strichfigur — für die Körperteile */
export function BodyIcon() {
  return (
    <SetIcon>
      <circle cx="12" cy="4.5" r="2.5" />
      <path d="M12 7v8M6 10h12M12 15l-3.5 6M12 15l3.5 6" />
    </SetIcon>
  )
}

export function PaletteIcon() {
  return (
    <SetIcon>
      <path d="M12 3a9 9 0 1 0 0 18 2 2 0 0 0 1.6-3.2 2 2 0 0 1 1.6-3.2H19a2.6 2.6 0 0 0 2.6-2.6C21.6 6.7 17.3 3 12 3z" />
      <circle cx="7.5" cy="11" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="11" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" />
    </SetIcon>
  )
}

/* Zwei Köpfe nebeneinander — für die Familie */
export function FamilyIcon() {
  return (
    <SetIcon>
      <circle cx="8" cy="7" r="3" />
      <circle cx="17" cy="8.5" r="2.3" />
      <path d="M2.5 20v-1.5A5.5 5.5 0 0 1 8 13a5.5 5.5 0 0 1 5.5 5.5V20" />
      <path d="M15.5 20v-1a4 4 0 0 1 6-3.4" />
    </SetIcon>
  )
}

export function ClockIcon() {
  return (
    <SetIcon>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6.5V12l4 2.5" />
    </SetIcon>
  )
}

/* Schale mit Stäbchen — für das Essens-Set */
export function BowlIcon() {
  return (
    <SetIcon>
      <path d="M3 12h18a9 9 0 0 1-9 9 9 9 0 0 1-9-9z" />
      <path d="M14 3.5 8.5 9M17.5 5 12 10.5" />
    </SetIcon>
  )
}

export function GlobeIcon() {
  return (
    <SetIcon>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.6 2.6 4 5.7 4 9s-1.4 6.4-4 9c-2.6-2.6-4-5.7-4-9s1.4-6.4 4-9z" />
    </SetIcon>
  )
}

export function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}
