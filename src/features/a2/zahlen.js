/* ============================================================
   ZAHLEN-DIKTAT — vorbereitete Sätze mit festen Zahlen
   (A2-Sprint Phase 2; Hören Teil 1 besteht zur Hälfte daraus)

   Bewusst FESTE Zahlen statt Zufall: jeder Satz wird genau
   einmal vertont und liegt danach für immer im TTS-Cache.
   Antwort-Vergleich: nur die Ziffern zählen (14:37 = 1437),
   das Format zeigt der Hinweis.
   ============================================================ */

export const ZAHLEN_SAETZE = [
  /* Uhrzeiten */
  { satz: 'Der Zug nach Berlin fährt um 14:37 Uhr.', frageKo: '기차가 몇 시에 떠나요?', hinweis: 'z. B. 11:20', loesung: '14:37' },
  { satz: 'Der Film beginnt um 20:15 Uhr.', frageKo: '영화가 몇 시에 시작해요?', hinweis: 'z. B. 11:20', loesung: '20:15' },
  { satz: 'Die Praxis öffnet um 8:30 Uhr.', frageKo: '병원이 몇 시에 열어요?', hinweis: 'z. B. 11:20', loesung: '8:30' },
  { satz: 'Wir treffen uns um 17:45 Uhr am Eingang.', frageKo: '몇 시에 만나요?', hinweis: 'z. B. 11:20', loesung: '17:45' },
  { satz: 'Der Bus kommt um 9:05 Uhr.', frageKo: '버스가 몇 시에 와요?', hinweis: 'z. B. 11:20', loesung: '9:05' },
  { satz: 'Das Geschäft schließt heute schon um 18:00 Uhr.', frageKo: '가게가 몇 시에 닫아요?', hinweis: 'z. B. 11:20', loesung: '18:00' },
  { satz: 'Der Deutschkurs beginnt um 19:30 Uhr.', frageKo: '수업이 몇 시에 시작해요?', hinweis: 'z. B. 11:20', loesung: '19:30' },
  { satz: 'Das Flugzeug landet um 22:50 Uhr.', frageKo: '비행기가 몇 시에 도착해요?', hinweis: 'z. B. 11:20', loesung: '22:50' },

  /* Preise */
  { satz: 'Das Brot kostet 3,49 Euro.', frageKo: '빵이 얼마예요?', hinweis: 'z. B. 4,20', loesung: '3,49' },
  { satz: 'Die Karte kostet 12,50 Euro.', frageKo: '표가 얼마예요?', hinweis: 'z. B. 4,20', loesung: '12,50' },
  { satz: 'Zusammen macht das 27,80 Euro.', frageKo: '전부 얼마예요?', hinweis: 'z. B. 4,20', loesung: '27,80' },
  { satz: 'Der Kaffee kostet nur 2,20 Euro.', frageKo: '커피가 얼마예요?', hinweis: 'z. B. 4,20', loesung: '2,20' },
  { satz: 'Die Jacke ist im Angebot und kostet 49,99 Euro.', frageKo: '재킷이 얼마예요?', hinweis: 'z. B. 4,20', loesung: '49,99' },
  { satz: 'Das Zimmer kostet 85 Euro pro Nacht.', frageKo: '방이 하룻밤에 얼마예요?', hinweis: '숫자를 쓰세요', loesung: '85' },
  { satz: 'Der Eintritt kostet 7,50 Euro.', frageKo: '입장료가 얼마예요?', hinweis: 'z. B. 4,20', loesung: '7,50' },
  { satz: 'Das Menü kostet heute 15,90 Euro.', frageKo: '오늘 메뉴가 얼마예요?', hinweis: 'z. B. 4,20', loesung: '15,90' },

  /* Gleise & Nummern */
  { satz: 'Der Zug fährt heute von Gleis 7 ab.', frageKo: '몇 번 플랫폼이에요?', hinweis: '숫자를 쓰세요', loesung: '7' },
  { satz: 'Der ICE nach Hamburg fährt von Gleis 14.', frageKo: '몇 번 플랫폼이에요?', hinweis: '숫자를 쓰세요', loesung: '14' },
  { satz: 'Bitte kommen Sie zu Schalter 3.', frageKo: '몇 번 창구로 가요?', hinweis: '숫자를 쓰세요', loesung: '3' },
  { satz: 'Nehmen Sie die Linie 8 bis zum Hauptbahnhof.', frageKo: '몇 번 노선을 타요?', hinweis: '숫자를 쓰세요', loesung: '8' },
  { satz: 'Der Bus Nummer 42 fährt zum Flughafen.', frageKo: '몇 번 버스예요?', hinweis: '숫자를 쓰세요', loesung: '42' },
  { satz: 'Sie wohnen jetzt in der Gartenstraße 15.', frageKo: '몇 번지예요?', hinweis: '숫자를 쓰세요', loesung: '15' },
  { satz: 'Das Büro ist im 6. Stock.', frageKo: '몇 층이에요?', hinweis: '숫자를 쓰세요', loesung: '6' },
  { satz: 'Bitte warten Sie in Zimmer 12.', frageKo: '몇 번 방이에요?', hinweis: '숫자를 쓰세요', loesung: '12' },

  /* Telefonnummern (kurz, prüfungstypisch) */
  { satz: 'Meine neue Nummer ist 030 55 82 14.', frageKo: '전화번호가 뭐예요?', hinweis: '숫자만 쓰세요', loesung: '030558214' },
  { satz: 'Rufen Sie uns an unter 0171 23 46 89.', frageKo: '전화번호가 뭐예요?', hinweis: '숫자만 쓰세요', loesung: '0171234689' },
  { satz: 'Die Praxis erreichen Sie unter 089 77 31 20.', frageKo: '전화번호가 뭐예요?', hinweis: '숫자만 쓰세요', loesung: '089773120' },
  { satz: 'Meine Handynummer ist 0152 98 76 34.', frageKo: '전화번호가 뭐예요?', hinweis: '숫자만 쓰세요', loesung: '0152987634' },

  /* Daten */
  { satz: 'Der Kurs beginnt am 3. Mai.', frageKo: '수업이 며칠에 시작해요?', hinweis: 'z. B. 7.11.', loesung: '3.5' },
  { satz: 'Wir haben am 21. Juni einen Termin.', frageKo: '약속이 며칠이에요?', hinweis: 'z. B. 7.11.', loesung: '21.6' },
  { satz: 'Das Fest ist am 15. August.', frageKo: '축제가 며칠이에요?', hinweis: 'z. B. 7.11.', loesung: '15.8' },
  { satz: 'Die Prüfung ist am 9. Oktober.', frageKo: '시험이 며칠이에요?', hinweis: 'z. B. 7.11.', loesung: '9.10' },
  { satz: 'Ich habe am 28. Februar Geburtstag.', frageKo: '생일이 며칠이에요?', hinweis: 'z. B. 7.11.', loesung: '28.2' },

  /* Mengen & Sonstiges */
  { satz: 'Ich hätte gern 2 Kilo Äpfel.', frageKo: '사과 몇 킬로요?', hinweis: '숫자를 쓰세요', loesung: '2' },
  { satz: 'Wir brauchen 6 Flaschen Wasser.', frageKo: '물 몇 병이요?', hinweis: '숫자를 쓰세요', loesung: '6' },
  { satz: 'Der Kurs hat 12 Teilnehmer.', frageKo: '참가자가 몇 명이에요?', hinweis: '숫자를 쓰세요', loesung: '12' },
  { satz: 'Die Fahrt dauert 45 Minuten.', frageKo: '몇 분 걸려요?', hinweis: '숫자를 쓰세요', loesung: '45' },
  { satz: 'Meine Wohnung hat 3 Zimmer.', frageKo: '방이 몇 개예요?', hinweis: '숫자를 쓰세요', loesung: '3' },
  { satz: 'Bitte 500 Gramm Käse.', frageKo: '치즈 몇 그램이요?', hinweis: '숫자를 쓰세요', loesung: '500' },
  { satz: 'Das Paket wiegt 8 Kilo.', frageKo: '소포가 몇 킬로예요?', hinweis: '숫자를 쓰세요', loesung: '8' },
  { satz: 'Der Weg ist ungefähr 2 Kilometer lang.', frageKo: '몇 킬로미터예요?', hinweis: '숫자를 쓰세요', loesung: '2' },
]

