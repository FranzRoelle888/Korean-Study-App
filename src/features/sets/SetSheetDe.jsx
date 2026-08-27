import {
  numbersDe,
  timeDe,
  articles,
  pluralDe,
  pronounsDe,
  bodyDe,
  foodDe,
  colorsDe,
  familyDe,
  countriesDe,
  setListDe,
} from './setsDataDe'
import {
  SheetHeader,
  Block,
  PairList,
  EmojiGrid,
  FaceDiagram,
  BodyDiagram,
} from './SetSheet'

/* ============================================================
   THEMEN-BLÄTTER — DEUTSCH LERNEN

   Benutzt dieselben Bausteine wie die koreanische Seite, damit
   beide Seiten gleich aussehen.

   Umwandlung: die geteilten Bausteine erwarten { ko, en }, wobei
   "ko" immer die ZIELsprache ist. Hier ist das Deutsch, "en" ist
   die koreanische Bedeutung.
   ============================================================ */
const pair = (list) => list.map((x) => ({ ko: x.de, en: x.ko, casual: x.casual }))
const tiles = (list) => list.map((x) => ({ ko: x.de, en: x.ko, emoji: x.emoji }))

/* ---------- Artikel ---------- */
function ArticlesSheet() {
  return (
    <>
      <Block label="정관사" note="독일어 명사는 남성·여성·중성 중 하나예요. 격에 따라 형태도 바뀝니다.">
        <div className="art-table">
          <div className="art-row art-head">
            <span />
            <span>남성</span>
            <span>여성</span>
            <span>중성</span>
            <span>복수</span>
          </div>
          {articles.table.map((r) => (
            <div className="art-row" key={r.case}>
              <span className="art-case">{r.case}</span>
              <span>{r.m}</span>
              <span>{r.f}</span>
              <span>{r.n}</span>
              <span className="art-pl">{r.pl}</span>
            </div>
          ))}
        </div>
      </Block>

      <Block label="부정관사" note="“하나의 ~”에 해당해요.">
        <PairList items={pair(articles.indefinite)} />
      </Block>

      <Block label="어미로 알아보기" note="완벽하지는 않지만 상당히 잘 맞는 힌트예요.">
        <div className="rule-list">
          {articles.rules.map((r) => (
            <div className="rule" key={r.ending}>
              <span className={`rule-gender rule-${r.gender}`}>{r.gender}</span>
              <span className="rule-main">
                <span className="rule-ending">{r.ending}</span>
                <span className="rule-example">{r.example}</span>
              </span>
            </div>
          ))}
        </div>
      </Block>

      <Block>
        <div className="truth">
          <h4>{articles.advice.title}</h4>
          <p>{articles.advice.body}</p>
        </div>
      </Block>
    </>
  )
}

/* ---------- Zahlen ---------- */
function NumbersDeSheet() {
  return (
    <>
      <Block label="0 – 12">
        <div className="chip-grid">
          {numbersDe.base.map((b) => (
            <div className="chip" key={b.n}>
              <span className="chip-ko">{b.n}</span>
              <span className="chip-de">{b.de}</span>
            </div>
          ))}
        </div>
      </Block>

      <Block label="10 단위">
        <div className="chip-grid">
          {numbersDe.tens.map((b) => (
            <div className="chip" key={b.n}>
              <span className="chip-ko">{b.n}</span>
              <span className="chip-de">{b.de}</span>
            </div>
          ))}
        </div>
      </Block>

      <Block label="순서가 거꾸로!" note={numbersDe.reversedNote}>
        <div className="pair-list">
          {numbersDe.reversed.map((r) => (
            <div className="pair pair-stack" key={r.n}>
              <span className="pair-ko">
                <span className="rev-n">{r.n}</span>
                {r.de}
              </span>
              <span className="pair-de">{r.ko}</span>
            </div>
          ))}
        </div>
      </Block>

      <Block label="큰 수" note={numbersDe.bigNote}>
        <PairList items={numbersDe.big.map((b) => ({ ko: b.de, en: b.n }))} />
      </Block>
    </>
  )
}

