/* ============================================================
   RADAR-LOGIK — Stärken, Prognose, Countdown, Tages-Empfehlung
   (Phase 5; Sicherheits-Modell nach Kritik Franz 05.09.:
   „100 % nur bei fast absoluter Bestehens-Sicherheit")

   Zwei Zutaten je Teil, die MULTIPLIZIERT werden:

   1. LEISTUNG: gewichteter Schnitt der letzten 12 Belege
      (prüfungsnahe Läufe zählen doppelt: ⏱-Modus, Generalprobe,
      Monolog-Prüfung, Schreib-Stufe 3, Fragen-Spiel).

   2. FESTIGUNG (0..1): wie belastbar der Wert ist. Drei
      Zutaten, das SCHWÄCHSTE bremst (min):
      - Menge:        mind. 12 gewichtete Läufe für volle Wirkung
      - Tage:         Erfolge über mind. 4 VERSCHIEDENE Tage —
                      ein Abend Dauerüben festigt nichts
      - Prüfungsnähe: mind. 6 prüfungsnahe Gewichte (= 3 echte
                      ⏱-Läufe) — Lernmodus allein reicht nie

   ANZEIGE = 50 % + (Leistung − 50 %) × (0,3 + 0,7 × Festigung).
   Folgen: zwei perfekte Runden an einem Abend ≈ 65 %, nicht
   100 %. Nur Lernmodus deckelt bei ~65 %. 100 % gibt es erst
   bei perfekter Leistung UND voller Festigung — mehrfach, über
   Tage verteilt, unter Prüfungsbedingungen. Die Dämpfung wirkt
   in beide Richtungen (frühe Ausrutscher drücken auch nicht
   sofort auf 0). Prognose/Bestehenslinie nutzen dieselben
   vorsichtigen Werte.

   Sichtbar als Pflanze je Teil: 🌱 frisch · 🌿 wächst · 🌳 fest.
   Skala: Lesen/Hören/Schreiben ×25, Sprechen ×20 (+ „Aussprache
   max 5" — bewertet nur ein Mensch). Bestehensgrenze 60/100.
   ============================================================ */

const FENSTER = 12 /* letzte Belege je Teil */
const MENGE_VOLL = 12 /* gewichtete Läufe für volle Menge */
const TAGE_VOLL = 4 /* verschiedene Übungstage */
const PRUEF_VOLL = 6 /* prüfungsnahe Gewichte (= 3 ⏱-Läufe) */

export const PRUEFUNGS_DATUM = new Date(2026, 9, 29) /* 29.10.2026 */

export const RADAR_MODULE = [
  {
    id: 'hoeren',
    emoji: '🎧',
    ko: '듣기',
    de: 'Hören',
    max: 25,
    teile: [
      { id: 't1', ko: '안내방송·응답기', uebung: 'hv', wahl: ['a2hoeren:wahl', '1'] },
      { id: 't2', ko: '요일 대화', uebung: 'hv', wahl: ['a2hoeren:wahl', '2'] },
      { id: 't3', ko: '짧은 대화', uebung: 'hv', wahl: ['a2hoeren:wahl', '3'] },
      { id: 't4', ko: '인터뷰', uebung: 'hv', wahl: ['a2hoeren:wahl', '4'] },
    ],
  },
  {
    id: 'lesen',
    emoji: '📖',
    ko: '읽기',
    de: 'Lesen',
    max: 25,
    teile: [
      { id: 't1', ko: '신문 기사', uebung: 'lv', wahl: ['a2lesen:wahl', '1'] },
      { id: 't2', ko: '안내판', uebung: 'lv', wahl: ['a2lesen:wahl', '2'] },
      { id: 't3', ko: '이메일 읽기', uebung: 'lv', wahl: ['a2lesen:wahl', '3'] },
      { id: 't4', ko: '광고 매칭', uebung: 'lv', wahl: ['a2lesen:wahl', '4'] },
    ],
  },
  {
    id: 'schreiben',
    emoji: '✉️',
    ko: '쓰기',
    de: 'Schreiben',
    max: 25,
    teile: [
      { id: 't1', ko: 'SMS 쓰기', uebung: 'smsmail', wahl: null },
      { id: 't2', ko: '이메일 쓰기', uebung: 'smsmail', wahl: null },
    ],
  },
  {
    id: 'sprechen',
    emoji: '🎤',
    ko: '말하기',
    de: 'Sprechen',
    max: 20,
    teile: [
      { id: 't1', ko: '질문 게임', uebung: 'fragen', wahl: null },
      { id: 't2', ko: '혼자 말하기', uebung: 'monolog', wahl: null },
    ],
  },
]

