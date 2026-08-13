/* ============================================================
   THEMEN-SETS ("Sets"-Tab)

   Reine Nachschlage-Blätter. Diese Daten landen NICHT in der
   Datenbank und NICHT im Lernstapel — sie werden nur angezeigt.

   Sichtbarer Text ist Englisch (wie der Rest der Oberfläche),
   die Kommentare bleiben Deutsch.

   Bewusst ohne Umschrift in lateinischen Buchstaben, damit man
   das Hangul liest statt der Krücke daneben.
   ============================================================ */

/* ---------- 1. Zahlen ----------
   Koreanisch hat ZWEI Zahlensysteme. Wer die Bausteine unten
   kann, setzt jede Zahl selbst zusammen. */
export const numbers = {
  /* Die Grundzahlen 1–10 in beiden Systemen.
     "attr" = Form vor einem Zählwort (한 개, 두 명 …) */
  base: [
    { n: 1, sino: '일', native: '하나', attr: '한' },
    { n: 2, sino: '이', native: '둘', attr: '두' },
    { n: 3, sino: '삼', native: '셋', attr: '세' },
    { n: 4, sino: '사', native: '넷', attr: '네' },
    { n: 5, sino: '오', native: '다섯', attr: null },
    { n: 6, sino: '육', native: '여섯', attr: null },
    { n: 7, sino: '칠', native: '일곱', attr: null },
    { n: 8, sino: '팔', native: '여덟', attr: null },
    { n: 9, sino: '구', native: '아홉', attr: null },
    { n: 10, sino: '십', native: '열', attr: null },
  ],

  /* Die Zehner. Sino ist regelmäßig (2 + 10 = 20), die nativen
     Zehner sind dagegen eigene Wörter und müssen sitzen. */
  tens: [
    { n: 10, sino: '십', native: '열' },
    { n: 20, sino: '이십', native: '스물', attr: '스무' },
    { n: 30, sino: '삼십', native: '서른' },
    { n: 40, sino: '사십', native: '마흔' },
    { n: 50, sino: '오십', native: '쉰' },
    { n: 60, sino: '육십', native: '예순' },
    { n: 70, sino: '칠십', native: '일흔' },
    { n: 80, sino: '팔십', native: '여든' },
    { n: 90, sino: '구십', native: '아흔' },
  ],

  /* Große Stufen — nur sino. Achtung: ab 10.000 zählt Koreanisch
     in Viererschritten (만), nicht in Dreierschritten wie wir. */
  big: [
    { n: '100', ko: '백' },
    { n: '1,000', ko: '천' },
    { n: '10,000', ko: '만' },
    { n: '100 mil.', ko: '억' },
  ],

  /* Wann welches System? Das ist der eigentliche Knackpunkt. */
  usage: [
    {
      system: 'sino',
      label: 'Sino-Korean',
      items: ['Dates & months', 'Money', 'Minutes', 'Phone numbers', 'Addresses & floors'],
    },
    {
      system: 'native',
      label: 'Native Korean',
      items: ['Counting things', 'People', 'Hours', 'Age', 'only up to 99'],
    },
  ],

  /* Uhrzeit mischt beide Systeme — das klassische Stolperfeld. */
  mixed: {
    ko: '세 시 삼십 분',
    en: 'half past three',
    note: 'Hour in native Korean (세), minute in sino (삼십) — in one and the same phrase.',
  },
}

/* ---------- 2. Wochentage ----------
   Jeder Tag ist ein Element + 요일 ("Wochentag"). Kennt man die
   sieben Elemente, kennt man die sieben Tage. */
export const weekdays = {
  days: [
    { ko: '월요일', en: 'Monday', element: '월', elementEn: 'moon' },
    { ko: '화요일', en: 'Tuesday', element: '화', elementEn: 'fire' },
    { ko: '수요일', en: 'Wednesday', element: '수', elementEn: 'water' },
    { ko: '목요일', en: 'Thursday', element: '목', elementEn: 'wood' },
    { ko: '금요일', en: 'Friday', element: '금', elementEn: 'metal' },
    { ko: '토요일', en: 'Saturday', element: '토', elementEn: 'earth' },
    { ko: '일요일', en: 'Sunday', element: '일', elementEn: 'sun' },
  ],
  extra: [
    { ko: '요일', en: 'day of the week' },
    { ko: '주말', en: 'weekend' },
    { ko: '평일', en: 'weekday (Mon–Fri)' },
    { ko: '무슨 요일이에요?', en: 'What day is it today?' },
  ],
}

/* ---------- 3. Pronomen ----------
   Bewusst KEINE Eins-zu-eins-Tabelle: das Koreanische funktioniert
   hier anders als das Englische. Höflich und locker stehen
   nebeneinander, weil die Wahl vom Gegenüber abhängt. */
