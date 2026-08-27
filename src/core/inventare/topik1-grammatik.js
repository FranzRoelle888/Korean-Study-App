/* ============================================================
   TOPIK-I-GRAMMATIK-INVENTAR (Koreanisch, Stufen 1–2 ≈ A1–A2)

   Der kanonische Fahrplan, gegen den Franz' Grammatik-Stand
   geführt wird. Jeder Punkt trägt EINEN typischen Beispielsatz —
   die Kalibrierung fragt nicht nach Fachbegriffen, sondern:
   „Könntest du so einen Satz selbst bilden?"

   stufe 1 ≈ TOPIK Level 1 (A1), stufe 2 ≈ Level 2 (A2).
   Reihenfolge = sinnvolle Lern-Reihenfolge (angelehnt an TOPIK-
   Listen und die TTMIK-Progression). Von Claude kuratiert;
   해인 macht die Muttersprachler-Stichprobe.
   ============================================================ */

export const TOPIK1_GRAMMATIK = [
  /* ---------- Stufe 1 (A1): das Fundament ---------- */
  { id: 'ident', stufe: 1, muster: 'N이에요/예요', name: 'to be (identity)', beispiel: { ko: '저는 학생이에요.', tr: 'I am a student.' } },
  { id: 'topic-eun-neun', stufe: 1, muster: 'N은/는', name: 'topic particle', beispiel: { ko: '오늘은 날씨가 좋아요.', tr: 'As for today, the weather is good.' } },
  { id: 'subj-i-ga', stufe: 1, muster: 'N이/가', name: 'subject particle', beispiel: { ko: '비가 와요.', tr: 'It is raining.' } },
  { id: 'obj-eul-reul', stufe: 1, muster: 'N을/를', name: 'object particle', beispiel: { ko: '커피를 마셔요.', tr: 'I drink coffee.' } },
  { id: 'praes-haeyo', stufe: 1, muster: '-아/어요', name: 'polite present (해요체)', beispiel: { ko: '한국어를 공부해요.', tr: 'I study Korean.' } },
  { id: 'formal-mnida', stufe: 1, muster: '-ㅂ니다/습니다', name: 'formal style (합니다체)', beispiel: { ko: '만나서 반갑습니다.', tr: 'Nice to meet you.' } },
  { id: 'exist-itda', stufe: 1, muster: '있다/없다', name: 'to exist / to have', beispiel: { ko: '시간이 없어요.', tr: 'I have no time.' } },
  { id: 'ort-e', stufe: 1, muster: 'N에 (장소/시간)', name: 'at/to (place & time)', beispiel: { ko: '세 시에 학교에 가요.', tr: 'I go to school at three.' } },
  { id: 'ort-eseo', stufe: 1, muster: 'N에서', name: 'at (action location)', beispiel: { ko: '카페에서 공부해요.', tr: 'I study at a café.' } },
  { id: 'neg-an', stufe: 1, muster: '안 + V', name: 'negation (don’t)', beispiel: { ko: '아침을 안 먹어요.', tr: 'I don’t eat breakfast.' } },
  { id: 'neg-mot', stufe: 1, muster: '못 + V', name: 'cannot', beispiel: { ko: '오늘은 못 가요.', tr: 'I can’t go today.' } },
  { id: 'auch-do', stufe: 1, muster: 'N도', name: 'also / too', beispiel: { ko: '저도 김치를 좋아해요.', tr: 'I like kimchi too.' } },
  { id: 'und-hago', stufe: 1, muster: 'N하고 / N와/과', name: 'and / with (nouns)', beispiel: { ko: '친구하고 영화를 봐요.', tr: 'I watch a movie with a friend.' } },
  { id: 'poss-ui', stufe: 1, muster: 'N의', name: 'possessive (of)', beispiel: { ko: '친구의 이름이 뭐예요?', tr: 'What is your friend’s name?' } },
  { id: 'dies-i-geu-jeo', stufe: 1, muster: '이/그/저 N', name: 'this / that / that over there', beispiel: { ko: '이 가방은 얼마예요?', tr: 'How much is this bag?' } },
  { id: 'fragew', stufe: 1, muster: '뭐/누구/어디/언제/왜', name: 'question words', beispiel: { ko: '주말에 뭐 해요?', tr: 'What do you do on the weekend?' } },
  { id: 'welch-museun', stufe: 1, muster: '무슨/어떤/어느 N', name: 'what kind / which', beispiel: { ko: '무슨 음식을 좋아해요?', tr: 'What food do you like?' } },
  { id: 'zahl-nativ', stufe: 1, muster: '하나, 둘… + 개/명/살', name: 'native numbers + counters', beispiel: { ko: '사과 두 개 주세요.', tr: 'Two apples, please.' } },
  { id: 'zahl-sino', stufe: 1, muster: '일, 이… + 년/월/일/원', name: 'Sino numbers (dates, money)', beispiel: { ko: '이 책은 만 오천 원이에요.', tr: 'This book is 15,000 won.' } },
  { id: 'uhrzeit', stufe: 1, muster: 'N시 N분', name: 'telling time (mixed systems)', beispiel: { ko: '지금 두 시 삼십 분이에요.', tr: 'It is 2:30 now.' } },
  { id: 'wieviel-myeot', stufe: 1, muster: '몇 + counter', name: 'how many / what (number)', beispiel: { ko: '몇 살이에요?', tr: 'How old are you?' } },
  { id: 'bitte-juseyo', stufe: 1, muster: 'N 주세요', name: 'please give me', beispiel: { ko: '물 좀 주세요.', tr: 'Please give me some water.' } },
  { id: 'wollen-go-sipda', stufe: 1, muster: '-고 싶다', name: 'want to', beispiel: { ko: '한국에 가고 싶어요.', tr: 'I want to go to Korea.' } },
  { id: 'hoefl-useyo', stufe: 1, muster: '-(으)세요', name: 'polite request / honorific present', beispiel: { ko: '여기 앉으세요.', tr: 'Please sit here.' } },
  { id: 'vergangenheit', stufe: 1, muster: '-았/었어요', name: 'past tense', beispiel: { ko: '어제 친구를 만났어요.', tr: 'I met a friend yesterday.' } },
  { id: 'futur-l-geoyeyo', stufe: 1, muster: '-(으)ㄹ 거예요', name: 'future / intention', beispiel: { ko: '내일 서울에 갈 거예요.', tr: 'I will go to Seoul tomorrow.' } },
  { id: 'verb-und-go', stufe: 1, muster: '-고', name: 'and (linking clauses)', beispiel: { ko: '밥을 먹고 커피를 마셔요.', tr: 'I eat and then drink coffee.' } },
  { id: 'aber-jiman', stufe: 1, muster: '-지만', name: 'but (linking clauses)', beispiel: { ko: '김치는 맵지만 맛있어요.', tr: 'Kimchi is spicy but delicious.' } },
  { id: 'satzkonn', stufe: 1, muster: '그리고/그런데/그래서', name: 'sentence connectors', beispiel: { ko: '비가 와요. 그래서 집에 있어요.', tr: 'It rains. So I stay home.' } },
  { id: 'position', stufe: 1, muster: 'N 앞/뒤/위/옆', name: 'position nouns (in front of…)', beispiel: { ko: '은행은 학교 옆에 있어요.', tr: 'The bank is next to the school.' } },
  { id: 'von-bis', stufe: 1, muster: 'N부터 N까지', name: 'from … to', beispiel: { ko: '아홉 시부터 여섯 시까지 일해요.', tr: 'I work from 9 to 6.' } },
  { id: 'mittel-euro', stufe: 1, muster: 'N(으)로', name: 'by / with / toward', beispiel: { ko: '지하철로 가요.', tr: 'I go by subway.' } },
  { id: 'um-zu-reo', stufe: 1, muster: '-(으)러 가다/오다', name: 'go in order to', beispiel: { ko: '밥을 먹으러 식당에 가요.', tr: 'I go to a restaurant to eat.' } },
  { id: 'person-hante', stufe: 1, muster: 'N한테/에게', name: 'to (a person)', beispiel: { ko: '친구한테 선물을 줬어요.', tr: 'I gave a present to a friend.' } },

  /* ---------- Stufe 2 (A2): das soziale Getriebe ---------- */
  { id: 'koennen-l-su', stufe: 2, muster: '-(으)ㄹ 수 있다/없다', name: 'can / cannot', beispiel: { ko: '한국어를 조금 할 수 있어요.', tr: 'I can speak a little Korean.' } },
  { id: 'muessen-eoya', stufe: 2, muster: '-아/어야 하다/되다', name: 'must / have to', beispiel: { ko: '내일 일찍 일어나야 해요.', tr: 'I have to get up early tomorrow.' } },
  { id: 'fuer-mich-eo-juseyo', stufe: 2, muster: '-아/어 주세요', name: 'please do (for me)', beispiel: { ko: '사진 좀 찍어 주세요.', tr: 'Please take a photo (for me).' } },
  { id: 'vorschlag-lkkayo', stufe: 2, muster: '-(으)ㄹ까요?', name: 'shall we? / I wonder', beispiel: { ko: '같이 점심 먹을까요?', tr: 'Shall we have lunch together?' } },
  { id: 'lasst-uns-psida', stufe: 2, muster: '-(으)ㅂ시다', name: 'let’s (formal)', beispiel: { ko: '다음 주에 만납시다.', tr: 'Let’s meet next week.' } },
  { id: 'wenn-myeon', stufe: 2, muster: '-(으)면', name: 'if / when', beispiel: { ko: '시간이 있으면 전화하세요.', tr: 'If you have time, call me.' } },
  { id: 'weil-eoseo', stufe: 2, muster: '-아/어서', name: 'because / and then', beispiel: { ko: '피곤해서 일찍 잤어요.', tr: 'I was tired, so I slept early.' } },
  { id: 'weil-nikka', stufe: 2, muster: '-(으)니까', name: 'because (imperative ok)', beispiel: { ko: '비가 오니까 우산을 가져가세요.', tr: 'It’s raining, so take an umbrella.' } },
  { id: 'verlauf-go-itda', stufe: 2, muster: '-고 있다', name: 'progressive (-ing)', beispiel: { ko: '지금 밥을 먹고 있어요.', tr: 'I am eating right now.' } },
  { id: 'versuchen-eo-boda', stufe: 2, muster: '-아/어 보다', name: 'try doing', beispiel: { ko: '이 옷을 한번 입어 보세요.', tr: 'Try this on once.' } },
  { id: 'erfahrung-n-jeok', stufe: 2, muster: '-(으)ㄴ 적이 있다', name: 'have done before', beispiel: { ko: '제주도에 간 적이 있어요.', tr: 'I have been to Jeju Island.' } },
  { id: 'attr-praesens', stufe: 2, muster: 'V-는 N', name: 'noun-modifying (present)', beispiel: { ko: '지금 읽는 책이 재미있어요.', tr: 'The book I’m reading now is fun.' } },
  { id: 'attr-vergangen', stufe: 2, muster: 'V-(으)ㄴ N', name: 'noun-modifying (past)', beispiel: { ko: '어제 본 영화가 좋았어요.', tr: 'The movie I saw yesterday was good.' } },
  { id: 'attr-futur', stufe: 2, muster: 'V-(으)ㄹ N', name: 'noun-modifying (future)', beispiel: { ko: '내일 할 일이 많아요.', tr: 'I have a lot to do tomorrow.' } },
  { id: 'bevor-gi-jeone', stufe: 2, muster: '-기 전에', name: 'before doing', beispiel: { ko: '자기 전에 책을 읽어요.', tr: 'I read before sleeping.' } },
  { id: 'nachdem-n-hue', stufe: 2, muster: '-(으)ㄴ 후에', name: 'after doing', beispiel: { ko: '수업이 끝난 후에 뭐 해요?', tr: 'What do you do after class ends?' } },
  { id: 'waehrend-myeonseo', stufe: 2, muster: '-(으)면서', name: 'while doing', beispiel: { ko: '음악을 들으면서 공부해요.', tr: 'I study while listening to music.' } },
  { id: 'verbot-ji-maseyo', stufe: 2, muster: '-지 마세요', name: 'please don’t', beispiel: { ko: '여기서 사진을 찍지 마세요.', tr: 'Please don’t take photos here.' } },
  { id: 'neg-ji-anta', stufe: 2, muster: '-지 않다', name: 'negation (long form)', beispiel: { ko: '요즘 바쁘지 않아요.', tr: 'I’m not busy these days.' } },
  { id: 'honorific-si', stufe: 2, muster: '-(으)시-', name: 'subject honorific', beispiel: { ko: '어머니께서 요리하세요.', tr: 'My mother is cooking. (honorific)' } },
  { id: 'vergleich-boda', stufe: 2, muster: 'N보다 (더)', name: 'more than', beispiel: { ko: '오늘이 어제보다 더 추워요.', tr: 'Today is colder than yesterday.' } },
  { id: 'superlativ-jeil', stufe: 2, muster: '제일/가장', name: 'the most', beispiel: { ko: '뭐가 제일 맛있어요?', tr: 'What is the most delicious?' } },
  { id: 'adverb-ge', stufe: 2, muster: 'A-게', name: 'adverb form (-ly)', beispiel: { ko: '주말 재미있게 보내세요!', tr: 'Have a fun weekend!' } },
  { id: 'nicht-wahr-jiyo', stufe: 2, muster: '-지요?', name: 'isn’t it? (confirmation)', beispiel: { ko: '날씨가 정말 좋지요?', tr: 'The weather is really nice, isn’t it?' } },
  { id: 'ausruf-neyo', stufe: 2, muster: '-네요', name: 'exclamation (I notice!)', beispiel: { ko: '한국어를 잘하시네요!', tr: 'You speak Korean well!' } },
  { id: 'versprechen-lgeyo', stufe: 2, muster: '-(으)ㄹ게요', name: 'I’ll (promise/offer)', beispiel: { ko: '제가 커피를 살게요.', tr: 'I’ll buy the coffee.' } },
  { id: 'magst-du-llaeyo', stufe: 2, muster: '-(으)ㄹ래요?', name: 'wanna …?', beispiel: { ko: '영화 보러 갈래요?', tr: 'Wanna go see a movie?' } },
  { id: 'weil-gi-ttaemune', stufe: 2, muster: '-기 때문에', name: 'because (written/formal)', beispiel: { ko: '시험이 있기 때문에 공부해요.', tr: 'I study because there is an exam.' } },
  { id: 'wie-cheoreom', stufe: 2, muster: 'N처럼/같이', name: 'like (comparison)', beispiel: { ko: '가수처럼 노래를 잘해요.', tr: 'You sing well like a singer.' } },
  { id: 'nur-man', stufe: 2, muster: 'N만', name: 'only', beispiel: { ko: '주말에만 시간이 있어요.', tr: 'I only have time on weekends.' } },
  { id: 'nominal-neun-geot', stufe: 2, muster: 'V-는 것', name: 'the act of (nominalizer)', beispiel: { ko: '요리하는 것을 좋아해요.', tr: 'I like cooking.' } },
  { id: 'scheint-geot-gatda', stufe: 2, muster: '-(으)ㄴ/는 것 같다', name: 'it seems', beispiel: { ko: '밖에 비가 오는 것 같아요.', tr: 'It seems to be raining outside.' } },
  { id: 'kontext-nunde', stufe: 2, muster: '-(으)ㄴ/는데', name: 'background / soft contrast', beispiel: { ko: '지금 바쁜데 나중에 전화해도 돼요?', tr: 'I’m busy now — can I call later?' } },
  { id: 'duerfen-eodo-dwaeda', stufe: 2, muster: '-아/어도 되다', name: 'may (permission)', beispiel: { ko: '여기 앉아도 돼요?', tr: 'May I sit here?' } },
  { id: 'verboten-myeon-andwaeda', stufe: 2, muster: '-(으)면 안 되다', name: 'must not', beispiel: { ko: '여기서 담배를 피우면 안 돼요.', tr: 'You must not smoke here.' } },
  { id: 'von-person-hanteseo', stufe: 2, muster: 'N한테서/에게서', name: 'from (a person)', beispiel: { ko: '친구한테서 편지를 받았어요.', tr: 'I got a letter from a friend.' } },
  { id: 'vermutung-gess', stufe: 2, muster: '-겠-', name: 'will / must be (guess)', beispiel: { ko: '와, 정말 맛있겠어요!', tr: 'Wow, that must be delicious!' } },
  { id: 'vorhaben-ryeogo', stufe: 2, muster: '-(으)려고 하다', name: 'intend to', beispiel: { ko: '주말에 부산에 가려고 해요.', tr: 'I’m planning to go to Busan this weekend.' } },
]
