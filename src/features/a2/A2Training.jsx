import { useState } from 'react'
import ArtikelSwipe from '../ueben/ArtikelSwipe'

/* ============================================================
   A2-TRAINING — der Prüfungs-Reiter (A2-Sprint, Phase 0)

   해인s Steuerzentrale für die Goethe-Vorbereitung:
   - Oben der Stärken-Radar (füllt sich, sobald Übungen
     A2-Belege schreiben — Phase 5 macht daraus die Prognose)
   - Darunter das Gitter aller Aufgabentypen. Jeder Typ wird
     einzeln freigeschaltet, sobald sein Konzept mit Franz
     abgenommen und gebaut ist (Roadmap docs/A2-ROADMAP.md).

   Jeder Aufgabentyp bekommt beim ersten Öffnen sein Lernblatt
   (shared/Lernblatt.jsx) — danach jederzeit übers ⓘ.
   ============================================================ */

/* Reihenfolge = Roadmap-Phasen. aktiv:false zeigt die Kachel
   ausgegraut mit "kommt bald" — sie verschwindet nicht, damit
   der Fahrplan sichtbar ist. */
const UEBUNGEN = [
  { id: 'artikel', emoji: '🃏', titel: 'Artikel-Spiel', sub: 'der · die · das', aktiv: true },
  { id: 'schreiben', emoji: '✉️', titel: 'SMS & E-Mail', sub: 'Schreiben Teil 1+2', aktiv: false },
  { id: 'hoeren', emoji: '🎧', titel: 'Hören', sub: 'wie in der Prüfung', aktiv: false },
  { id: 'sprechen', emoji: '🎤', titel: 'Sprechen', sub: 'Fragen · Erzählen · Planen', aktiv: false },
  { id: 'lesen', emoji: '📖', titel: 'Lesen', sub: 'Texte & Anzeigen', aktiv: false },
  { id: 'satzbau', emoji: '🧱', titel: 'Satz-Baukasten', sub: 'Wörter richtig ordnen', aktiv: false },
  { id: 'redemittel', emoji: '💬', titel: 'Redemittel', sub: 'die wichtigen Formeln', aktiv: false },
]

function A2Training({ profile, t }) {
  const [offen, setOffen] = useState(null)

  if (offen === 'artikel') {
    return <ArtikelSwipe profile={profile} t={t} onExit={() => setOffen(null)} />
  }

  return (
    <div className="screen sets-screen">
      <header className="header">
        <h1 className="sets-title">{t.a2Titel}</h1>
        <p className="sets-sub">{t.a2Sub}</p>
      </header>

      <main className="trainer-menu">
        {/* Stärken-Radar: Platzhalter, bis die Übungen Belege
            schreiben (Roadmap Phase 5) */}
        <div className="a2-radar">
          <p className="a2-radar-titel">📊 {t.a2RadarTitel}</p>
          <p className="a2-radar-leer">{t.a2RadarLeer}</p>
        </div>

        <div className="mode-grid">
          {UEBUNGEN.map((u) => (
            <button
              key={u.id}
              className={u.aktiv ? 'mode-card' : 'mode-card a2-bald'}
              onClick={() => u.aktiv && setOffen(u.id)}
              disabled={!u.aktiv}
            >
              <span className="mode-emoji">{u.emoji}</span>
              <span className="mode-title">{u.titel}</span>
              <span className="mode-sub">{u.aktiv ? u.sub : t.a2Folgt}</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}

export default A2Training
