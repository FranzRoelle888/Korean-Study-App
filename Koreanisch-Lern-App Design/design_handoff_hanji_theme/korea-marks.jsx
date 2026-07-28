/* ============================================================
   Korea-Motive für die App: Flagge, Hanok-Tor (Home-Icon) und
   Bergsilhouetten. Stil wie src/icons.jsx: reine SVG, kein
   externes Paket. In icons.jsx einfügen oder als eigene Datei
   importieren.
   ============================================================ */

/* --- Taegukgi (Flagge), 30x20 im Header --- */
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

/* --- Hanok-Tor: ersetzt HomeIcon in icons.jsx (gleiche Strichstärke wie BookIcon) --- */
export function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 11.5C6 5.5 18 5.5 22 11.5" />
      <path d="M7 11.5v8M12 11.5v8M17 11.5v8" />
      <path d="M4.5 19.5h15" />
    </svg>
  )
}

/* --- Bergkette für den Home-Screen ---
   Absolut am unteren Rand von .screen, in voller Breite:
   .screen { position: relative }
   Das SVG bekommt position:absolute; bottom:0; left:0; right:0;
   und liegt hinter dem Inhalt (z-index:0, Inhalt z-index:1).
   Der Verlaufsstreifen darüber lässt die Berge in die Tab-Bar auslaufen. */
export function MountainBand() {
  const pine = (x, base, h, w) => (
    <g key={x} fill="#9e8c71">
      <path d={`M${x} ${base - h} L${x + w} ${base} L${x - w} ${base} Z`} />
      <rect x={x - 0.6} y={base} width="1.2" height="2" />
    </g>
  )
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 74, pointerEvents: 'none' }} aria-hidden="true">
      <svg viewBox="0 0 390 74" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
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
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 30, background: 'linear-gradient(180deg, rgba(248,243,233,0) 0%, rgba(248,243,233,.75) 55%, #f8f3e9 100%)' }} />
    </div>
  )
}

/* --- Kleine Bergkante + Vogelpaar für den Fuß der Lernkarte ---
   In .flashcard / .daily-card einhängen (Karte: position:relative; overflow:hidden). */
export function CardRidge() {
  const bird = (x, y, s) => (
    <path key={x} d={`M${x} ${y} q${(3.2 * s).toFixed(1)} ${(-3 * s).toFixed(1)} ${(6.4 * s).toFixed(1)} 0 q${(3.2 * s).toFixed(1)} ${(-3 * s).toFixed(1)} ${(6.4 * s).toFixed(1)} 0`} fill="none" stroke="#b0a188" strokeWidth="1.7" strokeLinecap="round" />
  )
  return (
    <svg viewBox="0 0 342 60" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 60 }} aria-hidden="true">
      <path d="M0 46 L62 22 L112 44 L172 12 L230 42 L288 20 L342 40 L342 60 L0 60 Z" fill="#efe5d3" />
      <path d="M172 12 L162 22 L167 20 L172 24 L178 19 L184 23 Z" fill="#fbf8f1" />
      {bird(36, 20, 1.7)}
      {bird(66, 13, 1.15)}
    </svg>
  )
}
