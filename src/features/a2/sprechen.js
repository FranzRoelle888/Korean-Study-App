/* ============================================================
   SPRECH-BÄNKE — Teil-1-Karten + Shadowing-Sätze
   (A2-Sprint Phase 3, Etappe 1)

   KARTEN: die Stichwörter aus BEIDEN offiziellen Prüfungssätzen
   plus gleichartige. musterfrage = was der KI-Partner fragt,
   wenn er mit dieser Karte dran ist (per TTS).

   SHADOWING: kurze Sätze rund um die Laute, die Koreanisch-
   Muttersprachlern erfahrungsgemäß am meisten Mühe machen
   (ö/ü, r/l, f/pf, z/s, ch) + Prüfungs-Formeln — hören,
   nachsprechen, vergleichen.
   ============================================================ */

export const SPRECHEN_KARTEN = [
  { wort: 'Geburtstag?', musterfrage: 'Wann hast du Geburtstag?' },
  { wort: 'Wohnort?', musterfrage: 'Wo wohnst du?' },
  { wort: 'Beruf?', musterfrage: 'Was bist du von Beruf?' },
  { wort: 'Hobby?', musterfrage: 'Was ist dein Hobby?' },
  { wort: 'Ausbildung/Studium?', musterfrage: 'Was hast du studiert?' },
  { wort: 'Eltern?', musterfrage: 'Wo wohnen deine Eltern?' },
  { wort: 'Musik?', musterfrage: 'Was für Musik hörst du gern?' },
  { wort: 'Familienname?', musterfrage: 'Wie ist dein Familienname?' },
  { wort: 'Sprachen?', musterfrage: 'Welche Sprachen sprichst du?' },
  { wort: 'Familie?', musterfrage: 'Hast du Geschwister?' },
  { wort: 'Wochenende?', musterfrage: 'Was machst du am Wochenende?' },
  { wort: 'Essen?', musterfrage: 'Was isst du gern?' },
  { wort: 'Sport?', musterfrage: 'Machst du Sport?' },
  { wort: 'Urlaub?', musterfrage: 'Wohin fährst du gern in den Urlaub?' },
  { wort: 'Haustier?', musterfrage: 'Hast du ein Haustier?' },
  { wort: 'Arbeit?', musterfrage: 'Wo arbeitest du?' },
]

export const SHADOWING_SAETZE = [
  { satz: 'Ich hätte gern einen Kaffee, bitte.', fokus: 'ä · Formel' },
  { satz: 'Können Sie das bitte wiederholen?', fokus: 'ö · Formel' },
  { satz: 'Ich möchte fünf Brötchen kaufen.', fokus: 'ö · ü' },
  { satz: 'Der Frühling ist meine Lieblingsjahreszeit.', fokus: 'ü · r' },
  { satz: 'Ich fahre am Freitag mit dem Fahrrad zur Arbeit.', fokus: 'f · r' },
  { satz: 'Entschuldigung, wo ist der Bahnhof?', fokus: 'ch · Formel' },
  { satz: 'Mein Lieblingsrestaurant liegt in der Blumenstraße.', fokus: 'r · l · ß' },
  { satz: 'Zwanzig Züge fahren zwischen zwei und zehn.', fokus: 'z' },
  { satz: 'Ich spreche schon ein bisschen Deutsch.', fokus: 'sch · ch' },
  { satz: 'Das Wetter wird am Wochenende wieder wärmer.', fokus: 'w' },
  { satz: 'Vielen Dank für die schöne Einladung!', fokus: 'ö · Formel' },
  { satz: 'Um halb acht muss ich schon aufstehen.', fokus: 'au · st' },
  { satz: 'Ich schlage vor, dass wir eine Pizza bestellen.', fokus: 'Formel · dass' },
  { satz: 'Der Pfannkuchen schmeckt überraschend gut.', fokus: 'pf · ü' },
  { satz: 'Nächstes Jahr möchte ich nach Österreich reisen.', fokus: 'ä · ö · r' },
  { satz: 'Es tut mir leid, dass ich zu spät komme.', fokus: 'Formel · z' },
]
