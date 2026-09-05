# Vokabel-Motor V2 — verbindliches Konzept (Franz' Seite, `ko`)

Stand 06.09. Ersetzt den Entwurf. Enthält alle Entscheidungen aus den
Konzeptrunden. **Gilt nur für das Profil `ko`.** 해인s Seite (`de`) und ihr
Lernrhythmus bleiben bis zur Prüfung am 29.10. unangetastet — jede Änderung
ist hinter `targetLang === 'ko'` bzw. `TAGES_ZAHLEN.ko` verriegelt.

Etappe 1 (FSRS-Ziel 93 %, „Barely"-Deckel ½, neue Bewertungslabels,
Tagesdeckel) ist gebaut (Commit 0eab1c6). Dieses Dokument beschreibt den
Rest. **Status: wartet auf Franz' Go.**

---

## 1. Was der Motor leisten soll

1. **Mehr Wörter, die wirklich sitzen.** Neue Wörter kommen aus dem
   TOPIK-I-Häufigkeitsinventar in Rang-Reihenfolge, nicht mehr aus der
   Datei-Reihenfolge von `koreanPool.js` (die „20 Verben am Stück" erzeugte).
2. **Drei Stufen je Wort**, die nacheinander frei werden:
   Erkennen → Produktion → Hören. Jede Stufe hat eine eigene FSRS-Kette.
3. **Ehrliche Prüfung.** Antworten werden getippt, nicht geraten. Bei
   Erkennen/Hören über eine Vorschlagsliste aus der eigenen Bibliothek
   (nur der richtige Eintrag zählt), bei Produktion durch exaktes Tippen
   des koreanischen Wortes.
4. **Ein Einführungsritual (~25 s)**, das Wortbild, Klang, Beispielsatz,
   Hanja-Bausteine und Nuance in einem Zug verankert und mit einmaligem
   Abschreiben endet.
5. **Inhalte vorab.** Kein Wort wird eingeführt, dessen Beispielsatz,
   deutsche Bedeutung, Hanja-Zeile und Audio nicht schon liegen. Der
   Streak hängt nie an KI oder TTS.

**Nicht in dieser Umsetzung** (bewusst zurückgestellt): Abend-Check,
Sitzungs-Leiter, Extra-Runde/Vorziehen/Wackel-Liste, Anti-Verwechslung,
Wortfamilien-Bonus, Wortart-Tagesrotation (kommt nach dem
Prozent-Bericht, §5.4), Alt-Karten-Fälligkeits-Spreizung (separates Go).

---

## 2. Karten und ihr Lebenslauf

### 2.1 Die drei Stufen

| Stufe | Karte | Vorderseite | Antwort | Freischaltung |
|---|---|---|---|---|
| **Erkennen** | `front='ko'`, `modus='text'` | koreanisches Wort (+ Hanja-Zeile, Audio-Knopf) | Bedeutung antippen aus Vorschlagsliste (Englisch oder Deutsch) | am Einführungstag |
| **Produktion** | `front='en'` | Bedeutung `water (Wasser·)` | koreanisches Wort exakt tippen | nach 2 erfolgreichen Erkennen-Wiederholungen **oder** wenn Erkennen-Intervall > 14 Tage |
| **Hören** | dieselbe Erkennen-Karte, `modus='audio'` | nur Audio (Wort), kein Text | wie Erkennen: Bedeutung antippen | wenn Erkennen-Stabilität ≥ 21 Tage |

Bestehende Wörter (231) haben beide Karten schon — die bleiben genau so.
Für sie greift nur die Hör-Verwandlung (§2.4).

### 2.2 Einführungstag

- Nach dem Ritual (§4) wird **nur die Erkennen-Karte** angelegt
  (`stab=null`, fällig heute).
- **Kurz-Wiederholung ohne Warten:** Die Karte kommt noch in derselben
  Sitzung einmal dran — frühestens nach 5 anderen Karten oder 3 Minuten,
  spätestens am Sitzungsende. Das ist die erste echte FSRS-Bewertung
  (Wiedersehen nach Minuten = die wertvollste Wiederholung überhaupt).
- Sitzung vorher abgebrochen → Karte bleibt fällig heute und ist beim
  nächsten Öffnen als Erstes dran.

### 2.3 Produktions-Freischaltung („Warmstart")

- Prüfung **nach jeder erfolgreichen Erkennen-Wiederholung** („Got it"
  oder „Instant" zählt als Erfolg, „Barely" nicht):
  `erfolge ≥ 2` **oder** neues `intervalDays > 14`.
- Dann Produktions-Karte anlegen: `front='en'`, `stab=null`,
  `diff` = Schwierigkeit der Erkennen-Karte (geerbt), **fällig morgen**.
  Ab dort eigene FSRS-Kette ab 1 Tag.
- Ohne Erkennen-Erfolg entsteht nie eine Produktions-Karte — ein Wort,
  das im Erkennen dauernd fällt, wird nicht zusätzlich belastet.

### 2.4 Hör-Verwandlung

- Prüfung **nach jeder erfolgreichen Erkennen-Wiederholung** — also erst,
  wenn die Karte ohnehin dran ist. Kein Schwall am Umstellungstag, die
  bestehenden Karten wandeln sich nach und nach. Bedingung: neue
  Stabilität ≥ 21 Tage → `modus='audio'`.
- Beim Wechsel: **Stabilität halbiert**, Termin = `min(FSRS-Termin,
  heute + 7 Tage)`. Die Karte kommt binnen einer Woche als Hör-Karte
  wieder. **Kein Tageslimit** für Verwandlungen.
- **Hör-Karte im Stapel:** Audio spielt automatisch beim Erscheinen,
  Wiederholen-Knopf sichtbar, Text des Wortes nicht. Antwort per
  Vorschlagsliste wie Erkennen.
- **Zwei Fehlschläge in Folge** (`hoer_fehler ≥ 2`) → die nächste
  Wiederholung zeigt **Text + Audio** gemeinsam (einmal), Zähler auf 0,
  Modus bleibt `audio`. Jeder Erfolg setzt den Zähler auf 0.
- **Offline / Audio fehlt / Autoplay blockiert:** Karte erscheint als
  Text-Karte, Modus bleibt `audio`. Der Streak leidet nie am Audio.
- **Kein Rückweg** von `audio` nach `text` — Hören ist die Endstufe.

### 2.5 Datenmodell (Migration 015, additiv)

```sql
-- Wörter: neue Inhaltsfelder
alter table words add column if not exists de      text;     -- deutsche Bedeutung
alter table words add column if not exists nuance  text;     -- Kurzhinweis, optional
alter table words add column if not exists hanja   jsonb;    -- [{z:'水', les:'수', de:'Wasser'}]
alter table words add column if not exists inv_id  text;     -- TOPIK-Inventar-Id (t-123)
alter table words add column if not exists rang    integer;  -- Häufigkeitsrang
-- Karten: Hör-Stufe + Warmstart-Zähler
alter table cards add column if not exists modus       text not null default 'text'
  check (modus in ('text','audio'));
alter table cards add column if not exists hoer_fehler integer not null default 0;
alter table cards add column if not exists erfolge     integer not null default 0;
-- Vorrat: angereicherte, noch nicht eingeführte Wörter
create table if not exists vorrat (
  inv_id  text not null,
  profile text not null default 'ko',
  ko text not null, en text not null, de text, pos text, rang integer,
  ex text, ex_tr text, nuance text, hanja jsonb,
  bereit   boolean not null default false,  -- Text-Inhalte komplett + geprüft
  audio_ok boolean not null default false,  -- TTS Wort + Satz im Cache
  uebersprungen boolean not null default false,
  created_at timestamptz default now(),
  primary key (profile, inv_id)
);
```

Vorhandene Spalten werden weiterverwendet: `words.pos`, `words.ex`,
`words.ex_tr`, `cards.stab/diff`. Die App bleibt schema-tolerant
(fehlende Spalten → Feature still aus). Der Vorrat ist eine eigene
Tabelle, damit die Bibliothek nur enthält, was Franz wirklich lernt.

---

## 3. Antwort-Prüfung

### 3.1 Erkennen und Hören: Vorschlagsliste

- Ein Eingabefeld unter der Karte. **Ab dem 2. Zeichen** erscheint eine
  Liste mit **höchstens 5 Treffern** aus der **eigenen Bibliothek**
  (Feld `en` **und** `de` jedes Wortes), Präfix-Treffer zuerst, dann
  „enthält". Kein Fuzzy, kein Alias, keine Toleranz.
- **Nur das Antippen des richtigen Eintrags zählt als richtig.** Falscher
  Eintrag = falsch. Enter ohne Antippen tut nichts.
- Knopf **„Weiß nicht"** = falsch.
- Richtig → drei Knöpfe **Barely / Got it / Instant** (Selbstbewertung
  der Sicherheit, wie bisher im Tipp-Modus). Falsch → automatisch
  **Again**, richtige Bedeutung wird gezeigt, Karte bleibt heute im Stapel.
- Die Liste zeigt nur Bedeutungen (`water (Wasser)`), nie das koreanische
  Wort — sonst verriete sie bei der Hör-Karte die Antwort.
- Zwei verschiedene Wörter mit identischer Bedeutung (z. B. zweimal
  „to go"): beide stehen in der Liste, mit `nuance` als Zusatz, falls
  vorhanden; richtig ist nur der Eintrag der aktuellen Karte.

### 3.2 Produktion: exaktes Tippen

- Eingabe koreanisch, **keine Vorschläge**, keine Toleranz. Vergleich
  nach Normalisierung (NFC, Leerzeichen getrimmt, innen ein Leerzeichen).
- Falsch → **eigene Eingabe neben richtigem Wort**, Abweichungen auf
  **Jamo-Ebene** markiert (Silbe zerlegt: 학 vs 항 → ㄱ/ㅇ rot),
  automatisch **Again**. Richtig → Barely / Got it / Instant.
- Tastatur wechselt Franz **selbst** (Sprach-Globus). Keine Sperre,
  keine eigene Tastatur, kein Hinweis.

### 3.3 Fokus-Regel (alle Tipp-Durchläufe)

- Sobald das Eingabefeld Fokus hat: **alles verschwindet außer der
  Übersetzung bzw. dem Prompt** — koreanisches Wort, Hanja-Zeile,
  Beispielsatz, Nuance-Blase, **auch der Audio-Knopf**.
- Fokus raus / Tastatur zu → alles wieder sichtbar.
- Gilt für Produktion, Erkennen, Hören und das Ritual-Abschreiben.

---

## 4. Einführungsritual (~25 s je Wort)

1. **Wort groß** in Hangul, Audio spielt **automatisch** (Wiederholen-
   Knopf daneben). Darunter die **Hanja-Zeile**, falls sino-koreanisch:
   je Silbe ein Chip `水 수`; Antippen öffnet eine Blase mit der
   Bedeutung des Zeichens („Wasser").
2. **Bedeutung** `water (Wasser·)` — Englisch bleibt Hauptanker, Deutsch
   in Klammern. Der **Punkt** (plus gepunktete Unterstreichung) markiert
   eine vorhandene Nuance; Antippen öffnet die Sprechblase (z. B. „nur
   Trinkwasser, nicht Gewässer"). Ohne Nuance kein Punkt.
3. **Beispielsatz prominent** (größer als bisher, eigener Audio-Knopf,
   Übersetzung darunter, Zielwort im Satz fett).
4. **Kein Raten, kein Zwischentest.** Nach **10 s** erscheint der Knopf
   **„Jetzt schreiben"**. Franz tippt das Wort aus dem Kopf; Fokus-Regel
   §3.3 greift. Richtig → Häkchen, nächstes Wort. Falsch → Jamo-Diff,
   Wort wieder sichtbar, ein zweiter Versuch. Danach weiter, ohne
   Bewertung (das Ritual ist keine FSRS-Wiederholung).
5. Erkennen-Karte anlegen (§2.2), Kurz-Wiederholung einplanen.

Fünf Wörter ≈ 2–2,5 Minuten Ritual. Danach beginnt der Wiederholstapel.

---

## 5. Wortauswahl und Mengensteuerung

### 5.1 Quelle

- `src/core/inventare/topik1-woerter.json` (1791 Einträge, davon **1754
  ohne Zahlwörter**; 155 ohne Rang stehen ganz hinten).
- Reihenfolge: **`rang` aufsteigend**, `pos = 'number'` **ausgeschlossen**.
- **Pflichtprüfung „schon in der Bibliothek?"** vor jeder Einführung,
  zweifach: über `inv_id` **und** über das normalisierte koreanische Wort
  (NFC, getrimmt) gegen alle `words` des Profils. Treffer → Wort wird
  übersprungen und im Vorrat als `uebersprungen` markiert (nie wieder
  angeboten). Dieselbe Prüfung läuft schon beim Befüllen des Vorrats
  (§6.3), also doppelt abgesichert. Das ist die einzige Form von
  „Bekanntes überspringen"; Franz' Vorwissen wird nicht abgefragt — was
  er kennt, läuft über „Instant" schnell aus dem Stapel.
- **Nur `bereit = true` und `audio_ok = true`** Wörter dürfen eingeführt
  werden. Vorrat leer oder nicht bereit → Hinweis „Neue Wörter werden
  gerade vorbereitet", Wiederholstapel läuft normal, Streak unberührt.
- `koreanPool.js` wird für die Auswahl **nicht mehr** genutzt und in E6
  entfernt.

### 5.2 Tageszahlen (`TAGES_ZAHLEN.ko`)

| Größe | Wert | Bedeutung |
|---|---|---|
| `neueProTag` | **5** | Einführungen pro Tag |
| `deckel` | **130** | max. Wiederholungen, die der Tag anbietet |
| `neuStopp` | **100** | sind heute > 100 Karten fällig → keine neuen Wörter |
| Schalter | „Heute keine neuen Wörter" | manuell im Heute-Bereich, gilt bis Mitternacht, über `daily_log.stand` gesynct |

Erwartete Dauerlast bei 5 Wörtern/Tag und 93 %: ~110–125 Wiederholungen
pro Tag (≈ 25–30 min) nach Einlaufen. Der Stopp bei 100 bremst
automatisch, wenn es sich staut.

### 5.3 Auswahlalgorithmus (bewusst simpel)

```
kandidaten = vorrat
  .filter(bereit && audio_ok && !uebersprungen && pos != 'number')
  .sortBy(rang)
für jeden Kandidaten (bis neueProTag erreicht):
  wenn inv_id oder ko schon in words → uebersprungen = true, weiter
  sonst → einführen
```

Keine Anti-Verwechslung, kein Wortfamilien-Bonus, keine Rotation.

### 5.4 Wortarten-Einstufung (Vorbereitung der Rotation)

- **Vorrat:** `pos` kommt fertig aus dem Inventar.
- **Bestehende 231 Wörter:** Wo das Wort im Inventar steht (201 Fälle),
  wird `pos` übernommen. Die **30 Rest-Wörter** (z. B. 말하다, 공부하다 —
  im Inventar nur als Stamm) bekommen `pos` in der Anreicherung von der KI
  (feste Liste: noun, verb, adj, adv, pronoun, determiner, interjection,
  phrase).
- **Bericht nach der Anreicherung:** Prozentverteilung der Wortarten über
  die **nächsten 300** Vorratswörter. Daraus legt Franz die Tagesrotation
  fest — **nächste Iteration, nicht diese.**

---

## 6. Inhalte-Pipeline (Anreicherung)

### 6.1 Was je Wort entsteht

| Feld | Quelle | Regel |
|---|---|---|
| `en` | Inventar / bestehend | Hauptanker; Inventar-Glossen auf 1–3 Wörter gekürzt („A thing or an object" → „thing") |
| `de` | KI | 1–3 Wörter, Alltagsdeutsch |
| `ex`, `ex_tr` | KI | ein Satz, 해요체, nur A1/A2-Grammatik (MUSTER_EINFACH), 5–9 Wörter, enthält das Zielwort unverändert oder in gängiger Konjugation; Übersetzung Englisch. Bestehende Wörter **ohne** Satz bekommen einen, vorhandene Sätze bleiben |
| `nuance` | KI | nur wenn nötig (Gebrauchseinschränkung, Sprechebene, typische Fehlerquelle), ≤ 60 Zeichen, sonst `null` |
| `hanja` | Inventar + KI | §6.2 |
| `pos` | Inventar / KI | §5.4 |
| Audio | TTS | Wort **und** Satz über `baue-tts.mjs` in den Cache `v1/ko/<voice>/<sha256>.mp3` — dieselbe Stimme wie die App, damit der Cache trifft |

### 6.2 Hanja — Schutz vor Fehlzuordnung

- **Torwächter ist das Inventar:** Nur Wörter mit `hanja`-Feld in
  `topik1-woerter.json` (688 Stück) bekommen eine Hanja-Zeile. Die KI
  **wählt die Zeichen nicht** — sie bekommt sie vorgegeben und liefert je
  Zeichen nur deutsche Bedeutung und koreanische Lesung.
- **Plausibilitätsprüfung im Skript:** Zeichenanzahl = Silbenanzahl des
  sino-koreanischen Teils; die gelieferte Lesung muss silbenweise mit dem
  Wort übereinstimmen (학교 = 學校 → 학/교). Stimmt etwas nicht →
  `hanja = null`, Wort landet in `hanja_pruefen.json` für Franz.
- Wörter **ohne** Inventar-Hanja (auch native Homographen wie 배, 눈, 말)
  bekommen **nie** eine Hanja-Zeile. Lieber fehlend als falsch.
- Später erweiterbar auf die 30 Pool-Wörter außerhalb des Inventars
  (Stammabgleich 공부하다 → 공부 = 工夫) — nicht in dieser Umsetzung.

### 6.3 Ausführung

- **GitHub Action `vokabeln-anreichern.yml`**, manuell startbar
  (`workflow_dispatch`); Secrets ANTHROPIC_API_KEY, OPENAI_API_KEY,
  Supabase-URL + Service-Key **nur dort** (wie die Nacht-Workflows).
- Schritt 1: bestehende `ko`-Wörter — fehlende Felder (`de`, `nuance`,
  `hanja`, `pos`, ggf. `ex`, `inv_id`, `rang`) ergänzen, per Update
  einzelner Spalten (nie `en`/`ko` überschreiben; Sicherung
  `words_backup_v2` vorab).
- Schritt 2: **nächste 300** Inventarwörter (Rang-Reihenfolge, ohne
  Zahlen, ohne bereits vorhandene per `inv_id` und `ko`) → in `vorrat`
  einfügen, anreichern, `bereit = true`.
- Schritt 3: TTS für alle Wörter + Sätze aus 1 und 2 → `audio_ok = true`.
- Batches von 25 Wörtern je KI-Aufruf, JSON-Ausgabe, Validierung
  (Zielwort im Satz, Länge, Hanja-Prüfung); fehlgeschlagene Wörter
  bleiben `bereit = false` und stehen im Lauf-Protokoll.
- **Kosten (einmalig, geschätzt):** KI ≈ 1–2 € (≈ 530 Wörter),
  TTS ≈ 0,50 € (≈ 1 060 Clips). Danach Nachfüllen, wenn der Vorrat unter
  60 fällt (Action erneut starten; Hinweis in der App).
- **Sandbox:** Die Action kennt einen Parameter `profil` (`ko` oder
  `sb`); für den Test läuft sie zuerst mit `sb` und wenigen Wörtern.
- **Manuell hinzugefügtes Wort** (Bibliothek „+"): beim Speichern ruft die
  App die Trainer-Aktion `vokabelAnreichern` (ein Wort) — bei Erfolg
  sofort komplett, offline bleibt es ohne Extras und wird vom nächsten
  Action-Lauf nachgezogen. Manuelle Wörter sind sofort lernbar; die
  Anreicherung ist bei ihnen Schmuck, keine Voraussetzung.

---

## 7. Oberfläche

- **Review Erkennen:** Wort groß, Hanja-Chips, Audio-Knopf, Eingabefeld +
  Vorschlagsliste. Nach Antwort: Bedeutung mit Nuance-Punkt, Beispielsatz
  mit Audio, Bewertungsknöpfe.
- **Review Produktion:** `water (Wasser·)` groß, Eingabefeld koreanisch.
  Nach Antwort: Wort + Hanja + Satz + Audio.
- **Review Hören:** Lautsprecher-Symbol groß, Wiederholen-Knopf,
  Eingabefeld + Vorschlagsliste. Nach Antwort: wie Erkennen.
- **Heute:** Zeile „Neue Wörter 0/5" mit Schalter „Heute keine neuen
  Wörter"; Hinweis, wenn der Vorrat nicht bereit ist.
- **Bibliothek:** Suche wie gewohnt (koreanisch direkt, Englisch, Deutsch,
  Präfix zuerst, tippfehlertolerant — Suche darf tolerant sein, Prüfung
  nicht). Je Wort drei kleine Stufen-Punkte (Erkennen · Produktion ·
  Hören: leer / aktiv / gefestigt) und die Hanja-Zeile im Detail.
- **Statistik:** Zähler je Stufe (Wörter im Erkennen / mit Produktion /
  im Hören), Vorratsstand.
- Alles im bestehenden Bewegungs-System (transform/opacity), Bär & Hase
  unbewegt, iPhone 390×844 zuerst.

---

## 8. Sicherheit, Offline, Kosten

- Kein Secret im Frontend; Anreicherung nur in Action/Edge Function.
- Alle Tagesfunktionen laufen offline: Review, Vorschlagsliste
  (Bibliothek liegt lokal), Diff, Ritual mit lokal gecachtem Audio
  (Audio fehlt → Text). Die Einführung braucht **einmal** den Vorrat
  online — die nächsten 20 bereiten Wörter werden lokal gepuffert
  (`cacheKey`), dann geht auch das offline.
- Test-Schreibvorgänge: Die Sandbox `sb` ist eine Kopie der
  **deutschen** Seite — der Motor greift dort nicht. Geprüft wird
  deshalb so: Logik (FSRS, Auswahl, Prüfregeln) in Skript-Tests ohne
  Datenbank; die Oberfläche im Vorschau-Browser mit `?lang=ko` **nur
  lesend** (Karten anschauen, nichts bewerten, nichts einführen).
  Was der Anreicherungs-Lauf schreibt, ist keine Testausgabe, sondern
  die gewünschten Inhalte — mit `probe` vorher als Stichprobe.
  Migration 015 und den Action-Lauf startet Franz selbst mit Anleitung.

---

## 9. Etappen (Reihenfolge: meine Wahl)

| # | Inhalt | Warum hier | Franz' Handgriff |
|---|---|---|---|
| **E2 Fundament + Pipeline** | Migration 015; `baue-tts.mjs` für Wort + Satz; Action `vokabeln-anreichern.yml` (Schritte 1–3, Hanja-Prüfung, Protokoll, Profil-Parameter); Trainer-Aktion `vokabelAnreichern`; Wortarten-Bericht der nächsten 300 | Inhalte brauchen Laufzeit und Franz' Start — laufen, während ich E3/E4 baue. Ohne bereite Wörter kann nichts eingeführt werden | Migration ausführen, Action starten (erst `sb`, dann `ko`), Trainer deployen |
| **E3 Auswahl + Ritual** | Vorrat-Auswahl (§5.3) mit Doppel-Prüfung statt `nextFromPool`; Tageszahlen 5/130/100; Schalter; Einführungsritual (§4) mit Fokus-Regel, Hanja-Chips, Nuance-Blase; Kurz-Wiederholung | Erste sichtbare Frucht: neue Wörter kommen richtig | keiner |
| **E4 Prüfung** | Vorschlagsliste Erkennen; exaktes Tippen + Jamo-Diff Produktion; Fokus-Regel im Review; Hanja/Nuance auf allen Karten | Baut auf den Feldern aus E2 auf | keiner |
| **E5 Lebenslauf** | Produktions-Warmstart (§2.3); Hör-Verwandlung (§2.4) mit Audio-Karte, Fehlerzähler, Fallbacks | Braucht E4 für die Hör-Karte | keiner |
| **E6 Bibliothek + Statistik** | Stufen-Punkte, Detail mit Hanja, Zähler, Vorratsstand-Hinweis; `koreanPool.js` entfernen | Abschluss, Sichtbarkeit | keiner |

Jede Etappe: Sandbox-Prüfung (`?lang=sb`), Build, Commit + Push, kurzer
Bericht mit Strg+F-Selbstchecks für die Handgriffe.

---

## 10. Entscheidungs-Log (Kurzform)

- 93 % Ziel und Barely-Deckel nur `ko`.
- Englisch bleibt Hauptanker, Deutsch in Klammern; Nuance als tippbarer Punkt.
- Vorschlagsliste: nur eigene Bibliothek, en + de, ab 2. Zeichen, ≤ 5,
  **nur richtiges Antippen zählt**, kein Fuzzy/Alias.
- Produktion: exakt, Jamo-Diff, Tastatur manuell.
- Fokus-Regel: beim Tippen alles weg außer Übersetzung, auch Audio.
- Hör-Verwandlung: ab stab ≥ 21, Stabilität halbiert, erster Hör-Termin
  ≤ 7 Tage, **kein Tageslimit**, Prüfung lazy bei der Wiederholung.
- Quelle TOPIK-Inventar nach Rang, **ohne Zahlwörter**, Pflicht-Doppel-
  prüfung gegen Bibliothek; keine Anti-Verwechslung, kein Familien-Bonus;
  Rotation nach Prozent-Bericht (nächste Iteration).
- Hanja nur mit Inventar-Torwächter + Lesungsprüfung.
- Ritual: kein Raten, 10 s bis „Jetzt schreiben", Beispielsatz prominent,
  Inhalte vorab für alle bestehenden + nächste 300 inkl. TTS.
- Mengen 5 / 130 / 100 + manueller Schalter.
- Abend-Check und Sitzungs-Leiter: noch nicht.
