/* ============================================================
   SPRECH-BÄNKE — Teil-1-Karten + Monolog-Themen + Shadowing-Sätze
   (A2-Sprint Phase 3)

   MONOLOG_THEMEN: Themenkarten für Sprechen Teil 2 im Muster der
   beiden offiziellen Sätze (Frage als Thema + 4 Stichwörter);
   die ersten vier sind die belegten Original-Themen.

   KARTEN: die Stichwörter aus BEIDEN offiziellen Prüfungssätzen
   plus gleichartige. musterfrage = was der KI-Partner fragt,
   wenn er mit dieser Karte dran ist (per TTS).

   SHADOWING: kurze Sätze rund um die Laute, die Koreanisch-
   Muttersprachlern erfahrungsgemäß am meisten Mühe machen
   (ö/ü, r/l, f/pf, z/s, ch) + Prüfungs-Formeln — hören,
   nachsprechen, vergleichen.
   ============================================================ */


/* Themenkarten Sprechen Teil 2 — Thema als Frage + 4 Stichwörter.
   Die ersten vier sind die belegten Themen der Original-Sätze. */
export const MONOLOG_THEMEN = [
  { thema: 'Was machen Sie mit Ihrem Geld?', stichworte: ['Kleidung', 'Lebensmittel & Miete', 'Sparen', 'Reisen'] },
  { thema: 'Was machen Sie mit Ihrer Familie?', stichworte: ['Essen', 'Ausflüge', 'Spiele', 'Hausarbeit'] },
  { thema: 'Was machen Sie oft am Wochenende?', stichworte: ['Sport', 'Freunde', 'Einkaufen', 'Ausruhen'] },
  { thema: 'Was machen Sie, wenn Sie am Abend ausgehen?', stichworte: ['Restaurant', 'Kino', 'Freunde treffen', 'nach Hause kommen'] },
  { thema: 'Was essen Sie gern?', stichworte: ['Frühstück', 'Mittagessen', 'Lieblingsessen', 'Restaurant'] },
  { thema: 'Wie fahren Sie zur Arbeit?', stichworte: ['Verkehrsmittel', 'Zeit', 'Kosten', 'Wetter'] },
  { thema: 'Was machen Sie im Urlaub?', stichworte: ['Land', 'Hotel', 'Strand oder Stadt', 'Essen'] },
  { thema: 'Wie feiern Sie Ihren Geburtstag?', stichworte: ['Gäste', 'Essen', 'Geschenke', 'Musik'] },
  { thema: 'Was machen Sie mit Ihrem Handy?', stichworte: ['Nachrichten', 'Fotos', 'Musik', 'Spiele'] },
  { thema: 'Wie ist Ihr Arbeitstag?', stichworte: ['Anfang', 'Mittagspause', 'Kollegen', 'Feierabend'] },
  { thema: 'Wie wohnen Sie?', stichworte: ['Wohnung', 'Lieblingszimmer', 'Nachbarn', 'Umgebung'] },
  { thema: 'Was machen Sie im Winter?', stichworte: ['Wetter', 'Kleidung', 'Sport', 'zu Hause'] },
  { thema: 'Wie lernen Sie Deutsch?', stichworte: ['Kurs oder App', 'Wörter', 'Hören', 'Sprechen'] },
  { thema: 'Wie kaufen Sie ein?', stichworte: ['Supermarkt', 'Obst & Gemüse', 'Preise', 'Einkaufszettel'] },
  { thema: 'Was machen Sie am Morgen?', stichworte: ['Aufstehen', 'Frühstück', 'Bad', 'Weg zur Arbeit'] },
  { thema: 'Welchen Sport machen Sie?', stichworte: ['Lieblingssport', 'wie oft', 'allein oder im Verein', 'Kleidung'] },
  { thema: 'Was machen Sie mit Ihren Freunden?', stichworte: ['Treffen', 'Essen gehen', 'Reden', 'Pläne'] },
  { thema: 'Wie ist das Wetter in Ihrem Land?', stichworte: ['Sommer', 'Winter', 'Regen', 'Lieblingsjahreszeit'] },
  { thema: 'Was sehen Sie gern im Fernsehen?', stichworte: ['Filme', 'Serien', 'Nachrichten', 'wie lange'] },
  { thema: 'Was machen Sie in der Natur?', stichworte: ['Park', 'Berge', 'Meer', 'Picknick'] },
]

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
