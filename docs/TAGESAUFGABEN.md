# Tagesaufgaben — das verbindliche Konzept

> Finale Ausarbeitung (28.08.2026), kein Skizzenpapier. Beantwortet:
> Wie sieht die tägliche Ration aus, wie wird Grammatik-Können
> getrackt, wie entstehen die Aufgaben realistisch, was kostet es,
> und was passiert, wenn etwas ausfällt. Jede Zahl hier ist eine
> Design-Entscheidung — Änderungen bewusst, über das Entscheidungs-Log.

---

## 1. Die Kernidee: dumme Maschine, kluger Vorrat

Franz' berechtigte Skepsis: „Kann sich die KI nachts wirklich gute
Aufgaben ausdenken, die neue Vokabeln, wacklige Grammatik UND neuen
Stoff in gemäßigtem Tempo berücksichtigen?"

**Antwort: Sie muss es nicht.** Der Denkfehler wäre, die KI nachts
„den Unterricht planen" zu lassen. Stattdessen drei getrennte,
einzeln simple Komponenten:

1. **Nachts (KI, Batch):** produziert VORRAT, keine Pläne — kleine,
   validierte Aufgaben in eine Bank, jede getaggt mit dem
   Grammatikpunkt, den benutzten Wörtern, Typ und Schwierigkeit.
2. **Beim Öffnen (Code, 0 Tokens):** ein deterministischer
   **Komponist** wählt aus der Bank nach festen Regeln (§4) die
   heutige Ration. Kein LLM — schnell, kostenlos, testbar,
   vorhersagbar.
3. **Live (KI, minimal):** bewertet nur freie Antworten
   (Übersetzungen, selbstgebaute Sätze) — der einzige Live-Verbrauch.

Damit ist jede Komponente trivial zu prüfen: Die Bank kann man
lesen, den Komponisten kann man testen, die Bewertung ist ein
kleiner Prompt. „Extrem durchdacht" heißt hier: nirgends Magie.

---

## 2. Grammatik-Tracking (das Herzstück)

### 2.1 Zustände je Kanon-Punkt

Jeder Punkt der Inventare (72 TOPIK / 50 GER) hat genau einen Zustand:

| Zustand | Bedeutung | Wie man hinkommt |
|---|---|---|
| `unbekannt` | nie gesehen | Startzustand |
| `vorgestellt` | App/Trainer hat ihn eingeführt, noch kein Beleg | Grammatik-Lektion abgeschlossen |
| `wackelig` | Belege gemischt oder veraltet | s. Regeln unten |
| `sicher` | belegt beherrscht | s. Regeln unten |

Dazu je Punkt: `versuche`, `korrekt`, die letzten 5 Ergebnisse,
`zuletzt_gesehen`, `naechster_check` und `source`.

### 2.2 Die Beleg-Regeln (konservativ, wie von Franz gewünscht)

- **→ sicher:** mindestens 3 korrekte Anwendungen in Übungen,
  verteilt über mindestens 2 verschiedene Tage, UND höchstens 1
  Fehler in den letzten 5 Versuchen.
- **sicher → wackelig:** 2 Fehler in den letzten 5 Versuchen, ODER
  der fällige Erhaltungs-Check (s. u.) wird nicht bestanden.
- **Kalibrierungs-„sicher"** zählt als Vorschuss (blasser
  Balkenanteil): Es steuert Trainer und Komponist, wird aber erst
  durch Übungsbelege „satt". Widerlegt eine Übung die
  Selbsteinschätzung, wird ehrlich zurückgestuft.

### 2.3 Grammatik-SRS: der Erhaltungs-Check

Können verfällt. Jeder `sicher`-Punkt bekommt ein Prüf-Datum:
erst nach 7 Tagen, dann 21, dann 60 (bestanden = nächste Stufe,
durchgefallen = `wackelig` + zurück auf 7). Der Komponist reserviert
dafür täglich einen Slot. Das ist SM-2-Denken auf Grammatik-Ebene —
und der Grund, warum die Fortschritts-Leiste dauerhaft EHRLICH bleibt
statt nur zu wachsen.

### 2.4 Beleg-Quellen

1. **Aufgaben-Ergebnisse** (direkt: jede Aufgabe trägt ihren Punkt).
2. **Trainer-Korrekturen:** Die Abschluss-Zusammenfassung ordnet
   erkannte Fehler den Kanon-IDs zu (kleine Prompt-Erweiterung) —
   ein 은/는-Fehler im Café-Gespräch zählt als Gegenbeleg.
