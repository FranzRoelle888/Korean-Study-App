import { setList } from './setsData'
import { setListDe } from './setsDataDe'
import { istNotizbuch } from '../../core/profiles'
import {
  ChevronIcon,
  TallyIcon,
  CalendarIcon,
  SpeechIcon,
  BodyIcon,
  PaletteIcon,
  FamilyIcon,
  ClockIcon,
  BowlIcon,
  LayersIcon,
  GlobeIcon,
} from '../../shared/icons'

/* ============================================================
   SETS — Übersicht der Themen-Blätter

   Nur ein Menü: jede Karte führt auf ein Nachschlage-Blatt.
   Nichts davon berührt den Lernstapel oder die Datenbank.
   ============================================================ */

/* Zuordnung: der "icon"-Name aus setsData.js -> das Bauteil */
const SET_ICONS = {
  numbers: TallyIcon,
  calendar: CalendarIcon,
  speech: SpeechIcon,
  body: BodyIcon,
  palette: PaletteIcon,
  family: FamilyIcon,
  clock: ClockIcon,
  bowl: BowlIcon,
  layers: LayersIcon,
  globe: GlobeIcon,
}

function Sets({ onOpen, t, profile }) {
  /* Jede Seite hat ihre eigenen Themen */
  /* targetLang statt id: die Sandbox (sb) lernt auch Deutsch und
     muss dieselben Themen sehen wie 해인 — sonst testet Franz an
     der falschen Liste vorbei (Bug 05.09.) */
  const list = profile.targetLang === 'de' ? setListDe : setList
  return (
    <div className="screen sets-screen">
      <header className="header">
        <h1 className="sets-title">{t.setsTitle}</h1>
        <p className="sets-sub">{t.setsSub}</p>
      </header>

      <main className="set-grid">
        {list.map((s) => {
          const Icon = SET_ICONS[s.icon]
          return (
            <button className="set-card" key={s.id} onClick={() => onOpen(s.id)}>
              {/* Hangul links, Icon rechts auf derselben Höhe */}
              <div className="set-card-top">
                <span className="set-card-ko" lang="ko">
                  {s.ko}
                </span>
                <span className="set-icon">
                  {/* Notizbuch-Spec 3.4, Ausnahme „Länder": Mini-Flagge
                      (3 Streifen) statt Globus — nur im Theme */}
                  {istNotizbuch(profile.id) && s.id === 'countries' ? (
                    <svg width="21" height="15" viewBox="0 0 21 15" aria-hidden="true">
                      <rect width="21" height="5" y="0" fill="#3d3a44" rx="1" />
                      <rect width="21" height="5" y="5" fill="#c05a5a" />
                      <rect width="21" height="5" y="10" fill="#e3bb5c" rx="1" />
                    </svg>
                  ) : (
                    Icon && <Icon />
                  )}
                </span>
              </div>
              <span className="set-card-title">{s.title}</span>
              <span className="set-card-hint">{s.hint}</span>
              <span className="set-card-go">
                <ChevronIcon />
              </span>
            </button>
          )
        })}
      </main>
    </div>
  )
}

export default Sets