/* ---------- Zeit & Tage ---------- */
function TimeDeSheet() {
  return (
    <>
      <Block label="요일" note={timeDe.daysNote}>
        <PairList items={pair(timeDe.days)} />
      </Block>

      <Block label="오늘 주변">
        <div className="timeline">
          {timeDe.timeline.map((d) => (
            <div className={d.offset === 0 ? 'tl-item tl-now' : 'tl-item'} key={d.de}>
              <span className="tl-dot" />
              <span className="tl-ko">{d.de}</span>
              <span className="tl-de">{d.ko}</span>
            </div>
          ))}
        </div>
      </Block>

      <Block>
        <div className="truth">
          <h4>{timeDe.trap.title}</h4>
          <p>{timeDe.trap.body}</p>
        </div>
      </Block>

      <Block label="하루의 때">
        <PairList items={pair(timeDe.dayParts)} />
      </Block>

      <Block label="지난 · 이번 · 다음">
        <div className="span-table">
          <div className="span-row span-head">
            <span />
            <span>지난</span>
            <span>이번</span>
            <span>다음</span>
          </div>
          {timeDe.spans.map((s) => (
            <div className="span-row span-row-de" key={s.unit}>
              <span className="span-unit">{s.unit}</span>
              <span>{s.prev}</span>
              <span className="span-now">{s.now}</span>
              <span>{s.next}</span>
            </div>
          ))}
        </div>
      </Block>

      <Block label="그 밖에">
        <PairList items={pair(timeDe.extra)} />
      </Block>
    </>
  )
}

/* ---------- Plural ---------- */
function PluralSheet() {
  return (
    <>
      <Block>
        <div className="truth">
          <h4>{pluralDe.keyPoint.title}</h4>
          <p>{pluralDe.keyPoint.body}</p>
        </div>
      </Block>

      <Block label="여섯 가지 형태" note={pluralDe.note}>
        <div className="plural-list">
          {pluralDe.patterns.map((p) => (
            <div className="plural-row" key={p.rule}>
              <span className="plural-rule">{p.rule}</span>
              <span className="plural-main">
                <span className="plural-sg">{p.sg}</span>
                <span className="plural-arrow">→</span>
                <span className="plural-pl">{p.pl}</span>
              </span>
              <span className="plural-ko">{p.ko}</span>
            </div>
          ))}
        </div>
      </Block>
    </>
  )
}

/* ---------- Pronomen ---------- */
function PronounsDeSheet() {
  return (
    <>
      <Block label="인칭대명사" note="한국어와 달리 문장에서의 역할에 따라 형태가 바뀌어요.">
        <div className="case-table">
          <div className="case-row case-head">
            <span />
            <span>주격</span>
            <span>목적격</span>
            <span>여격</span>
          </div>
          {pronounsDe.rows.map((r) => (
            <div className={r.polite ? 'case-row case-row-flag' : 'case-row'} key={r.nom + r.ko}>
              <span className="case-ko">{r.ko}</span>
              <span className="case-de">{r.nom}</span>
              <span className="case-de">{r.akk}</span>
              <span className="case-de">{r.dat}</span>
            </div>
          ))}
        </div>
      </Block>

      <Block>
        <div className="truth">
          <h4>{pronounsDe.politeness.title}</h4>
          <p>{pronounsDe.politeness.body}</p>
        </div>
      </Block>

      <Block label="예문">
        <div className="phrase-list">
          {pronounsDe.examples.map((e) => (
            <div className="phrase" key={e.de}>
              <span className="phrase-ko">{e.de}</span>
              <span className="phrase-en">{e.ko}</span>
            </div>
          ))}
        </div>
      </Block>
    </>
  )
}

/* ---------- Körper ----------
   Gleiche Zeichnungen wie auf der koreanischen Seite, nur mit
   deutschen Wörtern. Kleinere Schrift, weil "die Augenbraue"
   deutlich länger ist als 눈썹. */
const FACE_DE = [
  { ko: 'das Haar', en: '머리카락', y: 52, side: 'l', to: [150, 111] },
  { ko: 'die Augenbraue', en: '눈썹', y: 106, side: 'l', to: [151, 128] },
  { ko: 'das Auge', en: '눈', y: 148, side: 'l', to: [152, 147] },
  { ko: 'das Ohr', en: '귀', y: 190, side: 'l', to: [112, 154] },
  { ko: 'die Wange', en: '볼', y: 232, side: 'l', to: [144, 178] },
  { ko: 'die Stirn', en: '이마', y: 70, side: 'r', to: [186, 125] },
  { ko: 'die Nase', en: '코', y: 140, side: 'r', to: [172, 164] },
  { ko: 'der Mund', en: '입', y: 184, side: 'r', to: [184, 189] },
  { ko: 'der Zahn', en: '이', y: 222, side: 'r', to: [172, 190] },
  { ko: 'das Kinn', en: '턱', y: 260, side: 'r', to: [172, 212] },
]

