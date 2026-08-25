# Wie der Wiederholungs-Algorithmus funktioniert

Diese Datei beschreibt, **wann eine Karte wieder drankommt** und **in welcher
Reihenfolge** der Tagesstapel abgearbeitet wird. Alles davon steckt in
[`src/storage.js`](src/storage.js).

---

## 1. Der Lerntag läuft von 4:00 bis 4:00 Uhr

Ein „Tag" beginnt in der App nicht um Mitternacht, sondern um **4 Uhr morgens**.
Wer um 1 Uhr nachts noch lernt, ist also noch im Pensum des Vortages.

```js
export function todayStr() {
  const d = new Date()
  if (d.getHours() < 4) d.setDate(d.getDate() - 1)
  return toISO(d)
}
```

Das gilt **überall gleich**: für fällige Karten, die Vokabel des Tages, die
Zahlen-Challenge und die Streak. Es gibt keinen separaten „Einsammel"-Vorgang —
um Punkt 4:00 wechselt das Datum, und damit sind automatisch alle Karten fällig,
deren Termin `due <= heute` ist. Auch die Mischung des Stapels (siehe Punkt 4)
wechselt genau in diesem Moment.

---

## 2. Der Kern: SM-2 (wie das klassische Anki)

Jede Karte merkt sich drei Zahlen:

| Feld | Bedeutung |
|---|---|
| `ease` | „Leichtigkeit", Startwert ca. 2.5 — der Multiplikator, mit dem das Intervall wächst |
| `intervalDays` | in wie vielen Tagen die Karte wiederkommt |
| `reps` | wie oft sie in Folge richtig war |

Die vier Knöpfe verändern diese Werte:

| Knopf | Wirkung |
|---|---|
| **Nochmal** | `ease` − 0.2, `reps` → 0, Karte kommt heute nochmal |
| **Schwer** | `ease` − 0.15, Intervall wächst nur um Faktor 1.2 |
| **Gut** | `ease` bleibt, Intervall × `ease` |
| **Einfach** | `ease` + 0.15, Intervall × `ease` × 1.3 |

Die Leichtigkeit fällt nie unter **1.3** (`MIN_EASE`), damit eine schwere Karte
nicht in einer Endlosschleife hängen bleibt.

---

## 3. Streuung: warum nicht alle Karten am selben Tag wiederkommen

**Das Problem.** Beim Import aus Anki sind sehr viele Karten mit identischem
Stand gestartet. Bei gleichem Stand + gleichem Knopf ergibt SM-2 auch exakt
dasselbe Intervall. Ergebnis: ein **Klumpen**, der für immer im Gleichschritt vor
sich her geschoben wird — an manchen Tagen kommen 60 Karten, an anderen keine.

**Die Lösung** (macht Anki genauso, dort heißt es *fuzz*): Das berechnete
Intervall wird um einen kleinen Zufallsbetrag verschoben.

```js
// bis 4 Tage: ±1 Tag · darüber: ±15 %
function fuzzDays(days, seed) {
  if (days <= 1) return days
  const spread = days <= 4 ? 1 : Math.max(1, Math.round(days * 0.15))
  return Math.max(1, days + pick(seed, -spread, spread))
}
```

Zusätzlich sind die **ersten beiden Wiederholungen** einer Karte keine festen
Werte mehr, sondern kleine Spannen (z. B. „Einfach" beim ersten Mal = 3–5 Tage
statt immer 4). So bricht der Klumpen sofort auf und nicht erst nach Monaten.
Auch die **Start-Leichtigkeit** neuer Karten ist leicht gestreut (2.5 ± 0.15).

### Wichtig: der Zufall hat ein Gedächtnis

Es wird **nicht bei jedem Klick neu gewürfelt**. Der Zufallswert wird aus der
Karte selbst berechnet — aus `id` + `reps` + gedrücktem Knopf:

```js
const seed = seeded(card.id, reps, rating)
```

Das hat zwei Vorteile:

1. **Die Vorschau auf den Knöpfen stimmt.** Wenn dort „12 Tage" steht, werden es
   auch 12 Tage — sonst würde die Anzeige lügen.
2. Trotzdem driften verschiedene Karten auseinander, und nach jeder Wiederholung
   (`reps` ändert sich) wird neu gestreut.

---

## 4. Reihenfolge des Tagesstapels

### Mischen

Alle fälligen Karten werden **gemischt**, damit man sie nicht in immer derselben
Reihenfolge sieht (und Antworten nicht über die Position auswendig lernt):

```js
function shuffleForToday(list) {
  const t = todayStr()
  return list
    .map((c) => ({ c, k: seeded('order', t, c.id) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.c)
}
```

Der Seed ist **Datum + Karten-Id**. Dadurch:

- wird der Stapel **jeden Morgen um 4:00 neu gemischt**,
- bleibt die Reihenfolge **über den Tag hinweg stabil** — wer die App
  zwischendurch verlässt und zurückkommt, findet den Stapel unverändert vor
  (kein Herumspringen).

### Wort-Paare auseinanderziehen

Jede Vokabel hat zwei Karten (Englisch → eintippen, Koreanisch → umdrehen).
Lägen die direkt hintereinander, würde die erste die Antwort der zweiten
verraten. `spaceOutPairs()` hält deshalb **mindestens 3 andere Karten** dazwischen
(`PAIR_GAP`), soweit der Stapel das hergibt.

### Die drei Gruppen

| Gruppe | Erkennungsmerkmal | Behandlung |
|---|---|---|
| **Wiederholungen** | `reps > 0` | gemischt · auf **50/Tag** gedeckelt (`REVIEW_CAP`), überfälligste zuerst |
| **Nochmal-Karten** | `reps === 0`, aber `lastReviewed` gesetzt | gemischt · nicht gedeckelt (gehören zum heutigen Pensum) |
| **Neue Karten** | `reps === 0` **und** kein `lastReviewed` | **hinten angehängt**. Heute hinzugefügte immer; älterer Rückstand füllt nur die freien Plätze bis zum 50er-Deckel |

```js
return [
  ...spaceOutPairs(shuffleForToday([...again, ...review])),
  ...spaceOutPairs(fresh),
]
```

Warum neue Karten hinten? Eine Vokabel, die man über „Vokabel des Tages" gerade
erst dreimal eingetippt hat, hätte mitten im Stapel keinen Lerneffekt — sie wäre
noch im Kurzzeitgedächtnis. Am Ende des Stapels liegt genug Abstand dazwischen.

### Der 50er-Deckel

Nach längerer Pause können mehrere hundert Karten fällig sein. Damit das nicht
erschlägt, zeigt der Stapel höchstens **50 Wiederholungen pro Tag** — die
**überfälligsten zuerst**, damit der Rückstand von hinten abgebaut wird.
Nochmal-Karten zählen nicht gegen dieses Limit — sie gehören zum heutigen Pensum.
Neue Karten dagegen schon: heute hinzugefügte erscheinen immer sofort, ein
älterer Rückstand an nie gelernten Karten füllt nur die verbleibenden Plätze.
(Ohne diese Regel machte ein großer Import den Stapel unerschöpflich und der
Tag ließ sich nie abschließen.)

---

## 5. Stellschrauben

Alle oben in [`src/storage.js`](src/storage.js):

```js
const START_EASE = 2.5   // Start-Leichtigkeit neuer Karten
const MIN_EASE   = 1.3   // Untergrenze
const DAILY_NEW  = 2     // neue Vokabeln pro Tag
const REVIEW_CAP = 50    // max. Wiederholungen pro Tag
const PAIR_GAP   = 3     // Mindestabstand zwischen den 2 Karten eines Wortes
```
