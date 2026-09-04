# Vokabel-Motor V2 — „Mehr Wörter, die auch bleiben" (Konzept, 06.09.)

Status: **ENTWURF — nichts davon ist gebaut.** Für Franz' Seite (`ko`);
was sich bewährt, kann später auf 해인s Seite wandern.

## 1. Auftrag (Franz, 06.09.)

- Mehr Vokabeln lernen — aber sie müssen **im Kopf bleiben**.
- Frage: Deutsch UND Englisch auf den Karten?
- Idee: neue Wörter zuerst nur **erkennen**, erst nach 2–3 Erfolgen
  selbst **produzieren**.
- Problem: Intervalle zu lang — „gerade so gewusst" + „Schwer" führt
  trotzdem zu 25 Tagen Pause.
- Wunsch: dritte Stufe **nur hören → Bedeutung tippen**, mit
  toleranter Antwort-Prüfung.
- Wunsch: **jederzeit wiederholen können**, ohne auf morgen zu warten.

## 2. Diagnose des Ist-Zustands (im Code nachgerechnet)

Vier konkrete Befunde — alle erklären genau das, was Franz spürt:

**① Neue Wörter „graduieren" viel zu schnell.**
`initStabilitaet` gibt einem neuen Wort bei „Gut" sofort **3,7 Tage**,
bei „Leicht" sogar **13,8 Tage**. Ein koreanisches Wort, das man einmal
gesehen hat, kommt also erst in vier Tagen wieder — die entscheidende
erste Festigungsphase (Minuten bis 24 h) wird komplett übersprungen.
Es gibt **keine Lernschritte innerhalb der Sitzung**.

**② „Schwer" verlängert das Intervall — immer.**
In FSRS ist „Schwer" eine BESTANDENE Antwort; die Stabilität wächst,
nur gedämpft. Nachgerechnet mit den echten Gewichten: eine Karte mit
15 Tagen Abstand, mit „Schwer" bewertet, bekommt **23 Tage** (mit
Streuung bis 26). Bei 20 Tagen Abstand werden es **30**. Genau Franz'
Beobachtung. Das ist kein Bug, sondern die Modell-Semantik: „Schwer" =
„mit Mühe erinnert", nicht „fast danebengelegen".

**③ Die Ziel-Behaltensquote steht auf 90 %.**
`ZIEL = 0.9` heißt: das Intervall wird so gelegt, dass **jede zehnte
Abfrage misslingt** — das ist der Effizienz-Optimalpunkt für Sprachen
mit Ableitungshilfe. Für Koreanisch ohne Verwandtschaft zum Deutschen
ist ein Aussetzer aber teuer: das Wort ist dann komplett weg, nicht
nur unscharf. Mathematisch: Intervall ≈ Stabilität × 1,0 bei 90 % ·
× 0,67 bei 93 % · × 0,46 bei 95 %.

**④ Geerbte Intervalle aus SM-2 waren nie „verdient".**
Bei der Umstellung wurde `stab = intervalDays` gesetzt — alte
SM-2-Intervalle wurden zu Stabilität erklärt, ohne dass ein einziger
Abruf sie unter FSRS bestätigt hätte. Wo SM-2 zu großzügig war,
rechnet FSRS seitdem auf einer zu hohen Basis weiter.

**⑤ Beide Richtungen ab Tag 1.**
Jedes neue Wort erzeugt sofort ZWEI Karten: Erkennen (KO → Bedeutung)
und Produzieren (Bedeutung → KO getippt). Produktion ist die mit
Abstand schwerste Form und trifft das Wort in dem Moment, in dem es am
schwächsten ist. Das kostet doppelte Tageslast bei halber Erfolgsquote.

## 3. Was die Lernforschung stützt (und was nicht)

- **Abruf schlägt Wiedersehen** (Testing-Effekt, Roediger & Karpicke):
  aktives Erinnern festigt weit stärker als erneutes Anschauen. ✓ haben wir.
- **Successive Relearning** (Rawson & Dunlosky): mehrfacher *korrekter*
  Abruf **innerhalb** einer Sitzung + Wiederholung **über** Sitzungen
  hinweg ist eine der bestbelegten Kombinationen überhaupt. → uns fehlt
  die erste Hälfte (Befund ①).
