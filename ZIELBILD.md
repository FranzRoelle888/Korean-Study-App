# Zielbild — Koreanisch/Deutsch-Lernwerkzeug für Franz & 해인

> Dieses Dokument ist der Nordstern des Projekts. Jede Design-, Feature- und
> Code-Entscheidung wird gegen dieses Zielbild geprüft. Es basiert auf dem
> Forschungsbericht „Lernkompass" (August 2026) und den gemeinsamen
> Entscheidungen mit Franz. Änderungen am Zielbild sind erlaubt und erwünscht —
> aber bewusst, nie beiläufig.

---

## 1. Leitidee

**Das beste persönliche Sprachlern-Werkzeug für genau zwei Menschen:**
Franz (Deutsch, lernt Koreanisch, A1–A2) und 해인 (Koreanisch, lernt Deutsch,
A1–A2), ein Paar. Kein Produkt, kein Markt, keine Skalierung — dafür ein
Anspruch: so gewissenhaft gebaut wie eine echte App, aber kompromisslos auf
diese zwei Lernenden zugeschnitten.

**Der eine Satz, der alles ordnet:**
Die App führt pro Person **ein Wissensmodell** (welche Wörter sitzen, welche
wackeln, welche Grammatik ist bereit, welche Fehler wiederholen sich) —
**jedes Feature liest aus diesem Modell und schreibt in dieses Modell.**
Ein Datenkreislauf, nicht viele Features.

**Der Prüfstein für jede neue Idee** (aus der Selbstbestimmungstheorie):
Dient sie *Autonomie* (selbst wählen), *Kompetenz* (Können sichtbar machen)
oder *Verbundenheit* (das Paar) — und füttert sie den Kreislauf?
Wenn nein: weglassen.

### Anti-Ziele (bewusst NICHT bauen)

- Keine XP, Punkte, Münzen, Abzeichen, Level — erwartete Belohnungen
  untergraben nachweislich die innere Motivation.
- Keine Ranglisten — sozialer Vergleich schadet in Langzeitstudien; eine
  Rangliste für zwei Menschen, die sich ein Bett teilen, wäre absurd.
- Keine Schuld-Benachrichtigungen, kein Streak-Terror — ein verpasster Tag
  schadet der Gewohnheitsbildung nicht (Lally 2010), die App behandelt ihn
  auch so.
- Keine nachgebauten Inhalte-Bibliotheken — Spitzen-Inhalte (Nicos Weg,
  Easy German, Comprehensible Korean) werden verlinkt und beerntet, nie kopiert.
- Kein Feature, dessen Zweck Bindung statt Lernen ist.

---

## 2. Die Nutzer und ihr Rahmen

| | Franz | 해인 |
|---|---|---|
| Lernt | Koreanisch | Deutsch |
| Kann schon | Englisch, Deutsch | Koreanisch, Englisch |
| Menüsprache | Englisch | Koreanisch |
| Niveau | zwischen A1 und A2 | zwischen A1 und A2 |
| Gerät | iPhone (PWA am Homescreen) | iPhone (PWA am Homescreen) |
| Alltag | eingespannt | eingespannt |

Konsequenzen:
- **iPhone-first, immer.** Desktop ist Nebensache. Alles wird bei 390×844 entworfen und getestet.
- **Tagesration ≈ 10 Minuten** (Entscheidung Franz, 27.08.2026): fällige
  Karten + eine kleine Wechsel-Aufgabe. Alles darüber ist freiwillig.
  Die Forschung ist eindeutig: klein und täglich schlägt groß und selten.
- **Nichts Bekanntes wiederholen:** Beim Einstieg (beide sind keine
  Null-Anfänger) kalibriert die App das Wissensmodell, statt bei „Hallo"
  anzufangen (→ §4 Kalibrierung).
- Beide sind füreinander **Muttersprachler der Zielsprache des anderen** —
  das Tandem ist der strukturelle Trumpf gegenüber jedem kommerziellen
  Produkt und bekommt eine eigene Feature-Schicht (→ §5.6).

---

## 3. Lehrmethoden-Prinzipien (forschungsgestützt, bindend)

Kurzfassung des Lernkompass — diese Regeln gelten für ALLE Features:

1. **Alles ist ein Abruf, nichts ist eine Anzeige.** Testeffekt (g ≈ 0,5–0,6).
   Ziel-Erfolgsquote 80–90 %; wer öfter scheitert, bekommt leichtere
   Zwischenstufen (Wiedererkennen vor Erinnern vor Tippen).
2. **Verteilt, nicht geblockt.** SM-2 bleibt; Rückstau wird nach Pausen
   automatisch über mehrere Tage verteilt (Rückstau-Gnade) statt als Wand
   präsentiert.
3. **Erst blocken, dann mischen.** Neue Themen geblockt einführen, danach
   Aufgabentypen innerhalb einer Runde mischen (Interleaving).
4. **Raten vor Aufdecken.** Neue Wörter im Satz zeigen, Bedeutung raten
   lassen, dann auflösen (Generierungseffekt — Fehler schaden nicht).
5. **Produktiv gewinnt mit der Reife.** Junge Wörter rezeptiv (L2→L1),
   reife produktiv (L1→L2, getippt). Chunks („Ich hätte gern…", 주세요)
   sind vollwertige Karten.
6. **8–10 Begegnungen pro Wort.** Der Trainer webt die zuletzt gelernten
   Wörter gezielt in Gespräche ein (Recycling-Auftrag im Prompt).
7. **Explizite Grammatik schlägt Mitlernen** (d ≈ 1,13 vs. 0,54) — besonders
   für unauffällige Formen: Artikel, Partikeln, Endungen.
8. **Korrektur ist gestuft:**
   - Fehler in Grammatik, die auf der Skills-Liste steht → kurze Nachfrage,
     die zur Selbstkorrektur einlädt („Fast! der oder das Auto?").
   - Fehler oberhalb des Stands → leise umformulieren oder ignorieren
     (Processability: Unfertiges ist nicht korrigierbar).
   - Abschluss-Feedback → explizit, aber fokussiert: max. 3 Fehlermuster,
     je 1 Erklärsatz, je 1 Nochmal-Aufgabe.
9. **Aufgaben haben Ziel, Lücke, Gewinn-Moment.** Der Trainer hält geheime
   Informationen (Preise, Uhrzeiten), die man erfragen muss; die App prüft
   das Ergebnis. Davor: Mini-Vorbereitung (3 Wendungen). Wiederholung
   derselben Aufgabe ist ein Feature (Flüssigkeit!), kein Versagen.
10. **Hören/Sprechen sind gleichberechtigt.** Diktat, Minimalpaare mit
    mehreren Stimmen (HVPT), Shadowing, Sprachnachrichten im Trainer
    (Stimme verdoppelt fast den Lerneffekt von Chat-Trainern).
11. **Sprachpaar-Spezifika:**
    - Franz: 은/는 vs. 이/가 nur in Mini-Dialogen (nie Übersetzung);
      Trainer bleibt konsequent bei 해요체; Zahlensysteme nach Kontext
      drillen (Alter, Uhrzeit, Geld); Minimalpaare 달/탈/딸, 어/오.
    - 해인: Genus über Regel-Wochen (Köpcke/Zubin: 70–80 % regelhaft,
      -ung→die, -chen→das …); Substantive immer als „die Lampe, -n"-Chunk;
      Wortstellungs-Stufen respektieren („Gestern ich habe…" ist eine
      Durchgangsstufe); Kasus über Chunks („mit dem Bus"), nicht Tabellen;
      Minimalpaare f/p, ö/o, ü/u, Silben-Cluster.
12. **Fortschritt zeigt Können, nicht Aktivität:** Can-do-Meilensteine
    (GER-Statements als prüfbare Trainer-Szenarien), gereifte Wörter,
    TOPIK-I-/Goethe-Abdeckung. Kalender + Partner-Punkte bleiben.
13. **Streak mit Vergebung:** zählt nur bei lern-bedeutsamer Aktion;
    1–2 Frei-Tage/Monat; Paar-Streak („beide heute") als gemeinsames Gut
    mit geteilten Frei-Tagen.

---

## 4. Das Wissensmodell (Herzstück)

Pro Profil führt die App:

| Bestandteil | Inhalt | Gepflegt durch |
|---|---|---|
| **Wörter & Chunks** | SM-2-Zustand je Karte, Stufen sicher/wacklig/frisch, Richtungs-Reife (rezeptiv/produktiv), ⚠-Problemwörter | Karten-Reviews, Lookup→Karte, Trainer-Vorschläge |
| **Grammatik-Skills** | beherrschte Punkte + Notizen, Meister-Zähler (richtig/versucht mit Vergessens-Abschlag) | Erzähl-Flow (Text/Foto), LLM-Kalibrier-Fenster, Übungsergebnisse |
| **Fehler-Muster** | wiederkehrende Fehler aus Trainer-Einheiten und Übungen | Session-Summaries, Übungs-Auswertung |
| **Can-do-Stand** | abgehakte GER-Meilensteine (A1→B1), verknüpft mit bestandenen Ziel-Szenarien | Trainer-Bewertung |
| **Gedächtnis** | letzte ~5 Session-Zusammenfassungen (nicht volle Transkripte) | Trainer-Abschluss |

**Kalibrierung (Einstieg + laufend):**
1. **Einmalig beim V2-Start:** Schnell-Sortierung (kennen / kenne ich nicht)
   über Häufigkeits-/TOPIK-/Goethe-Listen als Wisch-Übung + Can-do-Selbst-
   einschätzung + freies Erzählen, was man schon kann.
2. **Laufend:** das **LLM-Kalibrier-Fenster in den Einstellungen** — freier
   Text („Ich hab im Urlaub gelernt…"), die KI strukturiert in Skills/Wörter,
   Bestätigung vor Übernahme (Mechanik existiert bereits im Grammatik-Flow).
3. **Automatisch:** jede Übung, jedes Gespräch aktualisiert Zähler und Stufen.

Die Zielinventare sind endlich und öffentlich: **TOPIK I** (~85–100
Grammatikpunkte, ~1.700 Wörter) für Koreanisch, **Goethe/GER A1–B1** für
Deutsch. Sie bilden den „Skill-Baum", gegen den Abdeckung angezeigt wird.
Eingescannte Lehrbücher ergänzen später selektiv (Inhaltsverzeichnisse +
Schlüsselkapitel, einmalige Batch-Pipeline — nie live in den Kontext).

---

## 5. Die Erlebnisse (Feature-Landkarte)

### 5.1 Heute (der eine Einstieg)
Die App **komponiert eine Tagesration** (~10 min): fällige Karten +
1 Wechsel-Aufgabe (Challenge / Mini-Hörübung / kurze Trainer-Runde).
Ein Knopf startet alles nacheinander — „wenige Klicks" heißt: *ein* Klick.
Alles Weitere (freies Gespräch, Speed-Runde, Sets …) bleibt sichtbar, aber
freiwillig. Erledigt = Streak-Tag, Partner sieht es.

### 5.2 Wörter & Karten
Bestehende Bibliothek + SM-2, erweitert um: Karten-Staffelung (§3.5),
Raten-vor-Aufdecken, Chunks als Karten, einstellbares Tageslimit (2–5,
Standard 2; drittes Wort angeboten, wenn der Stapel klein ist),
KI-Eselsbrücken auf Abruf für ⚠-Wörter, Speed-Runden (nur sichere Wörter,
Timer — Nations Fluency Strand), **Partner-Audio** (→ 5.6) auf der Rückseite.

### 5.3 Trainer (KI)
Vier Modi: Szenario (mit Ziel + geheimer Information + Erfolgs-Bedingung),
Freigespräch, Lückentext, Grammatik (TTMIK-Bogen: 1 Punkt → Beispieldialog
→ Übung). Dazu: gestufte Korrektur (§3.8), Vokabel-Recycling (§3.6),
Vorschlags-Knopf bei Schreibblockade (3 Antwort-Kandidaten auf Niveau),
Einheiten-Verlauf mit „Nochmal versuchen", Abschluss-Feedback, das direkt
neue Karten vorschlägt, **Sprachnachrichten** (Mikro → Whisper → Claude →
TTS), Blur-Hören (Nachricht erst hören, Text auf Tipp). Später: fortlaufende
Serien-Geschichte mit wiederkehrenden Figuren (nutzt das Session-Gedächtnis).

### 5.4 Hören & Aussprache
Cloud-TTS (OpenAI) mit Cache in Supabase Storage — jeder Satz wird einmal
erzeugt, mehrere Stimmen pro Sprache. Übungen: Diktat (hören → tippen),
Minimalpaare (zwei/drei Knöpfe, mehrere Stimmen), Shadowing (abspielen →
nachsprechen → selbst bewerten), 0,75×-Tempo überall.
Aussprache-Check ehrlich: „Hat Whisper dich verstanden?" — kein Phonem-Scoring.

### 5.5 Lesen & Schreiben (spätere Stufen)
Lesen: Text einfügen oder tägliche KI-Kurzgeschichte exakt auf Niveau
(bekanntes Material + ~5 neue Wörter, Partner liest gegen); jedes Wort
antippbar, ein Tipp = eine Karte; Verstehens-Prozent vorab.
Schreiben: Mikro-Tagebuch (2–3 Sätze), Claude korrigiert fokussiert,
Partner ergänzt „so würde ich das wirklich sagen" — auf Anfrage, nicht
ungefragt (Korrektur-Müdigkeit vermeiden).

### 5.6 Die Paar-Schicht (bewusst schlank — Entscheidung Franz, 27.08.2026)
Wegen Zeitverschiebung und um keinen Druck aufzubauen, gibt es vorerst
GENAU ZWEI Überschneidungen zwischen den Profilen:
- **Geteilter Streak-Kalender:** die bestehende Partner-Sichtbarkeit
  (Punkte, „schon fertig heute"), perspektivisch als Paar-Streak
  („beide haben heute geübt", geteilte Frei-Tage).
- **Partner-Aufnahmen:** Warteschlange der nächsten 200–300 Vokabeln des
  anderen, halten-zum-Aufnehmen, automatisch weiter — zwei Sofa-Abende.
  Clips in Supabase Storage, abgespielt auf Kartenrückseite und im Tageswort.

Zurückgestellt (Ideen-Speicher, erst wenn der Rest steht): Missionen,
Wochenrückblick, Partner-Korrektur-Pass im Tagebuch, gespiegelte
Konzept-Decks. Rahmung bleibt überall Einladung, nie Vergleich.

### 5.7 Einstellungen
Profil, Login, Tageslimit, Erinnerung (an Alltags-Auslöser gekoppelt,
selbst-ausschleichend, max. 1/Tag), LLM-Kalibrier-Fenster (§4),
CSV-Export, Avatar-Bilder.

---

## 6. Technik-Fundament

### 6.1 Stack (bleibt)
Vite + React (plain JS, kein TypeScript — Franz liest mit), GitHub Pages
(Auto-Deploy via Actions), Supabase (DB + Auth + Storage + Edge Functions),
localStorage als Offline-Puffer mit Retry-Queue. PWA am Homescreen.

### 6.2 Sicherheit & Zugriff (Entscheidung: Passwort-Login)
- Supabase **Auth** mit E-Mail + Passwort, Sitzung monatelang gültig.
  Genau zwei Konten (Franz, 해인); Registrierung deaktiviert.
- **RLS echt:** Policies binden Zeilen an `auth.uid()` statt `using (true)`.
  Profil-Zuordnung über eine `profiles`-Tabelle (uid → 'ko'/'de').
- Edge Functions: **Verify JWT AN**, Aufrufe mit dem Nutzer-Token.
- Partnerdaten-Lesen (Kalender, Aufnahmen) über gezielte Read-Policies.
- Der `sb_publishable`-Key bleibt der einzige Schlüssel im Client;
  Secrets (ANTHROPIC_API_KEY, OPENAI_API_KEY) leben nur in Edge-Function-
  Secrets bzw. GitHub-Actions-Secrets. **Niemals API-Keys im Frontend.**

### 6.3 KI-Dienste
| Dienst | Zweck | Kostenrahmen |
|---|---|---|
| Anthropic (claude-sonnet-*) | Trainer-Chat, Korrekturen, Summaries, Extraktion, Aufgaben-Generierung | 5 €/Monat Hard-Limit (besteht) |
| OpenAI | TTS (Stimmen) + Whisper (Spracherkennung) | Hard-Limit setzen; erwartbar < 2 €/Monat dank Cache |

**Token-Sparsamkeit als Architekturprinzip:**
- Prompt-Caching (besteht), Nachrichten-Kappung (besteht), Ratenlimit (besteht).
- **Aufgaben-Banken statt Live-Generierung:** Lückentexte, Minimalpaar-Items,
  Diktat-Sätze, Geschichten werden **nachts im Batch** vorproduziert
  (GitHub Action existiert), validiert (Skript-Checks + Partner-Stichprobe)
  und in der DB abgelegt. Live-Tokens nur fürs Gespräch.
- TTS-Audio wird gecacht: Hash(Satz+Stimme) → Storage; nie doppelt erzeugen.
- Gestern-ins-Heute: die eigenen Trainer-Sätze von gestern sind das
  Lückentext-Material von heute (persönlich, kostenlos, garantiert auf Niveau).
- `trainer_usage` protokolliert weiter alles → datenbasierte Modell-/Budget-
  Entscheidungen.

### 6.4 Bekannte Risiken & verifizierte Antworten (Machbarkeits-Ampeln)
- 🟢 Trainer-Kontext: Steckbrief + Gedächtnis passen bequem; kein Risiko.
- 🟢 Speicher: Texte trivial; 300 Audio-Clips ≈ 15–30 MB (Storage: 1 GB frei).
- 🟡 iOS-PWA-Spracheingabe: Web-Speech-API fällt aus (bekanntes Loch) →
  getUserMedia + Upload + Whisper (verifiziertes Muster).
- 🟡 iOS-speechSynthesis unzuverlässig → Cloud-TTS mit Cache (Entscheidung).
- 🟡 KI-Koreanisch: mittelgut versorgte Sprache → kurze gängige Muster,
  feste Sprechebene, kuratierte Banken für Gespeichertes, 해인 als
  Muttersprachler-Kontrolle. Deutsch: unkritisch.
- 🟡 LLM-Niveau-Drift → Vokabel-Whitelist (besteht) + Auffrischung pro Zug
  + Out-of-List-Zähler mit Regeneration.
- 🔴 Verbote: keine Live-Generierung in Massenpfaden, kein Feature, das den
  Streak von einem externen Dienst abhängig macht („Der Streak darf niemals
  an einem externen Dienst sterben") — Ausfall von KI/TTS degradiert immer
  sanft auf die Offline-Grundfunktionen.

### 6.5 Daten (Ziel-Schema, ergänzend zum Bestand)
Bestand: `words`, `cards`, `daily_log`, `skills`, `sessions`, `trainer_usage`.
Neu geplant: `profiles` (uid→profile), `chunks` (oder words.kind),
`exercise_bank` (Typ, Payload, Niveau-Tags, validated_by), `audio_cache`
(hash→storage-path), `recordings` (word_id, storage-path, von wem),
`cando` (statement_id, geschafft_am, session_id), `missions`,
`error_patterns`. Migrationsprinzip bleibt: additive SQL-Dateien, die App
verträgt fehlende Spalten (Schema-Toleranz).

### 6.6 Ziel-Dateistruktur (Repo)
```
CLAUDE.md               ← Arbeitsregeln & Philosophie (System-Prompt des Repos)
ZIELBILD.md             ← dieses Dokument
docs/                   ← Konzepte (Trainer, Recherche-Notizen, Entscheidungs-Log)
supabase/
  functions/trainer/    ← bestehende Edge Function
  functions/speech/     ← TTS + Whisper-Proxy (neu)
  migrations/           ← nummerierte SQL-Dateien (bisherige einsammeln)
src/
  app/                  ← App-Rahmen: Shell, Routing/Views, Tabbar, Theme
  core/                 ← Wissensmodell: storage, sm2, profiles, auth, sync
  features/
    today/              ← Tagesration-Komponist
    cards/              ← Review, Bibliothek, Tageswort
    challenges/         ← Zahlen/Artikel/Plural/Konjugation + neue Übungstypen
    trainer/            ← Chat, Modi, Skills, Verlauf
    listening/          ← TTS-Client, Diktat, Minimalpaare, Shadowing
    sets/               ← Themen-Blätter
    couple/             ← Paar-Streak, Aufnahmen, Missionen, Wochenrückblick
    settings/           ← Einstellungen inkl. Kalibrier-Fenster
  shared/               ← ClearableInput, Icons, i18n, tts, ui-Bausteine
scripts/                ← Batch-Pipelines (extras, Aufgaben-Banken, Buch-Import)
```
**Umzug, kein Neubau:** bestehender Code wird mechanisch in diese Struktur
verschoben (erprobte Fixes bleiben wörtlich erhalten), App.css wird pro
Feature aufgeteilt, App.jsx auf den Rahmen reduziert.

---

## 7. Ausbaustufen

Reihenfolge so gewählt, dass jede Stufe für sich nutzbar ist und die
nächste absichert. (Zeitangaben bewusst weggelassen — Takt bestimmt Franz.)

- **Stufe 0 — Fundament:** Dieses Dokument + CLAUDE.md. Restrukturierung
  (Umzug in Zielstruktur). Auth + echte RLS + JWT an. OpenAI-Konto + 
  speech-Function + TTS-Cache. Einstiegs-Kalibrierung beider Profile.
- **Stufe A — Trainer-Vollausbau:** Ziel-Szenarien mit Erfolgs-Bedingung,
  gestufte Korrektur, Vokabel-Recycling, Verlauf + Wiederholung, Lückentext-
  und Grammatik-Modus (aus Banken), Vorschlags-Knopf, Feedback→Karten.
- **Stufe B — Hören & Sprechen:** Diktat, Minimalpaare, Shadowing,
  Sprachnachrichten im Trainer, Blur-Hören.
- **Stufe C — Heute & Motivation:** Tagesration-Komponist, Streak-Vergebung
  + Rückstau-Gnade, Paar-Streak, einstellbares Wortlimit, Speed-Runden,
  Karten-Staffelung.
- **Stufe D — Paar-Schicht (schlank):** Partner-Aufnahmen; Paar-Streak-Ausbau.
  (Missionen/Wochenrückblick bewusst zurückgestellt.)
- **Stufe E — Lesen & Schreiben:** Reader mit Tipp→Karte, tägliche
  Mini-Geschichte, Mikro-Tagebuch mit Doppel-Korrektur.
- **Stufe F — Horizont:** Can-do-Checklisten als Fortschritts-Spine,
  TOPIK/Goethe-Abdeckungskarte, Wortfamilien (Sino-Bausteine), Regel-Wochen
  der/die/das, Serien-Geschichte. Rollout des Trainers für 해인 sobald
  bei Franz bewährt.

---

## 8. Entscheidungs-Log

| Datum | Entscheidung | Begründung |
|---|---|---|
| 27.08.2026 | Kein Green-Field-Rewrite; Umzug in Zielstruktur | Erprobte Fixes (Keyboard, Profiltrennung, Sync) nicht neu erkämpfen |
| 27.08.2026 | Login: E-Mail + Passwort, lange Sitzung | Kein Alltags-Störfaktor; Registrierung zu; echte RLS |
| 27.08.2026 | Stimmen & Spracherkennung: OpenAI (ein Konto) | TTS + Whisper aus einer Hand, einfache Konsole, Hard-Limit |
| 27.08.2026 | Tagesration ~10 Minuten | Voller Alltag; Forschung: klein & täglich schlägt groß & selten |
| 27.08.2026 | Aufgaben aus nächtlichen Banken, live nur Gespräch | Token-Sparsamkeit; Validierbarkeit; Partner-Stichproben möglich |
| 27.08.2026 | Kein Zweit-Account bei Anthropic; ggf. Workspace + Limit | Abo- und API-Töpfe sind ohnehin getrennt |
| 27.08.2026 | Paar-Schicht schlank: nur geteilter Kalender/Streak + Partner-Aufnahmen | Zeitverschiebung; kein Druck auf 해인; Rest in den Ideen-Speicher |
| 27.08.2026 | KEINE Partner-Prüfpflichten: niemand muss für den anderen Inhalte gegenchecken | Vertrauen in die KI; einzelne Vokabelfehler korrigiert das echte Leben. KI-Inhalte bleiben markiert (extras_auto), Korrektur bleibt MÖGLICH, wird aber nie zur Aufgabe |
| 27.08.2026 | Tägliche Off-Site-Sicherung ins private Backup-Repo (hohe Priorität, Franz) | Gratis-Supabase hat keine Auto-Backups; Schichten & Notfallplan: docs/DATENSICHERUNG.md |
| früher | Modell claude-sonnet-*, 5 €-Hard-Limit, 40 Aufrufe/h | Kosten-Disziplin; Log für datenbasierte Modellwahl |
| früher | Trainer-Gedächtnis = Zusammenfassungen, nicht Transkripte | schlank; Verlaufs-Feature zeigt Summaries (Transkript-Ablage offen) |
