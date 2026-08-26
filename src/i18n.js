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
  tabTrainer: 'Trainer',

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

  /* --- Wortarten --- */
  posAll: 'All',
  pos: { noun: 'Noun', verb: 'Verb', adj: 'Adjective', adv: 'Adverb', phrase: 'Phrase', other: 'Other' },
  posShort: { noun: 'N', verb: 'V', adj: 'ADJ', adv: 'ADV', phrase: 'PHR', other: '·' },
  wordClass: 'Word class',

  /* --- Zahl des Tages --- */
  typeTheNumber: 'Type the number in Korean',
  almostFixRed: 'Almost! Fix the field marked red and try again.',
  notQuite: 'Not quite – try again.',

  /* --- Artikel des Tages --- */
  articleOfDay: 'Article of the Day',
  whichArticle: 'Which article does it take?',
  articleWrong: (a) => `Not quite — it is "${a}".`,
  articleNeedNouns: 'Add a few nouns to your library first.',
  pluralOfDay: 'Plural of the Day',
  whichPlural: 'What is the plural?',
  pluralWrong: 'Not quite — here is the plural.',
  conjOfDay: 'Verb of the Day',
  whichConj: 'What is the present-tense form?',
  conjWrong: 'Not quite — here is the form.',

  /* --- Zusatzinfos --- */
  info: 'Details',
  pluralLabel: 'Plural',
  conjLabel: 'Present tense',
  noExtras: 'No extra details for this word yet.',
  autoFilled: 'automatically added — please double-check',

  /* --- Partner --- */
  partnerDoneToday: (name) => `🔥 ${name} already finished today!`,
  undo: 'Undo',
  exampleLabel: 'Example',
  exportCsv: 'Export backup (CSV)',
  tricky: 'Tricky',

  /* --- Trainer --- */
  trainerTitle: 'Trainer',
  trainerSub: 'Real conversations, exactly at your level',
  modeScenario: 'Everyday situation',
  modeScenarioSub: 'Surprise scene — just dive in',
  modeFree: 'Free talk',
  modeFreeSub: 'No goal, no ending. Want a specific scene? Just ask!',
  modeGap: 'Fill the gaps',
  modeGapSub: 'Grammar in tiny doses',
  modeGrammar: 'Grammar',
  modeGrammarSub: 'Learn and review rules',
  comingSoon: 'Coming soon',
  skillsTitle: 'My grammar',
  skillsEntrySub: 'Tell the trainer what you already know',
  skillsSub: 'One line per point you can use. The trainer reads this before every conversation — what is listed here, it will use; what is missing, it avoids.',
  skillsTopicPh: 'Grammar point, e.g. -았/었어요 (past tense)',
  skillsNotePh: 'Note (optional)',
  skillsAdd: 'Add',
  skillsEmpty: 'Nothing here yet — add your first grammar point!',
  skillsError: 'Could not reach the cloud — please try again.',
  typeMessage: 'Message…',
  send: 'Send',
  endTalk: 'Finish conversation ✓',
  improve: '✍ Improve & resend',
  improving: 'Improving your last message…',
  trainerOffline: 'The trainer is unreachable right now. Please try again in a moment.',
  trainerRateLimit: 'That is plenty for this hour 😊 Try again a little later.',
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
  tabTrainer: '트레이너',

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

  /* --- Wortarten --- */
  posAll: '전체',
  pos: { noun: '명사', verb: '동사', adj: '형용사', adv: '부사', phrase: '표현', other: '기타' },
  posShort: { noun: 'N', verb: 'V', adj: 'ADJ', adv: 'ADV', phrase: 'PHR', other: '·' },
  wordClass: '품사',

  /* --- Zahl des Tages --- */
  typeTheNumber: '숫자를 한국어로 입력하세요',
  almostFixRed: '거의 다 됐어요! 빨간 칸을 고쳐 보세요.',
  notQuite: '아니에요 – 다시 해 보세요.',

  /* --- Artikel des Tages --- */
  articleOfDay: '오늘의 관사',
  whichArticle: '어떤 관사를 쓸까요?',
  articleWrong: (a) => `아니에요 — 정답은 "${a}"예요.`,
  articleNeedNouns: '먼저 명사를 몇 개 추가해 주세요.',
  pluralOfDay: '오늘의 복수형',
  whichPlural: '복수형은 무엇일까요?',
  pluralWrong: '아니에요 — 복수형은 이거예요.',
  conjOfDay: '오늘의 동사',
  whichConj: '현재형은 무엇일까요?',
  conjWrong: '아니에요 — 이 형태예요.',

  /* --- Zusatzinfos --- */
  info: '자세히',
  pluralLabel: '복수형',
  conjLabel: '현재형',
  noExtras: '아직 추가 정보가 없어요.',
  autoFilled: '자동으로 추가됨 — 확인해 주세요',

  /* --- Partner --- */
  partnerDoneToday: (name) => `🔥 ${name}는 오늘 벌써 다 했어요!`,
  undo: '되돌리기',
  exampleLabel: '예문',
  exportCsv: '백업 내보내기 (CSV)',
  tricky: '헷갈림',

  /* --- Trainer --- */
  trainerTitle: '트레이너',
  trainerSub: '내 수준에 딱 맞는 진짜 대화',
  modeScenario: '일상 상황',
  modeScenarioSub: '어떤 상황일까? 바로 시작!',
  modeFree: '자유 대화',
  modeFreeSub: '목표 없이 끝없이. 원하는 상황이 있으면 말만 해요!',
  modeGap: '빈칸 채우기',
  modeGapSub: '문법을 조금씩',
  modeGrammar: '문법',
  modeGrammarSub: '규칙 배우고 복습하기',
  comingSoon: '준비 중',
  skillsTitle: '내 문법',
  skillsEntrySub: '이미 아는 문법을 알려 주세요',
  skillsSub: '아는 문법을 한 줄씩 적어요. 트레이너는 대화 전에 이 목록을 읽어요 — 여기 있는 건 쓰고, 없는 건 피해요.',
  skillsTopicPh: '문법 항목, 예: 과거형',
  skillsNotePh: '메모 (선택)',
  skillsAdd: '추가',
  skillsEmpty: '아직 비어 있어요 — 첫 문법을 추가해 보세요!',
  skillsError: '지금은 저장할 수 없어요 — 다시 시도해 주세요.',
  typeMessage: '메시지…',
  send: '보내기',
  endTalk: '대화 마치기 ✓',
  improve: '✍ 고쳐서 다시 보내기',
  improving: '마지막 메시지를 고치는 중…',
  trainerOffline: '지금은 트레이너에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.',
  trainerRateLimit: '이번 시간엔 충분히 연습했어요 😊 조금 있다가 다시 해요.',
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
    articleOfDay: null,
    pluralOfDay: null,
    conjOfDay: null,
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
    articleOfDay: 'der · die · das',
    pluralOfDay: 'Plural',
    conjOfDay: 'ich · du · er…',
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