export const pronouns = {
  rows: [
    { en: 'I', polite: '저', casual: '나' },
    { en: 'I (as subject)', polite: '제가', casual: '내가' },
    { en: 'my', polite: '제', casual: '내' },
    { en: 'we / our', polite: '저희', casual: '우리' },
    { en: 'you', polite: 'name + 씨', casual: '너', flag: true },
    { en: 'you (as subject)', polite: '—', casual: '네가' },
    { en: 'your', polite: '—', casual: '네' },
    { en: 'he / she (that person)', polite: '그분', casual: '걔' },
    { en: 'you (plural)', polite: '여러분', casual: '너희' },
    { en: 'they', polite: '그분들', casual: '걔네' },
  ],

  /* Die drei wichtigsten Wahrheiten, die keine Tabelle hergibt. */
  truths: [
    {
      title: 'You do not simply say “you”',
      body: '너 is only fine with close friends and people younger than you. Otherwise use the name plus 씨, or the title — 선생님, 사장님. The 당신 taught in many textbooks sounds distant, even confrontational, in conversation.',
    },
    {
      title: 'There is no “it”',
      body: 'For things you use 이거 / 그거 / 저거. A pronoun like “it” simply does not exist.',
    },
    {
      title: 'Most often you leave it out',
      body: 'When the context makes clear who is meant, the pronoun is dropped entirely. 밥 먹었어요? means “Have you eaten?” — with no “you” anywhere in it.',
    },
  ],

  /* Das 이/그/저-System — hängt daran, wo etwas steht. */
  demonstratives: [
    { ko: '이거', en: 'this one', note: 'near me' },
    { ko: '그거', en: 'that one', note: 'near you' },
    { ko: '저거', en: 'that one', note: 'far from both' },
  ],
}

/* ---------- 4. Körperteile ----------
   Die beschrifteten Wörter stehen zusammen mit ihrer Position in
   der Zeichnung in SetSheet.jsx — sonst müsste man zwei Listen
   parallel pflegen und sie liefen früher oder später auseinander.
   Hier nur, was nicht an der Zeichnung hängt. */
export const body = {
  extra: [
    { ko: '등', en: 'back' },
    { ko: '엉덩이', en: 'bottom' },
    { ko: '발가락', en: 'toe' },
    { ko: '혀', en: 'tongue' },
    { ko: '몸', en: 'body' },
    { ko: '아파요', en: 'it hurts' },
  ],
}

/* ---------- 5. Farben ----------
   -색 heißt „Farbe“. Die Kachel zeigt den Farbwert direkt. */
export const colors = {
  items: [
    { ko: '빨간색', en: 'red', hex: '#d5352b' },
    { ko: '주황색', en: 'orange', hex: '#e2802d' },
    { ko: '노란색', en: 'yellow', hex: '#edc43a' },
    { ko: '초록색', en: 'green', hex: '#3f8a52' },
    { ko: '하늘색', en: 'sky blue', hex: '#79b6dd' },
    { ko: '파란색', en: 'blue', hex: '#2a4a8b' },
    { ko: '보라색', en: 'purple', hex: '#7b4b9c' },
    { ko: '분홍색', en: 'pink', hex: '#e08fae' },
    { ko: '갈색', en: 'brown', hex: '#7d5535' },
    { ko: '회색', en: 'grey', hex: '#8d8880' },
    { ko: '검은색', en: 'black', hex: '#1f1b18' },
    { ko: '하얀색', en: 'white', hex: '#fbf8f1' },
  ],
  /* Als Eigenschaftswort ("rot sein") sehen die Farben anders aus. */
  adjectives: [
    { ko: '빨갛다', en: 'to be red' },
    { ko: '파랗다', en: 'to be blue' },
    { ko: '노랗다', en: 'to be yellow' },
    { ko: '하얗다', en: 'to be white' },
    { ko: '까맣다', en: 'to be black' },
  ],
  question: { ko: '무슨 색이에요?', en: 'What colour is it?' },
}

/* ---------- 6. Familie ----------
   Bei Geschwistern hängt das Wort davon ab, ob der SPRECHER
   männlich oder weiblich ist — nicht das Geschwisterkind. */
export const family = {
  /* Wörter, die für alle gleich sind. */
  common: [
    { ko: '가족', en: 'family' },
    { ko: '부모님', en: 'parents' },
    { ko: '아버지', en: 'father', casual: '아빠' },
    { ko: '어머니', en: 'mother', casual: '엄마' },
    { ko: '할아버지', en: 'grandfather' },
    { ko: '할머니', en: 'grandmother' },
    { ko: '남동생', en: 'younger brother' },
    { ko: '여동생', en: 'younger sister' },
    { ko: '아들', en: 'son' },
    { ko: '딸', en: 'daughter' },
    { ko: '남편', en: 'husband' },
    { ko: '아내', en: 'wife' },
  ],

  /* Der Teil, der vom Sprecher abhängt. */
  split: [
    { en: 'older brother', male: '형', female: '오빠' },
    { en: 'older sister', male: '누나', female: '언니' },
  ],

  note: 'You are male, so the left column is always yours: 형 and 누나. Your girlfriend says 오빠 and 언니 for the very same people.',
  bonus: '오빠 and 언니 are also used for close older friends, not just for actual siblings.',
}

