/* ============================================================
   THEMEN-SETS ("Sets"-Tab)

   Reine Nachschlage-Blätter. Diese Daten landen NICHT in der
   Datenbank und NICHT im Lernstapel — sie werden nur angezeigt.

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
    { n: '1.000', ko: '천' },
    { n: '10.000', ko: '만' },
    { n: '100 Mio.', ko: '억' },
  ],

  /* Wann welches System? Das ist der eigentliche Knackpunkt. */
  usage: [
    { system: 'sino', label: 'Sino-koreanisch', items: ['Datum & Monate', 'Geld', 'Minuten', 'Telefonnummern', 'Adressen & Etagen'] },
    { system: 'native', label: 'Nativ-koreanisch', items: ['Dinge zählen', 'Personen', 'Stunden', 'Alter', 'nur bis 99'] },
  ],

  /* Uhrzeit mischt beide Systeme — das klassische Stolperfeld. */
  mixed: {
    ko: '세 시 삼십 분',
    de: 'halb vier',
    note: 'Stunde nativ (세), Minute sino (삼십) — in einem einzigen Satz.',
  },
}

/* ---------- 2. Wochentage ----------
   Jeder Tag ist ein Element + 요일 ("Wochentag"). Kennt man die
   sieben Elemente, kennt man die sieben Tage. */
export const weekdays = {
  days: [
    { ko: '월요일', de: 'Montag', element: '월', elementDe: 'Mond' },
    { ko: '화요일', de: 'Dienstag', element: '화', elementDe: 'Feuer' },
    { ko: '수요일', de: 'Mittwoch', element: '수', elementDe: 'Wasser' },
    { ko: '목요일', de: 'Donnerstag', element: '목', elementDe: 'Holz' },
    { ko: '금요일', de: 'Freitag', element: '금', elementDe: 'Metall' },
    { ko: '토요일', de: 'Samstag', element: '토', elementDe: 'Erde' },
    { ko: '일요일', de: 'Sonntag', element: '일', elementDe: 'Sonne' },
  ],
  extra: [
    { ko: '요일', de: 'Wochentag' },
    { ko: '주말', de: 'Wochenende' },
    { ko: '평일', de: 'Werktag' },
    { ko: '무슨 요일이에요?', de: 'Welcher Tag ist heute?' },
  ],
}

/* ---------- 3. Pronomen ----------
   Bewusst KEINE Eins-zu-eins-Tabelle: das Koreanische funktioniert
   hier anders als das Deutsche. Höflich und locker stehen
   nebeneinander, weil die Wahl vom Gegenüber abhängt. */
export const pronouns = {
  rows: [
    { de: 'ich', polite: '저', casual: '나' },
    { de: 'ich (als Satzsubjekt)', polite: '제가', casual: '내가' },
    { de: 'mein', polite: '제', casual: '내' },
    { de: 'wir / unser', polite: '저희', casual: '우리' },
    { de: 'du', polite: 'Name + 씨', casual: '너', flag: true },
    { de: 'du (als Satzsubjekt)', polite: '—', casual: '네가' },
    { de: 'dein', polite: '—', casual: '네' },
    { de: 'er / sie (die Person)', polite: '그분', casual: '걔' },
    { de: 'ihr (mehrere)', polite: '여러분', casual: '너희' },
    { de: 'sie (mehrere)', polite: '그분들', casual: '걔네' },
  ],

  /* Die drei wichtigsten Wahrheiten, die keine Tabelle hergibt. */
  truths: [
    {
      title: '„Du“ sagt man nicht einfach so',
      body: '너 ist nur unter engen Freunden und bei Jüngeren okay. Sonst nimmt man den Namen mit 씨 oder den Titel — 선생님, 사장님. Das oft gelehrte 당신 klingt im Gespräch distanziert bis streitlustig.',
    },
    {
      title: '„Es“ gibt es nicht',
      body: 'Für Dinge nimmt man 이거 / 그거 / 저거. Ein Pronomen wie „es“ existiert schlicht nicht.',
    },
    {
      title: 'Am häufigsten lässt man es weg',
      body: 'Wenn aus dem Zusammenhang klar ist, wer gemeint ist, fällt das Pronomen komplett weg. 밥 먹었어요? heißt „Hast du gegessen?“ — ganz ohne „du“.',
    },
  ],

  /* Das 이/그/저-System — hängt daran, wo etwas steht. */
  demonstratives: [
    { ko: '이거', de: 'das hier', note: 'bei mir' },
    { ko: '그거', de: 'das da', note: 'bei dir' },
    { ko: '저거', de: 'das dort', note: 'weit weg' },
  ],
}

/* ---------- 4. Körperteile ----------
   Die beschrifteten Wörter stehen zusammen mit ihrer Position in
   der Zeichnung in SetSheet.jsx — sonst müsste man zwei Listen
   parallel pflegen und sie liefen früher oder später auseinander.
   Hier nur, was nicht an der Zeichnung hängt. */
export const body = {
  extra: [
    { ko: '등', de: 'Rücken' },
    { ko: '엉덩이', de: 'Po' },
    { ko: '발가락', de: 'Zeh' },
    { ko: '혀', de: 'Zunge' },
    { ko: '몸', de: 'Körper' },
    { ko: '아파요', de: 'tut weh' },
  ],
}

/* ---------- 5. Farben ----------
   -색 heißt „Farbe". Die Kachel zeigt den Farbwert direkt. */
