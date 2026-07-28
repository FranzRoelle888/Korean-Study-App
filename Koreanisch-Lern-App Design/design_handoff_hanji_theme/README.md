# Handoff: Hanji-Theme für die Korean Study App

## Überblick
Neues visuelles Kleid für die bestehende Vokabel-Web-App (Repo `FranzRoelle888/Korean-Study-App`, Branch `main`): warmes Hanji-Papier statt kühlem Indigo-Grau, Taegeuk-Rot und -Blau als einzige Akzente, koreanische Motivik (Taegukgi im Header, Hanok-Tor als Home-Icon, Bergsilhouetten mit Schnee, Kiefern und Vogelpaar).

**Struktur, Flow und Bedienung bleiben unverändert.** Es werden keine Screens, Klickpfade oder Zustände hinzugefügt oder entfernt — die App soll weiterhin mit möglichst wenigen Taps bedienbar sein.

## Zu den Design-Dateien
Die beiliegende `Korean App Richtungen.dc.html` ist eine **Design-Referenz in HTML** — ein Prototyp, der Aussehen und Absicht zeigt, kein Produktionscode. Umgesetzt wird das Design in der bestehenden React-/Vite-Codebasis mit ihren eigenen Mustern (CSS-Variablen in `src/index.css`, Klassen in `src/App.css`, Inline-SVG in `src/icons.jsx`). HTML nicht kopieren.

Relevanter Abschnitt im Prototyp: **2a** (oberste Reihe, sechs Screens). Die Reihe darunter (1a/1b/1c) ist eine frühere Farbexploration — nur Archiv, nicht umsetzen.

## Fidelity
**High fidelity.** Farben, Maße und Typo sind final und wurden bewusst aus `src/App.css` übernommen (Screen-Padding 20, Streak-Punkte 26px, `.action` 20px/Radius 22 mit 52px-Icon, `.flashcard` min-height 240 mit Padding 48/24/32, Fortschrittsbalken 8px, `.ratings` Grid mit 8px Abstand). Deshalb ist die Umsetzung überwiegend ein **Token-Tausch plus vier kleine Ergänzungen** — kein Umbau.

## Umsetzung in 5 Schritten

1. **Tokens tauschen.** Den `:root`-Block in `src/index.css` durch den Block aus `tokens.css` (oberer Teil) ersetzen. Die Variablennamen sind identisch — dadurch zieht der Großteil der App sofort um.
2. **Dark Mode entfernen.** Der `@media (prefers-color-scheme: dark)`-Block in `src/index.css` fällt weg (Wunsch: nur heller Modus). `color-scheme: light` ist in `tokens.css` gesetzt.
3. **Überschreibungen anhängen.** Den unteren Teil von `tokens.css` ("Punktuelle Überschreibungen") an das Ende von `src/App.css` hängen — flache Farbflächen statt Verläufe, neue Bewertungsfarben, größere koreanische Kartenvorderseite, weiche Tab-Bar-Naht.
4. **Motive einbauen** (`korea-marks.jsx`):
   - `HomeIcon` in `src/icons.jsx` durch die Hanok-Tor-Variante ersetzen (gleiche Strichstärke wie `BookIcon`).
   - `KoreanFlag` in `src/Home.jsx` in die `.header`-Zeile rechts oben setzen (neben der Begrüßung, ca. 30px breit).
   - `MountainBand` als letztes Kind von `.screen` in `src/Home.jsx` einhängen; `.screen { position: relative }` ergänzen und dem Inhalt `position: relative; z-index: 1` geben, damit die Berge dahinter liegen.
   - `CardRidge` optional in `.flashcard` (`src/Review.jsx`) einhängen; die Karte braucht `position: relative; overflow: hidden`.
5. **Karten-Tag umtexten.** In `src/Review.jsx` die Emoji-Tags ersetzen:
   `'🇬🇧 → 🇰🇷  type'` → `'EN → KO · type'`, `'🇰🇷 → 🇬🇧  flip'` → `'KO → EN · flip'`.

## Screens im Prototyp (2a)

