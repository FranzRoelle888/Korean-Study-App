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

export function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5M5 9.5V20h14V9.5" />
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
          <stop stopColor="#5b4bff" />
          <stop offset="1" stopColor="#ff7a59" />
        </linearGradient>
      </defs>
      <circle cx="46" cy="46" r="30" fill="url(#successGrad)" />
      <path d="M34 46.5 42.5 55 60 37" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M73 15l1.7 4.6 4.6 1.7-4.6 1.7L73 27.6l-1.7-4.6-4.6-1.7 4.6-1.7z" fill="#f2c94c" />
      <circle cx="16" cy="30" r="3" fill="#56ccf2" />
      <circle cx="24" cy="71" r="2.5" fill="#2e9e6b" />
      <circle cx="73" cy="67" r="2.5" fill="#ff7a59" />
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
          <stop stopColor="#5b4bff" />
          <stop offset="1" stopColor="#7a6bff" />
        </linearGradient>
      </defs>
      <circle cx="44" cy="44" r="30" fill="url(#moonGrad)" />
      <circle cx="41" cy="44" r="13" fill="#fff" />
      <circle cx="47" cy="40" r="12" fill="url(#moonGrad)" />
      <circle cx="56" cy="52" r="1.8" fill="#fff" />
      <circle cx="59" cy="45" r="1.2" fill="#fff" opacity="0.85" />
      <circle cx="52" cy="59" r="1.1" fill="#fff" opacity="0.7" />
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

export function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}
