import { useState } from 'react'
import Skills from '../trainer/Skills'
import Kalibrierung from '../kalibrierung/Kalibrierung'
import { exportCsv } from '../cards/Library'
import { ChevronIcon } from '../../shared/icons'

/* ============================================================
   PROFIL — der persönliche Bereich (Wunsch Franz, 02.09.)

   Ganz rechts in der Tab-Leiste, auf BEIDEN Seiten. Hier wohnt
   alles, was nicht Lernen ist:
   - Grammatik mitteilen (der Upload per Text/Foto — zog aus dem
     Trainer hierher um; auf 해인s Seite war er vorher gar nicht
     erreichbar)
   - Einstufung starten/wiederholen (Kalibrierung)
   - Sicherung exportieren (CSV — Umzug aus dem Wörterbuch)
   Künftige Einstellungen (Immersions-Grad, Pensum …) kommen
   ebenfalls hierher.
   ============================================================ */

function Profil({ profile, t, words, cards }) {
  /* null = Menü | 'skills' | 'gramcheck' | 'kalibrierung' */
  const [offen, setOffen] = useState(null)

  if (offen === 'skills') {
    return (
      <Skills
        profile={profile}
        t={t}
        onBack={() => setOffen(null)}
        onGramCheck={() => setOffen('gramcheck')}
      />
    )
  }

  if (offen === 'gramcheck') {
    return (
      <Kalibrierung profile={profile} t={t} nurGrammatik onExit={() => setOffen(null)} />
    )
  }

  if (offen === 'kalibrierung') {
    return <Kalibrierung profile={profile} t={t} onExit={() => setOffen(null)} />
  }

  return (
    <div className="screen sets-screen">
      <header className="header">
        <h1 className="sets-title">{t.profilTitel}</h1>
        <p className="sets-sub">{t.profilSub}</p>
      </header>

      <main className="trainer-menu">
        <button className="skills-entry" onClick={() => setOffen('skills')}>
          <span className="skills-entry-emoji">📚</span>
          <div className="action-text">
            <span className="action-title">{t.skillsTitle}</span>
            <span className="action-sub">{t.skillsEntrySub}</span>
          </div>
          <ChevronIcon />
        </button>

        <button className="skills-entry" onClick={() => setOffen('kalibrierung')}>
          <span className="skills-entry-emoji">🧭</span>
          <div className="action-text">
            <span className="action-title">{t.profilEinstufung}</span>
            <span className="action-sub">{t.profilEinstufungSub}</span>
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
            <span className="action-sub">{t.profilExportSub}</span>
          </div>
          <ChevronIcon />
        </button>
      </main>
    </div>
  )
}

export default Profil