const BODY_DE = [
  { ko: 'der Kopf', en: '머리', y: 28, side: 'l', to: [156, 24] },
  { ko: 'die Schulter', en: '어깨', y: 96, side: 'l', to: [126, 96] },
  { ko: 'der Arm', en: '팔', y: 140, side: 'l', to: [128, 140] },
  { ko: 'der Ellbogen', en: '팔꿈치', y: 180, side: 'l', to: [124, 168] },
  { ko: 'die Hand', en: '손', y: 218, side: 'l', to: [119, 213] },
  { ko: 'der Finger', en: '손가락', y: 258, side: 'l', to: [116, 222] },
  { ko: 'das Knie', en: '무릎', y: 312, side: 'l', to: [155, 312] },
  { ko: 'der Fuß', en: '발', y: 388, side: 'l', to: [144, 386] },
  { ko: 'der Hals', en: '목', y: 62, side: 'r', to: [181, 62] },
  { ko: 'die Brust', en: '가슴', y: 122, side: 'r', to: [188, 125] },
  { ko: 'der Bauch', en: '배', y: 168, side: 'r', to: [188, 168] },
  { ko: 'die Taille', en: '허리', y: 202, side: 'r', to: [189, 198] },
  { ko: 'das Bein', en: '다리', y: 290, side: 'r', to: [186, 290] },
]

function BodyDeSheet() {
  return (
    <>
      <Block label="얼굴" note={bodyDe.note}>
        <FaceDiagram labels={FACE_DE} small />
      </Block>
      <Block label="몸">
        <BodyDiagram labels={BODY_DE} small />
      </Block>
      <Block label="그 밖에">
        <PairList items={pair(bodyDe.extra)} />
      </Block>
    </>
  )
}

/* ---------- Essen ---------- */
function FoodDeSheet() {
  return (
    <>
      <Block label="기본 식재료">
        <EmojiGrid items={tiles(foodDe.basics)} />
      </Block>
      <Block label="자주 보는 음식">
        <EmojiGrid items={tiles(foodDe.dishes)} />
      </Block>
      <Block label="음료">
        <EmojiGrid items={tiles(foodDe.drinks)} />
      </Block>
      <Block label="맛">
        <div className="pair-list">
          {foodDe.taste.map((t) => (
            <div className="pair" key={t.de}>
              <span className="pair-ko">
                <span className="pair-emoji">{t.emoji}</span>
                {t.de}
              </span>
              <span className="pair-de">{t.ko}</span>
            </div>
          ))}
        </div>
      </Block>
      <Block label="식당에서" note={foodDe.phraseNote}>
        <div className="phrase-list">
          {foodDe.phrases.map((p) => (
            <div className="phrase" key={p.de}>
              <span className="phrase-ko">{p.de}</span>
              <span className="phrase-en">{p.ko}</span>
            </div>
          ))}
        </div>
      </Block>
    </>
  )
}

/* ---------- Farben ---------- */
function ColorsDeSheet() {
  return (
    <>
      <Block note={colorsDe.note}>
        <div className="color-grid">
          {colorsDe.items.map((c) => (
            <div className="color-card" key={c.de}>
              <span className="color-swatch" style={{ background: c.hex }} />
              <span className="color-ko">{c.de}</span>
              <span className="color-de">{c.ko}</span>
            </div>
          ))}
        </div>
        <div className="mixed-card">
          <span className="mixed-ko">{colorsDe.question.de}</span>
          <span className="mixed-de">{colorsDe.question.ko}</span>
        </div>
      </Block>
    </>
  )
}

/* ---------- Familie ---------- */
function FamilyDeSheet() {
  return (
    <>
      <Block>
        <div className="truth">
          <h4>{familyDe.difference.title}</h4>
          <p>{familyDe.difference.body}</p>
        </div>
      </Block>
      <Block label="가족">
        <PairList items={pair(familyDe.items)} />
      </Block>
    </>
  )
}

/* ---------- Länder ---------- */
function CountriesDeSheet() {
  return (
    <>
      <Block note={countriesDe.note}>
        <div className="country-grid">
          {countriesDe.items.map((c) => (
            <div className="country-card" key={c.de}>
              <span className="country-flag">{c.flag}</span>
              <span className="country-main">
                <span className="country-ko">{c.de}</span>
                <span className="country-en">{c.ko}</span>
              </span>
              {c.article && <span className="country-tag">관사</span>}
            </div>
          ))}
        </div>
      </Block>

      <Block label="전치사와 함께" note="“어디에서 왔는지”와 “어디로 가는지”에 따라 달라져요.">
        <div className="phrase-list">
          {countriesDe.usage.map((u) => (
            <div className="phrase" key={u.de}>
              <span className="phrase-ko">{u.de}</span>
              <span className="phrase-en">{u.ko}</span>
            </div>
          ))}
        </div>
      </Block>
    </>
  )
}

const SHEETS_DE = {
  articles: ArticlesSheet,
  numbers: NumbersDeSheet,
  time: TimeDeSheet,
  plural: PluralSheet,
  pronouns: PronounsDeSheet,
  body: BodyDeSheet,
  food: FoodDeSheet,
  colors: ColorsDeSheet,
  family: FamilyDeSheet,
  countries: CountriesDeSheet,
}

function SetSheetDe({ id, onExit }) {
  const set = setListDe.find((s) => s.id === id)
  const Sheet = SHEETS_DE[id]
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

export default SetSheetDe
