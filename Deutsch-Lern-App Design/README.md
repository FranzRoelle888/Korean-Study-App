# Handoff: Deutsch-Theme (Bauhaus, Schwarz · Rot · Gold)

## Überblick
Visuelles Kleid für die Deutschlern-Fassung der Vokabel-App — dieselbe Codebasis-Struktur wie die Korean-App (React + Vite, CSS-Variablen in `src/index.css`, Klassen in `src/App.css`, Inline-SVG in `src/icons.jsx`).

**Struktur, Flow und Bedienung bleiben unverändert.** Keine neuen Screens, keine neuen Klickpfade, keine Änderung am SM-2-Algorithmus. Ein Feature entfällt: **Zahl des Tages gibt es in der Deutsch-App nicht** (Schritt 5).

## Zu den Design-Dateien
`Deutsch App Grundlage.dc.html` ist eine **Design-Referenz in HTML** — ein Prototyp, der Aussehen und Absicht zeigt, kein Produktionscode. HTML nicht kopieren; umgesetzt wird mit den Mustern der Codebasis. Verbindlicher Abschnitt: **3a** (fünf Screens plus die Spalte „Zustände" rechts).

## Fidelity
**High fidelity.** Alle Maße sind aus `src/App.css` übernommen und ändern sich nicht: Screen-Padding 20, Streak-Punkte 26px, `.action` 20px/Radius 22 mit 52px-Icon, `.flashcard` min-height 240 mit Padding 48/24/32, Fortschrittsbalken 8px, `.ratings`-Grid 8px. Radien bleiben rund (22/24px) — bewusst, trotz sonst flacher Bauhaus-Anmutung. Die Umsetzung ist deshalb **Token-Tausch + vier Motive + ein Feature-Ausbau**, kein Umbau.

## Farbrollen — das Wichtigste an diesem Theme
Die drei Nationalfarben tragen je eine **Rolle**, nicht je eine Kachel. Wer eine neue Fläche einfärbt, entscheidet zuerst, welche Rolle sie hat:

| Farbe | Rolle | Wo |
| --- | --- | --- |
| Tusche `#201e1d` | Struktur | Text, Wort-des-Tages-Karte, jeder Primärbutton (Confirm/Check/Flip), „Good" |
| Rot `#ec3013` | Aufforderung | Review-Aktion + Fälligkeitszähler, Fortschrittsbalken, aktiver Tab, Begrüßung, „Again", Ring um den heute noch offenen Tag, Fehlerzustand |
| Gold `#d9a521` | Ertrag | erledigte Streak-Tage, richtige Antwort, „Easy", erledigte Aktion (Häkchen), Bibliotheksstand, Artikel vor dem Substantiv |

Kleine Schrift nie im Vollton: Gold-Text ist `--gold-ink #8a6410`, Rot-Text `--accent-ink #c6250c`. Volle Töne nur für Flächen und für Schrift ab ~24px (`--gold-mid` für die Artikel).

## Umsetzung in 7 Schritten

1. **Tokens tauschen.** `:root` in `src/index.css` durch den oberen Teil von `tokens.css` ersetzen. Die Variablennamen sind identisch, dazu kommen `--gold`, `--gold-mid`, `--gold-ink`, `--accent-ink`.
2. **Dark Mode entfernen.** Der `@media (prefers-color-scheme: dark)`-Block in `src/index.css` fällt weg (nur heller Modus). `color-scheme: light` ist gesetzt.
3. **Schrift laden.** Archivo 400/500/600/700/800 in `index.html` einhängen; `--sans` steht schon darauf. Koreanische Fallbacks aus dem Stack entfernen.
4. **Überschreibungen anhängen.** Unteren Teil von `tokens.css` ans Ende von `src/App.css` hängen.
5. **Zahl des Tages ausbauen.** `src/NumberChallenge.jsx` löschen, den Case im View-Switch (`src/App.jsx`) entfernen, die dritte `.action`-Kachel aus `src/Home.jsx` entfernen, den zugehörigen Tageszustand in `src/storage.js` nicht mehr schreiben/lesen (keine Migration nötig — alte Keys einfach ignorieren). Home hat danach **zwei** Aktionen; das mittige Flex-Layout füllt den Raum von allein, nichts nachjustieren.
6. **Motive einbauen** (`deutschland-marks.jsx`):
   - `HomeIcon` in `src/icons.jsx` durch die Kölner-Dom-Variante ersetzen (strokeWidth 1.8).
   - `GermanFlag` rechts oben in die `.header`-Zeile von `src/Home.jsx`, ca. 30px breit.
   - `SkylineBand` als letztes Kind von `.screen` in `src/Home.jsx`; `.screen { position: relative }` ergänzen, dem Inhalt `position: relative; z-index: 1` geben.
   - `CardSkyline` optional in `.flashcard` / `.daily-card` (`src/Review.jsx`, `src/DailyWord.jsx`); die Karte braucht `position: relative; overflow: hidden`.
7. **Texte anpassen.** Karten-Tags in `src/Review.jsx`: `'EN → DE · type'` und `'DE → EN · flip'`. Aktions-Untertitel „Wort des Tages" / „Wiederholen". Eingabe-Platzhalter „Type German…". Begrüßung „Guten Tag" mit Klasse `.greeting-de`.

## Artikel-Genus (neue, kleine Regel)
Deutsche Substantive werden **mit Artikel** gespeichert und angezeigt; der Artikel steht in einem eigenen `<span class="article">` und ist Gold. Beim Tippen zählt er mit — falscher Artikel = falsche Antwort, Hinweis in Rot („Not quite — you typed „das Liebe""). Wenn das zu streng ist: Artikel tolerieren, aber im Antwortzustand markieren; dann bleibt `checkAnswer` wie es ist und nur die Vergleichsfunktion wird weicher.

## Screens im Prototyp (3a)

| Screen | Repo-Datei | Was sich ändert |
| --- | --- | --- |
| Home | `src/Home.jsx` | Papiergrund, „Guten Tag" in Rot, Deutschlandflagge oben rechts, Streak-Punkte Gold mit rotem Heute-Ring, Word of the Day = Tuschefläche, Review = rote Fläche, dritte Kachel entfällt, Stadtsilhouette hinter dem Inhalt, Kölner Dom im Tab |
| Word of the Day | `src/DailyWord.jsx` | Karte in Tusche statt Verlauf, Artikel Gold, Fortschrittspunkte Tusche, Confirm in Tusche |
| Review — Type | `src/Review.jsx` | Tag als gesetztes Label, Silhouette im Kartenfuß, Check in Tusche |
| Review — Antwort | `src/Review.jsx` | Rahmenpuls Gold bei richtig / Rot bei falsch, vier Bewertungen Rot · Rot-Tint · Tusche · Gold, Intervalltexte aus `formatInterval` („today / 3 days / 4 days / 8 days") |
| Review — Flip | `src/Review.jsx` | deutsche Vorderseite 44px statt 60px (deutsche Wörter sind lang), `text-wrap: balance` |

## Design-Tokens

| Rolle | Korean-Theme | Deutsch-Theme |
| --- | --- | --- |
| `--bg` | `#f4eee3` | `#f3f2f2` |
| `--surface` | `#fbf7ef` | `#ffffff` |
| `--surface-2` | `#efe7d8` | `#e9e6e0` |
| `--text` | `#1f1b18` | `#201e1d` |
| `--text-soft` | `#857a6c` | `#6e6a64` |
| `--border` | `#e2d8c6` | `#dad6cf` |
| `--primary` | `#2a4a8b` | `#201e1d` |
| `--primary-soft` | `#e5eaf4` | `#edeae4` |
| `--accent` | `#c1443b` | `#ec3013` |
| `--accent-soft` | `#f7e6e2` | `#fbdcd6` |
| Erfolg | `#4f6b54` | `#d9a521` Fläche / `#8a6410` Schrift |
| Fehler | `#c1443b` | `#ec3013` Fläche / `#c6250c` Schrift |
| Silhouette | Bergtöne | `#e7e5e0`, `#d9d6cf`, `#c8c4bb`, Kraniche `#a9a49a` |
| Tab-Bar | `#f8f3e9` / Naht `#efe6d6` | `#edebe7` / Naht `#dedbd5` |
| Schrift | System-Stack + KR-Fallbacks | Archivo |

Radien, Abstände und Schriftgrößen bleiben exakt wie in `src/App.css`.

## Interaktion & Verhalten
Unverändert: `:active`-Skalierung 0.98, Flash 0.65s, Karte fliegt bei richtiger Antwort 0.32s nach rechts, `viewIn` 0.28s beim Screenwechsel, Konfetti am Stapelende, `prefers-reduced-motion` respektiert. Neu nur: die Flash-Farben kommen aus `--gold` / `--accent`.

## Fokus & Zugänglichkeit
Fokusring `2px solid var(--accent)` mit `outline-offset: 2px` auf allen interaktiven Elementen (`:focus-visible`), nie der Browser-Default — die Regel liegt am Ende von `tokens.css`. Gold-Flächen tragen Tusche-Text, Rot- und Tusche-Flächen weißen Text.

## State
Keine Änderung außer dem Wegfall der Zahl-des-Tages-Felder. Keine neuen Requests.

## Assets
Keine Bilddateien. Alle Motive sind Inline-SVG in `deutschland-marks.jsx`. Fürs Favicon genügen die drei Flaggenstreifen aus `GermanFlag`.

## Dateien in diesem Bundle
- `README.md` — dieses Dokument
- `tokens.css` — Ersatz-`:root` + Überschreibungen für `App.css`
- `deutschland-marks.jsx` — Flagge, Kölner-Dom-Home-Icon, Stadtband, Kartensilhouette
- `Deutsch App Grundlage.dc.html` — der Design-Prototyp (Abschnitt 3a ist verbindlich)
