import {
  numbers,
  weekdays,
  pronouns,
  body,
  colors,
  family,
  timeWords,
  countries,
  setList,
} from './setsData'
import { ChevronIcon } from './icons'

/* ============================================================
   THEMEN-BLÄTTER

   Jedes Set bekommt die Darstellung, die zu seinem Inhalt passt:
   Zahlen als Tabelle, Wochentage als Liste, Körperteile als
   beschriftete Zeichnung usw.

   Alles hier ist reine Anzeige — nichts wird gespeichert,
   nichts wandert in den Lernstapel.
   ============================================================ */

/* ---------- Gemeinsame Bausteine ---------- */

function SheetHeader({ set, onExit }) {
  return (
    <header className="sheet-header">
      <button className="sheet-back" onClick={onExit} aria-label="Back">
        <span className="sheet-back-icon">
          <ChevronIcon />
        </span>
      </button>
      <div>
        <h2 className="sheet-title">{set.title}</h2>
        <p className="sheet-title-ko" lang="ko">
          {set.ko}
        </p>
      </div>
    </header>
  )
}

/* Überschrift innerhalb eines Blattes */
function Block({ label, note, children }) {
  return (
    <section className="sheet-block">
      {label && <h3 className="sheet-block-label">{label}</h3>}
      {note && <p className="sheet-note">{note}</p>}
      {children}
    </section>
  )
}

/* Einfache Wort-Übersetzungs-Liste — von mehreren Blättern genutzt */
function PairList({ items }) {
  return (
    <div className="pair-list">
      {items.map((it) => (
        <div className="pair" key={it.ko}>
          <span lang="ko" className="pair-ko">
            {it.ko}
            {it.casual && <em className="pair-casual">{it.casual}</em>}
          </span>
          <span className="pair-de">{it.en}</span>
        </div>
      ))}
    </div>
  )
}

/* ---------- 1. Zahlen ---------- */

function NumberRow({ r }) {
  return (
    <div className="num-row">
      <span className="num-n">{r.n}</span>
      <span lang="ko" className="num-ko">
        {r.sino}
      </span>
      <span lang="ko" className="num-ko">
        {r.native}
        {r.attr && <em className="num-attr">{r.attr}</em>}
      </span>
    </div>
  )
}

