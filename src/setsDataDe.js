/* ============================================================
   THEMEN-SETS — DEUTSCH LERNEN (koreanische Erklärungen)

   Gegenstück zu setsData.js. Reine Nachschlage-Blätter, nichts
   davon landet in der Datenbank oder im Lernstapel.

   Die Auswahl ist bewusst NICHT dieselbe wie auf der koreanischen
   Seite: Artikel, Plural und Fälle sind die Stellen, an denen
   Koreanisch-Sprechende im Deutschen tatsächlich hängen bleiben
   (im Koreanischen gibt es all das nicht).
   ============================================================ */

/* ---------- 1. Zahlen ---------- */
export const numbersDe = {
  base: [
    { n: 0, de: 'null' },
    { n: 1, de: 'eins' },
    { n: 2, de: 'zwei' },
    { n: 3, de: 'drei' },
    { n: 4, de: 'vier' },
    { n: 5, de: 'fünf' },
    { n: 6, de: 'sechs' },
    { n: 7, de: 'sieben' },
    { n: 8, de: 'acht' },
    { n: 9, de: 'neun' },
    { n: 10, de: 'zehn' },
    { n: 11, de: 'elf' },
    { n: 12, de: 'zwölf' },
  ],
  tens: [
    { n: 20, de: 'zwanzig' },
    { n: 30, de: 'dreißig' },
    { n: 40, de: 'vierzig' },
    { n: 50, de: 'fünfzig' },
    { n: 60, de: 'sechzig' },
    { n: 70, de: 'siebzig' },
    { n: 80, de: 'achtzig' },
    { n: 90, de: 'neunzig' },
  ],
  /* Der eigentliche Stolperstein: die Reihenfolge dreht sich um. */
  reversed: [
    { n: 21, de: 'einundzwanzig', ko: '1 + 20 순서로 읽어요' },
    { n: 35, de: 'fünfunddreißig', ko: '5 + 30' },
    { n: 47, de: 'siebenundvierzig', ko: '7 + 40' },
    { n: 99, de: 'neunundneunzig', ko: '9 + 90' },
  ],
  reversedNote:
    '한국어는 “이십일”처럼 큰 수부터 읽지만, 독일어는 거꾸로예요. 21은 “einundzwanzig”, 즉 “1과 20”. 두 자리 수는 항상 이 순서라서 익숙해지면 어렵지 않아요.',
  big: [
    { n: '100', de: '(ein)hundert' },
    { n: '1.000', de: '(ein)tausend' },
    { n: '1.000.000', de: 'eine Million' },
  ],
  bigNote:
    '독일어는 천 단위마다 점을 찍고, 소수점에는 쉼표를 써요. 1.000 = 천, 1,5 = 1.5.',
}

/* ---------- 2. Zeit & Tage ---------- */
export const timeDe = {
  days: [
    { de: 'Montag', ko: '월요일' },
    { de: 'Dienstag', ko: '화요일' },
    { de: 'Mittwoch', ko: '수요일' },
    { de: 'Donnerstag', ko: '목요일' },
    { de: 'Freitag', ko: '금요일' },
    { de: 'Samstag', ko: '토요일' },
    { de: 'Sonntag', ko: '일요일' },
  ],
  daysNote: '요일 이름은 모두 남성이라 “der Montag”, 그리고 “am Montag”처럼 씁니다.',

  timeline: [
    { de: 'vorgestern', ko: '그저께', offset: -2 },
    { de: 'gestern', ko: '어제', offset: -1 },
    { de: 'heute', ko: '오늘', offset: 0 },
    { de: 'morgen', ko: '내일', offset: 1 },
    { de: 'übermorgen', ko: '모레', offset: 2 },
  ],

  /* Klassische Verwechslung — lohnt einen eigenen Kasten. */
  trap: {
    title: 'morgen 과 Morgen',
    body:
      '소문자 “morgen”은 내일, 대문자 “der Morgen”은 아침이에요. 발음이 같아서 대소문자로만 구분해요. “morgen früh” = 내일 아침.',
  },

  dayParts: [
    { de: 'der Morgen', ko: '아침' },
    { de: 'der Vormittag', ko: '오전' },
    { de: 'der Mittag', ko: '점심' },
    { de: 'der Nachmittag', ko: '오후' },
    { de: 'der Abend', ko: '저녁' },
    { de: 'die Nacht', ko: '밤' },
  ],

  spans: [
    { unit: '주', prev: 'letzte Woche', now: 'diese Woche', next: 'nächste Woche' },
    { unit: '달', prev: 'letzten Monat', now: 'diesen Monat', next: 'nächsten Monat' },
    { unit: '해', prev: 'letztes Jahr', now: 'dieses Jahr', next: 'nächstes Jahr' },
  ],

  extra: [
    { de: 'jetzt', ko: '지금' },
    { de: 'später', ko: '나중에' },
    { de: 'immer', ko: '항상' },
    { de: 'manchmal', ko: '가끔' },
    { de: 'nie', ko: '절대 안' },
    { de: 'oft', ko: '자주' },
  ],
}