export const colors = {
  items: [
    { ko: '빨간색', de: 'rot', hex: '#d5352b' },
    { ko: '주황색', de: 'orange', hex: '#e2802d' },
    { ko: '노란색', de: 'gelb', hex: '#edc43a' },
    { ko: '초록색', de: 'grün', hex: '#3f8a52' },
    { ko: '하늘색', de: 'himmelblau', hex: '#79b6dd' },
    { ko: '파란색', de: 'blau', hex: '#2a4a8b' },
    { ko: '보라색', de: 'lila', hex: '#7b4b9c' },
    { ko: '분홍색', de: 'rosa', hex: '#e08fae' },
    { ko: '갈색', de: 'braun', hex: '#7d5535' },
    { ko: '회색', de: 'grau', hex: '#8d8880' },
    { ko: '검은색', de: 'schwarz', hex: '#1f1b18' },
    { ko: '하얀색', de: 'weiß', hex: '#fbf8f1' },
  ],
  /* Als Eigenschaftswort ("rot sein") sehen die Farben anders aus. */
  adjectives: [
    { ko: '빨갛다', de: 'rot sein' },
    { ko: '파랗다', de: 'blau sein' },
    { ko: '노랗다', de: 'gelb sein' },
    { ko: '하얗다', de: 'weiß sein' },
    { ko: '까맣다', de: 'schwarz sein' },
  ],
  question: { ko: '무슨 색이에요?', de: 'Welche Farbe ist das?' },
}

/* ---------- 6. Familie ----------
   Bei Geschwistern hängt das Wort davon ab, ob der SPRECHER
   männlich oder weiblich ist — nicht das Geschwisterkind. */
export const family = {
  /* Wörter, die für alle gleich sind. */
  common: [
    { ko: '가족', de: 'Familie' },
    { ko: '부모님', de: 'Eltern' },
    { ko: '아버지', de: 'Vater', casual: '아빠' },
    { ko: '어머니', de: 'Mutter', casual: '엄마' },
    { ko: '할아버지', de: 'Großvater' },
    { ko: '할머니', de: 'Großmutter' },
    { ko: '남동생', de: 'jüngerer Bruder' },
    { ko: '여동생', de: 'jüngere Schwester' },
    { ko: '아들', de: 'Sohn' },
    { ko: '딸', de: 'Tochter' },
    { ko: '남편', de: 'Ehemann' },
    { ko: '아내', de: 'Ehefrau' },
  ],

  /* Der Teil, der vom Sprecher abhängt. */
  split: [
    { de: 'älterer Bruder', male: '형', female: '오빠' },
    { de: 'ältere Schwester', male: '누나', female: '언니' },
  ],

  note: 'Du bist männlich — für dich gilt also immer die linke Spalte: 형 und 누나. Deine Freundin sagt für dieselben Personen 오빠 und 언니.',
  bonus: '오빠 und 언니 benutzt man auch für nahe ältere Freunde, nicht nur für echte Geschwister.',
}

/* ---------- 7. Zeitangaben ---------- */
export const timeWords = {
  /* Tage als Zeitstrahl um „heute" herum. */
  days: [
    { ko: '그저께', de: 'vorgestern', offset: -2 },
    { ko: '어제', de: 'gestern', offset: -1 },
    { ko: '오늘', de: 'heute', offset: 0 },
    { ko: '내일', de: 'morgen', offset: 1 },
    { ko: '모레', de: 'übermorgen', offset: 2 },
  ],

  /* Tagesabschnitte, von früh nach spät. */
  dayParts: [
    { ko: '새벽', de: 'frühe Morgenstunden' },
    { ko: '아침', de: 'Morgen' },
    { ko: '오전', de: 'Vormittag' },
    { ko: '점심', de: 'Mittag' },
    { ko: '오후', de: 'Nachmittag' },
    { ko: '저녁', de: 'Abend' },
    { ko: '밤', de: 'Nacht' },
  ],

  /* Immer dasselbe Muster: vorher — dieses — nächstes. */
  spans: [
    { unit: 'Woche', prev: '지난주', now: '이번 주', next: '다음 주' },
    { unit: 'Monat', prev: '지난달', now: '이번 달', next: '다음 달' },
    { unit: 'Jahr', prev: '작년', now: '올해', next: '내년' },
  ],

  extra: [
    { ko: '지금', de: 'jetzt' },
    { ko: '나중에', de: 'später' },
    { ko: '아까', de: 'vorhin' },
    { ko: '항상', de: 'immer' },
    { ko: '가끔', de: 'manchmal' },
    { ko: '절대', de: 'niemals' },
  ],
}

/* ---------- Übersicht für das Menü ----------
   Reihenfolge = Reihenfolge der Karten im Sets-Tab. */
export const setList = [
  { id: 'numbers', title: 'Numbers', ko: '숫자', hint: 'Two systems, one set of building blocks', count: '30+' },
  { id: 'weekdays', title: 'Weekdays', ko: '요일', hint: 'Seven elements, seven days', count: '7' },
  { id: 'pronouns', title: 'Pronouns', ko: '대명사', hint: 'Polite and casual side by side', count: '10' },
  { id: 'body', title: 'Body', ko: '몸', hint: 'Labelled face and body', count: '29' },
  { id: 'colors', title: 'Colours', ko: '색깔', hint: 'Twelve colours, plus their verb forms', count: '12' },
  { id: 'family', title: 'Family', ko: '가족', hint: 'Some words depend on who is speaking', count: '14' },
  { id: 'time', title: 'Time', ko: '시간', hint: 'Days, parts of the day, weeks and years', count: '21' },
]
