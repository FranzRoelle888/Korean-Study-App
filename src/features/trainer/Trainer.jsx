import { useEffect, useState } from 'react'
import TrainerChat, { readActiveChat } from './TrainerChat'
import Skills from './Skills'
import Kalibrierung from '../kalibrierung/Kalibrierung'
import { ChevronIcon } from '../../shared/icons'

/* ============================================================
   TRAINER — Startbildschirm

   Vier Kacheln, eine je Modus aus dem Konzept:
     1. Alltagssituation  — die App wählt ZUFÄLLIG eine Szene aus
        dem Pool unten; niemand muss vorher etwas aussuchen.
     2. Lückentext        — noch gesperrt (spätere Stufe)
     3. Grammatik         — noch gesperrt (spätere Stufe)
     4. Freies Gespräch   — endlos; wer eine BESTIMMTE Situation
        üben will, sagt es dem Trainer hier einfach im Chat.

   Darunter: "Mein Grammatik-Stand" — die Liste, aus der der
   Trainer vor jedem Gespräch lernt, was er benutzen darf.
   ============================================================ */

/* Szenario-Pool für die koreanische Seite (Franz). Wird bei jedem
   Antippen neu ausgelost — so bleibt die Kachel eine Wundertüte. */
const SCENARIOS_KO = [
  { id: 'cafe', emoji: '☕', title: 'Order at a café', ko: '카페에서 주문하기' },
  { id: 'taxi', emoji: '🚕', title: 'Taking a taxi in Seoul', ko: '택시 타기' },
  { id: 'restaurant', emoji: '🍜', title: 'At a restaurant', ko: '식당에서' },
  { id: 'market', emoji: '🛒', title: 'Shopping at the market', ko: '시장에서 장보기' },
  { id: 'day', emoji: '💬', title: 'How was your day?', ko: '오늘 하루 어땠어요?' },
  { id: 'partner', emoji: '❤️', title: 'Chat with 해인', ko: '여자친구랑 대화' },
  { id: 'pharmacy', emoji: '💊', title: 'At the pharmacy', ko: '약국에서' },
  { id: 'directions', emoji: '🗺️', title: 'Asking for directions', ko: '길 물어보기' },
  { id: 'subway', emoji: '🚇', title: 'Taking the subway', ko: '지하철 타기' },
  { id: 'clothes', emoji: '👕', title: 'Buying clothes', ko: '옷 사기' },
  { id: 'phone', emoji: '📞', title: 'Booking a table by phone', ko: '전화로 예약하기' },
  { id: 'weekend', emoji: '🎉', title: 'Weekend plans', ko: '주말 계획' },
]

function Trainer({ profile, t, onChatActive }) {
  /* null = Menü, sonst { mode, scenario, title }.
     Läuft noch ein Gespräch (Tab-Wechsel mittendrin), landet man
     direkt wieder darin statt im Menü. */
  const [aktiv, setAktiv] = useState(() => readActiveChat(profile.id))
  const [zeigeSkills, setZeigeSkills] = useState(false)
  /* Grammatik-Check nachholen/wiederholen (aus der Skills-Seite) */
  const [zeigeGramCheck, setZeigeGramCheck] = useState(false)

  /* Der App melden, ob gerade ein Chat läuft — dann versteckt sie
     die Tab-Leiste, damit nichts über der Tastatur aufflackert. */
  useEffect(() => {
    if (onChatActive) onChatActive(!!aktiv)
    return () => {
      if (onChatActive) onChatActive(false)
    }
  }, [aktiv])

  function zufallsSzenario() {
    const s = SCENARIOS_KO[Math.floor(Math.random() * SCENARIOS_KO.length)]
    setAktiv({ mode: 'scenario', scenario: `${s.title} (${s.ko})`, title: `${s.emoji} ${s.title}` })
  }

  if (aktiv) {
    return (
      <TrainerChat
        profile={profile}
        mode={aktiv.mode}
        scenario={aktiv.scenario}
        scenarioTitle={aktiv.title}
        onDone={() => {}}
        onExit={() => setAktiv(null)}
        t={t}
      />
    )
  }

  if (zeigeGramCheck) {
    return (
      <Kalibrierung
        profile={profile}
        t={t}
        nurGrammatik
        onExit={() => setZeigeGramCheck(false)}
      />
    )
  }

  if (zeigeSkills) {
    return (
      <Skills
        profile={profile}
        t={t}
        onBack={() => setZeigeSkills(false)}
        onGramCheck={() => {
          setZeigeSkills(false)
          setZeigeGramCheck(true)
        }}
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
        <div className="mode-grid">
          <button className="mode-card" onClick={zufallsSzenario}>
            <span className="mode-emoji">🎭</span>
            <span className="mode-title">{t.modeScenario}</span>
            <span className="mode-sub">{t.modeScenarioSub}</span>
          </button>

          <button
            className="mode-card"
            onClick={() => setAktiv({ mode: 'free', scenario: '', title: t.modeFree })}
          >
            <span className="mode-emoji">🗣️</span>
            <span className="mode-title">{t.modeFree}</span>
            <span className="mode-sub">{t.modeFreeSub}</span>
          </button>

          <div className="mode-card mode-locked" aria-disabled="true">
            <span className="mode-badge">{t.comingSoon}</span>
            <span className="mode-emoji">✏️</span>
            <span className="mode-title">{t.modeGap}</span>
            <span className="mode-sub">{t.modeGapSub}</span>
          </div>

          <div className="mode-card mode-locked" aria-disabled="true">
            <span className="mode-badge">{t.comingSoon}</span>
            <span className="mode-emoji">📖</span>
            <span className="mode-title">{t.modeGrammar}</span>
            <span className="mode-sub">{t.modeGrammarSub}</span>
          </div>
        </div>

        <button className="skills-entry" onClick={() => setZeigeSkills(true)}>
          <span className="skills-entry-emoji">📚</span>
          <div className="action-text">
            <span className="action-title">{t.skillsTitle}</span>
            <span className="action-sub">{t.skillsEntrySub}</span>
          </div>
          <ChevronIcon />
        </button>
      </main>
    </div>
  )
}

export default Trainer
