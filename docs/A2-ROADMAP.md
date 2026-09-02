# A2-Sprint — Roadmap bis zur Goethe-Prüfung

**Ziel:** 해인 besteht das Goethe-Zertifikat A2 (Seoul, in ~55 Tagen).
**Bestehens-Anatomie:** 60/100 gesamt, schriftlich ≥ 45/75, Sprechen ≥ 15/25 (K.o.!).
**Arbeitsweise:** Vor JEDEM Aufgabentyp wird das Konzept gemeinsam haargenau
durchgearbeitet (Franz gibt Go), erst dann wird gebaut. Jede Übung bewertet
nach echtem Goethe-Maßstab und schreibt Belege für den Schwächen-Radar.
Quelle Prüfungsformat: A2_Uebungssatz_Erwachsene.pdf (goethe.de/a2).

---

## Phase 0 — Fundament (Woche 1)

- [x] **Franz:** Migration `011-fsrs.sql` im Dashboard ausführen (FSRS + review_log)
- [x] **Franz:** Function-Deploy-Check (Strg+F `MISSPELLING` im trainer-Editor)
- [x] Vokabel-Zahlen nur für de-Profil: 5 neue/Tag, Wiederhol-Deckel 80
- [x] **„Kenn ich schon"-Knopf** bei neuen Vokabeln: bucht als angelernt
      (Wiedersehen ~1 Woche), zählt nicht auf die 5, zieht sofort nach
- [x] Nachziehstapel de: priorisiert aus der **Goethe-A2-Wortliste** ziehen
- [x] **Menü der de-Seite komplett auf Deutsch** (passives Mitlernen)
- [x] **iPad Air 4 + iPhone 14**: Tablet-Breakpoint, beide Orientierungen,
      Preview-Verifikation 390×844 / 820×1180 / 1180×820
- [x] **A2-Reiter** (neuer Tab, nur de): Gitter aller Aufgabentypen, oben der
      Schwächen-Radar; Artikel-Swipe zieht hier ein
- [x] **Lernblatt-Infrastruktur**: ⓘ-Knopf-Rahmen + Blatt-Format (Repo-Dateien
      wie Lektionen; beim ersten Öffnen automatisch)
- [x] **Beleg-Schema Prüfungsteile** (exam-Belege je Modul/Teil in der DB) —
      Grundlage für Radar & Empfehlungen

## Phase 1 — Die billigsten Punkte (Woche 1–2)

- [x] **SMS/E-Mail-Training** (Schreiben T1+T2): 3 Leitpunkte, Wortzähler,
      du/Sie-Register, A–E-Bewertung nach Original-Raster, Punkte /20.
      Stufen: Hilfe-Chips → frei → mit Uhr. (Konzept-Runde vor Bau!)
- [x] Lernblatt „Schreiben": Anrede/Gruß-Formeln, Leitpunkt-Checkliste,
      typische A2-Fehler, die Goethe verzeiht vs. bestraft
- [x] **Redemittel-Drill**: 7 Pakete à 7 Formeln — Kennenlern-Runde →
      Situations-Blitz → Lücken-Stufe; Paket-Bibliothek zum Nachschlagen

## Phase 2 — Hören (Woche 2–3, härtestes Modul)

- [x] **Hörverstehen-Übung** in den 4 Goethe-Formaten (MC / Bild-bzw.
      Text-Zuordnung / Ja-Nein), Einmal-Hören für T2/T3 nachgebildet
- [x] ~~Franz-Aufnahme-Tool~~ ENTFÄLLT (Entscheidung Franz 03.09.:
      KI-Stimmen sind gut genug, Hör-Übungen sind Wegwerf-Content —
      der Einsprech-Aufwand lohnt nicht)
- [x] **Zahlen-Diktat**: Uhrzeiten/Preise/Daten/Gleise nach Gehör tippen

## Phase 3 — Sprechen (Woche 3–4, K.o.-Hürde)

- [x] **Aufnahme-UI + STT-Anbindung** (speech-Function kann es schon)
- [x] **Fragen-Spiel** (T1): Stichwortkarte → Frage einsprechen; Start 20 s,
      Prüfungstempo-Stufe 10 s; Fragetyp-Vielfalt wird getrackt
- [ ] **Monolog-Training** (T2): Themenkarte + 4 Stichworte, ~1 min sprechen,
      Transkript + Kriterien-Feedback + Zusatzfrage
- [ ] **Partnergespräch** (T3): Sprach-Dialog mit Chatbot-Partner (spielt auch
      wortkarge/dominante Partner), Pflicht-Redemittel, Einigung als Ziel
- [x] **Aussprache-Shadowing**: TTS-Satz → nachsprechen → Vergleich anhören
      (ehrliche Grenze: keine KI-Note auf Aussprache; Franz hört gegen)

## Phase 4 — Lesen & Baukasten (Woche 4–5)

- [ ] **Satzumbau-Baukasten**: Blöcke ziehen; feste Stufenleiter (Verb Pos. 2 →
      Inversion → Verbklammer → trennbare Verben → Nebensätze → Fragen),
      Aufstieg ab ~8/10, Stufen-Einführung im Studio-Stil
- [ ] **Leseverstehen** in den 4 Formaten, Niveau-Anstieg bis Goethe-A2,
      Distraktoren-Training als explizites Ziel
- [ ] **Anzeigen-Detektiv** (T4 mit „X = keine Lösung"-Falle)

## Phase 5 — Ernstfall (ab Woche 5, wöchentlich)

- [ ] **Modul-Simulation** unter Echtzeit (Lesen/Hören 30 min, Schreiben 30 min,
      Sprechen komplett) mit echter Punktzahl
- [ ] **Schwächen-Radar + Prognose** auf ihrer Startseite: …/25 je Modul,
      Tages-Empfehlung = schwächster Teil zuerst
- [ ] **Zwei-Schichten-Modell umsetzen** (Beschluss 03.09.): Pensum bleibt
      ≤ 15 min und offline-fest (Vokabeln + Tages-Mini); der A2-Reiter
      bekommt Prüfungs-Countdown + Radar-Tagesempfehlung als sichtbare,
      aber freiwillige zweite Schicht (Session-Richtwert 20–40 min)

## Bewusst verschoben

- Design-Überholung (Franz: „aktuell nicht Vorrang")
- ko-Seite-Features (Partikel-Tipp, Dojo-Umbau) — nach der Prüfung
- Persönliche FSRS-Eichung (braucht ~2 Monate review_log)

## Entscheidungs-Log (Auszug)

- 02.09.: Prüfungs-Pivot beschlossen; App-Fokus für 55 Tage = A2-Sprint für 해인.
- 02.09.: Partner in der Prüfung = i. d. R. anderer Prüfling, individuelle
  Wertung; Chatbot-Partner trainiert Gespräch-Tragen.
- 02.09.: Bewertung strikt nach Goethe-Rastern (A–E, Leitpunkte, Register,
  Wortzahl-Nullregel) — keine hausgemachten Maßstäbe.
- 03.09.: Zwei-Schichten-Modell: Das tägliche Pensum bleibt klein, heilig
  und offline-fest (Streak hängt NUR daran); A2-Training ist eine
  eigenständige, freiwillige Session-Schicht, gesteuert über Radar +
  Prüfungs-Countdown. A2-Übungen kommen NICHT ins Pflicht-Pensum.
- 03.09.: Sandbox-Profil ?lang=sb für folgenfreie Tests (Franz testet nie
  mehr auf Haeins echtem Konto).
