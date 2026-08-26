# Konzept: Der Trainer (KI-Sprachtrainer in der App)

Stand: in Ausarbeitung mit Franz. Dieses Dokument ist die verbindliche
Vorlage für die Umsetzung — was hier steht, wird gebaut; was nicht, nicht.

---

## 1. Leitidee

Die App weiß bereits, was beide können: jedes Wort liegt mit Lernstand
(`reps`, `lapses`, `ease`) in der Datenbank. Der Trainer ist ein
Sprachmodell, das diesen Stand **liest und sich strikt daran hält** —
plus ein Gedächtnis für Grammatik und für vergangene Übungseinheiten.

Nur Text, kein Sprachein-/ausgang in v1. Begründung: Lehrbücher arbeiten
genauso (Lücken-/Freitext), und Echtzeit-Sprache ist auf iOS
unzuverlässig. Das Vorlesen der Trainer-Antworten über den vorhandenen
Lautsprecher-Knopf ist erlaubt (eine Zeile, kein Risiko).

---

## 2. Architektur

```
App (GitHub Pages, öffentlich)
  │  fetch, streamend
  ▼
Supabase Edge Function  ←  hält ANTHROPIC_API_KEY als Secret
  │
  ├── liest words / skills / sessions  (Lernstand-Steckbrief)
  ├── ruft Anthropic API
  └── schreibt sessions (Zusammenfassung nach jeder Einheit)
```

**Sicherheits-Pflichten (ohne die wird nicht gebaut):**
- Hartes Ausgabenlimit im Anthropic-Konto: **5 €/Monat**.
- Ratenlimit in der Edge Function (z. B. max. 40 Züge/Stunde je Profil).
- Der Schlüssel existiert ausschließlich als Function-Secret.

---

## 3. Der Lernstand-Steckbrief

Vor jeder Einheit baut die Edge Function aus der Datenbank einen
kompakten Steckbrief — **strukturiert, nicht als Rohliste**:

| Block | Quelle | Inhalt |
|---|---|---|
| Sicherer Wortschatz | `words`+`cards`, reps ≥ 4, lapses < 3 | frei verwendbar |
| Wackeliger Wortschatz | lapses ≥ 3 | gezielt einbauen und üben |
| Frischer Wortschatz | reps < 4 | vorsichtig verwenden, wiederholen |
| Grammatik-Skills | `skills` (neu) | was erklärt/beherrscht ist |
| Lernjournal | `sessions` (neu) | letzte ~5 Zusammenfassungen + Dauerfehlerliste |

Regeln an das Modell: nur diesen Wortschatz und diese Grammatik
benutzen; höchstens 1–2 neue Wörter pro Einheit, deutlich markiert;
sanft korrigieren (erst würdigen, dann verbessern, auf Koreanisch bzw.
Englisch erklären — Menüsprache der jeweiligen Seite).

---

## 4. Gedächtnis über Unterhaltungen

Kein Volltext-Archiv (wächst unbegrenzt, kostet Kontext). Stattdessen:

- Beim Beenden einer Einheit erzeugt ein zusätzlicher Modell-Aufruf eine
  **Kurz-Zusammenfassung**: was geübt, welche Fehler, was beim nächsten
  Mal wieder aufgreifen. → Tabelle `sessions`.