/* ---------- 3. Artikel ----------
   Für Koreanisch-Sprechende der größte Brocken überhaupt. */
export const articles = {
  table: [
    { case: '주격 (Nominativ)', m: 'der', f: 'die', n: 'das', pl: 'die' },
    { case: '목적격 (Akkusativ)', m: 'den', f: 'die', n: 'das', pl: 'die' },
    { case: '여격 (Dativ)', m: 'dem', f: 'der', n: 'dem', pl: 'den' },
  ],

  indefinite: [
    { de: 'ein Mann', ko: '남자 한 명 (남성)' },
    { de: 'eine Frau', ko: '여자 한 명 (여성)' },
    { de: 'ein Kind', ko: '아이 한 명 (중성)' },
  ],

  /* Endungen, an denen man das Geschlecht erkennt */
  rules: [
    { ending: '-ung, -heit, -keit, -schaft', gender: 'die', example: 'die Wohnung, die Freiheit' },
    { ending: '-e (대부분)', gender: 'die', example: 'die Blume, die Lampe' },
    { ending: '-er, -ling, -ismus', gender: 'der', example: 'der Lehrer, der Frühling' },
    { ending: '-chen, -lein', gender: 'das', example: 'das Mädchen, das Brötchen' },
    { ending: '-um, -ment', gender: 'das', example: 'das Museum, das Dokument' },
  ],

  advice: {
    title: '단어와 관사를 함께 외우세요',
    body:
      '한국어에는 관사가 없어서 가장 낯선 부분이에요. 규칙은 도움이 되지만 예외가 많아서, 처음부터 “Tisch”가 아니라 “der Tisch”로 통째로 외우는 편이 훨씬 빠릅니다. 단어장에 넣을 때도 관사를 같이 적어 주세요.',
  },
}

/* ---------- 4. Plural ---------- */
export const pluralDe = {
  patterns: [
    { rule: '-e', sg: 'der Tag', pl: 'die Tage', ko: '날' },
    { rule: '-e + 움라우트', sg: 'die Hand', pl: 'die Hände', ko: '손' },
    { rule: '-er + 움라우트', sg: 'das Buch', pl: 'die Bücher', ko: '책' },
    { rule: '-(e)n', sg: 'die Frau', pl: 'die Frauen', ko: '여자' },
    { rule: '-s (외래어)', sg: 'das Auto', pl: 'die Autos', ko: '자동차' },
    { rule: '변화 없음', sg: 'der Lehrer', pl: 'die Lehrer', ko: '선생님' },
  ],
  keyPoint: {
    title: '복수형의 관사는 언제나 die',
    body:
      '남성이든 여성이든 중성이든, 복수가 되면 관사는 무조건 “die”예요. der Tag → die Tage, das Buch → die Bücher. 이것 하나만은 예외가 없습니다.',
  },
  note: '어떤 형태를 쓰는지는 규칙보다 단어마다 정해져 있어요. 복수형도 단어와 함께 외우는 게 좋습니다.',
}

/* ---------- 5. Personalpronomen mit Fällen ---------- */
export const pronounsDe = {
  rows: [
    { ko: '나', nom: 'ich', akk: 'mich', dat: 'mir' },
    { ko: '너', nom: 'du', akk: 'dich', dat: 'dir' },
    { ko: '그', nom: 'er', akk: 'ihn', dat: 'ihm' },
    { ko: '그녀', nom: 'sie', akk: 'sie', dat: 'ihr' },
    { ko: '그것', nom: 'es', akk: 'es', dat: 'ihm' },
    { ko: '우리', nom: 'wir', akk: 'uns', dat: 'uns' },
    { ko: '너희', nom: 'ihr', akk: 'euch', dat: 'euch' },
    { ko: '그들', nom: 'sie', akk: 'sie', dat: 'ihnen' },
    { ko: '당신 (높임)', nom: 'Sie', akk: 'Sie', dat: 'Ihnen', polite: true },
  ],

  politeness: {
    title: 'du 와 Sie',
    body:
      '한국어의 반말과 존댓말처럼 독일어에도 두 가지가 있어요. 친구·가족·아이에게는 “du”, 처음 만난 사람과 공식적인 자리에서는 “Sie”. Sie는 문장 어디에서나 대문자로 씁니다.',
  },

  examples: [
    { de: 'Ich sehe dich.', ko: '나는 너를 봐. (목적격)' },
    { de: 'Ich helfe dir.', ko: '나는 너를 도와줘. (여격)' },
    { de: 'Er gibt mir das Buch.', ko: '그는 나에게 책을 줘.' },
  ],
}

