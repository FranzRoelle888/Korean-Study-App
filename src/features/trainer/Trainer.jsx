import { useEffect, useState } from 'react'
import TrainerChat, { readActiveChat } from './TrainerChat'
import Lueckentext from '../ueben/Lueckentext'
import GrammatikModus from '../ueben/GrammatikModus'
import Schreibwerkstatt from '../ueben/Schreibwerkstatt'
import ArtikelSwipe from '../ueben/ArtikelSwipe'
import ClearableInput from '../../shared/ClearableInput'
import { naechsteGrammatikPunkte, grammatikFokusText } from '../../core/grammatikStand'

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

function Trainer({ profile, t, onChatActive, onAddWord }) {
  /* null = Menü, sonst { mode, scenario, title }.
     Läuft noch ein Gespräch (Tab-Wechsel mittendrin), landet man
     direkt wieder darin statt im Menü. */
  const [aktiv, setAktiv] = useState(() => readActiveChat(profile.id))
  /* Lückentext-Übung (aus der Aufgaben-Bank) */
  const [zeigeLueckentext, setZeigeLueckentext] = useState(false)
  const [zeigeGrammatik, setZeigeGrammatik] = useState(false)
  const [zeigeSchreiben, setZeigeSchreiben] = useState(false)
  const [zeigeArtikel, setZeigeArtikel] = useState(false)
  /* Aufgaben-Werkstatt (Franz 06.09.): Thema tippen oder die nächsten
     drei offenen Grammatikpunkte nehmen, dann Chat im Modus 'aufgaben' */
  const [zeigeAufgaben, setZeigeAufgaben] = useState(false)
  const [thema, setThema] = useState('')
  const [laedtFokus, setLaedtFokus] = useState(false)

  function starteAufgaben(fokus, titel) {
    setZeigeAufgaben(false)
    setThema('')
    setAktiv({ mode: 'aufgaben', scenario: fokus, title: `🎯 ${titel || t.modeAufgaben}` })
  }

  async function starteGrammatikAufgaben() {
    setLaedtFokus(true)
    try {
      const punkte = await naechsteGrammatikPunkte(profile.id, 3)
      if (!punkte.length) {
        starteAufgaben('', t.modeAufgaben)
        return
      }
      starteAufgaben(grammatikFokusText(punkte), punkte.map((g) => g.muster).join(' · '))
    } finally {
      setLaedtFokus(false)
    }
  }

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

  if (zeigeLueckentext) {
    return <Lueckentext profile={profile} t={t} onExit={() => setZeigeLueckentext(false)} />
  }

  if (zeigeGrammatik) {
    return <GrammatikModus profile={profile} t={t} onExit={() => setZeigeGrammatik(false)} />
  }

  if (zeigeSchreiben) {
    return <Schreibwerkstatt profile={profile} t={t} onExit={() => setZeigeSchreiben(false)} onAddWord={onAddWord} />
  }

  if (zeigeArtikel) {
    return <ArtikelSwipe profile={profile} t={t} onExit={() => setZeigeArtikel(false)} />
  }

  if (zeigeAufgaben) {
    return (
      <div className="screen sets-screen">
        <div className="review-header">
          <button className="back-btn" onClick={() => setZeigeAufgaben(false)} aria-label={t.back}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 6-6 6 6 6" />
            </svg>
          </button>
          <span className="daily-label">🎯 {t.modeAufgaben}</span>
        </div>
        <main className="aw">
          <p className="aw-hinweis">{t.aufgabenHinweis}</p>
          <form
            className="type-area"
            onSubmit={(e) => {
              e.preventDefault()
              starteAufgaben(thema.trim(), thema.trim() || t.modeAufgaben)
            }}
          >
            <ClearableInput
              autoFocus
              value={thema}
              onChange={(e) => setThema(e.target.value)}
              onClear={() => setThema('')}
              placeholder={t.aufgabenThemaPlatzhalter}
              autoComplete="off"
              maxLength={200}
            />
            <button type="submit" className="check-btn">
              {t.aufgabenStart}
            </button>
          </form>
          <p className="aw-oder">{t.aufgabenOder}</p>
          <button className="skills-entry" onClick={starteGrammatikAufgaben} disabled={laedtFokus}>
            <span className="skills-entry-emoji">📖</span>
            <div className="action-text">
              <span className="action-title">{t.aufgabenGrammatik}</span>
              <span className="action-sub">{t.aufgabenGrammatikSub}</span>
            </div>
          </button>
        </main>
      </div>
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
          {/* Aufgaben-Werkstatt: gezielte Übungen aus dem eigenen Wortschatz */}
          <button className="mode-card" onClick={() => setZeigeAufgaben(true)}>
            <span className="mode-emoji">🎯</span>
            <span className="mode-title">{t.modeAufgaben}</span>
            <span className="mode-sub">{t.modeAufgabenSub}</span>
          </button>

          <button className="mode-card" onClick={() => setZeigeLueckentext(true)}>
            <span className="mode-emoji">✏️</span>
            <span className="mode-title">{t.modeGap}</span>
            <span className="mode-sub">{t.modeGapSub}</span>
          </button>

          <button className="mode-card" onClick={() => setZeigeGrammatik(true)}>
            <span className="mode-emoji">📖</span>
            <span className="mode-title">{t.modeGrammar}</span>
            <span className="mode-sub">{t.modeGrammarSub}</span>
          </button>

          <button className="mode-card" onClick={() => setZeigeSchreiben(true)}>
            <span className="mode-emoji">✍️</span>
            <span className="mode-title">{t.modeWrite}</span>
            <span className="mode-sub">{t.modeWriteSub}</span>
          </button>

          {/* Artikel-Swipe gibt es nur auf der deutschen Seite —
              Koreanisch kennt keine Artikel. Vorerst hier zum
              Testen; ersetzt später das Artikel-Quiz auf Heute. */}
          {profile.id === 'de' && (
            <button className="mode-card" onClick={() => setZeigeArtikel(true)}>
              <span className="mode-emoji">🃏</span>
              <span className="mode-title">{t.modeArtikel}</span>
              <span className="mode-sub">{t.modeArtikelSub}</span>
            </button>
          )}
        </div>

        {/* "Grammatik mitteilen" wohnt seit 02.09. im Profil-Tab */}
      </main>
    </div>
  )
}

export default Trainer
