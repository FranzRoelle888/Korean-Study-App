# Das tägliche Pensum V2 — „Der Lernpfad" (Konzept, 05.09.)

Status: **ENTWURF — nichts davon ist gebaut.** Franz entscheidet die
offenen Fragen in §11, dann wird in Etappen umgesetzt (§12).

## 1. Auftrag & Leitplanken (Franz, 05.09.)

- Das Pensum ist **der wesentlichste Bestandteil der App**: organisches
  Wachstum von Vokabeln UND Grammatik, täglich 20–30 min.
- **Nie erschlagen:** Die App braucht ein gutes Bild ihrer aktuellen
  Fähigkeiten; KI-Aufgaben passen sich live daran an.
- **Stetig Neues** — produktiver Lernerfolg, kein Stillstand.
- Alle N Rationen eine **größere Prüf-Ration**; Bestehen = nächste Stufe.
- Orientierung an der **offiziellen A2-Grammatik**, aber Redewendungen,
  Satzstellung und Sprech-Praxis gleichwertig ernst nehmen.
- Abwechslungsreich, spaßig, zielführend; vorhandene Werkzeuge dürfen
  einfließen, neue Aufgabentypen sind erlaubt.
- Später: Hauptmenü zu einem Pensum-Knopf kombinieren.

Dazu die eisernen Regeln der App: Streak stirbt nie an externen
Diensten (Offline-Kern!), Kosten-Disziplin (Nacht-Batch statt live),
keine XP/Schuld (Fortschritt zeigt Können), Leitmotiv „sofort
durchblicken", Musterlösungen einfach, Erklärungen koreanisch.

## 2. Ist-Zustand des dritten Knopfs (Start-Tab)

Heute liegt dort: Streak-Karte mit Wochenzeile · einmaliges
Kalibrierungs-Banner · zwei provisorische Test-Zugänge (Studio,
Artikel-Spiel) · **Vokabel des Tages** (5 neue aus der Goethe-Liste) ·
**Wiederholen** (FSRS-Stapel mit Zähler) · **Artikel/Plural/
Konjugation des Tages** (rotierendes Tages-Mini). Das ist ein solider
Vokabel-Motor — aber es wächst nur der Wortschatz, nicht die
Grammatik, und nichts davon erklärt oder prüft Konzepte.

## 3. Kernidee: Der Lernpfad (Stufen statt Streusand)

Das Pensum bekommt ein Rückgrat: einen **Pfad aus Stufen**. Jede
Stufe bündelt drei Dinge, die eine Woche lang zusammen geübt werden:

1. **ein Grammatik-Kern** (aus dem offiziellen A2-Inventar, §8),
2. **ein Wortfeld** (Themenblock aus der Goethe-Wortliste — die
   5 neuen Vokabeln pro Tag kommen bevorzugt daraus),
3. **ein Chunk-Paket** (Redemittel/Wendungen, die zum Kern passen —
   „Gestern habe ich…", „Ich hätte gern…").

Rhythmus: **6 Lern-Rationen → 1 Meilenstein-Ration** (§7). Bestanden
= Stufe gilt als 🌳 gemeistert, die nächste öffnet sich. Der Pfad ist
als **Stufenkarte** sichtbar (eine Zeile pro Stufe mit Pflanze) — sie
sieht immer, wo sie steht und was als Nächstes kommt.

Warum Stufen statt „jeden Tag irgendwas"? Weil Festigung Wiederholung
im Kontext braucht: sechs Tage lang taucht dasselbe Konzept in immer
neuen Formen auf (erklärt → geführt → frei → gemischt), zusammen mit
den passenden Wörtern und Wendungen. Das ist organisches Wachstum.

## 4. Das Fähigkeiten-Bild & die Live-Anpassung

Drei Quellen, zwei davon existieren schon:

- **Vokabeln:** FSRS pro Wort (existiert). Der Stapel weiß präzise,
  welche Wörter sie wie sicher kann.
- **Grammatik-Konten (NEU):** Jedes Konzept des Pfads bekommt ein
  kleines Konto nach dem bewährten Radar-Sicherheitsmodell:
  Leistung × Festigung (Menge, Tage-Streuung, Schwierigkeit der
  Aufgabenform). Zustände: frisch 🌱 → geübt 🌿 → gemeistert 🌳
  (nur der Meilenstein vergibt 🌳). Jede Pensum-Aufgabe ist mit
  ihrem Konzept etikettiert und zahlt aufs Konto ein.