/* ---------- 6. Körper ----------
   Beschriftung der Zeichnung: deutsches Wort + koreanische
   Bedeutung. Die Positionen stehen in SetSheetDe.jsx. */
export const bodyDe = {
  extra: [
    { de: 'der Rücken', ko: '등' },
    { de: 'der Po', ko: '엉덩이' },
    { de: 'der Zeh', ko: '발가락' },
    { de: 'die Zunge', ko: '혀' },
    { de: 'der Körper', ko: '몸' },
    { de: 'Es tut weh.', ko: '아파요.' },
  ],
  note: '신체 부위는 관사와 함께 외워 두세요. 병원에서 바로 쓰게 됩니다.',
}

/* ---------- 7. Essen ---------- */
export const foodDe = {
  basics: [
    { de: 'das Brot', ko: '빵', emoji: '🍞' },
    { de: 'das Wasser', ko: '물', emoji: '💧' },
    { de: 'der Käse', ko: '치즈', emoji: '🧀' },
    { de: 'das Fleisch', ko: '고기', emoji: '🥩' },
    { de: 'der Fisch', ko: '생선', emoji: '🐟' },
    { de: 'das Ei', ko: '계란', emoji: '🥚' },
    { de: 'das Gemüse', ko: '채소', emoji: '🥕' },
    { de: 'das Obst', ko: '과일', emoji: '🍎' },
    { de: 'die Kartoffel', ko: '감자', emoji: '🥔' },
  ],
  dishes: [
    { de: 'die Brezel', ko: '프레첼', emoji: '🥨' },
    { de: 'die Wurst', ko: '소시지', emoji: '🌭' },
    { de: 'das Schnitzel', ko: '슈니첼', emoji: '🍖' },
    { de: 'die Suppe', ko: '수프', emoji: '🍲' },
    { de: 'der Salat', ko: '샐러드', emoji: '🥗' },
    { de: 'der Kuchen', ko: '케이크', emoji: '🍰' },
  ],
  drinks: [
    { de: 'der Kaffee', ko: '커피', emoji: '☕' },
    { de: 'der Tee', ko: '차', emoji: '🍵' },
    { de: 'die Milch', ko: '우유', emoji: '🥛' },
    { de: 'der Saft', ko: '주스', emoji: '🧃' },
    { de: 'das Bier', ko: '맥주', emoji: '🍺' },
    { de: 'der Wein', ko: '와인', emoji: '🍷' },
  ],
  taste: [
    { de: 'lecker', ko: '맛있는', emoji: '😋' },
    { de: 'süß', ko: '단', emoji: '🍯' },
    { de: 'salzig', ko: '짠', emoji: '🧂' },
    { de: 'sauer', ko: '신', emoji: '🍋' },
    { de: 'scharf', ko: '매운', emoji: '🌶️' },
    { de: 'bitter', ko: '쓴', emoji: '☕' },
  ],
  phrases: [
    { de: 'Guten Appetit!', ko: '맛있게 드세요 (식사 전 인사)' },
    { de: 'Ich habe Hunger.', ko: '배고파요.' },
    { de: 'Ich bin satt.', ko: '배불러요.' },
    { de: 'Das schmeckt gut.', ko: '맛있어요.' },
    { de: 'Ich hätte gern …', ko: '… 주세요 (정중한 주문)' },
    { de: 'Die Rechnung, bitte.', ko: '계산해 주세요.' },
    { de: 'Ich bin Vegetarierin.', ko: '저는 채식주의자예요.' },
  ],
  phraseNote:
    '“Ich hätte gern …”은 식당에서 가장 자주 쓰는 표현이에요. “Ich will …”은 직설적으로 들리니 피하는 게 좋습니다.',
}

/* ---------- 8. Farben ---------- */
export const colorsDe = {
  items: [
    { de: 'rot', ko: '빨간색', hex: '#d5352b' },
    { de: 'orange', ko: '주황색', hex: '#e2802d' },
    { de: 'gelb', ko: '노란색', hex: '#edc43a' },
    { de: 'grün', ko: '초록색', hex: '#3f8a52' },
    { de: 'hellblau', ko: '하늘색', hex: '#79b6dd' },
    { de: 'blau', ko: '파란색', hex: '#2a4a8b' },
    { de: 'lila', ko: '보라색', hex: '#7b4b9c' },
    { de: 'rosa', ko: '분홍색', hex: '#e08fae' },
    { de: 'braun', ko: '갈색', hex: '#7d5535' },
    { de: 'grau', ko: '회색', hex: '#8d8880' },
    { de: 'schwarz', ko: '검은색', hex: '#1f1b18' },
    { de: 'weiß', ko: '하얀색', hex: '#fbf8f1' },
  ],
  note: '색 이름은 형용사예요. 명사 앞에 오면 어미가 붙어요: “das rote Auto”, “ein roter Apfel”.',
  question: { de: 'Welche Farbe ist das?', ko: '이건 무슨 색이에요?' },
}