/* ---------- 7. Zeitangaben ---------- */
export const timeWords = {
  /* Tage als Zeitstrahl um „heute“ herum. */
  days: [
    { ko: '그저께', en: 'the day before yesterday', offset: -2 },
    { ko: '어제', en: 'yesterday', offset: -1 },
    { ko: '오늘', en: 'today', offset: 0 },
    { ko: '내일', en: 'tomorrow', offset: 1 },
    { ko: '모레', en: 'the day after tomorrow', offset: 2 },
  ],

  /* Tagesabschnitte, von früh nach spät. */
  dayParts: [
    { ko: '새벽', en: 'early hours' },
    { ko: '아침', en: 'morning' },
    { ko: '오전', en: 'a.m.' },
    { ko: '점심', en: 'midday' },
    { ko: '오후', en: 'p.m.' },
    { ko: '저녁', en: 'evening' },
    { ko: '밤', en: 'night' },
  ],

  /* Immer dasselbe Muster: vorher — dieses — nächstes. */
  spans: [
    { unit: 'Week', prev: '지난주', now: '이번 주', next: '다음 주' },
    { unit: 'Month', prev: '지난달', now: '이번 달', next: '다음 달' },
    { unit: 'Year', prev: '작년', now: '올해', next: '내년' },
  ],

  extra: [
    { ko: '지금', en: 'now' },
    { ko: '나중에', en: 'later' },
    { ko: '아까', en: 'a moment ago' },
    { ko: '항상', en: 'always' },
    { ko: '가끔', en: 'sometimes' },
    { ko: '절대', en: 'never' },
  ],
}

/* ---------- 8. Länder ----------
   Nur die Namen (so gewünscht). "sino" markiert Namen, die aus
   chinesischen Zeichen gebaut sind — der Rest ist lautlich aus
   dem Original übernommen. */
export const countries = {
  items: [
    { ko: '한국', en: 'South Korea', flag: '🇰🇷', sino: true },
    { ko: '북한', en: 'North Korea', flag: '🇰🇵', sino: true },
    { ko: '독일', en: 'Germany', flag: '🇩🇪', sino: true },
    { ko: '미국', en: 'United States', flag: '🇺🇸', sino: true },
    { ko: '영국', en: 'United Kingdom', flag: '🇬🇧', sino: true },
    { ko: '일본', en: 'Japan', flag: '🇯🇵', sino: true },
    { ko: '중국', en: 'China', flag: '🇨🇳', sino: true },
    { ko: '호주', en: 'Australia', flag: '🇦🇺', sino: true },
    { ko: '태국', en: 'Thailand', flag: '🇹🇭', sino: true },
    { ko: '프랑스', en: 'France', flag: '🇫🇷', sino: false },
    { ko: '스페인', en: 'Spain', flag: '🇪🇸', sino: false },
    { ko: '이탈리아', en: 'Italy', flag: '🇮🇹', sino: false },
    { ko: '캐나다', en: 'Canada', flag: '🇨🇦', sino: false },
    { ko: '러시아', en: 'Russia', flag: '🇷🇺', sino: false },
  ],
  note: 'Two kinds of names. The ones marked 漢 are built from Chinese characters and look nothing like the original — 독일 for Germany, 미국 for the USA. The rest are simply the original name written in Hangul, so you can often guess them by sound.',
}

/* ---------- Übersicht für das Menü ----------
   Reihenfolge = Reihenfolge der Karten im Sets-Tab.
   "icon" verweist auf einen Eintrag in SET_ICONS (Sets.jsx). */
export const setList = [
  { id: 'numbers', title: 'Numbers', ko: '숫자', icon: 'numbers', hint: 'Two systems, one set of building blocks', count: '30+' },
  { id: 'weekdays', title: 'Weekdays', ko: '요일', icon: 'calendar', hint: 'Seven elements, seven days', count: '7' },
  { id: 'pronouns', title: 'Pronouns', ko: '대명사', icon: 'speech', hint: 'Polite and casual side by side', count: '10' },
  { id: 'body', title: 'Body', ko: '몸', icon: 'body', hint: 'Labelled face and body', count: '29' },
  { id: 'colors', title: 'Colours', ko: '색깔', icon: 'palette', hint: 'Twelve colours, plus their verb forms', count: '12' },
  { id: 'family', title: 'Family', ko: '가족', icon: 'family', hint: 'Some words depend on who is speaking', count: '14' },
  { id: 'time', title: 'Time', ko: '시간', icon: 'clock', hint: 'Days, parts of the day, weeks and years', count: '21' },
  { id: 'countries', title: 'Countries', ko: '나라', icon: 'globe', hint: 'The ones that actually come up', count: '14' },
]
