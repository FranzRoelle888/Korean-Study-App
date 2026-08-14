/* ============================================================
   Deutschland-Motive: Flagge, Kölner Dom (Home-Icon) und
   Stadtsilhouette. Reine SVG, kein externes Paket — Stil wie
   src/icons.jsx. Farben absichtlich als Literale: dieses File
   ist die einzige Stelle mit Motiv-Farben.
   ============================================================ */

const SKY_FAR = '#e7e5e0'   /* hintere Dachlinie */
const SKY_MID = '#d9d6cf'   /* Dom + Fernsehturm */
const SKY_NEAR = '#c8c4bb'  /* Tor + Häuserzeile */
const CRANE = '#a9a49a'     /* Kraniche */

/* --- Deutschlandflagge, 30x20 im Header (.header, rechts oben) --- */
export function GermanFlag({ width = 30 }) {
  return (
    <svg viewBox="0 0 36 24" width={width} height={(width / 36) * 24}
      style={{ flex: 'none', boxShadow: '0 1px 3px rgba(32,30,29,.22)' }} aria-hidden="true">
      <rect width="36" height="8" fill="#201e1d" />
      <rect y="8" width="36" height="8" fill="#ec3013" />
      <rect y="16" width="36" height="8" fill="#d9a521" />
    </svg>
  )
}

/* --- Kölner Dom: ersetzt HomeIcon in src/icons.jsx (strokeWidth 1.8) --- */
export function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 21V10l1.6-6L10.2 10v11" />
      <path d="M13.8 21V10L15.4 4 17 10v11" />
      <path d="M10.2 13h3.6" />
      <path d="M10.2 21h3.6v-6h-3.6z" />
      <path d="M4.5 21h15" />
    </svg>
  )
}

/* --- Stadtband für den Home-Screen ---
   Als letztes Kind von .screen einhängen. Voraussetzung:
   .screen { position: relative }  und  Inhalt: position: relative; z-index: 1
   Der Verlaufsstreifen lässt die Silhouette in die Tab-Bar auslaufen. */
export function SkylineBand() {
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 74, pointerEvents: 'none' }} aria-hidden="true">
      <svg viewBox="0 0 390 74" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
        {/* hintere Dachlinie mit Giebeln */}
        <path fill={SKY_FAR} d="M0 74 L0 52 L18 52 L26 44 L34 52 L52 52 L52 46 L70 46 L70 40 L78 40 L78 52 L104 52 L112 43 L120 52 L150 52 L150 47 L168 47 L168 52 L196 52 L204 44 L212 52 L240 52 L240 48 L262 48 L262 52 L290 52 L298 43 L306 52 L334 52 L334 47 L356 47 L356 52 L390 52 L390 74 Z" />
        {/* Kölner Dom: zwei Türme mit Langhaus */}
        <path fill={SKY_MID} d="M212 74 L212 32 L217 10 L222 32 L222 44 L236 44 L236 32 L241 10 L246 32 L246 74 Z" />
        {/* Fernsehturm */}
        <rect x="336" y="26" width="4" height="48" fill={SKY_MID} />
        <circle cx="338" cy="24" r="6.5" fill={SKY_MID} />
        <rect x="337.2" y="5" width="1.6" height="13" fill={SKY_MID} />
        {/* Kraniche */}
        <path d="M264 20 q6.4 -6 12.8 0 q6.4 -6 12.8 0" fill="none" stroke={CRANE} strokeWidth="1.7" strokeLinecap="round" />
        <path d="M298 13 q4.3 -4.1 8.6 0 q4.3 -4.1 8.6 0" fill="none" stroke={CRANE} strokeWidth="1.7" strokeLinecap="round" />
        {/* Haus links, Zeile mit Kirchturm in der Mitte */}
        <path fill={SKY_NEAR} d="M0 74 L0 60 L14 60 L20 53 L26 60 L26 74 Z" />
        <path fill={SKY_NEAR} d="M126 74 L126 61 L146 61 L146 74 Z M154 74 L154 57 L160 51 L166 57 L166 74 Z M174 74 L174 62 L192 62 L192 74 Z" />
        {/* Brandenburger Tor: Gebälk, Quadriga, fünf Säulen */}
        <path fill={SKY_NEAR} d="M42 58 L110 58 L110 63 L42 63 Z" />
        <path fill={SKY_NEAR} d="M66 51 L86 51 L86 58 L66 58 Z" />
        <path fill={SKY_NEAR} d="M68 47 L70 47 L70 51 L68 51 Z M73 46 L75 46 L75 51 L73 51 Z M78 47 L80 47 L80 51 L78 51 Z M83 48 L85 48 L85 51 L83 51 Z" />
        <path fill={SKY_NEAR} d="M46 63 L51 63 L51 74 L46 74 Z M60 63 L65 63 L65 74 L60 74 Z M74 63 L79 63 L79 74 L74 74 Z M88 63 L93 63 L93 74 L88 74 Z M102 63 L107 63 L107 74 L102 74 Z" />
        <rect x="0" y="70" width="390" height="4" fill={SKY_NEAR} />
      </svg>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 30, background: 'linear-gradient(180deg, rgba(237,235,231,0) 0%, rgba(237,235,231,.75) 55%, #edebe7 100%)' }} />
    </div>
  )
}

/* --- Kleine Silhouette für den Fuß der Lernkarte ---
   In .flashcard / .daily-card einhängen (Karte: position:relative; overflow:hidden). */
export function CardSkyline() {
  return (
    <svg viewBox="0 0 342 60" preserveAspectRatio="none"
      style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 60 }} aria-hidden="true">
      <path fill="#edeae4" d="M0 60 L0 44 L20 44 L27 37 L34 44 L58 44 L58 40 L76 40 L76 44 L104 44 L112 36 L120 44 L152 44 L152 39 L170 39 L170 44 L206 44 L206 40 L228 40 L228 44 L262 44 L270 36 L278 44 L306 44 L306 39 L326 39 L326 44 L342 44 L342 60 Z" />
      <path fill="#e4e0d9" d="M176 60 L176 28 L180 11 L184 28 L184 36 L195 36 L195 28 L199 11 L203 28 L203 60 Z" />
      <rect x="292" y="26" width="3" height="34" fill="#e4e0d9" />
      <circle cx="293.5" cy="24" r="5" fill="#e4e0d9" />
      <path d="M36 20 q5.4 -5.1 10.9 0 q5.4 -5.1 10.9 0" fill="none" stroke="#c6c1b8" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M66 13 q3.7 -3.4 7.4 0 q3.7 -3.4 7.4 0" fill="none" stroke="#c6c1b8" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}