3. **Kalibrierung / Erzähl-Fenster** als Vorschuss (s. o.).

### 2.5 Lern-Takt für NEUEN Stoff (gemäßigt, wie gefordert)

Es gibt immer höchstens EINEN „aktuellen Lern-Punkt". Ein neuer
wird erst eingeführt, wenn der aktuelle mindestens `wackelig` mit
2 guten Tagen ist — Meister-Takt statt Kalender-Takt. Faktisch
ergibt das ~2 neue Punkte pro Woche; wer schwächelt, bekommt
automatisch Festigung statt Neuem. Reihenfolge: der Kanon
(nächster nicht-sicherer Punkt), mit Sprung-Erlaubnis über bereits
kalibrierte Punkte.

---

## 3. Wortschatz in der Ration

- **3 neue Wörter/Tag** (Entscheidung Franz; einstellbar 2–5
  bleibt Ziel). Quelle: die Häufigkeits-Warteschlange der
  Inventare (unbekannte Wörter, häufigste zuerst), gemischt mit
  von Hand hinzugefügten.
- **Einweben statt Inszenieren:** Die neuen Wörter von gestern/
  vorgestern tauchen in Bank-Aufgaben als KONTEXT auf (im Satzkörper),
  nicht als Lücke — nichts wirkt „gestaged". Erst nach ~3 Tagen
  dürfen sie selbst Lückenziel werden. Wacklige Wörter (⚠) sind
  bevorzugte Lückenziele.
- **FSRS statt SM-2** (die 20–30 %-weniger-Wiederholungen-Frage):
  **Machbar ohne Datenverlust.** Der Umbau konvertiert jede Karte
  (Wiederholungen/Patzer/aktuelles Intervall → Startschätzung für
  das FSRS-Gedächtnismodell); die ersten Tage sind die Intervalle
  leicht daneben und korrigieren sich selbst; das Nacht-Backup
  sichert den Stand davor. Empfehlung: JA, als eigener sorgfältiger
  Schritt — denn 3 Wörter/Tag erhöhen die Wiederholungslast genau
  dort, wo FSRS spart. Bis dahin bleibt SM-2 unangetastet.

---

## 4. Die Tagesration (der Komponist)

**Zeitbudget: 10–15 min.** Rechnung: Wiederholungen ~3–5 min
(gedeckelt, Rückstau-Gnade) + 3 neue Wörter ~3 min + Aufgaben-Block
~4–5 min + Puffer. Passt — und FSRS verschafft Luft, wenn der
Kartenbestand wächst.

**Der Aufgaben-Block: 5 Aufgaben nach festem Slot-Schema:**

| Slot | Inhalt | Warum |
|---|---|---|
| 1 | **Erhaltung:** fälligster Grammatik-Check (§2.3) | Können verfällt sonst unbemerkt |
| 2+3 | **Lern-Punkt:** 2 Aufgaben zum aktuellen neuen Punkt, verschiedene Typen | Festigung braucht Wiederholung in Variation |
| 4 | **Recycling:** Aufgabe, deren Satz frische/wacklige Wörter einwebt | 8–10 Begegnungen pro Wort |
| 5 | **Wildcard:** Hören, Lesen oder Übersetzen — rotierend | Abwechslung; die vernachlässigten Kanäle |

Typen-Pool (wild gemischt, wie gewünscht): Lückentext offen /
Multiple-Choice, Satz aus Bausteinen bauen, Übersetzung in beide
Richtungen, Diktat (Cache-Audio!), Hör-Multiple-Choice, Fehler-
Detektiv, „Bau selbst einen Satz mit …" (KI bewertet live),
Mini-Lesetext mit einer Frage. Regel: nie zweimal derselbe Typ
hintereinander; jeder Typ mit Erfolgsquoten-Ziel 80–90 %.

---

## 5. Die Nacht-Pipeline (realistisch, mit Ausfallplan)

**Was der Batch tut (GitHub Action, Sonnet, ~10–20 Cent/Nacht):**
Für jeden AKTIVEN Punkt (Lern-Punkt, fällige Checks der nächsten
7 Tage, wacklige Punkte) den Bank-Puffer auf ≥ 8 Aufgaben
auffüllen; dazu je 1 Hör-/Lese-Häppchen pro Woche. Eingabe je
Auftrag: der Punkt, die Wort-Whitelist (sicher + frisch markiert),
gewünschte Typen. **Validierung vor dem Speichern** (Skript, nicht
KI): Lückenwort kommt im Satz vor; alle Wörter auf der Whitelist;
Distraktoren ≠ Lösung; Längen-Grenzen; feste Sprechebene; bei
Koreanisch nur kuratierte Satzmuster. Durchgefallenes wird
verworfen, nie repariert. Alles `extras_auto`, korrigierbar, ohne
Prüfpflicht.

