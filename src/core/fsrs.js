/* ============================================================
   FSRS — Free Spaced Repetition Scheduler (Version 4.5)
   (Entscheidung Franz 02.09.: ersetzt SM-2, sanfte Umstellung)

   Modelliert das Gedächtnis pro Karte mit drei Größen:
   - Stabilität (stab): nach wie vielen Tagen die Abruf-
     Wahrscheinlichkeit auf 90 % gefallen ist — die "Stärke"
   - Schwierigkeit (diff, 1-10): wie zäh DIESE Karte ist
   - Abrufwahrscheinlichkeit: wie sicher die Karte JETZT sitzt
     (sinkt seit der letzten Wiederholung entlang der
     Vergessenskurve)

   Der neue Termin entsteht aus der Frage "wann fällt die
   Abrufwahrscheinlichkeit unter das Ziel (90 %)?" — nicht mehr
   aus "Intervall mal Faktor".

   Die 17 Gewichte sind die offiziellen FSRS-4.5-Standardwerte,
   geeicht auf hunderte Millionen echter Anki-Wiederholungen.
   Persönliche Eichung wird möglich, sobald genug Zeilen in
   review_log liegen (Migration 011).

   Reine Mathematik, deterministisch, offline — kein KI-Aufruf.
   ============================================================ */

const W = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031,
  1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755,
]
const DECAY = -0.5
const FAKTOR = 19 / 81
/* Ziel-Behaltensquote: 90 % ist der bewährte Standard. Höher =
   mehr Wiederholungen, niedriger = mehr Vergessen. DER Drehknopf.
   Seit 06.09. je Profil gesetzt (storage.js): Franz lernt Koreanisch
   ohne jede Ableitungshilfe — dort kostet ein Aussetzer das ganze
   Wort, also 93 %. 해인s Deutsch bleibt bei 90 %.
   Rechnerisch: Intervall ≈ Stabilität × 1,00 bei 90 % ·
   × 0,67 bei 93 % · × 0,46 bei 95 %. */
const ZIEL_STANDARD = 0.9
const MAX_INTERVALL = 365

const NOTE = { again: 1, hard: 2, good: 3, easy: 4 }
const klemme = (x, lo, hi) => Math.min(hi, Math.max(lo, x))

/* Wie sicher sitzt die Karte nach t Tagen bei Stabilität s? */
function abrufWkt(t, s) {
  return Math.pow(1 + (FAKTOR * t) / s, DECAY)
}

/* Tage, bis die Abrufwahrscheinlichkeit aufs Ziel fällt
   (bei 90 % ist das ziemlich genau die Stabilität selbst) */
function intervallFuer(s, ziel) {
  const tage = (s / FAKTOR) * (Math.pow(ziel, 1 / DECAY) - 1)
  return klemme(Math.round(tage), 1, MAX_INTERVALL)
}

function initStabilitaet(g) {
  return Math.max(W[g - 1], 0.1)
}

function initSchwierigkeit(g) {
  return klemme(W[4] - (g - 3) * W[5], 1, 10)
}

/* Schwierigkeit wandert mit jeder Antwort — und driftet leicht
   zur Mitte zurück, damit ein einzelner schlechter Tag eine Karte
   nicht für immer brandmarkt */
function naechsteSchwierigkeit(d, g) {
  const dn = d - W[6] * (g - 3)
  return klemme(W[7] * initSchwierigkeit(4) + (1 - W[7]) * dn, 1, 10)
}

/* Karte GEWUSST: Stabilität wächst — umso stärker, je schwerer
   der Abruf war (niedrige Abrufwahrscheinlichkeit = wertvollere
   Wiederholung). "Schwer" dämpft, "Leicht" verstärkt. */
function erinnerungsStabilitaet(d, s, r, g) {
  const schwerBremse = g === 2 ? W[15] : 1
  const leichtBonus = g === 4 ? W[16] : 1
  return (
    s *
    (1 +
      Math.exp(W[8]) *
        (11 - d) *
        Math.pow(s, -W[9]) *
        (Math.exp(W[10] * (1 - r)) - 1) *
        schwerBremse *
        leichtBonus)
  )
}

/* Karte VERGESSEN: neue (kleinere) Stabilität aus der alten —
   lange Gewusstes fällt nicht auf null zurück (der 화장실-Fall) */
function vergessensStabilitaet(d, s, r) {
  const neu = W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r))
  return Math.min(neu, s)
}

/* ---------- der eine Einstiegspunkt ----------
   stab == null heißt: erste Begegnung (oder noch kein
   FSRS-Zustand — das Schätzen aus SM-2 macht storage.js).
   "again" gibt Intervall 0 zurück: die Karte bleibt heute im
   Stapel, wie bisher. */
export function fsrsSchritt({ stab, diff, elapsed, rating, ziel = ZIEL_STANDARD, hartDeckel = null }) {
  const g = NOTE[rating] ?? 3
  if (stab == null) {
    const s = initStabilitaet(g)
    return { stab: s, diff: initSchwierigkeit(g), intervalDays: g === 1 ? 0 : intervallFuer(s, ziel) }
  }
  const d = diff ?? 5
  const r = abrufWkt(Math.max(0, elapsed), stab)
  const s2 = g === 1 ? vergessensStabilitaet(d, stab, r) : erinnerungsStabilitaet(d, stab, r, g)
  let intervalDays = g === 1 ? 0 : intervallFuer(s2, ziel)

  /* "Schwer"-Deckel (Franz 06.09.): In FSRS ist "Schwer" eine
     BESTANDENE Antwort — das Intervall wächst also trotzdem (eine
     15-Tage-Karte bekam 23 Tage). Wer "gerade so" gewusst hat, will
     das Wort aber früher wiedersehen. Deshalb: höchstens der halbe
     bisherige Abstand. Das Modell bleibt heil — die Stabilität darf
     weiter wachsen, wir legen nur den Termin früher; beim nächsten
     Mal ist die Erinnerung dann frischer und FSRS gibt von selbst
     weniger Zuwachs. Selbstkorrigierend. */
  if (g === 2 && hartDeckel && elapsed > 0) {
    intervalDays = klemme(Math.min(intervalDays, Math.round(elapsed * hartDeckel)), 1, MAX_INTERVALL)
  }

  return {
    stab: s2,
    diff: naechsteSchwierigkeit(d, g),
    intervalDays,
  }
}