| Screen | Repo-Datei | Was sich ändert |
| --- | --- | --- |
| Home | `src/Home.jsx` | Papierton, Begrüßungs-Verlauf Rot→Blau, Flagge oben rechts, Streak-Punkte rot mit blauem Heute-Ring, Word of the Day = blaue Fläche, Review = rote Fläche, erledigte Aufgabe = Papierkarte mit grünem Häkchen, Bergkette hinter dem Inhalt, Hanok-Tor im Tab |
| Word of the Day | `src/DailyWord.jsx` | Karte in Taegeuk-Blau statt Lila-Verlauf, Fortschrittspunkte blau, Confirm-Button in Tusche |
| Review — Type | `src/Review.jsx` | Karten-Tag als gesetztes Label, Check-Button in Tusche (`#1f1b18`) |
| Review — Antwort | `src/Review.jsx` | grüner Rahmenpuls bleibt, Antwort-Hangul in `#4f6b54`, vier Bewertungsknöpfe in Rot/Gold/Grün/Blau, Intervalltexte aus `formatInterval` ("today / 3 days / 4 days / 8 days") |
| Review — Flip | `src/Review.jsx` | koreanische Vorderseite auf 60px (statt 34px) |
| Number of the Day | `src/NumberChallenge.jsx` | große Zahl mit Rot→Blau-Verlauf, Eingaben auf Papierflächen, Bergkette am Fuß |

## Design-Tokens

| Rolle | Alt | Neu |
| --- | --- | --- |
| `--bg` | `#f4f5fb` | `#f4eee3` |
| `--surface` | `#ffffff` | `#fbf7ef` |
| `--surface-2` | `#eef0f9` | `#efe7d8` |
| `--text` | `#1a1b2e` | `#1f1b18` |
| `--text-soft` | `#6b6d85` | `#857a6c` |
| `--border` | `#e4e6f2` | `#e2d8c6` |
| `--primary` | `#5b4bff` | `#2a4a8b` |
| `--primary-soft` | `#ece9ff` | `#e5eaf4` |
| `--accent` | `#ff7a59` | `#c1443b` |
| `--accent-soft` | `#ffe9e2` | `#f7e6e2` |
| Erfolg / Häkchen | `#2e9e6b` | `#4f6b54` |
| Warnung / Hard | `#f2994a` | `#b4863c` |
| Fehler | `#e5484d` | `#c1443b` |
| Bergtöne | — | `#e7dece`, `#daceb9`, `#cbbba0`, Schnee `#faf6ee`, Kiefer `#9e8c71`, Vogel `#b0a188` |
| Tab-Bar | `--bg` | `#f8f3e9`, Naht `#efe6d6` |
| Schatten | unverändert in der Struktur | `0 2px 8px rgba(31,27,24,.06)` / `0 8px 24px rgba(31,27,24,.10)` |

Radien, Abstände und Schriftgrößen bleiben exakt wie in `src/App.css`. Schrift bleibt der System-Stack mit koreanischen Fallbacks (`--sans`).

## Interaktion & Verhalten
Unverändert: `:active`-Skalierung 0.98 auf Aktionen und Buttons, Flash grün/rot 0.65s, Karte fliegt bei richtiger Antwort 0.32s nach rechts, `viewIn` 0.28s beim Screenwechsel, Konfetti am Stapelende, `prefers-reduced-motion` respektiert. Neu ist nur, dass die Flash-Farben aus den neuen Tokens kommen (`#4f6b54` / `#c1443b`).

## State
Keine Änderung. Kein neuer State, keine neuen Requests, keine Änderung an `src/storage.js` oder am SM-2-Algorithmus.

## Assets
Keine Bilddateien. Alle Motive sind Inline-SVG in `korea-marks.jsx`. `public/favicon.svg` bleibt wie sie ist (nicht Teil dieses Handoffs).

## Dateien in diesem Bundle
- `README.md` — dieses Dokument
- `tokens.css` — Ersatz-`:root` + Überschreibungen für `App.css`
- `korea-marks.jsx` — Flagge, Hanok-Home-Icon, Bergkette, Kartenkante
- `Korean App Richtungen.dc.html` — der Design-Prototyp (Abschnitt 2a ist verbindlich)