function NumbersSheet() {
  return (
    <>
      <Block label="1 – 10" note="Korean has two number systems. You need both.">
        <div className="num-table">
          <div className="num-row num-head">
            <span>#</span>
            <span>Sino</span>
            <span>Native</span>
          </div>
          {numbers.base.map((r) => (
            <NumberRow r={r} key={r.n} />
          ))}
        </div>
        <p className="sheet-foot">
          The short form beside it (<em lang="ko">한</em>, <em lang="ko">두</em> …) is what you use
          directly in front of a counter word: <span lang="ko">한 개</span>,{' '}
          <span lang="ko">두 명</span>.
        </p>
      </Block>

      <Block
        label="Tens"
        note="Sino builds up regularly. The native tens are words of their own — those you have to know."
      >
        <div className="num-table">
          {numbers.tens.map((r) => (
            <NumberRow r={r} key={r.n} />
          ))}
        </div>
      </Block>

      <Block
        label="Bigger steps"
        note="Sino only. Careful: from 10,000 upwards Korean groups in steps of four digits (만), not three."
      >
        <div className="chip-grid">
          {numbers.big.map((b) => (
            <div className="chip" key={b.n}>
              <span className="chip-ko" lang="ko">
                {b.ko}
              </span>
              <span className="chip-de">{b.n}</span>
            </div>
          ))}
        </div>
      </Block>

      <Block label="Which one when?">
        <div className="usage-grid">
          {numbers.usage.map((u) => (
            <div className={`usage usage-${u.system}`} key={u.system}>
              <h4>{u.label}</h4>
              <ul>
                {u.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mixed-card">
          <span className="mixed-ko" lang="ko">
            {numbers.mixed.ko}
          </span>
          <span className="mixed-de">{numbers.mixed.en}</span>
          <span className="mixed-note">{numbers.mixed.note}</span>
        </div>
      </Block>
    </>
  )
}

/* ---------- 2. Wochentage ---------- */

function WeekdaysSheet() {
  return (
    <>
      <Block note="Every day is an element plus 요일. Know the seven elements and you know the seven days.">
        <div className="day-list">
          {weekdays.days.map((d) => (
            <div className="day-row" key={d.ko}>
              <span className="day-element" lang="ko">
                {d.element}
              </span>
              <span className="day-main">
                <span className="day-ko" lang="ko">
                  {d.ko}
                </span>
                <span className="day-de">{d.en}</span>
              </span>
              <span className="day-meaning">{d.elementEn}</span>
            </div>
          ))}
        </div>
      </Block>

      <Block label="Also worth knowing">
        <PairList items={weekdays.extra} />
      </Block>
    </>
  )
}

/* ---------- 3. Pronomen ---------- */

function PronounsSheet() {
  return (
    <>
      <Block note="Polite and casual sit side by side — which column applies depends on who you are talking to.">
        <div className="pron-table">
          <div className="pron-row pron-head">
            <span />
            <span>polite</span>
            <span>casual</span>
          </div>
          {pronouns.rows.map((r) => (
            <div className={r.flag ? 'pron-row pron-row-flag' : 'pron-row'} key={r.en}>
              <span className="pron-de">{r.en}</span>
              <span className="pron-ko" lang="ko">
                {r.polite}
              </span>
              <span className="pron-ko" lang="ko">
                {r.casual}
              </span>
            </div>
          ))}
        </div>
      </Block>

      <Block label="What no table can show">
        {pronouns.truths.map((t) => (
          <div className="truth" key={t.title}>
            <h4>{t.title}</h4>
            <p>{t.body}</p>
          </div>
        ))}
      </Block>

      <Block label="이 / 그 / 저" note="For things. Which word applies depends on where the thing is.">
        <div className="dem-grid">
          {pronouns.demonstratives.map((d) => (
            <div className="dem" key={d.ko}>
              <span className="dem-ko" lang="ko">
                {d.ko}
              </span>
              <span className="dem-de">{d.en}</span>
              <span className="dem-note">{d.note}</span>
            </div>
          ))}
        </div>
      </Block>
    </>
  )
}

/* ---------- 4. Körperteile ----------
   Wort, Übersetzung und Position stehen bewusst zusammen:
   y = Höhe der Beschriftung, to = worauf der Pfeil zeigt,
   side = 'l' (Text linksbündig auslaufend) oder 'r'. */

const FACE_LABELS = [
  { ko: '머리카락', en: 'hair', y: 52, side: 'l', to: [148, 96] },
  { ko: '눈썹', en: 'eyebrow', y: 106, side: 'l', to: [151, 129] },
  { ko: '눈', en: 'eye', y: 148, side: 'l', to: [152, 147] },
  { ko: '귀', en: 'ear', y: 190, side: 'l', to: [117, 152] },
  { ko: '볼', en: 'cheek', y: 232, side: 'l', to: [144, 178] },
  { ko: '이마', en: 'forehead', y: 70, side: 'r', to: [188, 116] },
  { ko: '코', en: 'nose', y: 140, side: 'r', to: [172, 164] },
  { ko: '입', en: 'mouth', y: 184, side: 'r', to: [184, 189] },
  { ko: '이', en: 'tooth', y: 222, side: 'r', to: [172, 190] },
  { ko: '턱', en: 'chin', y: 260, side: 'r', to: [172, 212] },
]

const BODY_LABELS = [
  { ko: '머리', en: 'head', y: 40, side: 'l', to: [152, 36] },
  { ko: '어깨', en: 'shoulder', y: 88, side: 'l', to: [142, 86] },
  /* Oberarm bzw. das Ellbogengelenk selbst — dort, wo der Arm knickt */
  { ko: '팔', en: 'arm', y: 130, side: 'l', to: [131, 110] },
  { ko: '팔꿈치', en: 'elbow', y: 172, side: 'l', to: [120, 132] },
  { ko: '손', en: 'hand', y: 214, side: 'l', to: [105, 198] },
  { ko: '손가락', en: 'finger', y: 256, side: 'l', to: [103, 210] },
  { ko: '무릎', en: 'knee', y: 306, side: 'l', to: [148, 300] },
  { ko: '발', en: 'foot', y: 388, side: 'l', to: [144, 386] },
  { ko: '목', en: 'neck', y: 68, side: 'r', to: [176, 70] },
  { ko: '가슴', en: 'chest', y: 110, side: 'r', to: [188, 110] },
  { ko: '배', en: 'belly', y: 156, side: 'r', to: [188, 160] },
  { ko: '허리', en: 'waist', y: 202, side: 'r', to: [192, 196] },
  { ko: '다리', en: 'leg', y: 280, side: 'r', to: [192, 268] },
]

/* Eine Beschriftung + der Pfeil, der auf die Stelle zeigt. */
function Label({ ko, en, y, side, to }) {
  const left = side === 'l'
  const textX = left ? 92 : 248
  const lineX = left ? 97 : 243
  return (
    <g>
      <path
        d={`M${lineX} ${y - 4} L${to[0]} ${to[1]}`}
        stroke="#b6a992"
        strokeWidth="1.2"
        fill="none"
      />
      <circle cx={to[0]} cy={to[1]} r="2.6" fill="#c1443b" />
      <text x={textX} y={y} textAnchor={left ? 'end' : 'start'} className="dia-ko" lang="ko">
        {ko}
      </text>
      <text x={textX} y={y + 13} textAnchor={left ? 'end' : 'start'} className="dia-de">
        {en}
      </text>
    </g>
  )
}

function BodySheet() {
  const skin = '#f3e3d3'
  const line = '#1f1b18'
  return (
    <>
      <Block label="Face">
        <svg className="diagram" viewBox="0 0 340 300" role="img" aria-label="Labelled face">
          {/* Kopfform */}
          <ellipse cx="170" cy="150" rx="52" ry="66" fill={skin} stroke={line} strokeWidth="1.6" />
          {/* Ohren */}
          <ellipse cx="118" cy="152" rx="7" ry="12" fill={skin} stroke={line} strokeWidth="1.4" />
          <ellipse cx="222" cy="152" rx="7" ry="12" fill={skin} stroke={line} strokeWidth="1.4" />
          {/* Haar */}
          <path
            d="M118 140 C120 96 140 84 170 84 C200 84 220 96 222 140 C214 118 206 110 190 106 C176 116 156 116 142 108 C130 114 122 124 118 140 Z"
            fill="#2f2622"
          />
          {/* Augenbrauen */}
          <path d="M142 132 q10 -6 20 -1" stroke={line} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M178 131 q10 -5 20 1" stroke={line} strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Augen */}
          <ellipse cx="152" cy="147" rx="7.5" ry="5" fill="#fbf7ef" stroke={line} strokeWidth="1.4" />
          <ellipse cx="188" cy="147" rx="7.5" ry="5" fill="#fbf7ef" stroke={line} strokeWidth="1.4" />
          <circle cx="152" cy="147" r="2.6" fill={line} />
          <circle cx="188" cy="147" r="2.6" fill={line} />
          {/* Nase */}
          <path d="M170 152 L166 168 q4 3 8 0" stroke={line} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* Mund */}
          <path d="M156 187 q14 10 28 0 q-14 5 -28 0 Z" fill="#c98d86" stroke={line} strokeWidth="1.4" strokeLinejoin="round" />
          {/* Hals */}
          <path d="M154 210 L154 228 M186 210 L186 228" stroke={line} strokeWidth="1.6" fill="none" />

          {FACE_LABELS.map((l) => (
            <Label key={l.ko} {...l} />
          ))}
        </svg>
      </Block>

      <Block label="Body">
        <svg className="diagram" viewBox="0 0 340 420" role="img" aria-label="Labelled body">
          {/* Kopf + Hals */}
          <circle cx="170" cy="40" r="23" fill={skin} stroke={line} strokeWidth="1.6" />
          <path d="M162 62 L162 76 M178 62 L178 76" stroke={line} strokeWidth="1.6" fill="none" />
          {/* Rumpf */}
          <path
            d="M140 84 q30 -10 60 0 l4 60 q-4 34 -6 62 q-28 8 -56 0 q-2 -28 -6 -62 Z"
            fill={skin}
            stroke={line}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Arme */}
          <path d="M141 88 L120 132 L106 192" stroke={line} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M199 88 L220 132 L234 192" stroke={line} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          {/* Hände */}
          <ellipse cx="104" cy="201" rx="8" ry="11" fill={skin} stroke={line} strokeWidth="1.4" />
          <ellipse cx="236" cy="201" rx="8" ry="11" fill={skin} stroke={line} strokeWidth="1.4" />
          {/* Beine */}
          <path d="M152 206 L148 300 L145 380" stroke={line} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M188 206 L192 300 L195 380" stroke={line} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          {/* Füße */}
          <path d="M145 380 q-14 4 -14 10 h26 Z" fill={skin} stroke={line} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M195 380 q14 4 14 10 h-26 Z" fill={skin} stroke={line} strokeWidth="1.4" strokeLinejoin="round" />

          {BODY_LABELS.map((l) => (
            <Label key={l.ko} {...l} />
          ))}
        </svg>
      </Block>

      <Block label="Also worth knowing">
        <PairList items={body.extra} />
      </Block>
    </>
  )
}

/* ---------- 5. Farben ---------- */

function ColorsSheet() {
  return (
    <>
      <Block note="-색 means “colour”. Each tile shows the shade itself.">
        <div className="color-grid">
          {colors.items.map((c) => (
            <div className="color-card" key={c.ko}>
              <span className="color-swatch" style={{ background: c.hex }} />
              <span className="color-ko" lang="ko">
                {c.ko}
              </span>
              <span className="color-de">{c.en}</span>
            </div>
          ))}
        </div>
      </Block>

      <Block
        label="As a describing word"
        note="“To be red” is a word of its own, not something derived from 빨간색."
      >
        <PairList items={colors.adjectives} />
        <div className="mixed-card">
          <span className="mixed-ko" lang="ko">
            {colors.question.ko}
          </span>
          <span className="mixed-de">{colors.question.en}</span>
        </div>
      </Block>
    </>
  )
}

/* ---------- 6. Familie ---------- */

function FamilySheet() {
  return (
    <>
      <Block
        label="Depends on who is speaking"
        note="It is not the sibling who decides the word — it is you."
      >
        <div className="split-table">
          <div className="split-row split-head">
            <span />
            <span>you say</span>
            <span>she says</span>
          </div>
          {family.split.map((s) => (
            <div className="split-row" key={s.en}>
              <span className="split-de">{s.en}</span>
              <span className="split-ko split-mine" lang="ko">
                {s.male}
              </span>
              <span className="split-ko" lang="ko">
                {s.female}
              </span>
            </div>
          ))}
        </div>
        <p className="sheet-foot">{family.note}</p>
        <p className="sheet-foot">{family.bonus}</p>
      </Block>

      <Block label="Same for everyone" note="Where a second form is shown, it is the familiar one.">
        <PairList items={family.common} />
      </Block>
    </>
  )
}

/* ---------- 7. Zeitangaben ---------- */

function TimeSheet() {
  return (
    <>
      <Block label="Days" note="A timeline around “today”.">
        <div className="timeline">
          {timeWords.days.map((d) => (
            <div className={d.offset === 0 ? 'tl-item tl-now' : 'tl-item'} key={d.ko}>
              <span className="tl-dot" />
              <span className="tl-ko" lang="ko">
                {d.ko}
              </span>
              <span className="tl-de">{d.en}</span>
            </div>
          ))}
        </div>
      </Block>

      <Block label="Parts of the day" note="From early to late.">
        <PairList items={timeWords.dayParts} />
      </Block>

      <Block label="Week, month, year" note="Always the same pattern: last — this — next.">
        <div className="span-table">
          <div className="span-row span-head">
            <span />
            <span>last</span>
            <span>this</span>
            <span>next</span>
          </div>
          {timeWords.spans.map((s) => (
            <div className="span-row" key={s.unit}>
              <span className="span-unit">{s.unit}</span>
              <span lang="ko">{s.prev}</span>
              <span lang="ko" className="span-now">
                {s.now}
              </span>
              <span lang="ko">{s.next}</span>
            </div>
          ))}
        </div>
      </Block>

      <Block label="Also worth knowing">
        <PairList items={timeWords.extra} />
      </Block>
    </>
  )
}

/* ---------- 8. Länder ---------- */

function CountriesSheet() {
  return (
    <Block note={countries.note}>
      <div className="country-grid">
        {countries.items.map((c) => (
          <div className="country-card" key={c.ko}>
            <span className="country-flag">{c.flag}</span>
            <span className="country-main">
              <span className="country-ko" lang="ko">
                {c.ko}
              </span>
              <span className="country-en">{c.en}</span>
            </span>
            {/* Markiert die Namen, die aus chinesischen Zeichen gebaut sind */}
            {c.sino && <span className="country-tag">漢</span>}
          </div>
        ))}
      </div>
    </Block>
  )
}

/* ---------- Auswahl ---------- */

const SHEETS = {
  numbers: NumbersSheet,
  weekdays: WeekdaysSheet,
  pronouns: PronounsSheet,
  body: BodySheet,
  colors: ColorsSheet,
  family: FamilySheet,
  time: TimeSheet,
  countries: CountriesSheet,
}

function SetSheet({ id, onExit }) {
  const set = setList.find((s) => s.id === id)
  const Sheet = SHEETS[id]
  if (!set || !Sheet) return null

  return (
    <div className="sheet">
      <SheetHeader set={set} onExit={onExit} />
      <div className="sheet-body">
        <Sheet />
      </div>
    </div>
  )
}

export default SetSheet