- **Fehler-Heft:** die persönlichen falsch→richtig-Paare (existiert)
  fließen als Warm-up-Futter zurück in die Rationen.

**Live-Anpassung** (deterministisch + KI, in dieser Reihenfolge):

1. **Stoff-Deckel:** Aufgaben verwenden NUR eingeführte Konzepte +
   das aktuell neue. Die KI-Generierung bekommt die Konten-Liste und
   die Anweisung „nichts darüber hinaus" — das verhindert Erschlagen
   strukturell, nicht nur als Bitte.
2. **Geländer-Regler pro Aufgabentyp:** Jede Übungsform hat zwei bis
   drei Hilfestufen (Chips antippen → Lücke tippen → frei
   formulieren). Zwei Fehlversuche in Folge → eine Stufe mehr
   Geländer, läuft es glatt → eine Stufe freier. Still, automatisch,
   pro Konzept gemerkt.
3. **Vokabel-Steuerung** (existiert): Generierungen bevorzugen ihre
   gelernten Wörter.
4. **Fehler-Recycling:** offene Fehler-Heft-Einträge tauchen als
   Warm-up-Häppchen wieder auf, bis abgehakt.

## 5. Anatomie der Tages-Ration (~25 min, 5 Gänge)

Feste Reihenfolge (sofort durchblicken!), Inhalt variiert:

| Gang | Minuten | Inhalt | Quelle/Offline? |
|---|---|---|---|
| 1 · Warm-up | 3 | 3 Blitzfragen zu gestern + 1 Fehler-Heft-Eintrag | lokal, offline ✓ |
| 2 · Vokabeln | 7–8 | FSRS-Wiederholen + 5 neue aus dem Stufen-Wortfeld | existiert, offline ✓ |
| 3 · Das Neue | 5–7 | Tages-Häppchen des Stufen-Kerns (§6) | kuratierte Erklärkarten + Nacht-Batch |
| 4 · Anwenden | 6–8 | 1–2 gemischte Übungen (Rotation, §6) | Nacht-Batch, Fallback: kuratierte Bank ✓ |
| 5 · Abschluss | 1 | Pflanze wächst, Ein-Satz-Vorschau auf morgen | lokal ✓ |

