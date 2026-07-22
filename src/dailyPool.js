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
]