- **Wünschenswerte Schwierigkeiten** (Bjork): Schwierigkeit hilft — aber
  nur, solange der Abruf noch **gelingt**. Zu früh zu schwer ist
  verschwendete Zeit. → stützt Franz' Stufen-Idee direkt.
- **Rezeptiv vor produktiv** (Nation): Erkennen wird früher und
  billiger erworben als Produzieren; produktives Wissen baut auf
  rezeptivem auf. → stützt die Idee ebenfalls.
- **Mehrere Zugangswege** (Form–Bedeutung über Auge, Ohr, Hand)
  erzeugen mehr Abrufpfade — deshalb ist die Hör-Stufe kein Luxus.
- **Kontext schlägt Wortpaare**: ein Wort im Beispielsatz sitzt besser
  als isoliert. Unsere `ex`-Felder liegen ungenutzt auf der Rückseite.
- **Schlüsselwort-Mnemonik** (Atkinson) wirkt nachweislich bei
  hartnäckigen Einzelwörtern — der richtige Griff für „Dauer-Aussetzer".
- **Ehrliche Einschränkung:** Die FSRS-Standardgewichte stammen aus
  hunderten Millionen Anki-Wiederholungen — großartige Datenbasis, aber
  eben ein Durchschnitt über alle Fächer und Sprachen. Persönliche
  Eichung wird erst mit genug eigenen `review_log`-Zeilen möglich.

## 4. Das Konzept: drei Stufen pro Wort — ohne mehr Karten

Kernidee: Ein Wort hat weiterhin **zwei Karten**, aber die Schwierigkeit
**wächst mit dem Wort mit**, statt am ersten Tag voll zuzuschlagen.

| Stufe | Was passiert | Wann |
|---|---|---|
| **1 · Erkennen** | KO steht da (+ 🔊 hörbar) → Bedeutung, aufdecken & selbst bewerten | ab der ersten Begegnung |
| **2 · Produzieren** | Bedeutung → koreanisches Wort selbst erzeugen | **freigeschaltet nach 2 gelungenen Abrufen** auf Stufe 1 (und ≥ 1 Tag Abstand) |
| **3 · Hören** | **nur Audio**, kein Text → Bedeutung tippen | wenn die Erkennen-Karte **reif** ist (Stabilität ≥ 21 Tage) — sie *verwandelt* sich, es kommt keine dritte Karte dazu |

Warum das aufgeht:
- **Frühe Last sinkt um die Hälfte** (Produktion schläft noch) → Platz
  für mehr neue Wörter bei gleicher Zeit.
- **Späte Last steigt nicht**, weil Stufe 3 die Stufe-1-Karte *ersetzt*
  statt zu ergänzen. Reife Wörter werden schwerer geprüft, nicht öfter.
- Jede Stufe ist der jeweils schwerste Test, den das Wort gerade
  **bestehen kann** — genau die „wünschenswerte Schwierigkeit".

## 5. Vier Eingriffe in den Algorithmus

