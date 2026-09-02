# CLAUDE.md — Arbeitsregeln für dieses Repo

Persönliche Sprachlern-PWA für genau zwei Nutzer: Franz (lernt Koreanisch)
und 해인 (lernt Deutsch). **Der Nordstern steht in [ZIELBILD.md](ZIELBILD.md)** —
jede Feature- und Design-Entscheidung wird dagegen geprüft. Bei Widerspruch
zwischen einer Idee und dem Zielbild: Zielbild gewinnt oder wird bewusst
(im Entscheidungs-Log) geändert.

## Wer hier arbeitet

Franz ist Coding-Einsteiger und entwickelt alles im Dialog mit Claude
(„Vibecoding"). Konsequenzen:
- **Erklären gehört zum Liefern:** Bei jedem Schritt kurz sagen, was warum
  passiert — auf Deutsch, ohne Fachjargon-Gewitter.
- Kommentare im Code auf Deutsch, erklärend geschrieben (warum, nicht was),
  damit Franz mitlesen kann. Plain JS, kein TypeScript.
- Vor jedem Feature eine **ehrliche Machbarkeits-Einschätzung** liefern
  (Kontextgrößen, iOS-PWA-Löcher, Kosten). Wackelige Fundamente zuerst
  verifizieren, dann darauf bauen.

## Eiserne Regeln

1. **Keine Secrets im Frontend.** GitHub Pages liefert den Code öffentlich
   aus. Im Client steht nur der `sb_publishable`-Key. ANTHROPIC_API_KEY,
   OPENAI_API_KEY u. ä. leben ausschließlich in Edge-Function-Secrets oder
   GitHub-Actions-Secrets. Den geheimen Supabase-Key niemals anfordern.
2. **Keine Test-Löschungen/-Einträge gegen die Live-Datenbank.** Sie enthält
   echte Lerndaten. Wenn DB-Eingriffe nötig sind: vorher Snapshot + Franz
   fragen. Log-Tabellen (`trainer_usage`) sind von Test-Aufrufen ausgenommen.
3. **Der Streak darf niemals an einem externen Dienst sterben.** KI-, TTS-,
   Netz-Ausfälle degradieren sanft auf Offline-Grundfunktionen; das
   Tagespensum bleibt immer erfüllbar.
4. **Kosten-Disziplin:** Hard-Limits bei Anthropic (5 €/Monat) und OpenAI;
   Ratenlimit in den Edge Functions; Aufgaben nachts im Batch generieren,
   live nur das Gespräch; TTS-Audio cachen (Hash → Storage, nie doppelt).
5. **Keine XP, Ranglisten, Schuld-Nachrichten** — siehe Anti-Ziele im
   Zielbild. Fortschritt zeigt Können, nicht Aktivität.
6. **„Das Auge isst mit"** (Motto Franz, 02.09.): Info- und
   Erklärtexte immer schön formatiert — fette Überschriften,
   Nummern/Listen untereinander, lange Texte ausklappbar statt
   bildschirmfüllend.
7. **iPhone-first:** Entwerfen und verifizieren bei 390×844; 16-px-Schrift in
   Eingaben (iOS-Zoom); Safe-Areas beachten; Tastatur-Handling in
   src (fixierte Seite + visualViewport) nicht anfassen, es ist hart erkämpft.

## Arbeitsweise

- **Auto-Push:** Nach jeder funktionierenden Änderung committen und pushen
  (GitHub Pages deployt automatisch). Deutsche Commit-Messages, keine
  Rückfrage nötig.
- **Verifizieren vor Melden:** Build laufen lassen und im Browser-Preview
  (390×844, `?lang=ko` UND `?lang=de`) prüfen, bevor etwas als fertig gilt.
- **Edge Functions** deployt Franz von Hand im Supabase-Dashboard
  (Code aus `supabase/functions/<name>/index.ts` einfügen). Jede Änderung
  dort heißt: Franz braucht eine kurze Schritt-Anleitung. Änderungen an
  Functions deshalb bündeln.
- **Migrationen** sind additive SQL-Dateien; die App verträgt fehlende
  Spalten/Tabellen (Schema-Toleranz: optionale Spalten nur senden, wenn
  befüllt). Franz führt SQL im Dashboard aus — Anleitung mitliefern.
- **Profiltrennung ist heilig:** Jeder DB-Zugriff läuft über die
  `mine()`/`stamp()`-Helfer (Filter/Stempel auf `profile`), localStorage
  über `cacheKey()`. Die einzige dokumentierte Ausnahme ist das lesende
  `loadPartnerLog()` (und künftig gezielte Partner-Read-Policies).
- **Windows-Umgebung:** Node liegt in `C:\Program Files\nodejs` (nicht im
  PATH — in Bash exportieren). Keine Heredocs mit Backticks — Skripte per
  Write-Tool als .mjs anlegen und mit node ausführen. Datei-Anhänge nie per
  PowerShell `>>` (UTF-8-Doppelkodierung!), sondern per node fs.
  Groß-/Kleinschreibung kollidiert: nie zwei Dateien, die sich nur darin
  unterscheiden (deshalb heißt der API-Client `trainerApi.js`).
- **Musterlösungen einfach halten** (Franz, 04.09.): Jedes Vorbild
  (Muster-Text, Muster-Antwort, Korrektur-Vorschlag) nutzt nur
  A1/A2-Grammatik und Alltagswörter — einfach, aber gut und passend.
  Ein perfekter, wortgewandter Text, den die Lernerin nicht versteht,
  lehrt nichts. Im Trainer über den Prompt-Baustein `MUSTER_EINFACH`
  verankert — bei jeder neuen Aktion mit Mustern anhängen.
- **KI-generierte Lerninhalte:** Deutsch ist unkritisch; Koreanisch mit
  kurzen gängigen Mustern, fester Sprechebene (해요체) und kuratierten
  Banken für alles Dauerhafte. Was dauerhaft gespeichert wird, bekommt
  Validierungs-Checks und ist für Partner-Stichproben markiert
  (`extras_auto`-Muster beibehalten).

## Struktur

Ziel-Dateistruktur und Datenmodell: siehe ZIELBILD.md §6. Während der
Restrukturierung gilt: **Umzug, kein Neubau** — funktionierender Code wird
mechanisch verschoben, nicht neu geschrieben.
