/* ============================================================
   OBERFLÄCHENTEXTE

   Zwei Menüsprachen:
     en  für Franz (lernt Koreanisch)
     ko  für seine Freundin (lernt Deutsch)

   Benutzung in den Bauteilen:
     const t = useText()      // holt sich das passende Paket
     t.review                 // -> "Review" bzw. "복습"
     t.wordsInLibrary(12)     // Texte mit Zahl darin sind Funktionen

   NICHT hier drin stehen Wörter der ZIELsprache (오늘의 단어 /
   Wort des Tages) — die hängen daran, was gelernt wird, nicht
   daran, welches Menü man sieht. Die stehen unten in TARGET.
   ============================================================ */

const en = {
  /* --- Startseite --- */
  ready: 'Ready for today?',
  dayStreak: 'day streak',
  wordOfDay: 'Word of the Day',
  review: 'Review',
  numberOfDay: 'Number of the Day',
  wordsInLibrary: (n) => `${n} words in your library`,
  switchLanguage: 'Switch to the German side',

  /* --- Untere Leiste --- */
  tabSets: 'Sets',
  tabHome: 'Home',
  tabLibrary: 'Library',

  /* --- Wiederholen --- */
  again: 'Again',
  hard: 'Hard',
  good: 'Good',
  easy: 'Easy',
  clearedAll: "You've cleared all your cards for today.",
  nothingToReview: 'Nothing to review',
  stackEmpty: 'Your stack is already empty for today.',
  correct: 'Correct ✓',
  wrong: "Your answer wasn't right",
  back: 'Back',
  check: 'Check',
  showAnswer: 'Show answer',

  /* --- Vokabel des Tages --- */
  newWord: 'New word',
  doneForToday: 'Done for today',
  comeBackTomorrow: 'Come back tomorrow for new words.',
  nowInLibrary: "They're now in your library and on your stack.",
  confirm: 'Confirm',
  newLearned: (n) => `${n} new learned!`,
  addedOk: (w) => `"${w}" added ✓`,
  deleteWord: (w) => `Delete "${w}"?`,
  no: 'No',

  /* --- Bibliothek --- */
  library: 'Library',
  wordsCount: (n) => `${n} words`,
  add: 'Add',
  search: 'Search…',
  sort: 'Sort:',
  newest: 'Newest',
  alpha: 'A–Z',
  noWords: 'No words yet – add your first one above.',
  nothingFound: 'Nothing found.',
  edit: 'Edit',
  delete: 'Delete',
  cancel: 'Cancel',
  save: 'Save',
  reallyDelete: 'Delete this word?',

  /* --- Kalender --- */
  learningDays: 'Your learning days',
  daysThisMonth: (n) => `${n} ${n === 1 ? 'day' : 'days'} completed this month`,
  prevMonth: 'Previous month',
  nextMonth: 'Next month',

  /* --- Sets --- */
  setsTitle: 'Sets',
  setsSub: 'Topic sheets to look things up',

  /* --- Zustände --- */
  loading: 'Loading your words…',
  offline: 'Offline – changes are saved locally.',

  /* --- Meldungen aus der Prüfung --- */
  fillBoth: 'Please fill in both fields.',
  duplicate: (w) => `"${w}" is already in your library.`,
}

const ko = {
  /* --- Startseite --- */
  ready: '오늘도 시작해 볼까요?',
  dayStreak: '일 연속',
  wordOfDay: '오늘의 단어',
  review: '복습',
  numberOfDay: '오늘의 숫자',
  wordsInLibrary: (n) => `단어장에 ${n}개`,
  switchLanguage: '한국어 쪽으로 이동',

  /* --- Untere Leiste --- */
  tabSets: '모음',
  tabHome: '홈',
  tabLibrary: '단어장',

  /* --- Wiederholen --- */
  again: '다시',
  hard: '어려움',
  good: '보통',
  easy: '쉬움',
  clearedAll: '오늘 카드를 모두 끝냈어요.',
  nothingToReview: '복습할 카드가 없어요',
  stackEmpty: '오늘 복습은 이미 끝났어요.',
  correct: '정답 ✓',
  wrong: '답이 맞지 않았어요',
  back: '뒤로',
  check: '확인',
  showAnswer: '정답 보기',

  /* --- Vokabel des Tages --- */
  newWord: '새 단어',
  doneForToday: '오늘 완료',
  comeBackTomorrow: '새 단어는 내일 또 나와요.',
  nowInLibrary: '단어장과 복습 카드에 추가됐어요.',
  confirm: '확인',
  newLearned: (n) => `${n}개 배웠어요!`,
  addedOk: (w) => `"${w}" 추가됨 ✓`,
  deleteWord: (w) => `"${w}" 을(를) 삭제할까요?`,
  no: '아니요',

  /* --- Bibliothek --- */
  library: '단어장',
  wordsCount: (n) => `${n}개`,
  add: '추가',
  search: '검색…',
  sort: '정렬:',
  newest: '최신순',
  alpha: 'A–Z',
  noWords: '아직 단어가 없어요 – 위에서 추가해 보세요.',
  nothingFound: '검색 결과가 없어요.',
  edit: '수정',
  delete: '삭제',
  cancel: '취소',
  save: '저장',
  reallyDelete: '이 단어를 삭제할까요?',

  /* --- Kalender --- */
  learningDays: '학습한 날',
  daysThisMonth: (n) => `이번 달 ${n}일 완료`,
  prevMonth: '이전 달',
  nextMonth: '다음 달',

  /* --- Sets --- */
  setsTitle: '모음',
  setsSub: '주제별로 정리한 노트',

  /* --- Zustände --- */
  loading: '단어를 불러오는 중…',
  offline: '오프라인 – 기기에 저장됩니다.',

  /* --- Meldungen aus der Prüfung --- */
  fillBoth: '두 칸을 모두 채워 주세요.',
  duplicate: (w) => `"${w}" 은(는) 이미 단어장에 있어요.`,
}

const PACKS = { en, ko }

export function textFor(uiLang) {
  return PACKS[uiLang] || PACKS.en
}

/* ------------------------------------------------------------
   Texte, die an der ZIELsprache hängen — also daran, was gelernt
   wird. Sie stehen als kleine Unterzeile auf den Knöpfen und in
   den Eingabefeldern, immer in der Sprache, die geübt wird.
   ------------------------------------------------------------ */
const MONTHS_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

const TARGET = {
  ko: {
    wordOfDay: '오늘의 단어',
    review: '복습',
    numberOfDay: '오늘의 숫자',
    typePlaceholder: '한국어…',
    typeHint: 'type in Korean',
    example: 'e.g. 물',
    knownExample: 'e.g. water',
    tagType: 'EN → KO · type',
    tagFlip: 'KO → EN · flip',
    /* Kalender: Wochentage ab Montag, Monatsüberschrift */
    calWeekdays: ['월', '화', '수', '목', '금', '토', '일'],
    monthLabel: (y, m) => `${y}년 ${m + 1}월`,
  },
  de: {
    wordOfDay: 'Wort des Tages',
    review: 'Wiederholen',
    numberOfDay: null,
    typePlaceholder: 'Deutsch…',
    typeHint: '독일어로 입력',
    example: '예: Wasser',
    knownExample: '예: 물',
    tagType: 'KO → DE · 입력',
    tagFlip: 'DE → KO · 뒤집기',
    calWeekdays: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
    monthLabel: (y, m) => `${MONTHS_DE[m]} ${y}`,
  },
}

export function targetTextFor(targetLang) {
  return TARGET[targetLang] || TARGET.ko
}