**Ausfallsicherheit (eiserne Regel 3):**
- Der Puffer hält ≥ 3 Tage: Ein ausgefallener Batch bleibt unbemerkt.
- Ist die Bank doch leer: Der Komponist degradiert auf **lokal
  erzeugbare Typen** — Diktat/Hör-MC aus vorhandenen Beispielsätzen
  (Audio im Cache), Karten-Sonderrunden, Satz-Puzzle aus
  Bank-Altbeständen. Die Ration ist IMMER erfüllbar, ganz ohne KI.
- Live-Bewertung ausgefallen → freie Aufgaben werden durch
  geschlossene ersetzt.

**Warum das realistisch ist:** Jeder Einzelauftrag an die KI ist
winzig und eng („5 Lückentexte zu -(으)면, nur diese Wörter") —
genau die Aufgabengröße, bei der Sonnet zuverlässig ist. Die
„Didaktik" (was wann drankommt) steckt komplett im Komponisten
und in §2 — deterministischer Code, den wir lesen und testen können.

---

## 6. Fortschritts-Leisten, Korrektur (Entscheidung Franz)

Die Wortschatz-Leiste „x/1791" war ein Designfehler: unerreichbar
wirkend und fachlich schief (die Gesamtliste ist der ganze
Anfänger-Korridor, kein Tagesziel). **Neu: Meilenstein-Leiste über
Häufigkeits-Etappen** — Top 100 → 250 → 500 → 750 → 1000 → alle.
Angezeigt wird nur die AKTUELLE Etappe („Häufigste 500: 430/500");
ist sie voll, rückt die nächste nach. Didaktisch ehrlich (die
häufigsten 1000 Wörter decken den Großteil echter Alltagssprache)
und immer erreichbar. Die Grammatik-Leisten bleiben unverändert —
sie sind klein genug, um ganz erobert zu werden.

---

## 7. Streak vs. „So oft diese Woche gelernt" (kritisch geprüft)

Ausdrücklich NICHT blind zugestimmt — die Abwägung:

- **Für die Wochenzählung** spricht die Forschung gegen
  Streak-Angst: Ein Fehltag schadet der Gewohnheit nicht, und eine
  Wochenzahl bestraft ihn nicht.
- **Dagegen** spricht: Der Wochen-Reset am Montag nimmt den
  aufgelaufenen Wert weg, der Streaks so bindend macht (Duolingo:
  7-Tage-Streaks korrelieren mit 2,4-facher Bindung) — und euer
  Streak hat mit den Partner-Punkten eine warme, soziale Funktion,
  die eine Wochenzahl nicht ersetzt.
- **Empfehlung: Hybrid statt Ersatz.** Der Streak bleibt, bekommt
  aber die beschlossene Vergebung (1–2 Frei-Tage/Monat; Fehltag
  dimmt, statt auf null zu reißen). Die Wochen-Punkte-Reihe auf der
  Startseite (existiert schon!) wird um genau Franz' Satz ergänzt:
  „4× gelernt diese Woche". Beide Botschaften, kein Verlust.
  → Zur gemeinsamen Entscheidung vorgelegt, nicht umgesetzt.

---

## 8. Umsetzungs-Reihenfolge

1. **Sofort (entschieden):** Wortschatz-Leiste → Meilensteine;
   Tagesration 3 neue Wörter.
2. **Datenmodell:** `exercise_bank` + Grammatik-Zustandsfelder
   (Migration), Zustands-Logik in `core` (rein, testbar).
3. **Bank-Batch** (Nacht-Action) + Validierungs-Skript.
4. **Komponist + Aufgaben-UI** (die 5 Slots, erste Typen:
   Lückentext offen/MC, Satz bauen, Diktat, Hör-MC).
5. **Beleg-Rückfluss:** Ergebnisse → Zustände → Leisten werden satt;
   Trainer-Fehler → Kanon-Zuordnung (Function-Redeploy, gebündelt).
6. **Danach:** FSRS-Umstellung als eigener Schritt; Streak-Vergebung
   + Wochen-Beschriftung nach Franz' Entscheidung zu §7.

Der bisherige „Lückentext/Grammatik-Kachel"-Plan geht in diesem
Konzept auf: Die Kacheln öffnen künftig den Aufgaben-Block bzw. die
Grammatik-Lektion des Lern-Punkts.
