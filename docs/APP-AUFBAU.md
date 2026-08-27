# App-Aufbau — freiwillige Modi & Navigation

> Konzept (28.08.2026). Zwei Fragen: Welche freiwilligen Modi baut
> die App (multimodal, aber Qualität vor Quantität), und wie ist
> alles angeordnet, damit 해인 jedes Feature ohne Erklärung findet?
> Das VISUELLE Design (Farben, Typografie, Feinschliff) macht Franz
> später mit Claude Design — hier geht es um Struktur, Anordnung
> und Bedienlogik, an denen das Design andocken wird.

---

## 1. Die freiwilligen Modi (Kür neben der Tagesration)

Auswahlprinzip aus dem Lernkompass: nur Modi mit belastbarer
Evidenz UND geringem Betriebsrisiko; drei Modalitäten abgedeckt
(Hören, Lesen, Schreiben); wenige exzellente Typen statt vieler
halber. Sprechen läuft weiter über den Trainer (Sprachnachrichten
folgen dort laut Roadmap).

### 1.1 Hören-Studio 🎧 *(zuerst bauen — Infrastruktur existiert)*
Zwei Übungsformen, gemischt in kurzen Runden (~2 min):
- **Diktat:** Satz aus dem eigenen Bestand hören (Cache-Audio!),
  tippen, Zeichen-Diff zeigt Treffer. Evidenz: signifikante
  Hörverstehens-Gewinne; trainiert bei Koreanisch nebenbei die
  Lautwandel-Schreibung.
- **Minimal-Paare:** „Welches Wort hörst du?" — 달/탈/딸, 어/오
  (Franz) bzw. f/p, ö/o, ü/u, Silben-Cluster (해인), mit MEHREREN
  Cloud-Stimmen (der HVPT-Wirkfaktor, Meta-Analyse g≈0,9).
  Kuratierte Kontrast-Sets im Repo, kein Live-LLM.
Ergebnisse fließen als Belege ins Wissensmodell (Wort gehört ≠
Wort gelesen — zählt als eigener Kanal, konservativ gewichtet).

### 1.2 Speed-Runde ⚡ *(winzig zu bauen, großer blinder Fleck)*
60–90 Sekunden, NUR sichere Wörter, Timer, Trefferzähler.
Nations „Fluency Strand": 25 % der Lernzeit sollte flüssiger
Abruf von Bekanntem sein — fast alle Apps bieten 0 %. Macht reife
Karten wieder attraktiv, ohne das SRS zu stören (Speed-Ergebnisse
ändern KEINE Intervalle — Tempo-Druck verfälscht die Bewertung).

### 1.3 Lese-Ecke 📖
Kurze Geschichten (~100 Wörter) exakt auf Niveau: bekannter Stoff
plus ~5 neue Wörter, wöchentlich im Batch erzeugt und validiert
(Whitelist, Sprechebene, Längen). Jedes Wort antippbar → Bedeutung
→ ein Tipp = Karte (der Lookup→SRS-Kreislauf aus der
Marktanalyse). 1–2 Verständnisfragen als Abschluss. Dazu kuratierte
Links (Nicos Weg für 해인, Comprehensible-Korean-Kanäle für Franz)
— verlinken statt nachbauen.

