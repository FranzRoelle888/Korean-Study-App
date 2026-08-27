# Wissensmodell & Kalibrierung — rückwärts gedacht

> Konzept-Dokument (27.08.2026). Beantwortet: Welche Aufgabentypen kommen,
> welche Kenntnisstand-Daten braucht jeder davon, und wie kommen wir
> systematisch an das echte Sprachlevel? Entscheidungen von Franz sind
> eingearbeitet (konservative Einstufung, KI-Intuition vor perfektem
> Kartenstapel, Frei-Erzählen als Dauerkanal).

## 1. Rückwärts: Aufgabentypen → benötigte Daten

| Aufgabentyp (Stufe) | Braucht vom Wissensmodell |
|---|---|
| Szenario-Chat mit Ziel (A) | Vokabel-Stufen ✓, Grammatik-Liste ✓, Fehlermuster ✓, zuletzt Gelerntes ✓, **grobe Niveau-Einschätzung** (neu) |
| Lückentext (A) | **Bekannt-Wortliste als Whitelist** (neu, groß), wacklige Wörter ✓, **Grammatikpunkt-Status** (neu) |
| Grammatik-Modus (A) | **kanonisches Grammatik-Inventar mit Status je Punkt + „was kommt als Nächstes"** (neu) |
| Diktat / Shadowing (B) | Bekannt-Wortliste (wie Lückentext), sonst nichts |
| Minimalpaare (B) | nichts Personenbezogenes (feste Kontrast-Sets je Muttersprache) |
| Speed-Runde (C) | sichere Wörter ✓ |
| Neue-Wörter-Warteschlange (C) | **häufigkeitssortierte Unbekannt-Liste** (neu = Nebenprodukt der Kalibrierung) |
| Can-do-Szenarien (F) | Can-do-Status (grob reicht lange) |

**Ergebnis:** Es fehlen genau DREI Datenarten — alles andere existiert schon:
1. **Wortschatz-Abdeckung** über die offiziellen Listen (bekannt/unbekannt je Eintrag)
2. **Grammatik-Status über einem kanonischen Inventar** (nicht nur freie Texte)
3. eine **kompakte Niveau-Einschätzung** für die Trainer-Intuition

## 2. Die drei Quellen der Wahrheit (Triangulation)

Kein einzelner Test trifft das echte Level. Das Modell speist sich dauerhaft
aus drei Quellen, die sich gegenseitig korrigieren:

1. **Selbstauskunft** (Kalibrierung, Frei-Erzählen) — schnell, grob, START-WERT.
   Konservativ ausgelegt: „halb gewusst" zählt als NICHT gewusst (Entscheidung
   Franz — man wäre allein nicht auf das Wort gekommen).
2. **Verhalten** (läuft automatisch, für immer): SM-2-Ergebnisse je Karte,
   Korrekturdichte im Trainer, Übungsergebnisse je Grammatikpunkt.
   Selbstauskunft wird hierdurch laufend geerdet — Überschätzungen fliegen
   von selbst auf (gelegentliche Stichproben „gewusster" Wörter im Stapel).
3. **Gezielte Nachfrage**: Die KI darf im Kalibrier-Gespräch und im Trainer
   nachbohren („Vergangenheit — auch bei 듣다?").

## 3. Grammatik und Vokabeln: GETRENNT abfragen

Entscheidung: nicht gleichzeitig, weil die Methoden verschieden sein müssen.

- **Vokabeln → Wischen.** Selbstauskunft funktioniert bei Wörtern gut.
  Häufigkeitssortierte Stichproben-Bänder, Abbruch wenn Trefferquote < ~50 %.
  Rechts = „kenne ich sicher", links = alles andere (konservativ).
- **Grammatik → Beispielsätze, NICHT Fachbegriffe.** Niemand soll
  „attributive Endung" einordnen müssen. Stattdessen: ein Beispielsatz, der
  das Muster zeigt („어제 카페에 **갔어요**" / „Ich **habe** Pizza
  **gegessen**") und die Frage „Könntest du so einen Satz selbst bilden?
  ja / nein". ~20–30 Punkte in kanonischer Reihenfolge, mit Sprung-Logik
  wie beim Wischen.
- **Can-do → 8–10 Fragen** ganz am Anfang (liefert die Startposition für
  beide Abfragen).

## 4. Das Frei-Erzähl-Feld wird zum DOSSIER (Dauerkanal)

Weil außerhalb der App gelernt wird, ist Frei-Erzählen kein Einmal-Schritt,
sondern der wichtigste Pflege-Kanal. Bauweise:

- Eingabe wie beim bestehenden Grammatik-Flow (Text/Foto → KI strukturiert
  → Bestätigung). NEU: Die KI stellt bei Unklarheit 1–2 RÜCKFRAGEN, bevor
  sie vorschlägt — das schärft die Intuition mehr als jede Liste.
- Erkenntnisse landen doppelt: (a) strukturiert (Skills auf Inventar-Punkte
  gemappt, Wörter als Karten), (b) im **Lernstand-Dossier**: ein kurzer,
  von der KI gepflegter und vom Nutzer EINSEHBARER und BESTÄTIGTER
  Absatz („Franz kennt ~X der TOPIK-I-Wörter, sicher: …, Baustellen: …,
  lernt gerade außerhalb: …"). Dieses Dossier geht in jeden Trainer-Prompt —
  DAS ist die „Intuition der KI" in konkret.

## 5. Datengrundlage (muss zuerst gebaut werden)

- **Vokabel-Inventare:** TOPIK-I-Liste (~1.700, Koreanisch) und
  Goethe A1+A2 (~1.300, Deutsch) als kuratierte Dateien im Repo:
  Eintrag = Wort, Übersetzung, Häufigkeitsrang, Themen-Tag.
  Erzeugung per Batch-Skript aus den öffentlichen Listen; Stichproben-
  Prüfung: 해인 prüft die koreanische, Franz die deutsche.
- **Grammatik-Inventare:** TOPIK-I-Grammatikpunkte (~85) und GER-A1/A2-Kanon
  (~60) als Dateien: Punkt = ID, Kurzname, 2 Beispielsätze, kanonische
  Reihenfolge, Voraussetzungen. Gleiche Prüfung.
- **DB:** neue Tabelle `inventory_status` (profile, item_id, kind
  wort|grammatik, status sicher|wackelig|unbekannt, source
  kalibrierung|uebung|dossier, updated_at). Die Inventare selbst bleiben
  statisch im Repo (kein DB-Ballast). `skills` bleibt für freie Einträge
  und bekommt optional eine Zuordnung zu Inventar-IDs.

## 6. Reihenfolge der Umsetzung

1. **Inventare bauen** (Datenarbeit, kein UI-Risiko) + Partner-Prüfung.
2. **Trainer-Prompt-Upgrade** parallel (Recycling, gestufte Korrektur —
   unabhängig von allem hier).
3. **Kalibrier-UI** (Can-do → Wischen → Grammatik-Sätze → Erzähl-Abschluss),
   erst nach Freigabe des Konzepts durch Franz und NACHDEM klar ist, dass
   Lückentext/Grammatik-Modus genau diese Daten konsumieren.
4. **Dossier + Rückfragen** im Kalibrier-Fenster.

## Leitplanken (Franz, 27.08.2026)

- Lieber KI-Intuition stärken als perfekten Kartenstapel füllen.
- Konservativ einstufen; doppelt gelernt ist gefestigt, nicht verschwendet.
- Kalibrierung ist Startwert, kein Urteil — das Verhalten korrigiert.
- Erst Klarheit über die Folge-Features, dann die echte Abfrage durchführen.