/* ---------- 9. Familie ---------- */
export const familyDe = {
  items: [
    { de: 'die Familie', ko: '가족' },
    { de: 'die Eltern', ko: '부모님' },
    { de: 'die Mutter', ko: '어머니' },
    { de: 'der Vater', ko: '아버지' },
    { de: 'die Großmutter', ko: '할머니', casual: 'die Oma' },
    { de: 'der Großvater', ko: '할아버지', casual: 'der Opa' },
    { de: 'die Schwester', ko: '자매 (언니·누나·여동생)' },
    { de: 'der Bruder', ko: '형제 (오빠·형·남동생)' },
    { de: 'die Tochter', ko: '딸' },
    { de: 'der Sohn', ko: '아들' },
    { de: 'die Frau', ko: '아내' },
    { de: 'der Mann', ko: '남편' },
  ],

  /* Spiegelbild zum koreanischen Familien-Set */
  difference: {
    title: '나이와 성별로 나누지 않아요',
    body:
      '한국어는 오빠·형·언니·누나를 구별하지만, 독일어는 그냥 “der Bruder”와 “die Schwester”뿐이에요. 나이를 말하려면 따로 붙입니다: “mein älterer Bruder” (형/오빠), “meine jüngere Schwester” (여동생).',
  },
}

/* ---------- 10. Länder ---------- */
export const countriesDe = {
  items: [
    { de: 'Deutschland', ko: '독일', flag: '🇩🇪' },
    { de: 'Österreich', ko: '오스트리아', flag: '🇦🇹' },
    { de: 'die Schweiz', ko: '스위스', flag: '🇨🇭', article: true },
    { de: 'Korea', ko: '한국', flag: '🇰🇷' },
    { de: 'Japan', ko: '일본', flag: '🇯🇵' },
    { de: 'China', ko: '중국', flag: '🇨🇳' },
    { de: 'die USA', ko: '미국', flag: '🇺🇸', article: true },
    { de: 'England', ko: '영국', flag: '🇬🇧' },
    { de: 'Frankreich', ko: '프랑스', flag: '🇫🇷' },
    { de: 'Spanien', ko: '스페인', flag: '🇪🇸' },
    { de: 'Italien', ko: '이탈리아', flag: '🇮🇹' },
    { de: 'Russland', ko: '러시아', flag: '🇷🇺' },
  ],
  note: '나라 이름은 대부분 관사가 없어요. 몇 개만 예외입니다: die Schweiz, die USA, die Türkei.',
  usage: [
    { de: 'Ich komme aus Korea.', ko: '저는 한국에서 왔어요.' },
    { de: 'Ich wohne in Deutschland.', ko: '저는 독일에 살아요.' },
    { de: 'Ich fahre nach Österreich.', ko: '저는 오스트리아에 가요.' },
    { de: 'Ich fahre in die Schweiz.', ko: '스위스는 관사가 있어서 “in die”를 써요.' },
  ],
}

/* ---------- Übersicht für das Menü ---------- */
export const setListDe = [
  { id: 'articles', title: '관사', ko: 'der/die/das', icon: 'speech', hint: '독일어에서 가장 큰 산' },
  { id: 'numbers', title: '숫자', ko: 'Zahlen', icon: 'numbers', hint: '읽는 순서가 거꾸로예요' },
  { id: 'time', title: '시간과 요일', ko: 'Zeit', icon: 'clock', hint: '요일, 오늘 주변의 날들' },
  { id: 'plural', title: '복수형', ko: 'Plural', icon: 'layers', hint: '여섯 가지 형태' },
  { id: 'pronouns', title: '인칭대명사', ko: 'Pronomen', icon: 'family', hint: 'ich · mich · mir' },
  { id: 'body', title: '몸', ko: 'Körper', icon: 'body', hint: '그림으로 보는 신체 부위' },
  { id: 'food', title: '음식', ko: 'Essen', icon: 'bowl', hint: '식당에서 쓰는 말' },
  { id: 'colors', title: '색깔', ko: 'Farben', icon: 'palette', hint: '열두 가지 색' },
  { id: 'family', title: '가족', ko: 'Familie', icon: 'family', hint: '한국어보다 단순해요' },
  { id: 'countries', title: '나라', ko: 'Länder', icon: 'globe', hint: '나라 이름과 전치사' },
]
