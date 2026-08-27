import {
  numbers,
  weekdays,
  pronouns,
  body,
  colors,
  family,
  timeWords,
  food,
  countries,
  setList,
} from './setsData'
import { ChevronIcon } from '../../shared/icons'

/* ============================================================
   THEMEN-BLÄTTER

   Jedes Set bekommt die Darstellung, die zu seinem Inhalt passt:
   Zahlen als Tabelle, Wochentage als Liste, Körperteile als
   beschriftete Zeichnung usw.

   Alles hier ist reine Anzeige — nichts wird gespeichert,
   nichts wandert in den Lernstapel.
   ============================================================ */

/* ---------- Gemeinsame Bausteine ---------- */

export function SheetHeader({ set, onExit }) {
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
export function Block({ label, note, children }) {
  return (
    <section className="sheet-block">
      {label && <h3 className="sheet-block-label">{label}</h3>}
      {note && <p className="sheet-note">{note}</p>}
      {children}
    </section>
  )
}

/* Einfache Wort-Übersetzungs-Liste — von mehreren Blättern genutzt */
export function PairList({ items }) {
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
  /* Zeigt auf den Haaransatz, nicht auf den leeren Scheitel */
  { ko: '머리카락', en: 'hair', y: 52, side: 'l', to: [150, 111] },
  { ko: '눈썹', en: 'eyebrow', y: 106, side: 'l', to: [151, 128] },
  { ko: '눈', en: 'eye', y: 148, side: 'l', to: [152, 147] },
  { ko: '귀', en: 'ear', y: 190, side: 'l', to: [112, 154] },
  { ko: '볼', en: 'cheek', y: 232, side: 'l', to: [144, 178] },
  /* Unterhalb des Haaransatzes, sonst zeigt es auf die Haare */
  { ko: '이마', en: 'forehead', y: 70, side: 'r', to: [186, 125] },
  { ko: '코', en: 'nose', y: 140, side: 'r', to: [172, 164] },
  { ko: '입', en: 'mouth', y: 184, side: 'r', to: [184, 189] },
  { ko: '이', en: 'tooth', y: 222, side: 'r', to: [172, 190] },
  { ko: '턱', en: 'chin', y: 260, side: 'r', to: [172, 212] },
]

const BODY_LABELS = [
  { ko: '머리', en: 'head', y: 28, side: 'l', to: [156, 24] },
  { ko: '어깨', en: 'shoulder', y: 96, side: 'l', to: [126, 96] },
  /* Oberarm bzw. das Ellbogengelenk selbst — dort, wo der Arm knickt */
  { ko: '팔', en: 'arm', y: 140, side: 'l', to: [128, 140] },
  { ko: '팔꿈치', en: 'elbow', y: 180, side: 'l', to: [124, 168] },
  { ko: '손', en: 'hand', y: 218, side: 'l', to: [119, 213] },
  { ko: '손가락', en: 'finger', y: 258, side: 'l', to: [116, 222] },
  { ko: '무릎', en: 'knee', y: 312, side: 'l', to: [155, 312] },
  { ko: '발', en: 'foot', y: 388, side: 'l', to: [144, 386] },
  { ko: '목', en: 'neck', y: 62, side: 'r', to: [181, 62] },
  { ko: '가슴', en: 'chest', y: 122, side: 'r', to: [188, 125] },
  { ko: '배', en: 'belly', y: 168, side: 'r', to: [188, 168] },
  { ko: '허리', en: 'waist', y: 202, side: 'r', to: [189, 198] },
  { ko: '다리', en: 'leg', y: 290, side: 'r', to: [186, 290] },
]

/* Die rechte Hälfte des Körperumrisses. Die linke entsteht daraus
   gespiegelt (translate(340) scale(-1,1)) — das garantiert, dass die
   Figur wirklich symmetrisch ist, und halbiert die Tipparbeit.
   Bewusst NICHT geschlossen (kein Z): sonst liefe eine Strichlinie
   mitten durch den Körper. Zum Füllen schließt SVG von selbst. */
const BODY_HALF =
  /* Hals */
  'M170 44 L181 44 L181 72 ' +
  /* Schulter, Arm aussen hinunter bis zur Hand */
  'C199 75 212 86 216 104 C219 122 221 140 223 158 ' +
  'C225 176 227 194 228 206 C232 217 227 226 219 223 ' +
  /* Hand und Arm innen wieder hinauf zur Achsel */
  'C212 221 210 214 209 206 C207 190 205 172 203 152 ' +
  'C201 136 199 122 196 112 C195 108 191 108 190 113 ' +
  /* Rumpf: Brust breiter als Taille, dann Hüfte */
  'C193 126 196 140 196 158 C195 174 193 186 193 196 ' +
  'C194 206 196 212 197 220 ' +
  /* Bein aussen hinunter, Fuss, Bein innen zurueck zum Schritt */
  'C195 252 193 284 191 312 C190 338 190 360 190 376 ' +
  'C190 383 195 388 204 388 L181 388 ' +
  'C177 388 176 383 176 376 C176 340 177 300 177 268 ' +
  'L175 224 L170 222'

/* Eine Beschriftung + der Pfeil, der auf die Stelle zeigt. */
export function Label({ ko, en, y, side, to, small }) {
  const left = side === 'l'
  const textX = left ? 92 : 248
  const lineX = left ? 97 : 243
  return (
    <g>
      <path
        d={`M${lineX} ${y - 4} L${to[0]} ${to[1]}`}
        stroke="#c4b8a4"
        strokeWidth="1"
        fill="none"
      />
      <circle cx={to[0]} cy={to[1]} r="2.2" fill="#c1443b" />
      <text
        x={textX}
        y={y}
        textAnchor={left ? 'end' : 'start'}
        className={small ? 'dia-ko dia-small' : 'dia-ko'}
      >
        {ko}
      </text>
      <text x={textX} y={y + 13} textAnchor={left ? 'end' : 'start'} className="dia-de">
        {en}
      </text>
    </g>
  )
}

/* Tusche auf Papier: eine Strichstärke, keine Farbflächen.
   Der Umriss trägt die Zeichnung, nicht die Füllung. */
const INK = '#38312b'
const PAPER = '#fbf7ef'

/* Die zwei Zeichnungen. Die Beschriftungen kommen von aussen,
   damit die deutsche Seite dieselben Bilder mit eigenen Wörtern
   benutzen kann. */
export function FaceDiagram({ labels, small }) {
  return (
    <svg className="diagram" viewBox="0 0 340 300" role="img" aria-label="Face">
      <g fill="none" stroke={INK} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M118 140 c-9 2 -9 20 0 23" />
        <path d="M222 140 c9 2 9 20 0 23" />
        <ellipse cx="170" cy="150" rx="52" ry="66" fill={PAPER} />
        <path d="M123 132 C129 104 160 95 186 103 C201 108 211 118 217 132" />
        <path d="M186 103 C183 112 180 119 178 126" />
        <path d="M142 130 q10 -6 20 -1.5" />
        <path d="M178 128.5 q10 -4.5 20 1.5" />
        <path d="M143.5 147 Q152 140 160.5 147 Q152 154 143.5 147 Z" />
        <path d="M179.5 147 Q188 140 196.5 147 Q188 154 179.5 147 Z" />
        <path d="M169 149 L164 166 Q169 170 174 167" />
        <path d="M156 188 Q170 197 184 188" />
        <path d="M152 212 L152 240" />
        <path d="M188 212 L188 240" />
      </g>
      <circle cx="152" cy="147" r="2.4" fill={INK} />
      <circle cx="188" cy="147" r="2.4" fill={INK} />
      {labels.map((l) => (
        <Label key={l.ko} {...l} small={small} />
      ))}
    </svg>
  )
}

export function BodyDiagram({ labels, small }) {
  return (
    <svg className="diagram" viewBox="0 0 340 420" role="img" aria-label="Body">
      <g fill={PAPER} stroke={INK} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d={BODY_HALF} />
        <path d={BODY_HALF} transform="translate(340 0) scale(-1 1)" />
        <circle cx="170" cy="30" r="22" />
      </g>
      {labels.map((l) => (
        <Label key={l.ko} {...l} small={small} />
      ))}
    </svg>
  )
}

function BodySheet() {
  /* Gemeinsame Strich-Einstellungen für alle Linien der Zeichnung */
  const stroke = {
    fill: 'none',
    stroke: INK,
    strokeWidth: 1.7,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }
  return (
    <>
      <Block label="Face">
        <svg className="diagram" viewBox="0 0 340 300" role="img" aria-label="Labelled face">
          <g {...stroke}>
            {/* Ohren zuerst, damit der gefüllte Kopf sie sauber abschneidet */}
            <path d="M118 140 c-9 2 -9 20 0 23" />
            <path d="M222 140 c9 2 9 20 0 23" />

            <ellipse cx="170" cy="150" rx="52" ry="66" fill={PAPER} />

            {/* Haaransatz statt Haarklumpen. Leicht asymmetrisch mit
                angedeutetem Scheitel — ein exakt symmetrischer Bogen
                sieht aus wie der Rand einer Mütze. */}
            <path d="M123 132 C129 104 160 95 186 103 C201 108 211 118 217 132" />
            <path d="M186 103 C183 112 180 119 178 126" />

            <path d="M142 130 q10 -6 20 -1.5" />
            <path d="M178 128.5 q10 -4.5 20 1.5" />

            {/* Augen als schlichte Mandelform */}
            <path d="M143.5 147 Q152 140 160.5 147 Q152 154 143.5 147 Z" />
            <path d="M179.5 147 Q188 140 196.5 147 Q188 154 179.5 147 Z" />

            <path d="M169 149 L164 166 Q169 170 174 167" />
            <path d="M156 188 Q170 197 184 188" />

            {/* Hals — setzt genau am Kieferrand an */}
            <path d="M152 212 L152 240" />
            <path d="M188 212 L188 240" />
          </g>

          <circle cx="152" cy="147" r="2.4" fill={INK} />
          <circle cx="188" cy="147" r="2.4" fill={INK} />

          {FACE_LABELS.map((l) => (
            <Label key={l.ko} {...l} />
          ))}
        </svg>
      </Block>

      <Block label="Body">
        <svg className="diagram" viewBox="0 0 340 420" role="img" aria-label="Labelled body">
          <g {...stroke} fill={PAPER}>
            {/* Rechte Hälfte, dann dieselbe Kontur gespiegelt */}
            <path d={BODY_HALF} />
            <path d={BODY_HALF} transform="translate(340 0) scale(-1 1)" />
            {/* Kopf zuletzt: deckt den Halsansatz sauber ab */}
            <circle cx="170" cy="30" r="22" />
          </g>

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

/* ---------- 2. Zeit & Tage ----------
   Wochentage und Zeitangaben liegen auf einem gemeinsamen Blatt. */

function TimeSheet() {
  return (
    <>
      <Block
        label="Weekdays"
        note="Every day is an element plus 요일. Know the seven elements and you know the seven days."
      >
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
        <PairList items={[...weekdays.extra, ...timeWords.extra]} />
      </Block>
    </>
  )
}

/* ---------- 7. Essen ---------- */

/* Kachelraster mit Emoji — für Zutaten, Gerichte, Getränke, Geschirr */
export function EmojiGrid({ items }) {
  return (
    <div className="emoji-grid">
      {items.map((it) => (
        <div className="emoji-card" key={it.ko}>
          <span className="emoji-symbol">{it.emoji}</span>
          <span className="emoji-ko" lang="ko">
            {it.ko}
          </span>
          <span className="emoji-en">{it.en}</span>
        </div>
      ))}
    </div>
  )
}

function FoodSheet() {
  return (
    <>
      <Block label="Basics">
        <EmojiGrid items={food.staples} />
      </Block>

      <Block label="On the menu" note="The dishes you will actually be asked to choose between.">
        <EmojiGrid items={food.dishes} />
      </Block>

      <Block label="Drinks">
        <EmojiGrid items={food.drinks} />
      </Block>

      <Block label="How it tastes" note="Dictionary forms — in speech these become 맛있어요, 매워요 and so on.">
        <div className="pair-list">
          {food.taste.map((t) => (
            <div className="pair" key={t.ko}>
              <span lang="ko" className="pair-ko">
                <span className="pair-emoji">{t.emoji}</span>
                {t.ko}
              </span>
              <span className="pair-de">{t.en}</span>
            </div>
          ))}
        </div>
      </Block>

      <Block label="At the table" note={food.phraseNote}>
        <div className="phrase-list">
          {food.phrases.map((p) => (
            <div className="phrase" key={p.ko}>
              <span className="phrase-ko" lang="ko">
                {p.ko}
              </span>
              <span className="phrase-en">{p.en}</span>
            </div>
          ))}
        </div>
      </Block>

      <Block label="On the table">
        <EmojiGrid items={food.table} />
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
  time: TimeSheet,
  pronouns: PronounsSheet,
  body: BodySheet,
  food: FoodSheet,
  colors: ColorsSheet,
  family: FamilySheet,
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
