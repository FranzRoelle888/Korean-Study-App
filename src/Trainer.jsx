import { useState } from 'react'
import TrainerChat from './TrainerChat'
import { ChevronIcon } from './icons'

/* ============================================================
   TRAINER — Startbildschirm (Modus-Menü)

   v1 nach Konzept: Szenario-Gespräche (endlich, mit Abschluss)
   und endloses Freigespräch. Lückentext und Grammatik-Aufgaben
   folgen als eigene Stufen — hier stehen bewusst KEINE toten
   Knöpfe dafür.
   ============================================================ */

/* Szenario-Karten für die koreanische Seite (Franz). Die deutsche
   Liste folgt, wenn der Trainer sich bei ihm bewährt hat. */
const SCENARIOS_KO = [
  { id: 'cafe', emoji: '☕', title: 'Order at a café', ko: '카페에서 주문하기' },
  { id: 'taxi', emoji: '🚕', title: 'Taking a taxi in Seoul', ko: '택시 타기' },
  { id: 'restaurant', emoji: '🍜', title: 'At a restaurant', ko: '식당에서' },
  { id: 'market', emoji: '🛒', title: 'Shopping at the market', ko: '시장에서 장보기' },
  { id: 'day', emoji: '💬', title: 'How was your day?', ko: '오늘 하루 어땠어요?' },
  { id: 'partner', emoji: '❤️', title: 'Chat with 해인', ko: '여자친구랑 대화' },
]

function Trainer({ profile, t }) {
  /* null = Menü, sonst { mode, scenario, title } */
  const [aktiv, setAktiv] = useState(null)
  const [beendet, setBeendet] = useState(false)

  if (aktiv) {
    return (
      <TrainerChat
        profile={profile}
        mode={aktiv.mode}
        scenario={aktiv.scenario}
        scenarioTitle={aktiv.title}
        onDone={() => setBeendet(true)}
        onExit={() => {
          setAktiv(null)
          setBeendet(false)
        }}
        t={t}
      />
    )
  }

  return (
    <div className="screen sets-screen">
      <header className="header">
        <h1 className="sets-title">{t.trainerTitle}</h1>
        <p className="sets-sub">{t.trainerSub}</p>
      </header>

      <main className="trainer-menu">
        <h3 className="sheet-block-label">{t.trainerScenarios}</h3>
        <div className="scenario-grid">
          {SCENARIOS_KO.map((s) => (
            <button
              className="scenario-card"
              key={s.id}
              onClick={() =>
                setAktiv({ mode: 'scenario', scenario: `${s.title} (${s.ko})`, title: s.title })
              }
            >
              <span className="scenario-emoji">{s.emoji}</span>
              <span className="scenario-title">{s.title}</span>
              <span className="scenario-ko" lang="ko">
                {s.ko}
              </span>
            </button>
          ))}
        </div>

        <h3 className="sheet-block-label trainer-free-label">{t.trainerFreeLabel}</h3>
        <button
          className="action action-secondary trainer-free"
          onClick={() => setAktiv({ mode: 'free', scenario: '', title: t.trainerFree })}
        >
          <span className="scenario-emoji">🗣️</span>
          <div className="action-text">
            <span className="action-title">{t.trainerFree}</span>
            <span className="action-sub">{t.trainerFreeSub}</span>
          </div>
          <ChevronIcon />
        </button>
      </main>
    </div>
  )
}

export default Trainer
