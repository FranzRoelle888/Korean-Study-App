import { setList } from './setsData'
import {
  ChevronIcon,
  TallyIcon,
  CalendarIcon,
  SpeechIcon,
  BodyIcon,
  PaletteIcon,
  FamilyIcon,
  ClockIcon,
  GlobeIcon,
} from './icons'

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
  globe: GlobeIcon,
}

function Sets({ onOpen }) {
  return (
    <div className="screen sets-screen">
      <header className="header">
        <h1 className="sets-title">Sets</h1>
        <p className="sets-sub">Topic sheets to look things up</p>
      </header>

      <main className="set-grid">
        {setList.map((s) => {
          const Icon = SET_ICONS[s.icon]
          return (
            <button className="set-card" key={s.id} onClick={() => onOpen(s.id)}>
              {/* Hangul links, Icon rechts auf derselben Höhe */}
              <div className="set-card-top">
                <span className="set-card-ko" lang="ko">
                  {s.ko}
                </span>
                <span className="set-icon">{Icon && <Icon />}</span>
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