/* Prüfungsnah? Dann doppeltes Gewicht. */
function gewicht(modulId, details) {
  const stufe = details?.stufe
  if (stufe === 'pruefung' || stufe === 'sim') return 2
  if (stufe === 'lern') return 1
  if (modulId === 'schreiben') return stufe === 3 ? 2 : 1
  if (modulId === 'hoeren' || modulId === 'lesen') return stufe === 2 ? 2 : 1
  return 2 /* Fragen-Spiel: eine Aufnahme, prüfungsecht */
}

/* Aus der Beleg-Liste (neueste zuerst) die Radar-Auswertung bauen */
export function werteAus(belege) {
  const module = RADAR_MODULE.map((m) => {
    const teile = m.teile.map((t) => {
      const letzte = belege
        .filter((b) => b.modul === m.id && b.teil === t.id && b.max > 0)
        .slice(0, FENSTER)
      if (!letzte.length) return { ...t, quote: null, festigung: 0, anzahl: 0 }

      /* Zutat 1: Leistung (gewichteter Schnitt) */
      let summe = 0
      let gewichte = 0
      let pruefGewichte = 0
      const tage = new Set()
      for (const b of letzte) {
        const g = gewicht(m.id, b.details)
        summe += (b.punkte / b.max) * g
        gewichte += g
        if (g === 2) pruefGewichte += g
        tage.add(String(b.created_at ?? '').slice(0, 10))
      }
      const leistung = summe / gewichte

      /* Zutat 2: Festigung — das Schwächste bremst */
      const festigung = Math.min(
        gewichte / MENGE_VOLL,
        tage.size / TAGE_VOLL,
        pruefGewichte / PRUEF_VOLL,
        1
      )

      /* Vorsichtige Anzeige: zur 50%-Mitte hin gedämpft */
      const quote = Math.min(1, Math.max(0, 0.5 + (leistung - 0.5) * (0.3 + 0.7 * festigung)))
      return { ...t, quote, festigung, anzahl: letzte.length }
    })
    const mitDaten = teile.filter((t) => t.quote !== null)
    const quote = mitDaten.length
      ? mitDaten.reduce((s, t) => s + t.quote, 0) / mitDaten.length
      : null
    return {
      ...m,
      teile,
      quote,
      punkte: quote === null ? null : Math.round(quote * m.max),
    }
  })

  const alleDa = module.every((m) => m.quote !== null)
  const gesamt = alleDa ? module.reduce((s, m) => s + m.punkte, 0) : null

  return { module, gesamt, alleDa }
}

/* Tages-Empfehlung: erst nie Geübtes (aus dem schwächsten Modul),
   sonst der schwächste Teil. Genau EIN Vorschlag — intuitiv. */
export function empfehlung(auswertung) {
  const { module } = auswertung
  const offene = []
  for (const m of module) {
    for (const t of m.teile) {
      if (t.quote === null) offene.push({ modul: m, teil: t })
    }
  }
  if (offene.length) {
    /* aus dem Modul mit den wenigsten Daten zuerst */
    offene.sort(
      (a, b) =>
        a.modul.teile.filter((x) => x.quote !== null).length -
        b.modul.teile.filter((x) => x.quote !== null).length
    )
    return { ...offene[0], grund: 'neu' }
  }
  let schwaechster = null
  for (const m of module) {
    for (const t of m.teile) {
      if (!schwaechster || t.quote < schwaechster.teil.quote) schwaechster = { modul: m, teil: t }
    }
  }
  return schwaechster ? { ...schwaechster, grund: 'schwach' } : null
}

/* D-Tage bis zur Prüfung (D-0 = Prüfungstag) */
export function dTage(heute = new Date()) {
  const start = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate())
  return Math.round((PRUEFUNGS_DATUM - start) / 86400000)
}