/* SCHWERE Sätze (Feedback Franz 03.09.: zu einfach) — gebaut wie
   die echten Prüfungs-Fallen: ZWEI Zahlen im Satz, nur eine ist
   die Antwort (Korrekturen, "nicht … sondern", Vergleiche). */
export const ZAHLEN_SCHWER = [
  { satz: 'Der Zug fährt nicht um 15:10, sondern erst um 15:40.', frageKo: '기차가 실제로 몇 시에 떠나요?', hinweis: 'z. B. 11:20', loesung: '15:40' },
  { satz: 'Das Konzert beginnt nicht um 19 Uhr, sondern schon um 18:30.', frageKo: '콘서트가 실제로 몇 시에 시작해요?', hinweis: 'z. B. 11:20', loesung: '18:30' },
  { satz: 'Die Jacke hat 60 Euro gekostet, jetzt kostet sie nur noch 42 Euro.', frageKo: '지금 재킷이 얼마예요?', hinweis: '숫자를 쓰세요', loesung: '42' },
  { satz: 'Früher war die Miete 480 Euro, jetzt sind es 520 Euro.', frageKo: '지금 월세가 얼마예요?', hinweis: '숫자를 쓰세요', loesung: '520' },
  { satz: 'Der Zug nach Köln fährt heute nicht von Gleis 5, sondern von Gleis 11.', frageKo: '오늘 몇 번 플랫폼에서 떠나요?', hinweis: '숫자를 쓰세요', loesung: '11' },
  { satz: 'Nehmen Sie nicht den Bus 14, der fährt heute nicht — nehmen Sie die Linie 23.', frageKo: '몇 번을 타야 해요?', hinweis: '숫자를 쓰세요', loesung: '23' },
  { satz: 'Der Termin am 12. März fällt aus. Der neue Termin ist am 19. März.', frageKo: '새 약속이 며칠이에요?', hinweis: 'z. B. 7.11.', loesung: '19.3' },
  { satz: 'Wir wollten uns um 17 Uhr treffen, aber ich schaffe es erst um 17:45.', frageKo: '실제로 몇 시에 만나요?', hinweis: 'z. B. 11:20', loesung: '17:45' },
  { satz: 'Ein Kilo Tomaten kostet 3,90 Euro, zwei Kilo kosten nur 6,50 Euro.', frageKo: '2킬로에 얼마예요?', hinweis: 'z. B. 4,20', loesung: '6,50' },
  { satz: 'Das Museum hat bis 18 Uhr geöffnet, am Donnerstag sogar bis 21 Uhr.', frageKo: '목요일에는 몇 시까지 해요?', hinweis: '숫자를 쓰세요', loesung: '21' },
  { satz: 'Der Kurs war für 15 Personen geplant, aber es kommen 22.', frageKo: '실제로 몇 명이 와요?', hinweis: '숫자를 쓰세요', loesung: '22' },
  { satz: 'Die Wohnung ist nicht im 2. Stock, sondern im 4. Stock.', frageKo: '집이 몇 층이에요?', hinweis: '숫자를 쓰세요', loesung: '4' },
]

/* Antwort-Vergleich: nur Ziffern zählen */
export function zahlenGleich(eingabe, loesung) {
  const ziffern = (s) => String(s).replace(/\D/g, '')
  return ziffern(eingabe) === ziffern(loesung) && ziffern(eingabe).length > 0
}
