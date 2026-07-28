import { useMemo } from 'react'

/* ============================================================
   Kleines Konfetti – ganz ohne externe Bibliothek.
   Erzeugt viele bunte Schnipsel mit zufälliger Position, Farbe,
   Drehung und Fallzeit. Läuft einmal ab (beim Anzeigen).
   ============================================================ */

const COLORS = ['#c1443b', '#2a4a8b', '#4f6b54', '#b4863c', '#d97a5f', '#3c5f9e', '#cbbba0']

function Confetti({ count = 90 }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2.2 + Math.random() * 1.8,
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 6,
        drift: (Math.random() * 2 - 1) * 50,
        spin: 360 + Math.random() * 540,
      })),
    [count]
  )

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: `${p.size}px`,
            height: `${p.size * 0.45 + 3}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            '--drift': `${p.drift}px`,
            '--spin': `${p.spin}deg`,
          }}
        />
      ))}
    </div>
  )
}

export default Confetti
