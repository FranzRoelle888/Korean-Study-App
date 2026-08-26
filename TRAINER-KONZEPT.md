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

## 5. Trainer-Modi

Kein einziger Freiform-Chat, sondern ein kleines Menü (wie die
Aufgaben-Kacheln, gleiche Optik):

1. **Freies Gespräch** — Alltagsdialog („Wie war dein Tag?"), Trainer
   hält Niveau, korrigiert nebenbei.
2. **Lückentext** — Trainer liefert die Übung als **strukturiertes JSON**,
   die App rendert echte Eingabefelder im Stil der vorhandenen
   Challenges. Kein Lückentext als Fließtext im Chat (unbedienbar).
3. **Grammatik üben** — gezielter Drill zu einem Skill (bestehend oder
   frisch hochgeladen), aufgebaut wie ein Mini-Arbeitsblatt.
4. **Trainer entscheidet** — wählt anhand von Journal + Dauerfehlerliste,
   was heute am meisten bringt.

Unbekannte Wörter im Dialog: antippbar → „In die Bibliothek?" → landet
mit Wortart im Karteikasten (der Nachtlauf ergänzt den Rest). Das
Gespräch füttert so den Karteikasten.

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

## 10. Offene Fragen an Franz

1. **Einheiten-Länge:** fester Umfang (z. B. ~8 Trainer-Züge, dann
   Abschluss + Zusammenfassung) oder offenes Ende mit „Beenden"-Knopf?
2. **Korrektur-Stil:** Fehler sofort in jeder Antwort korrigieren, oder
   erst am Ende der Einheit gesammelt (flüssigeres Gespräch)?
3. **Rhythmus-Start:** Wechselrhythmus für beide Seiten sofort, oder
   erst bei dir testen und 해인 später umstellen?

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