**① Lernschritte innerhalb der Sitzung (der größte Hebel).**
Ein neues Wort (und jedes „Nochmal") muss **zweimal korrekt** in
derselben Sitzung abgerufen werden, mit wachsendem Abstand: nach ~3
weiteren Karten, dann nach ~10. Erst danach geht es an den
Tages-Scheduler — mit **1 Tag** als erstem Intervall statt 4.

**② Ziel-Behaltensquote hoch: 90 % → 93 %.**
Ein Drehknopf, eine Zeile. Alle Intervalle werden auf ~⅔ gekürzt,
auch die geerbten aus Befund ④. Ehrlicher Preis: **rund ein Drittel
mehr Wiederholungen pro Tag** im Dauerbetrieb. (95 % wären ~doppelt
so viele — meine Empfehlung ist 93 % als Startwert, nachjustierbar.)

**③ „Schwer" bekommt eine Obergrenze.**
Neue Hausregel: *„Schwer" heißt künftig ungefähr der halbe bisherige
Abstand — nie mehr.* Aus 15 Tagen werden ~9 statt 23. Das Modell
bleibt intakt (die Stabilität darf weiter wachsen), wir legen den
Termin nur früher; FSRS rechnet frühe Abfragen korrekt und dämpft den
Zuwachs beim nächsten Mal von selbst. Zusätzlich werden die vier
Knöpfe sprachlich geschärft, damit „Schwer" auch wirklich benutzt wird:
**Nochmal · Gerade so · Gewusst · Sofort da**.

**④ Einmalige Ehrlichkeits-Korrektur der Alt-Karten.**
Alle Karten mit Intervall > 21 Tagen, deren Stabilität nur aus SM-2
geschätzt wurde, bekommen ihren Termin einmalig auf die nächsten
2–3 Wochen verteilt (gestreut, damit kein Berg entsteht). Danach
läuft alles auf verdienten Werten weiter. Rein additiv, nichts wird
gelöscht — und optional, siehe §11.

## 6. Die Antwort-Prüfung („das Vorschlagssystem")

Für Stufe 3 (und Stufe 2) muss das Tippen tolerant sein. Fünf
Schichten, alle **offline und kostenlos**, in dieser Reihenfolge:

1. **Normalisieren:** Kleinschreibung, Satzzeichen weg, Klammern weg,
   führendes „to " / „der/die/das " / „the " weg, Umlaute beidseitig
   (ä ↔ ae), Mehrfach-Leerzeichen zusammen.
2. **Varianten spalten:** Die Bedeutung wird an `,` `/` `;` zerlegt —
   jede Teilbedeutung gilt als richtig. („to be (이다, 있다)" → „to be")
3. **Tippfehler-Toleranz:** Levenshtein-Abstand ≤ 1 (kurze Wörter) bzw.
   ≤ 2 (ab 7 Zeichen) → gilt als richtig, die saubere Form wird gezeigt.
4. **Kern-Treffer:** Enthält die Eingabe das Hauptwort der Bedeutung
   (oder umgekehrt), zählt es.
5. **Selbst-Freigabe, die dazulernt:** Bleibt es dabei „nicht erkannt",
   erscheint neben der Lösung der Knopf **„Hatte ich richtig"** — und
   die getippte Formulierung wird als **Alias** zum Wort gespeichert.
   Ab dann gilt sie für immer. Das System lernt so Franz' eigene
   Ausdrucksweise, ganz ohne KI-Aufruf.

## 7. Wiederholen, wann immer man will

Zwei klar getrennte Knöpfe (Verwechslung wäre fatal fürs Vertrauen):

- **🔁 Extra-Runde — zählt nicht:** freies Üben auf frei gewählter
  Auswahl (die 10 wackeligsten · die von heute nochmal · ein Thema ·
  alle Aussetzer). Der Terminplan wird **nicht** angefasst. Für
  „ich will jetzt lernen" ohne Nebenwirkungen.
- **⏩ Vorziehen — zählt:** holt die nächsten N Karten, die ohnehin bald
  dran wären. Bewertungen zählen normal; FSRS behandelt frühe Abfragen
  korrekt (weniger Zuwachs, weil die Erinnerung noch frisch ist).

Dazu die **Wackel-Liste**: die Wörter mit der gerade niedrigsten
Abrufwahrscheinlichkeit — berechenbar aus `stab` und dem letzten
Termin, ohne neue Daten. Das ist die ehrliche Antwort auf „welche
Wörter kann ich gerade *nicht*?".

## 8. Zwei koreanisch-spezifische Hebel

**① Sino-koreanische Bausteine (한자어).** Ein sehr großer Teil des
koreanischen Wortschatzes ist sino-koreanisch und damit **zerlegbar**:
wer weiß, dass 학 = „lernen" trägt, bekommt 학생 · 학교 · 학년 · 대학 ·
유학 · 학기 fast geschenkt. Genau die Ableitungshilfe, die Franz nach
eigener Aussage fehlt — sie existiert, sie ist nur unsichtbar.
Umsetzung: pro Wort einmalig eine Zerlegung + „Wortfamilie aus deinem
Stapel" erzeugen (Nacht-Batch, danach für immer gespeichert), gezeigt
auf der **Rückseite** als Merkhilfe. Nie als Abfrage — es soll
entlasten, nicht prüfen.

**② Merkhilfe für Dauer-Aussetzer.** Ein Wort mit ≥ 3 Aussetzern wird
markiert; auf Knopfdruck erzeugt der Trainer **einmalig** eine
Schlüsselwort-Brücke (Klangähnlichkeit + Bild) und speichert sie an der
Karte. Kostet einen Aufruf pro Problemwort, nicht pro Wiederholung.

Ergänzend, ohne KI: **Beispielsatz als Kontext** nach dem Aufdecken
(haben wir), und neue Wörter eines Tages bewusst **thematisch
gestreut** einführen — semantisch benachbarte Neuwörter am selben Tag
(rot/blau/grün) behindern sich gegenseitig.

## 9. Deutsch UND Englisch auf den Karten?

**Ja — aber mit klarer Rollentrennung, nicht gleichberechtigt.**

- **Deutsch groß** als Hauptbedeutung: die Muttersprache ist der
  schnellste und stabilste Bedeutungsanker. Der Umweg
  Koreanisch → Englisch → Bedeutung kostet Tempo und erzeugt unscharfe
  Einträge.
- **Englisch klein darunter** als Feinschliff: Es schärft dort, wo
  Deutsch mehrdeutig ist — und umgekehrt. Genau diese
  Doppel-Perspektive verhindert den häufigsten Fehlertyp
  („ich weiß die Bedeutung, aber welches der drei Wörter war es?").
- **Auf der Frageseite von Stufe 2 gilt: nur Deutsch.** Zwei Sprachen
  als Hinweis würden den Abruf zu leicht machen.

Kosten, ehrlich: Der `ko`-Stapel hat heute nur `en`. Deutsche
Bedeutungen müssten einmalig ergänzt werden (Nacht-Batch über den
vorhandenen `uebersetzung`-Weg, ~1 Aufruf pro Wort, danach nie wieder)
plus eine additive Spalte. Machbar an einem Abend.

## 10. Die Last-Rechnung (ohne Schönfärberei)

Faustwert: Jede Karte erzeugt im ersten Jahr grob 8–10 Wiederholungen.

| | heute | nach Umbau |
|---|---|---|
| Neue Wörter/Tag | 3 | **5** |
| Karten pro neuem Wort **am Anfang** | 2 | **1** (Produktion schläft) |
| Ziel-Behaltensquote | 90 % | 93 % (+ ⅓ Wiederholungen) |
| Wiederholungen/Tag im Dauerbetrieb | ~50 | **~65–75** |
| Zeit/Tag | ~15 min | **~20–25 min** |

Heißt: **Franz lernt 60 % mehr neue Wörter und behält sie deutlich
besser — für rund 5–10 Minuten mehr am Tag.** Der Deckel bleibt ein
Tagespensum (nichts staut sich auf), und die Zahl neuer Wörter wird
ein Regler im Profil, kein fester Wert.

## 11. Entscheidungen (Franz, 06.09.) — verbindlich

1. **Behaltensquote: 93 %** — nur auf der `ko`-Seite. 해인s Seite
   bleibt bei 90 %: Deutsch ist für sie ableitbar, und 53 Tage vor der
   Prüfung wird ihr Lernrhythmus nicht angefasst.
2. **Produktion auf Stufe 2: tippen wie bisher** (Hangul-Tastatur) —
   der schärfste Test, Schreibung inklusive.
3. **Alt-Karten: ja, einmalig gestreut einsammeln** (§5④).
4. **Deutsch-Anker: ja** — einmaliger Nacht-Batch, Deutsch groß,
   Englisch klein als Feinschliff (§9).

## 12. Umsetzungs-Etappen (nach dem Go)

1. **E1 — Algorithmus:** Lernschritte in der Sitzung, Behaltensquote,
   „Schwer"-Deckel, geschärfte Knopf-Beschriftungen. *(Sofort spürbar,
   kein neues UI.)*
2. **E2 — Stufen:** Produktion gated, Reifeprüfung per Audio,
   Antwort-Prüfung mit Alias-Lernen.
3. **E3 — Extra-Runden** + Wackel-Liste.
4. **E4 — Deutsch-Anker** + sino-koreanische Bausteine + Merkhilfen.