Die Ration läuft als **geführte Sequenz** hinter EINEM Knopf
(„오늘의 학습 시작") mit Fortschrittspunkten oben — kein Menü-Suchen.
Abbrechen ist jederzeit ok; die Ration merkt sich den Stand.

## 6. Wochen-Dramaturgie & Aufgabenformen

Der Stufen-Kern wird über die Woche gestaffelt (Gang 3):

- **Tag 1 — Kennenlernen:** die kuratierte **Erklärkarte** (koreanisch,
  „Auge isst mit": Tabelle, Farben, 2–3 Merksätze, 🔊-Beispiele) +
  ein Abschnitt **„한국어와 비교"** (kontrastiv: Perfekt ↔ 았/었,
  Wechselpräpositionen ↔ 에/에서, Verbklammer ↔ Verb am Satzende …).
  Danach 3 geführte Beispiele zum Antippen.
- **Tag 2–3 — Formen bauen:** erkennen & zusammensetzen (Chips).
- **Tag 4–5 — Anwenden:** produzieren (tippen, sprechen).
- **Tag 6 — Mischen:** neues Konzept + zwei alte gemischt
  (kumulatives Wiederholen — nichts rutscht weg).

Gang 4 rotiert die Form nach Wochentag (vorhersehbar UND
abwechslungsreich); vorhandene Werkzeuge fließen ein:

| Tag | Form | Neu/vorhanden |
|---|---|---|
| 1 | 🧱 Satz-Baukasten-Runde mit Stufen-Sätzen | vorhanden (Bank je Stufe erweitern) |
| 2 | 💬 **Mini-Dialog-Lücke**: 4-Zeilen-Alltagsdialog, 2 Lücken (Chips/tippen), danach 🔊 anhörbar | NEU |
| 3 | 🎙 **Ein-Satz-Sprechen**: Prompt („어제 뭐 했어요?") → einen Satz einsprechen → a2sprechen1 bewertet | NEU (nutzt vorhandene Technik) |
| 4 | 🔁 **Übersetzungs-Sprint**: 5 kurze Sätze ko→de tippen, konzept-fokussiert | NEU |
| 5 | 🎧 Hör-Schnipsel: 20-Sek-Clip + 2 Fragen (Mini-a2hoeren) | vorhanden (kleine Variante) |
| 6 | 🃏 Chunk-Blitz: Redemittel-Paket der Stufe | vorhanden |
| 7 | 🎯 **Meilenstein** (§7) | NEU |

Ab ~10 Tagen vor der Prüfung bekommt Gang 4 „Prüfungs-Würze": er
zieht bevorzugt die Radar-Tages-Empfehlung (Brücke zum A2-Tab,
bleibt im Zeitbudget).

## 7. Der Meilenstein (die größere Ration)

Nach 6 erledigten Lern-Rationen einer Stufe wird die 7. zur
**Meilenstein-Ration** (~30 min): Gänge 1–2 normal, dann statt
Gang 3+4 ein **kleiner Test**: 12 Aufgaben quer durch die Formen der
Woche, davon ⅓ aus früheren Stufen (kumulativ!), ohne Geländer.

- **Bestanden ab 9/12 (75 %):** Stufe wird 🌳, Konfetti-frei gefeiert
  (Pflanze + ein warmer Satz), nächste Stufe öffnet am Folgetag.
- **Nicht bestanden — ohne Schuld:** „이틀만 더 연습해요." Die
  nächsten 2 Rationen remixen gezielt die Schwachstellen (die
  falschen Meilenstein-Aufgaben werden zu Übungsmaterial), dann
  kommt ein frischer Meilenstein. Der Streak ist davon UNBERÜHRT —
  Ration gemacht ist Ration gemacht.
- **Überspringen (organisch):** Wer per Kalibrierung/„kenn ich schon"
  ein Konzept als bekannt markiert hat, darf den Meilenstein sofort
  vorziehen („시험 먼저 볼래요") — bestanden = Stufe übersprungen.
  Keine Langeweile für Bekanntes, aber der Beweis wird erbracht.

## 8. Der Stufenplan bis zur Prüfung (8 Wochen ≈ 8 Stufen)

Reihenfolge nach Prüfungs-Nutzen und Aufbau-Logik; Grammatik nach dem
offiziellen A2-Inventar (Goethe-Prüfungsziele). Jede Stufe: Kern +
Wortfeld + Chunks. „Kenn ich schon" verkürzt den Weg.

| Stufe | Grammatik-Kern | Wortfeld | Chunk-Beispiele |
|---|---|---|---|
| 1 | **Perfekt I** (haben + regelmäßige Partizipien) | Tagesablauf & Alltag | „Gestern habe ich …" |
| 2 | **Perfekt II** (sein, unregelmäßig) + Präteritum war/hatte | Reisen & Wochenende | „Ich bin … gefahren", „Es war toll!" |
| 3 | **Dativ** (Artikel, Pronomen mir/dir/ihm, Verben helfen/gefallen/schmecken/gehören) | Einkaufen & Geschenke | „Das gefällt mir", „Kannst du mir helfen?" |
| 4 | **Präpositionen** (mit/nach/bei/von/zu/aus + für/ohne/um) + **Wechselpräpositionen** (wo?/wohin?) | Wohnen, Stadt & Wege | „neben dem Bahnhof", „in die Stadt" |
| 5 | **Nebensätze** weil / dass / wenn (Verb ans Ende) | Gefühle & Meinung | „Ich finde, dass …", „…, weil …" |
| 6 | **Modalverben komplett** + Präteritum (konnte/musste/wollte/durfte) | Arbeit & Regeln | „Ich musste …", „Man darf nicht …" |
| 7 | **Komparativ/Superlativ** (+ als/wie) + **Konjunktiv II höflich** (würde/könnte/hätte) | Vergleichen & Bitten | „lieber … als", „Ich hätte gern …" |
| 8 | **Verben mit Präpositionen** (warten auf, sich freuen über/auf) + Reflexive + indirekte Fragen | Pläne & Prüfung | „Ich freue mich auf …", „Weißt du, wo …?" |

Danach (nach der Prüfung, gleiche Maschine): Adjektivdeklination
vertieft, Relativsätze rezeptiv, B1-Pfad. Der Rahmen ist
zukunftssicher — nur die Stufen-Bank wächst.

Satzstellung zieht sich als roter Faden durch ALLE Stufen (Verbklammer
in 1–2 und 6, Verb-Ende in 5, Inversion überall) — der Satz-Baukasten
liefert je Stufe passende Sätze.

## 9. Streak, Offline & Kosten

- **Streak-Kern:** Gänge 1+2 sind komplett offline. Für Gänge 3+4
  liegt IMMER kuratiertes Fallback-Material bereit (die Erklärkarten
  und je Stufe eine Mini-Bank an Übungen sind fest im Code). Kein
  Netz / KI down → die Ration ist trotzdem voll abschließbar.
- **Nacht-Batch:** Ein Workflow erzeugt die Morgen-Ration vorab
  (Dialog-Lücken, Sprints, Hör-Schnipsel + TTS) in die
  exercise_bank (typ 'pensum'), kalibriert auf Konten + Vokabelstand.
  Grobkosten: ~1–2 Cent/Tag. Live läuft nur Bewertung (Ein-Satz-
  Sprechen, Nachfragen). **Braucht Franz' Freigabe der
  Nacht-Workflows.**
- Erklärkarten werden NICHT generiert, sondern von uns kuratiert
  (Qualität, Offline, koreanische Didaktik) — je Stufe eine.

## 10. Oberfläche: „오늘" (der dritte Knopf)

- Oben: Streak-Karte (bleibt) + **Stufenkarte** (Pfad mit Pflanzen,
  aktuelle Stufe groß: „Stufe 3 · Dativ · Tag 4/6").
- Mitte: **EIN großer Knopf** „오늘의 학습 시작" → geführte Ration.
  Nach Abschluss zeigt er ✓ und wird zur Zusammenfassung des Tages.
- Unten klein: freiwillige Extras (Zahl/Artikel des Tages als Bonbon,
  Link in den A2-Tab). Die provisorischen Test-Knöpfe (Studio,
  Artikel) verschwinden — ihre Inhalte leben in den Gängen weiter.
- **Hauptmenü-Kombination** (Franz' Ausblick): erst wenn die Ration
  läuft, wird entschieden, was von „Themen"/„Wörter" in den
  Heute-Tab wandert. Eigener, späterer Schritt — Umzug, kein Neubau.

## 11. Entscheidungs-Fragen an Franz

1. **Rhythmus:** Meilenstein nach „6 erledigten Rationen" (egal an
   welchen Tagen — streakfreundlich bei Pausen) oder fest sonntags?
   Empfehlung: nach 6 erledigten, kalenderunabhängig.
2. **Streak-Definition:** Streak schon ab Gängen 1+2 (~10 min,
   schützt Reise-/Krankheitstage) und die „volle Ration" wird separat
   als Pflanze sichtbar — oder Streak erst bei voller Ration?
   Empfehlung: Streak ab 1+2, Pflanze für die volle Ration.
3. **Meilenstein-Schwelle:** 9/12 (75 %) ok? Vorziehen erlaubt?
4. **Nacht-Workflow-Freigabe:** 1 Batch-Lauf pro Nacht für die
   Morgen-Ration — ok, oder erst Testphase mit Live-Erzeugung beim
   ersten Öffnen?
5. **Umfang Stufe 0:** Starten wir Haein direkt in Stufe 1 (Perfekt)
   oder mit einer 2-Tage-„Stufe 0" (Bestandsaufnahme: kurze
   Selbsteinschätzung je Konzept + Mini-Proben), die die Konten
   initial füllt? Empfehlung: Stufe 0 — dann stimmt das
   Fähigkeiten-Bild vom ersten Tag an.

## 12. Umsetzungs-Etappen (nach dem Go, jede mit Rückfragen)

1. **E1 Fundament:** Curriculum-Bank (Stufen, Erklärkarten 1–3,
   Fallback-Übungen), Grammatik-Konten + Migration, Stufenkarte im
   Heute-Tab.
2. **E2 Die Ration:** geführte Sequenz (Gänge 1–5), Geländer-Regler,
   neue Formen Mini-Dialog-Lücke + Übersetzungs-Sprint.
3. **E3 Meilenstein** + Ein-Satz-Sprechen + Hör-Schnipsel.
4. **E4 Nacht-Batch** + Erklärkarten 4–8 + Prüfungs-Würze.
5. **E5 Aufräumen:** Test-Knöpfe raus, Hauptmenü-Frage.