### 1.4 Schreib-Studio ✍️
Das Mikro-Tagebuch: täglicher kleiner Impuls („Was hast du heute
gegessen?"), 2–3 Sätze frei schreiben, Claude korrigiert FOKUSSIERT
(max. 3 Muster, mit Ein-Zeilen-Warum — die Schreibkorrektur-Evidenz
ist die stärkste der ganzen Recherche, g≈0,7). Fehler fließen in
die Fehler-Muster des Wissensmodells. Keine Partner-Pflichten;
Teilen bleibt optional für später.

### Bewusst NICHT (v1)
Aussprache-Scoring (frustriert nachweislich durch Fehlalarme),
Video/visuelle Inhalte (Franz: verzichtbar), Vokabel-Bildchen
(nur für konkrete Nomen belegt — später als Emoji-Schicht),
weitere Spielarten vor Bewährung der vier oben.

**Baureihenfolge:** Hören-Studio → Speed-Runde → Lese-Ecke →
Schreib-Studio. Jeder Modus einzeln nutzbar, jeder speist das
eine Wissensmodell (Zielbild-Kreislauf).

---

## 2. Navigation — „drei Verben, drei Tabs"

### 2.1 Der Kodex (woran sich alles messen lässt)
Aus iOS-Praxis (Human Interface Guidelines) und den Grundregeln
sleeker Apps destilliert:
1. **Ein Satz pro Tab.** Kann man einen Tab nicht in einem
   Alltagssatz erklären, ist er falsch geschnitten.
2. **Eine Hauptaktion pro Bildschirm**, visuell dominant.
3. **Max. 2 Ebenen tief**, Zurück immer oben links, nie Sackgassen.
4. **Progressive Enthüllung:** Details erst auf Anfrage
   (Info-Panels, aufklappen), Startbildschirme atmen.
5. **Daumen-Zone:** Alles Häufige in der unteren Bildschirmhälfte.
6. **Kein Scrollen auf Einstiegs-Bildschirmen** — Kacheln statt
   Listen; scrollen dürfen nur Inhalte (Bibliothek, Chat, Texte).
7. **Vorgänge sind heilig:** Läuft etwas (Chat, Ration, Übung),
   verschwindet die Tab-Leiste — ein Fokus, ein Ausgang.
8. **Keine toten Knöpfe.** Gesperrtes erscheint nur mit konkretem
   „bald"-Versprechen, sonst gar nicht.

### 2.2 Die Ziel-Struktur: 3 Tabs statt 4

Das mentale Modell für 해인 — drei Verben:

**■ HEUTE** *(machen — der Pflichtteil)*
Eine Bildschirmhöhe, kein Scrollen: Begrüßung + Streak/Wochen-
Zeile, dann EINE dominante Karte: **„Heute (≈10 min)"** mit
Fortschritts-Häkchen (Karten ✓ → 3 Wörter → Aufgaben-Block) und
einem großen Start-Knopf, der alles nacheinander abspult (der
Komponist aus dem Tagesaufgaben-Konzept). Darunter kompakt die
Fortschritts-Leisten. Zahnrad oben rechts → Einstellungen.

**■ ÜBEN** *(wollen — die Kür)*
Kachel-Gitter ohne Scrollen: **Trainer** (die große Kachel oben,
volle Breite — das Herzstück verdient die Bühne), darunter 2×2:
Hören-Studio, Speed-Runde, Lese-Ecke, Schreib-Studio. Der
Einheiten-Verlauf des Trainers wohnt in der Trainer-Kachel
(hineingehen → Modi + Verlauf).

**■ WISSEN** *(nachschlagen — das Nachschlagewerk)*
Bündelt, was heute auf zwei Tabs verstreut ist: **Wörter**
(die Bibliothek), **Themen-Blätter** (die Sets), **Mein
Grammatik-Stand** (die Skills-Seite samt Erzähl-Fenster und
Grammatik-Check). Einstieg als drei klare Bereichskarten, kein
Scrollen; gescrollt wird erst IN den Bereichen.

Ergebnis: Tab-Leiste mit 3 Zielen (Heute · Üben · Wissen) —
weniger als heute (4), obwohl VIER neue Modi dazukommen. Die
Sprachumschaltung (Flagge) bleibt in der Begrüßung; Login/Backup/
Limits/Kalibrierung-wiederholen ziehen in die Einstellungen.

### 2.3 Selbsterklärend für 해인 — die konkreten Mittel
- Jede Kachel: Emoji + Name + EIN Untertitel-Satz, was passiert
  („Hören-Studio — kurze Hör-Runden, 2 Minuten").
- Beim ERSTEN Öffnen eines Modus: ein einziger Erklär-Bildschirm
  (3 Zeilen + Los-Knopf), danach nie wieder.
- Zustände sprechen: erledigte Tagesration feiert kurz und zeigt
  „Fertig für heute ✓" statt weiter zu fordern.
- Alles Text über i18n — beide Sprachen von Anfang an.

### 2.4 Umbau-Weg (Umzug, kein Neubau)
1. Mit dem Komponisten (Tagesaufgaben §8) entsteht die
   Heute-Karte — der Home-Bildschirm wird dabei entrümpelt.
2. „Üben"-Tab ersetzt den Trainer-Tab (Trainer wird erste Kachel),
   neue Modi docken nacheinander an.
3. „Wissen" verschmilzt Bibliothek + Sets + Grammatik-Stand;
   der Sets-Tab entfällt.
4. Einstellungen-Seite (Zahnrad) sammelt die Streu-Funktionen
   (Abmelden aus dem Kalender, Kalibrier-Fenster, Wortlimit,
   „Neue Version"-Anzeige).
Claude Design bekommt danach eine stehende Struktur mit klaren
Bausteinen — Farben und Feinschliff obendrauf, ohne Umgraben.
