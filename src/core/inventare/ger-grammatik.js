/* ============================================================
   DEUTSCH-GRAMMATIK-INVENTAR (GER A1–A2)

   Der kanonische Fahrplan für 해인s Grammatik-Stand — angelehnt
   an die Goethe-Progression (Start Deutsch 1/2) und die üblichen
   Lehrwerke (Menschen, Begegnungen, Nicos Weg).

   name = kurzer koreanischer Name (해인s Menüsprache),
   name_en als Rückfalltext. Jeder Punkt trägt einen typischen
   Beispielsatz mit koreanischer Übersetzung — die Kalibrierung
   fragt: „Könntest du so einen Satz selbst bilden?"
   Von Claude kuratiert; Franz macht die Muttersprachler-
   Stichprobe der deutschen Sätze, 해인 die der Übersetzungen.
   ============================================================ */

export const GER_GRAMMATIK = [
  /* ---------- A1: das Fundament ---------- */
  { id: 'praesens', stufe: 'A1', muster: 'Präsens (regelmäßig)', name: '현재형 (규칙 동사)', name_en: 'present tense', beispiel: { de: 'Ich lerne Deutsch.', tr: '저는 독일어를 배워요.' } },
  { id: 'sein-haben', stufe: 'A1', muster: 'sein / haben', name: 'sein과 haben 동사', name_en: 'to be / to have', beispiel: { de: 'Ich bin müde und ich habe Hunger.', tr: '저는 피곤하고 배고파요.' } },
  { id: 'verbzweit', stufe: 'A1', muster: 'Verb an Position 2', name: '동사는 두 번째 자리', name_en: 'verb-second word order', beispiel: { de: 'Ich trinke morgens Kaffee.', tr: '저는 아침에 커피를 마셔요.' } },
  { id: 'janein-frage', stufe: 'A1', muster: 'Ja/Nein-Frage', name: '네/아니요 의문문 (동사 먼저)', name_en: 'yes/no questions', beispiel: { de: 'Trinkst du Kaffee?', tr: '커피 마셔요?' } },
  { id: 'w-fragen', stufe: 'A1', muster: 'W-Fragen', name: '의문사 (wo, was, wann…)', name_en: 'question words', beispiel: { de: 'Wo wohnst du?', tr: '어디에 살아요?' } },
  { id: 'artikel-bestimmt', stufe: 'A1', muster: 'der / die / das', name: '정관사 der/die/das', name_en: 'definite articles (gender)', beispiel: { de: 'Der Tisch, die Lampe, das Buch.', tr: '책상, 램프, 책 (관사와 함께).' } },
  { id: 'artikel-unbestimmt', stufe: 'A1', muster: 'ein / eine', name: '부정관사 ein/eine', name_en: 'indefinite articles', beispiel: { de: 'Das ist eine Lampe.', tr: '이것은 램프예요.' } },
  { id: 'plural', stufe: 'A1', muster: 'Plural', name: '복수형', name_en: 'plural forms', beispiel: { de: 'ein Buch, zwei Bücher', tr: '책 한 권, 책 두 권' } },
  { id: 'akkusativ', stufe: 'A1', muster: 'Akkusativ (den/einen)', name: '목적격 (4격)', name_en: 'accusative case', beispiel: { de: 'Ich sehe den Mann.', tr: '저는 그 남자를 봐요.' } },
  { id: 'possessiv', stufe: 'A1', muster: 'mein / dein / sein…', name: '소유관사 (나의, 너의…)', name_en: 'possessive articles', beispiel: { de: 'Das ist meine Schwester.', tr: '이 사람은 제 여동생이에요.' } },
  { id: 'kein', stufe: 'A1', muster: 'kein / keine', name: 'kein 부정 (명사 부정)', name_en: 'negation with kein', beispiel: { de: 'Ich habe kein Auto.', tr: '저는 차가 없어요.' } },
  { id: 'nicht', stufe: 'A1', muster: 'nicht', name: 'nicht 부정', name_en: 'negation with nicht', beispiel: { de: 'Ich arbeite heute nicht.', tr: '저는 오늘 일하지 않아요.' } },
  { id: 'modalverben', stufe: 'A1', muster: 'können / müssen / möchten…', name: '화법조동사 (할 수 있다, 해야 한다…)', name_en: 'modal verbs', beispiel: { de: 'Ich kann gut kochen.', tr: '저는 요리를 잘할 수 있어요.' } },
  { id: 'trennbar', stufe: 'A1', muster: 'trennbare Verben', name: '분리동사 (aufstehen → stehe … auf)', name_en: 'separable verbs', beispiel: { de: 'Ich stehe um sieben Uhr auf.', tr: '저는 일곱 시에 일어나요.' } },
  { id: 'unregelm-praesens', stufe: 'A1', muster: 'fahren → fährst, essen → isst', name: '불규칙 동사 (모음 변화)', name_en: 'irregular present (vowel change)', beispiel: { de: 'Er fährt nach Berlin.', tr: '그는 베를린에 가요.' } },
  { id: 'imperativ', stufe: 'A1', muster: 'Imperativ (du/Sie)', name: '명령형', name_en: 'imperative', beispiel: { de: 'Komm bitte her! / Kommen Sie bitte!', tr: '이리 와요! / 오세요!' } },
  { id: 'pronomen-akk', stufe: 'A1', muster: 'mich / dich / ihn…', name: '인칭대명사 목적격', name_en: 'accusative pronouns', beispiel: { de: 'Ich liebe dich.', tr: '사랑해요.' } },
  { id: 'es-gibt', stufe: 'A1', muster: 'es gibt + Akkusativ', name: 'es gibt (있다)', name_en: 'there is/are', beispiel: { de: 'Hier gibt es ein gutes Café.', tr: '여기 좋은 카페가 있어요.' } },
  { id: 'praep-temporal', stufe: 'A1', muster: 'am / um / im', name: '시간 전치사 (요일/시각/월)', name_en: 'time prepositions', beispiel: { de: 'Am Montag um acht Uhr im August.', tr: '8월의 월요일 여덟 시에.' } },
  { id: 'praep-dativ-fest', stufe: 'A1', muster: 'mit / bei / zu / von + Dativ', name: '여격 전치사 (mit, bei, zu…)', name_en: 'dative prepositions (fixed)', beispiel: { de: 'Ich fahre mit dem Bus zur Arbeit.', tr: '저는 버스로 출근해요.' } },
  { id: 'zahlen-uhrzeit', stufe: 'A1', muster: 'Zahlen, Uhrzeit, Datum', name: '숫자, 시간, 날짜', name_en: 'numbers, time, date', beispiel: { de: 'Es ist halb drei.', tr: '두 시 반이에요.' } },
  { id: 'perfekt-haben', stufe: 'A1', muster: 'Perfekt mit haben', name: '현재완료 (haben + 과거분사)', name_en: 'perfect with haben', beispiel: { de: 'Ich habe Pizza gegessen.', tr: '저는 피자를 먹었어요.' } },
  { id: 'perfekt-sein', stufe: 'A1', muster: 'Perfekt mit sein', name: '현재완료 (sein + 이동동사)', name_en: 'perfect with sein', beispiel: { de: 'Ich bin nach Hause gegangen.', tr: '저는 집에 갔어요.' } },
  { id: 'gern', stufe: 'A1', muster: 'gern / lieber', name: 'gern (즐겨서 하다)', name_en: 'expressing likes', beispiel: { de: 'Ich koche gern.', tr: '저는 요리하는 걸 좋아해요.' } },
  { id: 'konjunktionen', stufe: 'A1', muster: 'und / oder / aber / denn', name: '등위 접속사', name_en: 'coordinating conjunctions', beispiel: { de: 'Ich bin müde, aber glücklich.', tr: '피곤하지만 행복해요.' } },
  { id: 'inversion', stufe: 'A1', muster: 'Heute gehe ich…', name: '도치 (시간 표현이 앞에 오면)', name_en: 'inversion after fronting', beispiel: { de: 'Heute gehe ich ins Kino.', tr: '오늘은 영화관에 가요.' } },
  { id: 'du-sie', stufe: 'A1', muster: 'du / Sie', name: '반말과 존댓말 (du/Sie)', name_en: 'informal vs formal you', beispiel: { de: 'Wie heißt du? / Wie heißen Sie?', tr: '이름이 뭐야? / 성함이 어떻게 되세요?' } },

  /* ---------- A2: das Getriebe ---------- */
  { id: 'dativ', stufe: 'A2', muster: 'Dativ (dem/einer, mir/dir)', name: '여격 (3격) 전체', name_en: 'dative case (full)', beispiel: { de: 'Ich gebe dem Kind einen Apfel.', tr: '저는 아이에게 사과를 줘요.' } },
  { id: 'wechselpraep', stufe: 'A2', muster: 'in/auf/unter + Akk oder Dativ', name: '방향/장소 전치사 (Wo? vs Wohin?)', name_en: 'two-way prepositions', beispiel: { de: 'Ich gehe in die Küche. / Ich bin in der Küche.', tr: '부엌으로 가요 / 부엌에 있어요.' } },
  { id: 'praeteritum-sein-haben', stufe: 'A2', muster: 'war / hatte', name: 'sein/haben의 과거형', name_en: 'simple past of sein/haben', beispiel: { de: 'Gestern war ich krank.', tr: '어제 저는 아팠어요.' } },
  { id: 'praeteritum-modal', stufe: 'A2', muster: 'konnte / musste / wollte', name: '화법조동사의 과거형', name_en: 'simple past of modals', beispiel: { de: 'Ich konnte gestern nicht kommen.', tr: '어제 올 수 없었어요.' } },
  { id: 'reflexiv', stufe: 'A2', muster: 'sich freuen / sich treffen', name: '재귀동사', name_en: 'reflexive verbs', beispiel: { de: 'Ich freue mich auf das Wochenende.', tr: '주말이 기대돼요.' } },
  { id: 'komparativ', stufe: 'A2', muster: 'größer als', name: '비교급', name_en: 'comparative', beispiel: { de: 'Seoul ist größer als München.', tr: '서울은 뮌헨보다 커요.' } },
  { id: 'superlativ', stufe: 'A2', muster: 'am größten', name: '최상급', name_en: 'superlative', beispiel: { de: 'Dieser Kuchen schmeckt am besten.', tr: '이 케이크가 제일 맛있어요.' } },
  { id: 'weil', stufe: 'A2', muster: 'weil (Verb ans Ende)', name: 'weil 종속절 (동사는 끝으로)', name_en: 'because-clauses', beispiel: { de: 'Ich bleibe zu Hause, weil es regnet.', tr: '비가 와서 집에 있어요.' } },
  { id: 'dass', stufe: 'A2', muster: 'dass', name: 'dass 종속절', name_en: 'that-clauses', beispiel: { de: 'Ich glaube, dass er kommt.', tr: '그가 올 거라고 생각해요.' } },
  { id: 'wenn', stufe: 'A2', muster: 'wenn', name: 'wenn 종속절 (…하면)', name_en: 'if/when-clauses', beispiel: { de: 'Wenn ich Zeit habe, koche ich.', tr: '시간이 있으면 요리해요.' } },
  { id: 'adjektiv-bestimmt', stufe: 'A2', muster: 'der große Mann', name: '형용사 어미 (정관사 뒤)', name_en: 'adjective endings (definite)', beispiel: { de: 'Der rote Mantel ist schön.', tr: '그 빨간 코트가 예뻐요.' } },
  { id: 'adjektiv-unbestimmt', stufe: 'A2', muster: 'ein großer Mann', name: '형용사 어미 (부정관사 뒤)', name_en: 'adjective endings (indefinite)', beispiel: { de: 'Das ist ein guter Film.', tr: '좋은 영화예요.' } },
  { id: 'verben-dativ', stufe: 'A2', muster: 'helfen / gefallen / schmecken', name: '여격을 쓰는 동사', name_en: 'dative verbs', beispiel: { de: 'Das Kleid gefällt mir.', tr: '그 원피스가 마음에 들어요.' } },
  { id: 'indirekte-frage', stufe: 'A2', muster: 'Ich weiß nicht, wo…', name: '간접의문문', name_en: 'indirect questions', beispiel: { de: 'Ich weiß nicht, wo der Bahnhof ist.', tr: '역이 어디에 있는지 몰라요.' } },
  { id: 'konjunktiv-hoeflich', stufe: 'A2', muster: 'würde / könnte / hätte gern', name: '공손한 표현 (Konjunktiv II)', name_en: 'polite requests', beispiel: { de: 'Ich hätte gern einen Kaffee.', tr: '커피 한 잔 주세요.' } },
  { id: 'futur-werden', stufe: 'A2', muster: 'werden + Infinitiv', name: '미래형 (werden)', name_en: 'future with werden', beispiel: { de: 'Ich werde nächstes Jahr Koreanisch lernen.', tr: '내년에 한국어를 배울 거예요.' } },
  { id: 'verben-praep', stufe: 'A2', muster: 'warten auf / denken an', name: '전치사와 함께 쓰는 동사', name_en: 'verbs with prepositions', beispiel: { de: 'Ich warte auf den Bus.', tr: '버스를 기다려요.' } },
  { id: 'es-subjekt', stufe: 'A2', muster: 'es regnet / es ist…', name: '비인칭 es', name_en: 'impersonal es', beispiel: { de: 'Es regnet schon wieder.', tr: '또 비가 와요.' } },
  { id: 'haeufigkeit', stufe: 'A2', muster: 'immer / oft / manchmal / nie', name: '빈도 부사와 어순', name_en: 'frequency adverbs', beispiel: { de: 'Ich trinke nie Kaffee am Abend.', tr: '저는 저녁에 커피를 절대 안 마셔요.' } },
  { id: 'deshalb-trotzdem', stufe: 'A2', muster: 'deshalb / trotzdem', name: '그래서/그런데도 (도치 접속사)', name_en: 'therefore / nevertheless', beispiel: { de: 'Es regnet, trotzdem gehen wir spazieren.', tr: '비가 오는데도 우리는 산책해요.' } },
  { id: 'laender-richtung', stufe: 'A2', muster: 'nach Korea / in die Schweiz', name: '나라 이름과 방향 (nach/in)', name_en: 'directions with countries', beispiel: { de: 'Wir fliegen nach Korea.', tr: '우리는 한국에 가요.' } },
  { id: 'zu-infinitiv', stufe: 'A2', muster: 'zu + Infinitiv', name: 'zu 부정사', name_en: 'zu + infinitive', beispiel: { de: 'Ich habe vergessen, Milch zu kaufen.', tr: '우유 사는 걸 잊어버렸어요.' } },
  { id: 'ordinalzahlen', stufe: 'A2', muster: 'der erste / am zweiten', name: '서수 (날짜)', name_en: 'ordinal numbers', beispiel: { de: 'Mein Geburtstag ist am ersten Mai.', tr: '제 생일은 5월 1일이에요.' } },
]
