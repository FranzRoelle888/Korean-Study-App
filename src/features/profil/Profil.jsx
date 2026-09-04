import { useState } from 'react'
import Skills from '../trainer/Skills'
import Kalibrierung from '../kalibrierung/Kalibrierung'
import Fortschritt from '../today/Fortschritt'
import { exportCsv } from '../cards/Library'
import { ChevronIcon } from '../../shared/icons'

/* ============================================================
   PROFIL — der persönliche Bereich (Umbau 05.09., Wunsch Franz)

   Aufbau:
   - Die STATISTIK liegt OFFEN obenauf (Zahlen + gemeinsamer
     Lern-Kalender) — nicht hinter einem Knopf versteckt.
   - „Meine Grammatik" bündelt ALLES Grammatik-bezogene:
     Niveau-Fortschritt (zog aus dem Hauptmenü hierher),
     Einstufungs-Kompass und „Grammatik mitteilen".
   - Sicherung exportieren (CSV) bleibt als eigener Eintrag.
   ============================================================ */

function Profil({ profile, t, words, cards }) {
  /* null = Übersicht | 'grammatik' | 'skills' | 'gramcheck' | 'kalibrierung' */
  const [offen, setOffen] = useState(null)

  if (offen === 'skills') {
    return (
      <Skills
        profile={profile}
        t={t}
        onBack={() => setOffen('grammatik')}
        onGramCheck={() => setOffen('gramcheck')}
      />
    )
  }

  if (offen === 'gramcheck') {
    return (
      <Kalibrierung profile={profile} t={t} nurGrammatik onExit={() => setOffen('grammatik')} />
    )
  }

  if (offen === 'kalibrierung') {
    return <Kalibrierung profile={profile} t={t} onExit={() => setOffen('grammatik')} />
  }

  /* ---------- Meine Grammatik: Fortschritt + Kompass + Mitteilen */
  if (offen === 'grammatik') {
    return (
      <div className="screen sets-screen">
        <div className="review-header">
          <button className="back-btn" onClick={() => setOffen(null)} aria-label={t.back}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 6-6 6 6 6" />
            </svg>
          </button>
          <span className="daily-label">📖 {t.profilGrammatik}</span>
        </div>

        <main className="trainer-menu">
          <Fortschritt profile={profile} t={t} />

          <button className="skills-entry" onClick={() => setOffen('kalibrierung')}>
            <span className="skills-entry-emoji">🧭</span>
            <div className="action-text">
              <span className="action-title">{t.profilEinstufung}</span>
              <span className="action-sub" lang="ko">{t.profilEinstufungSub}</span>
            </div>
            <ChevronIcon />
          </button>

          <button className="skills-entry" onClick={() => setOffen('skills')}>
            <span className="skills-entry-emoji">📚</span>
            <div className="action-text">
              <span className="action-title">{t.skillsTitle}</span>
              <span className="action-sub" lang="ko">{t.skillsEntrySub}</span>
            </div>
            <ChevronIcon />
          </button>
        </main>
      </div>
    )
  }

  /* ---------- Übersicht ---------- */
  return (
    <div className="screen sets-screen">
      <header className="header">
        <h1 className="sets-title">{t.profilTitel}</h1>
        <p className="sets-sub" lang="ko">{t.profilSub}</p>
      </header>

      <main className="trainer-menu profil-menue">
        {/* Die Statistik zog weiter: sie liegt jetzt hinter der
            Wochenstreak im Hauptmenü (Entscheidung Franz 06.09.) */}
        <button className="skills-entry" onClick={() => setOffen('grammatik')}>
          <span className="skills-entry-emoji">📖</span>
          <div className="action-text">
            <span className="action-title">{t.profilGrammatik}</span>
            <span className="action-sub" lang="ko">{t.profilGrammatikSub}</span>
          </div>
          <ChevronIcon />
        </button>

        <button
          className="skills-entry"
          onClick={() => exportCsv(words, cards, profile.id)}
        >
          <span className="skills-entry-emoji">💾</span>
          <div className="action-text">
            <span className="action-title">{t.exportCsv}</span>
            <span className="action-sub" lang="ko">{t.profilExportSub}</span>
          </div>
          <ChevronIcon />
        </button>
      </main>
    </div>
  )
}

export default Profil