- Zusätzlich eine **Dauerfehlerliste** je Profil (z. B. „vergisst 을/를",
  „Verwechselt Akkusativ/Dativ nach in"), die der Trainer fortschreibt.
- Die nächste Einheit bekommt: letzte ~5 Zusammenfassungen + die
  Dauerfehlerliste. So entsteht echte Kontinuität („letztes Mal hakte es
  bei X — bauen wir heute wieder ein").

---

## 5. Die vier Trainer-Modi

Auswahl über ein kleines Menü (Kachel-Optik wie die Tagesaufgaben).

### Modus 1: Szenario-Gespräch (endlich, zählt als Tageseinheit)
Konkrete Alltagssituation als Startkachel — nicht nur „Wie war dein
Tag?", sondern **Szenario-Karten**: Beim Bäcker bestellen, Taxi in
Seoul, Restaurant, Small Talk mit den Schwiegereltern. Teils fest
hinterlegt, teils vom Trainer anhand des Wortschatzes vorgeschlagen
(er weiß, welche Themenfelder abgedeckt sind — Essen ist z. B. bei
beiden stark).

**Abschluss-Mechanik:** Der Trainer liefert jede Antwort in einem
strukturierten Umschlag `{ message, canEnd, … }`. Sobald er 3–4
gelungene Wechsel gesehen hat, setzt er `canEnd: true` — in der App
erscheint ein Knopf „Gespräch abschließen ✓". Manuelles Beenden, aber
erst wenn der Trainer die Länge für ausreichend hält. Danach das
Abschluss-Feedback (siehe 5b).

### Modus 2: Lückentext (endlich, zählt)
Entscheidung nach Franz' Frage „Gespräch oder Grammatik?": **beides
zugleich, mit klarer Rollenteilung.** Die Lücken zielen auf
**Grammatik** (Partikeln 은/는·이/가·을/를, Endungen; Artikel und
Fälle auf der deutschen Seite) — denn Vokabeln deckt der Karteikasten
schon ab, Partikeln und Endungen kann nur Produktion üben. Der
**Rahmen** ist aber ein kurzer Alltagstext oder Mini-Dialog aus dem
bekannten Wortschatz, kein steriler Einzelsatz. Kontext + Grammatik
in einem.

Auslieferung als strukturiertes JSON, die App rendert echte
Eingabefelder im Stil der bestehenden Challenges. Nie als Fließtext
im Chat.

### Modus 3: Grammatik lernen (endlich, zählt)
Erste Frage des Trainers: „Was möchtest du heute üben?" — mit
Vorschlägen aus der Skills-Liste und der Dauerfehlerliste („Du
wolltest -았/었어요 wiederholen", „을/를 hakt noch"). Dann Aufgaben
nach **einheitlichem Schema**: kurze Erklärung, 5 Aufgaben zum
Selberlösen, Bewertung mit Feedback je Aufgabe am Ende.

### Modus 4: Endloses Freigespräch (offen, zählt NICHT)
Freies Üben ohne Abschluss — reden, solange man will. Zählt bewusst
nicht als Tageseinheit (es hat keinen definierten Abschluss), wird
aber genauso ins Lernjournal zusammengefasst, wenn man es verlässt.
Das Ratenlimit der Edge Function deckelt die Kosten.

### 5a. Chat-Erlebnis
Der Chat sieht aus wie ein Messenger (WhatsApp/KakaoTalk-Anmutung),
aber in der jeweiligen App-Optik — Hanji-Töne auf der einen, Bauhaus
auf der anderen Seite. Eigene Nachrichten rechts in der Akzentfarbe,
Trainer links auf Karten-Weiß, Tipp-Indikator (drei Punkte) während
der Trainer „schreibt", gestreamte Antworten.

**Kurze Nachrichten sind Pflicht:** Der Trainer antwortet in 1–3
Sätzen wie ein echter Chat-Partner. Lange Lehrer-Absätze zerstören
sowohl die Messenger-Anmutung als auch das Sprachniveau.

**Avatar:** Der Trainer trägt bei 해인 ein Cartoon-Gesicht von Franz,
bei Franz eines von 해인 (Bilder liefert Franz später). Das passt
inhaltlich perfekt zu Modus 1: Man übt buchstäblich die Gespräche,
die man mit dem Partner führen will. Wichtige Grenze: In den
Grammatik-Modi spricht der Trainer als Trainer, nicht in der Rolle
des Partners — das Gesicht bleibt, die Rolle wechselt. (Offen: soll
er im Szenario-Modus aktiv die Partnerrolle spielen dürfen?)

### 5b. Korrekturen im Gespräch
Zweistufig, damit der Fluss erhalten bleibt:
- **Sofort, aber leise:** Unter der eigenen Nachricht erscheint bei
  Fehlern eine kleine Anmerkung (korrigierte Form, dezent wie ein
  „Bearbeitet"-Hinweis). Antippen klappt die kurze Erklärung auf.
- **Am Ende gesammelt:** Beim Abschluss einer Einheit das eigentliche
  Feedback — was gut war, die 2–3 wichtigsten Fehler, was ins
  Lernjournal wandert.

Unbekannte Wörter im Trainer-Text: antippbar → „In die Bibliothek?"
→ landet mit Wortart im Karteikasten, der Nachtlauf ergänzt den Rest.
Das Gespräch füttert so den Karteikasten.

### 5c. Platz in der App
Der Trainer bekommt einen **vierten Tab** in der unteren Leiste
(Sprechblasen-Icon) — jederzeit erreichbar, mit dem Modus-Menü als
Startbildschirm. Am Aktiv-Tag verweist zusätzlich die Aufgaben-Kachel
auf der Startseite direkt hinein und zeigt nach Abschluss ihr
Häkchen.

---

## 6. Grammatik erfassen (frustrationsarm)

Zwei Wege, ein gemeinsames Prinzip: **das Modell schlägt vor, der Mensch
bestätigt.** Nie Blindspeicherung.

- **Per Hand:** kurzes Textfeld („Perfekt mit haben/sein gelernt") →
  Modell normalisiert zu 1–3 atomaren Skills → Checkliste → Speichern.
- **Per Foto:** Kamera-Knopf (`<input capture>`), Bild an die Edge
  Function, Claude liest das Übungsblatt direkt (multimodal, kein
  OCR-Dienst) → Checkliste der erkannten Grammatikpunkte → abwählbar →
  Speichern. Bei unlesbarem Foto eine klare Meldung, kein Raten.
- Skills sind **kurz und atomar** („-았/었어요 Vergangenheit"), keine
  Absätze. Editierbar und löschbar in der App.
- Aus Einheiten heraus: übt der Trainer erfolgreich etwas Neues, darf er
  vorschlagen „als gelernt markieren?" — wieder mit Bestätigung.

---

## 7. Tagesrhythmus (Franz' Wechsel-Idee, geschärft)

Beobachtung: 2 neue Vokabeln/Tag summieren sich schnell, besonders bei
einer fernen Sprache. Und produktives Anwenden fehlt bisher völlig.

**Wechselrhythmus:**

| | Input-Tag | Aktiv-Tag |
|---|---|---|
| Wort des Tages | ✅ | — (keine neuen Vokabeln) |
| Wiederholen | ✅ | ✅ **immer** |
| Challenge (Zahl bzw. Rotation) | ✅ | — |
| Trainer-Einheit | freiwillig | ✅ zählt für die Streak |

Wichtigste Abweichung von der Roh-Idee: **Wiederholen pausiert nie.**
Der SM-2-Algorithmus lebt von termingerechten Wiederholungen; ein
Aussetz-Tag verfälscht alle Intervalle. Neuzugang darf pausieren,
Wiederholung nicht.

Nebeneffekt genau im Sinne der Beobachtung: der Vokabel-Neuzugang
halbiert sich (nur noch an Input-Tagen).

**Streak-Absicherung:** Ist der Trainer nicht erreichbar (Funktion down,
Budgetdeckel erreicht), gilt am Aktiv-Tag ersatzweise der normale
Ablauf. Die Streak darf niemals an einem externen Dienst sterben.

---

## 8. Modellwahl und Kosten

Franz' Vorgabe: Opus, falls es ins 5-€-Budget passt; sonst schnelleres
Modell bei ausreichender Qualität. Einschätzung:

- **Opus: nein.** Bei täglicher Nutzung durch zwei Personen sprengt es
  das Budget um ein Mehrfaches. Und die eigentliche Schwierigkeit ist
  nicht Intelligenz, sondern **Disziplin** (im Wortschatz bleiben) —
  das ist Steckbrief-Qualität, keine Modellgröße.
- **Start: Sonnet** mit Prompt-Caching (der Steckbrief ist innerhalb
  einer Einheit stabil → gecachte Lesezugriffe kosten einen Bruchteil).
  Geschätzt wenige Euro/Monat für beide zusammen.
- **Messen statt schätzen:** Die Edge Function loggt Token je Aufruf in
  eine kleine Tabelle. Nach einer Woche echter Nutzung wird anhand der
  Zahlen entschieden: bleibt Sonnet, oder reicht Haiku (Kosten ÷ ~3)
  bei gleicher erlebter Qualität. Der 5-€-Deckel gilt unabhängig davon
  immer.

---

## 9. Nicht-Ziele der v1

- Kein Sprach-zu-Sprach-Gespräch in Echtzeit (keine passende API,
  Latenz zerstört das Erlebnis).
- Keine Spracherkennung in der App (iOS-Diktat auf der Tastatur
  funktioniert ohnehin).
- Kein Volltext-Gesprächsarchiv mit Suche.
- Keine Öffnung für weitere Nutzer (Ratenlimit + offene DB sind nur im
  Zwei-Personen-Rahmen vertretbar).

---

## 10. Entschieden / noch offen

**Entschieden (Runde 2):**
- Einheiten-Ende: manuell, aber der Abschluss-Knopf erscheint erst,
  wenn der Trainer genug gelungene Wechsel gesehen hat (canEnd).
- Feedback: je Aufgabe in den Übungs-Modi; im Gespräch leise
  Sofort-Anmerkung + gesammeltes Abschluss-Feedback.
- Vier Modi wie in Abschnitt 5; Modus 4 zählt nicht als Tageseinheit.
- Platz: vierter Tab + Aktiv-Tag-Kachel.
- Chat-Optik: Messenger-Look in den bestehenden Themes.
- Avatare: Cartoon-Partnergesichter, Bilder liefert Franz.

**Noch offen:**
1. Darf der Trainer im Szenario-Modus aktiv die **Partnerrolle**
   spielen („simuliertes Gespräch mit 해인/Franz"), oder bleibt er
   immer sichtbar Trainer mit Partnergesicht?
2. **Rhythmus-Start:** Input-/Aktiv-Tag für beide sofort, oder erst
   bei Franz testen?
3. Sollen die **leisen Sofort-Anmerkungen** unter eigenen Nachrichten
   so umgesetzt werden, oder Korrekturen ausschließlich am Ende?

---

## 11. Bauplan (nach Freigabe des Konzepts)

1. **Fundament:** Edge Function (Proxy + Ratenlimit + Token-Log),
   Chat-Ansicht mit Streaming, Steckbrief aus `words`/`cards`.
   → Modus „Freies Gespräch" erlebbar.
2. **Gedächtnis:** `skills`- und `sessions`-Tabellen,
   Einheiten-Zusammenfassung, Dauerfehlerliste, Skill-Erfassung per
   Hand.
3. **Modi & Rhythmus:** Lückentext (strukturiert), Grammatik-Drill,
   „Trainer entscheidet", Input-/Aktiv-Tag-Logik mit Streak-Fallback.
4. **Foto-Erfassung** der Grammatik + Wörter-Übernahme aus dem Dialog.

Jede Stufe wird einzeln gebaut, getestet und gepusht — wie immer.
