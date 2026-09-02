/* ============================================================
   REDEMITTEL-BANK — die Formeln, die Goethe hören will
   (A2-Sprint Phase 1; Quelle: Sprechen-Prüferblätter + Schreib-
   Aufgabenmuster des offiziellen Übungssatzes)

   7 Pakete à 7 Formeln, sortiert nach Prüfungswert (Sprechen
   Teil 3 = K.o.-Hürde zuerst). Felder je Formel:
     de          die Formel selbst
     ko          koreanische Bedeutung
     beispiel    ein natürlicher Beispielsatz (deutsch)
     situationKo Einsatz-Situation auf Koreanisch — dient als
                 Erklärung auf der Kennenlern-Karte UND als
                 Quiz-Frage im Blitz (Ablenker kommen immer aus
                 FREMDEN Paketen, damit die Antwort eindeutig ist)
     luecke      Produktions-Stufe: Satz mit ___ + Lösung
   ============================================================ */

export const REDEMITTEL_PAKETE = [
  {
    id: 'vorschlag',
    titel: 'Vorschläge machen',
    titelKo: '제안하기',
    formeln: [
      { de: 'Wollen wir …?', ko: '우리 ~할까요?', beispiel: 'Wollen wir am Samstag tanzen gehen?', situationKo: '파트너에게 같이 뭔가 하자고 제안할 때', luecke: { satz: '___ wir am Samstag tanzen gehen?', loesung: 'Wollen' } },
      { de: 'Wie wäre es mit …?', ko: '~은 어때요?', beispiel: 'Wie wäre es mit Samstagabend?', situationKo: '시간이나 장소를 제안할 때', luecke: { satz: 'Wie ___ es mit Samstagabend?', loesung: 'wäre' } },
      { de: 'Ich schlage vor, dass …', ko: '~하자고 제안해요', beispiel: 'Ich schlage vor, dass wir eine Pizza bestellen.', situationKo: '조금 격식 있게 제안할 때', luecke: { satz: 'Ich ___ vor, dass wir eine Pizza bestellen.', loesung: 'schlage' } },
      { de: 'Hast du Lust, … zu …?', ko: '~할 마음 있어요?', beispiel: 'Hast du Lust, ins Kino zu gehen?', situationKo: '친구에게 하고 싶은지 물어볼 때', luecke: { satz: 'Hast du ___, ins Kino zu gehen?', loesung: 'Lust' } },
      { de: 'Wir könnten …', ko: '우리 ~할 수도 있어요', beispiel: 'Wir könnten zusammen kochen.', situationKo: '가능한 계획을 부드럽게 제안할 때', luecke: { satz: 'Wir ___ zusammen kochen.', loesung: 'könnten' } },
      { de: 'Was hältst du von …?', ko: '~에 대해 어떻게 생각해요?', beispiel: 'Was hältst du von einem Picknick?', situationKo: '아이디어에 대한 의견을 물으며 제안할 때', luecke: { satz: 'Was ___ du von einem Picknick?', loesung: 'hältst' } },
      { de: 'Lass uns …', ko: '우리 ~하자', beispiel: 'Lass uns einen Termin finden.', situationKo: '친구에게 바로 하자고 말할 때', luecke: { satz: '___ uns einen Termin finden.', loesung: 'Lass' } },
    ],
  },
  {
    id: 'reaktion',
    titel: 'Zustimmen & Ablehnen',
    titelKo: '동의하기 · 거절하기',
    formeln: [
      { de: 'Gute Idee!', ko: '좋은 생각이에요!', beispiel: 'Gute Idee! Das machen wir.', situationKo: '제안이 마음에 들 때', luecke: { satz: 'Gute ___! Das machen wir.', loesung: 'Idee' } },
      { de: 'Einverstanden.', ko: '동의해요/좋아요', beispiel: 'Einverstanden, dann treffen wir uns um sieben.', situationKo: '제안을 받아들일 때', luecke: { satz: '___, dann treffen wir uns um sieben.', loesung: 'Einverstanden' } },
      { de: 'Das passt mir gut.', ko: '저는 그게 딱 좋아요', beispiel: 'Samstag passt mir gut.', situationKo: '시간·장소가 나에게 맞을 때', luecke: { satz: 'Samstag ___ mir gut.', loesung: 'passt' } },
      { de: 'Das finde ich nicht so gut, weil …', ko: '~해서 별로예요', beispiel: 'Das finde ich nicht so gut, weil es zu teuer ist.', situationKo: '이유를 들어 부드럽게 반대할 때', luecke: { satz: 'Das finde ich nicht so gut, ___ es zu teuer ist.', loesung: 'weil' } },
      { de: 'Leider kann ich nicht, …', ko: '아쉽지만 안 돼요', beispiel: 'Leider kann ich am Montag nicht.', situationKo: '제안을 거절해야 할 때', luecke: { satz: '___ kann ich am Montag nicht.', loesung: 'Leider' } },
      { de: 'Lieber …', ko: '차라리/더 좋은 건 ~', beispiel: 'Lieber am Sonntag als am Samstag.', situationKo: '다른 것을 더 원할 때', luecke: { satz: '___ am Sonntag als am Samstag.', loesung: 'Lieber' } },
      { de: 'Das ist mir zu …', ko: '저한테는 너무 ~해요', beispiel: 'Das ist mir zu spät.', situationKo: '너무 비싸거나 늦어서 곤란할 때', luecke: { satz: 'Das ist ___ zu spät.', loesung: 'mir' } },
    ],
  },
  {
    id: 'fragen',
    titel: 'Fragen stellen',
    titelKo: '질문하기',
    formeln: [
      { de: 'Wo wohnen Sie?', ko: '어디에 사세요?', beispiel: 'Wo wohnen Sie jetzt?', situationKo: '사는 곳을 물을 때 (말하기 파트1 단골)', luecke: { satz: '___ wohnen Sie?', loesung: 'Wo' } },
      { de: 'Was sind Sie von Beruf?', ko: '직업이 뭐예요?', beispiel: 'Was sind Sie von Beruf?', situationKo: '직업을 물을 때', luecke: { satz: 'Was sind Sie von ___?', loesung: 'Beruf' } },
      { de: 'Haben Sie …?', ko: '~이 있으세요?', beispiel: 'Haben Sie Geschwister?', situationKo: '있는지 없는지 물을 때 (예/아니오 질문)', luecke: { satz: '___ Sie Geschwister?', loesung: 'Haben' } },
      { de: 'Wie oft …?', ko: '얼마나 자주 ~?', beispiel: 'Wie oft machen Sie Sport?', situationKo: '빈도를 물을 때', luecke: { satz: 'Wie ___ machen Sie Sport?', loesung: 'oft' } },
      { de: 'Wann …?', ko: '언제 ~?', beispiel: 'Wann stehen Sie auf?', situationKo: '시간을 물을 때', luecke: { satz: '___ stehen Sie auf?', loesung: 'Wann' } },
      { de: 'Was für Musik …?', ko: '어떤 음악을 ~?', beispiel: 'Was für Musik hören Sie gern?', situationKo: '종류를 물을 때 (음악? 영화?)', luecke: { satz: 'Was ___ Musik hören Sie gern?', loesung: 'für' } },
      { de: 'Können Sie das bitte wiederholen?', ko: '다시 말씀해 주시겠어요?', beispiel: 'Entschuldigung, können Sie das bitte wiederholen?', situationKo: '못 알아들었을 때 (시험에서 써도 돼요!)', luecke: { satz: 'Können Sie das bitte ___?', loesung: 'wiederholen' } },
    ],
  },
  {
    id: 'bitten',
    titel: 'Bitten & Danken',
    titelKo: '부탁하기 · 감사하기',
    formeln: [
      { de: 'Könnten Sie bitte …?', ko: '~해 주시겠어요? (격식)', beispiel: 'Könnten Sie mir bitte helfen?', situationKo: 'Sie에게 정중하게 부탁할 때', luecke: { satz: '___ Sie mir bitte helfen?', loesung: 'Könnten' } },
      { de: 'Kannst du mir …?', ko: '~해 줄 수 있어? (친구)', beispiel: 'Kannst du mir die Hausaufgaben schicken?', situationKo: '친구에게 부탁할 때', luecke: { satz: '___ du mir die Hausaufgaben schicken?', loesung: 'Kannst' } },
      { de: 'Ich brauche …', ko: '~이 필요해요', beispiel: 'Ich brauche deine Hilfe.', situationKo: '필요한 것을 말할 때', luecke: { satz: 'Ich ___ deine Hilfe.', loesung: 'brauche' } },
      { de: 'Vielen Dank für …', ko: '~에 감사해요', beispiel: 'Vielen Dank für die Einladung.', situationKo: '무언가에 대해 감사할 때', luecke: { satz: 'Vielen ___ für die Einladung.', loesung: 'Dank' } },
      { de: 'Das ist sehr nett von dir.', ko: '정말 친절하네요', beispiel: 'Danke, das ist sehr nett von dir.', situationKo: '도움을 받고 고마움을 표현할 때', luecke: { satz: 'Das ist sehr ___ von dir.', loesung: 'nett' } },
      { de: 'Gern geschehen!', ko: '천만에요!', beispiel: '„Danke!" — „Gern geschehen!"', situationKo: '감사 인사에 답할 때', luecke: { satz: '___ geschehen!', loesung: 'Gern' } },
      { de: 'Ich hätte gern …', ko: '~을 주세요/원해요 (공손)', beispiel: 'Ich hätte gern einen Kaffee.', situationKo: '가게나 식당에서 주문할 때', luecke: { satz: 'Ich ___ gern einen Kaffee.', loesung: 'hätte' } },
    ],
  },
  {
    id: 'entschuldigung',
    titel: 'Entschuldigen',
    titelKo: '사과하기',
    formeln: [
      { de: 'Es tut mir leid, dass …', ko: '~해서 미안해요', beispiel: 'Es tut mir leid, dass ich zu spät komme.', situationKo: '이유와 함께 사과할 때', luecke: { satz: 'Es tut mir ___, dass ich zu spät komme.', loesung: 'leid' } },
      { de: 'Entschuldigung!', ko: '죄송해요/실례해요', beispiel: 'Entschuldigung, wo ist der Bahnhof?', situationKo: '말을 걸거나 가볍게 사과할 때', luecke: { satz: '___, wo ist der Bahnhof?', loesung: 'Entschuldigung' } },
      { de: 'Leider …', ko: '아쉽게도/유감스럽게도', beispiel: 'Leider habe ich keine Zeit.', situationKo: '나쁜 소식을 부드럽게 전할 때', luecke: { satz: '___ habe ich keine Zeit.', loesung: 'Leider' } },
      { de: 'Das war nicht meine Absicht.', ko: '일부러 그런 게 아니에요', beispiel: 'Entschuldigung, das war nicht meine Absicht.', situationKo: '실수였다고 해명할 때', luecke: { satz: 'Das war nicht meine ___.', loesung: 'Absicht' } },
      { de: 'Kein Problem!', ko: '괜찮아요!', beispiel: '„Sorry!" — „Kein Problem!"', situationKo: '사과를 받아줄 때', luecke: { satz: 'Kein ___!', loesung: 'Problem' } },
      { de: 'Ich muss leider absagen.', ko: '아쉽지만 취소해야 해요', beispiel: 'Ich muss den Termin leider absagen.', situationKo: '약속을 취소할 때 (쓰기 단골!)', luecke: { satz: 'Ich muss den Termin leider ___.', loesung: 'absagen' } },
      { de: 'Beim nächsten Mal …', ko: '다음번에는 ~', beispiel: 'Beim nächsten Mal komme ich bestimmt.', situationKo: '다음을 기약할 때', luecke: { satz: 'Beim nächsten ___ komme ich bestimmt.', loesung: 'Mal' } },
    ],
  },
  {
    id: 'anrede',
    titel: 'Anrede & Gruß',
    titelKo: '인사말 (쓰기 필수!)',
    formeln: [
      { de: 'Liebe … / Lieber …', ko: '(친구에게) ~에게', beispiel: 'Liebe Mia, / Lieber Tim,', situationKo: '친구에게 편지·SMS를 시작할 때', luecke: { satz: '___ Mia, wie geht es dir?', loesung: 'Liebe' } },
      { de: 'Sehr geehrte Frau …', ko: '(격식) ~님께 (여성)', beispiel: 'Sehr geehrte Frau Yilmaz,', situationKo: '공식 이메일을 여성에게 시작할 때', luecke: { satz: 'Sehr ___ Frau Yilmaz,', loesung: 'geehrte' } },
      { de: 'Sehr geehrter Herr …', ko: '(격식) ~님께 (남성)', beispiel: 'Sehr geehrter Herr Weber,', situationKo: '공식 이메일을 남성에게 시작할 때', luecke: { satz: 'Sehr geehrter ___ Weber,', loesung: 'Herr' } },
      { de: 'Sehr geehrte Damen und Herren,', ko: '(격식) 담당자님께', beispiel: 'Sehr geehrte Damen und Herren,', situationKo: '받는 사람 이름을 모를 때', luecke: { satz: 'Sehr geehrte Damen und ___,', loesung: 'Herren' } },
      { de: 'Liebe Grüße', ko: '(친구) 안부를 담아', beispiel: 'Liebe Grüße, Haein', situationKo: '친구에게 편지를 끝낼 때', luecke: { satz: 'Liebe ___, Haein', loesung: 'Grüße' } },
      { de: 'Mit freundlichen Grüßen', ko: '(격식) 정중한 인사를 담아', beispiel: 'Mit freundlichen Grüßen, Haein Kim', situationKo: '공식 이메일을 끝낼 때', luecke: { satz: 'Mit freundlichen ___', loesung: 'Grüßen' } },
      { de: 'Bis bald!', ko: '곧 만나요!', beispiel: 'Bis bald! Deine Haein', situationKo: '친구와 곧 만날 때 끝인사로', luecke: { satz: 'Bis ___!', loesung: 'bald' } },
    ],
  },
  {
    id: 'meinung',
    titel: 'Meinung sagen',
    titelKo: '의견 말하기',
    formeln: [
      { de: 'Ich finde, dass …', ko: '제 생각에는 ~', beispiel: 'Ich finde, dass das Essen dort sehr gut ist.', situationKo: '의견을 말할 때 (기본형)', luecke: { satz: 'Ich ___, dass das Essen dort sehr gut ist.', loesung: 'finde' } },
      { de: 'Ich glaube, …', ko: '아마 ~인 것 같아요', beispiel: 'Ich glaube, das Wetter wird gut.', situationKo: '확실하지 않은 생각을 말할 때', luecke: { satz: 'Ich ___, das Wetter wird gut.', loesung: 'glaube' } },
      { de: '… gefällt mir (nicht).', ko: '~이 마음에 들어요/안 들어요', beispiel: 'Die Wohnung gefällt mir sehr.', situationKo: '좋고 싫음을 말할 때', luecke: { satz: 'Die Wohnung ___ mir sehr.', loesung: 'gefällt' } },
      { de: 'Am liebsten …', ko: '제일 좋아하는 건 ~', beispiel: 'Am liebsten esse ich koreanisch.', situationKo: '가장 좋아하는 것을 말할 때', luecke: { satz: 'Am ___ esse ich koreanisch.', loesung: 'liebsten' } },
      { de: 'Ich bin dafür / dagegen.', ko: '찬성이에요 / 반대예요', beispiel: 'Ich bin dafür, dass wir früher anfangen.', situationKo: '찬반을 분명히 말할 때', luecke: { satz: 'Ich bin ___, dass wir früher anfangen.', loesung: 'dafür' } },
      { de: 'Das stimmt.', ko: '맞아요', beispiel: '„Das ist teuer." — „Das stimmt."', situationKo: '상대의 말이 맞다고 할 때', luecke: { satz: 'Das ___.', loesung: 'stimmt' } },
      { de: 'Da hast du recht.', ko: '네 말이 맞아', beispiel: 'Da hast du recht, das ist besser.', situationKo: '친구의 의견에 동의할 때', luecke: { satz: 'Da hast du ___.', loesung: 'recht' } },
    ],
  },
]
