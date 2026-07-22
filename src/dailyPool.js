/* ============================================================
   NACHZIEHSTAPEL ("Vokabel des Tages")

   Eine geordnete Liste neuer Vokabeln (pädagogisch von einfach
   nach anspruchsvoller). Jeden Tag nimmt die App die nächsten
   noch nicht eingeführten Einträge daraus.

   Felder: ko (Koreanisch), en (Bedeutung), roman (Lesehilfe),
   ex (Beispielsatz), exEn (Übersetzung des Beispiels).

   Startportion – wächst später Richtung 300. Sollte sich ein
   Wort mit der Bibliothek überschneiden, überspringt die App es
   automatisch (kein Duplikat möglich).
   ============================================================ */

export const dailyPool = [
  // --- Menschen & Familie ---
  { ko: '가족', en: 'family', roman: 'gajok', ex: '우리 가족은 네 명이에요.', exEn: 'My family has four people.' },
  { ko: '어머니', en: 'mother', roman: 'eomeoni', ex: '어머니는 요리를 잘하세요.', exEn: 'My mother cooks well.' },
  { ko: '아버지', en: 'father', roman: 'abeoji', ex: '아버지는 회사에 가세요.', exEn: 'My father goes to the company.' },
  { ko: '아이', en: 'child', roman: 'ai', ex: '아이가 공원에서 놀아요.', exEn: 'The child plays in the park.' },
  { ko: '남자', en: 'man', roman: 'namja', ex: '저 남자는 제 친구예요.', exEn: 'That man is my friend.' },
  { ko: '여자', en: 'woman', roman: 'yeoja', ex: '저 여자는 학생이에요.', exEn: 'That woman is a student.' },
  { ko: '선생님', en: 'teacher', roman: 'seonsaengnim', ex: '선생님이 한국어를 가르쳐요.', exEn: 'The teacher teaches Korean.' },
  { ko: '의사', en: 'doctor', roman: 'uisa', ex: '의사 선생님이 친절해요.', exEn: 'The doctor is kind.' },

  // --- Orte ---
  { ko: '한국', en: 'Korea', roman: 'hanguk', ex: '저는 한국에서 살아요.', exEn: 'I live in Korea.' },
  { ko: '나라', en: 'country', roman: 'nara', ex: '어느 나라에서 왔어요?', exEn: 'Which country are you from?' },
  { ko: '병원', en: 'hospital', roman: 'byeongwon', ex: '아파서 병원에 가요.', exEn: "I'm sick, so I go to the hospital." },
  { ko: '은행', en: 'bank', roman: 'eunhaeng', ex: '은행에서 돈을 찾아요.', exEn: 'I withdraw money at the bank.' },
  { ko: '시장', en: 'market', roman: 'sijang', ex: '시장에서 과일을 사요.', exEn: 'I buy fruit at the market.' },
  { ko: '식당', en: 'restaurant', roman: 'sikdang', ex: '식당에서 밥을 먹어요.', exEn: 'I eat at the restaurant.' },
  { ko: '가게', en: 'store / shop', roman: 'gage', ex: '가게에서 물을 샀어요.', exEn: 'I bought water at the store.' },
  { ko: '회사', en: 'company', roman: 'hoesa', ex: '아버지는 회사에서 일해요.', exEn: 'My father works at a company.' },
  { ko: '역', en: 'station', roman: 'yeok', ex: '역에서 친구를 만나요.', exEn: 'I meet a friend at the station.' },
  { ko: '공원', en: 'park', roman: 'gongwon', ex: '공원에서 운동해요.', exEn: 'I exercise in the park.' },

  // --- Essen & Trinken ---
  { ko: '커피', en: 'coffee', roman: 'keopi', ex: '아침에 커피를 마셔요.', exEn: 'I drink coffee in the morning.' },
  { ko: '우유', en: 'milk', roman: 'uyu', ex: '우유를 매일 마셔요.', exEn: 'I drink milk every day.' },
  { ko: '빵', en: 'bread', roman: 'ppang', ex: '아침에 빵을 먹어요.', exEn: 'I eat bread in the morning.' },
  { ko: '과일', en: 'fruit', roman: 'gwail', ex: '과일이 맛있어요.', exEn: 'The fruit is delicious.' },
  { ko: '사과', en: 'apple', roman: 'sagwa', ex: '사과를 두 개 샀어요.', exEn: 'I bought two apples.' },
  { ko: '고기', en: 'meat', roman: 'gogi', ex: '저는 고기를 좋아해요.', exEn: 'I like meat.' },
  { ko: '김치', en: 'kimchi', roman: 'gimchi', ex: '김치가 조금 매워요.', exEn: 'Kimchi is a little spicy.' },
  { ko: '계란', en: 'egg', roman: 'gyeran', ex: '아침마다 계란을 먹어요.', exEn: 'I eat eggs every morning.' },

  // --- Alltagsgegenstände ---
  { ko: '돈', en: 'money', roman: 'don', ex: '돈이 조금 있어요.', exEn: 'I have a little money.' },
  { ko: '옷', en: 'clothes', roman: 'ot', ex: '새 옷을 샀어요.', exEn: 'I bought new clothes.' },
  { ko: '가방', en: 'bag', roman: 'gabang', ex: '가방이 무거워요.', exEn: 'The bag is heavy.' },
  { ko: '전화', en: 'phone / call', roman: 'jeonhwa', ex: '친구한테 전화해요.', exEn: 'I call my friend.' },
  { ko: '컴퓨터', en: 'computer', roman: 'keompyuteo', ex: '컴퓨터로 일해요.', exEn: 'I work with a computer.' },
  { ko: '사진', en: 'photo', roman: 'sajin', ex: '사진을 찍어요.', exEn: 'I take a photo.' },

  // --- Häufige Verben ---
  { ko: '사다', en: 'to buy', roman: 'sada', ex: '새 신발을 사고 싶어요.', exEn: 'I want to buy new shoes.' },
  { ko: '주다', en: 'to give', roman: 'juda', ex: '친구에게 선물을 줘요.', exEn: 'I give my friend a present.' },
  { ko: '받다', en: 'to receive', roman: 'batda', ex: '편지를 받았어요.', exEn: 'I received a letter.' },
  { ko: '만들다', en: 'to make', roman: 'mandeulda', ex: '어머니가 음식을 만들어요.', exEn: 'My mother makes food.' },
  { ko: '타다', en: 'to ride', roman: 'tada', ex: '버스를 타요.', exEn: 'I ride the bus.' },
  { ko: '기다리다', en: 'to wait', roman: 'gidarida', ex: '친구를 기다려요.', exEn: 'I wait for a friend.' },
  { ko: '알다', en: 'to know', roman: 'alda', ex: '저는 그 사람을 알아요.', exEn: 'I know that person.' },
  { ko: '웃다', en: 'to laugh / smile', roman: 'utda', ex: '아이가 크게 웃어요.', exEn: 'The child laughs loudly.' },

  // --- More family & people ---
  { ko: '할머니', en: 'grandmother', ex: '할머니는 시골에 사세요.', exEn: 'My grandmother lives in the countryside.' },
  { ko: '할아버지', en: 'grandfather', ex: '할아버지가 신문을 읽으세요.', exEn: 'My grandfather reads the newspaper.' },
  { ko: '동생', en: 'younger sibling', ex: '제 동생은 키가 커요.', exEn: 'My younger sibling is tall.' },
  { ko: '부모님', en: 'parents', ex: '저는 부모님을 사랑해요.', exEn: 'I love my parents.' },
  { ko: '아들', en: 'son', ex: '그분은 아들이 두 명 있어요.', exEn: 'He has two sons.' },
  { ko: '딸', en: 'daughter', ex: '제 친구는 딸이 있어요.', exEn: 'My friend has a daughter.' },

  // --- Body ---
  { ko: '머리', en: 'head', ex: '머리가 아파요.', exEn: 'My head hurts.' },
  { ko: '얼굴', en: 'face', ex: '얼굴을 씻어요.', exEn: 'I wash my face.' },
  { ko: '손', en: 'hand', ex: '손을 씻으세요.', exEn: 'Please wash your hands.' },
  { ko: '발', en: 'foot', ex: '발이 아파요.', exEn: 'My foot hurts.' },
  { ko: '눈', en: 'eye', ex: '눈이 커요.', exEn: 'Her eyes are big.' },
  { ko: '마음', en: 'heart / mind', ex: '마음이 따뜻한 사람이에요.', exEn: 'She is a warm-hearted person.' },

  // --- Nature ---
  { ko: '하늘', en: 'sky', ex: '하늘이 맑아요.', exEn: 'The sky is clear.' },
  { ko: '바다', en: 'sea', ex: '여름에 바다에 가요.', exEn: 'I go to the sea in summer.' },
  { ko: '산', en: 'mountain', ex: '주말에 산에 올라가요.', exEn: 'I climb the mountain on weekends.' },
  { ko: '나무', en: 'tree', ex: '공원에 나무가 많아요.', exEn: 'There are many trees in the park.' },
  { ko: '꽃', en: 'flower', ex: '꽃이 예뻐요.', exEn: 'The flowers are pretty.' },
  { ko: '비', en: 'rain', ex: '오늘 비가 와요.', exEn: "It's raining today." },
  { ko: '바람', en: 'wind', ex: '바람이 시원해요.', exEn: 'The wind is refreshing.' },
  { ko: '별', en: 'star', ex: '밤에 별이 많아요.', exEn: 'There are many stars at night.' },

  // --- Getting around ---
  { ko: '기차', en: 'train', ex: '기차를 타고 부산에 가요.', exEn: 'I take the train to Busan.' },
  { ko: '버스', en: 'bus', ex: '버스가 늦게 와요.', exEn: 'The bus comes late.' },
  { ko: '지하철', en: 'subway', ex: '지하철이 빨라요.', exEn: 'The subway is fast.' },
  { ko: '비행기', en: 'airplane', ex: '비행기로 여행해요.', exEn: 'I travel by airplane.' },
  { ko: '자전거', en: 'bicycle', ex: '저는 자전거를 타요.', exEn: 'I ride a bicycle.' },
  { ko: '공항', en: 'airport', ex: '공항에서 친구를 기다려요.', exEn: 'I wait for a friend at the airport.' },
  { ko: '호텔', en: 'hotel', ex: '호텔에서 잤어요.', exEn: 'I slept at a hotel.' },
  { ko: '도서관', en: 'library', ex: '도서관에서 공부해요.', exEn: 'I study at the library.' },
  { ko: '교실', en: 'classroom', ex: '교실이 조용해요.', exEn: 'The classroom is quiet.' },

  // --- Everyday objects ---
  { ko: '문', en: 'door', ex: '문을 열어 주세요.', exEn: 'Please open the door.' },
  { ko: '창문', en: 'window', ex: '창문을 닫으세요.', exEn: 'Please close the window.' },
  { ko: '열쇠', en: 'key', ex: '열쇠를 잃어버렸어요.', exEn: 'I lost my key.' },
  { ko: '시계', en: 'clock / watch', ex: '시계가 정확해요.', exEn: 'The clock is accurate.' },
  { ko: '우산', en: 'umbrella', ex: '비가 와서 우산이 필요해요.', exEn: "It's raining, so I need an umbrella." },
  { ko: '신발', en: 'shoes', ex: '새 신발이 편해요.', exEn: 'The new shoes are comfortable.' },
  { ko: '모자', en: 'hat', ex: '모자를 써요.', exEn: 'I wear a hat.' },
  { ko: '안경', en: 'glasses', ex: '저는 안경을 써요.', exEn: 'I wear glasses.' },
  { ko: '지갑', en: 'wallet', ex: '지갑에 돈이 없어요.', exEn: "There's no money in my wallet." },
  { ko: '선물', en: 'present / gift', ex: '생일 선물을 받았어요.', exEn: 'I received a birthday present.' },
  { ko: '편지', en: 'letter', ex: '친구에게 편지를 써요.', exEn: 'I write a letter to my friend.' },
  { ko: '표', en: 'ticket', ex: '기차표를 샀어요.', exEn: 'I bought a train ticket.' },

  // --- Life & study ---
  { ko: '노래', en: 'song', ex: '이 노래를 좋아해요.', exEn: 'I like this song.' },
  { ko: '영화', en: 'movie', ex: '어제 영화를 봤어요.', exEn: 'I watched a movie yesterday.' },
  { ko: '음악', en: 'music', ex: '음악을 들어요.', exEn: 'I listen to music.' },
  { ko: '그림', en: 'picture / drawing', ex: '그림을 그려요.', exEn: 'I draw a picture.' },
  { ko: '생일', en: 'birthday', ex: '오늘은 제 생일이에요.', exEn: 'Today is my birthday.' },
  { ko: '시험', en: 'exam', ex: '내일 시험이 있어요.', exEn: 'I have an exam tomorrow.' },
  { ko: '숙제', en: 'homework', ex: '숙제가 많아요.', exEn: 'I have a lot of homework.' },
  { ko: '수업', en: 'class / lesson', ex: '수업이 재미있어요.', exEn: 'The class is fun.' },
  { ko: '여행', en: 'trip / travel', ex: '저는 여행을 좋아해요.', exEn: 'I like traveling.' },
  { ko: '취미', en: 'hobby', ex: '제 취미는 요리예요.', exEn: 'My hobby is cooking.' },
  { ko: '문제', en: 'problem', ex: '문제가 어려워요.', exEn: 'The problem is difficult.' },
  { ko: '질문', en: 'question', ex: '질문이 있어요.', exEn: 'I have a question.' },
  { ko: '대답', en: 'answer', ex: '그 대답이 맞아요.', exEn: 'That answer is correct.' },
  { ko: '소리', en: 'sound', ex: '무슨 소리예요?', exEn: 'What is that sound?' },
  { ko: '색깔', en: 'color', ex: '무슨 색깔을 좋아해요?', exEn: 'What color do you like?' },
  { ko: '이유', en: 'reason', ex: '이유가 뭐예요?', exEn: 'What is the reason?' },

  // --- More common verbs ---
  { ko: '팔다', en: 'to sell', ex: '시장에서 과일을 팔아요.', exEn: 'They sell fruit at the market.' },
  { ko: '열다', en: 'to open', ex: '가게는 아홉 시에 열어요.', exEn: 'The store opens at nine.' },
  { ko: '닫다', en: 'to close', ex: '문을 닫아요.', exEn: 'I close the door.' },
  { ko: '찾다', en: 'to look for / find', ex: '열쇠를 찾아요.', exEn: 'I look for my key.' },
  { ko: '시작하다', en: 'to start', ex: '수업을 시작해요.', exEn: 'The class starts.' },
  { ko: '끝나다', en: 'to end / finish', ex: '영화가 끝났어요.', exEn: 'The movie ended.' },
  { ko: '필요하다', en: 'to need', ex: '돈이 필요해요.', exEn: 'I need money.' },
  { ko: '준비하다', en: 'to prepare', ex: '저녁을 준비해요.', exEn: 'I prepare dinner.' },
  { ko: '청소하다', en: 'to clean', ex: '방을 청소해요.', exEn: 'I clean my room.' },
]
