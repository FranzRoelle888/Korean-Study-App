import { useEffect, useState } from 'react'
import { supabase } from '../../core/supabaseClient'
import { TOPIK1_GRAMMATIK } from '../../core/inventare/topik1-grammatik'
import { GER_GRAMMATIK } from '../../core/inventare/ger-grammatik'

/* ============================================================
   FORTSCHRITTS-LEISTEN — ehrlicher Level-Stand (Idee: Franz)

   Zeigt je Stufe, wie viel vom OFFIZIELLEN Stoff schon sitzt:
   Grammatikpunkte (TOPIK-I-Kanon bzw. GER A1/A2) und Wortschatz
   (TOPIK-I- bzw. Goethe-Listen). Gespeist aus inventory_status —
   also aus Kalibrierung, Kalibrier-Fenster und (künftig) echten
   Übungsergebnissen.

   Zwei Qualitäten im Balken (Lernkompass: Können zeigen, ehrlich):
   - satt  = durch Übungen BESTÄTIGT (source != kalibrierung)
   - blass = selbst eingeschätzt (Kalibrierung)
   Mit jedem Lückentext/Grammatik-Training wird der satte Anteil
   wachsen — die Leiste wird von Woche zu Woche ehrlicher.

   Wichtig: Die Leiste misst den STOFF der offiziellen Listen,
   nicht das Prüfungszertifikat — deshalb heißt sie "A1-Stoff".

   Vor der Kalibrierung (keine Daten) zeigt sie sich gar nicht —
   leere Balken würden nur demotivieren, das 🧭-Banner lädt ja
   schon ein.
   ============================================================ */

/* Wortschatz-Umfänge der Inventare. Die Wort-IDs sind fortlaufend
   (t-1…, g-1…); bei Goethe sind g-1 bis g-677 die A1-Wörter, weil
   das Bau-Skript A1 zuerst verarbeitet (scripts/baue-goethe-
   inventar.mjs) — bei Neubau der Inventare hier nachziehen! */
const WORT_UMFANG = {
  ko: { gesamt: 1791 },
  de: { a1: 677, a2: 684 },
}

/* Wortschatz als MEILENSTEINE statt Gesamtberg (Entscheidung
   Franz, Konzept §6): angezeigt wird immer nur die aktuelle
   Häufigkeits-Etappe — erreichbar statt erdrückend. Die Wort-IDs
   sind häufigkeitssortiert, darum zählt "Top N" einfach die
   Einträge mit Nummer <= N. */
const MEILENSTEINE = [100, 250, 500, 750, 1000]

function etappe(bekannt /* Map nr -> bestaetigt */, gesamt) {
  for (const m of MEILENSTEINE) {
    if (m >= gesamt) break
    let fest = 0
    let blass = 0
    for (const [nr, bestaetigt] of bekannt) {
      if (nr <= m) bestaetigt ? fest++ : blass++
    }
    if (fest + blass < m) return { ziel: m, fest, blass }
  }
  /* Alle Etappen voll: die Gesamtliste als letzte Etappe */
  let fest = 0
  let blass = 0
  for (const [, bestaetigt] of bekannt) (bestaetigt ? fest++ : blass++)
  return { ziel: gesamt, fest, blass }
}

function balkenDaten(rows, profileId) {
  /* id -> Stufe für die Grammatikpunkte */
  const gramStufe = new Map()
  if (profileId === 'ko') {
    for (const g of TOPIK1_GRAMMATIK) gramStufe.set(`tg-${g.id}`, String(g.stufe))
  } else {
    for (const g of GER_GRAMMATIK) gramStufe.set(`gg-${g.id}`, g.stufe)
  }

  /* Zähler je Grammatik-Gruppe + Wort-Nummern je Seite */
  const z = {}
  const zaehle = (gruppe, bestaetigt) => {
    z[gruppe] = z[gruppe] || { fest: 0, blass: 0 }
    z[gruppe][bestaetigt ? 'fest' : 'blass']++
  }
  const woerterKo = new Map()

  for (const r of rows) {
    const bestaetigt = r.source !== 'kalibrierung'
    if (r.kind === 'grammatik') {
      const stufe = gramStufe.get(r.item_id)
      if (stufe) zaehle(`g${stufe}`, bestaetigt)
    } else if (r.kind === 'wort') {
      const nr = parseInt(r.item_id.split('-')[1], 10)
      if (profileId === 'ko') woerterKo.set(nr, bestaetigt)
      else if (nr <= WORT_UMFANG.de.a1) zaehle('wa1', bestaetigt)
      else zaehle('wa2', bestaetigt)
    }
  }

  /* Für die unsortierten Goethe-Listen: Meilenstein über die
     ANZAHL (nächstes Etappenziel oberhalb des aktuellen Stands) */
  const zielFuer = (anzahl, gesamt) => {
    for (const m of MEILENSTEINE) {
      if (m >= gesamt) break
      if (anzahl < m) return m
    }
    return gesamt
  }

  const leer = { fest: 0, blass: 0 }
  if (profileId === 'ko') {
    const g1 = TOPIK1_GRAMMATIK.filter((g) => g.stufe === 1).length
    const g2 = TOPIK1_GRAMMATIK.filter((g) => g.stufe === 2).length
    /* Häufigkeits-Etappe: "kennst du die Top 500?" */
    const e = etappe(woerterKo, WORT_UMFANG.ko.gesamt)
    return [
      { schluessel: 'g1', art: 'grammatik', stufe: 'TOPIK 1', ...(z.g1 || leer), gesamt: g1 },
      { schluessel: 'g2', art: 'grammatik', stufe: 'TOPIK 2', ...(z.g2 || leer), gesamt: g2 },
      { schluessel: 'w', art: 'wortschatz', stufe: `Top ${e.ziel}`, fest: e.fest, blass: e.blass, gesamt: e.ziel },
    ]
  }
  const a1 = GER_GRAMMATIK.filter((g) => g.stufe === 'A1').length
  const a2 = GER_GRAMMATIK.filter((g) => g.stufe === 'A2').length
  const wa1 = z.wa1 || leer
  const wa2 = z.wa2 || leer
  return [
    { schluessel: 'ga1', art: 'grammatik', stufe: 'A1', ...(z.ga1 || leer), gesamt: a1 },
    { schluessel: 'ga2', art: 'grammatik', stufe: 'A2', ...(z.ga2 || leer), gesamt: a2 },
    { schluessel: 'wa1', art: 'wortschatz', stufe: 'A1', ...wa1, gesamt: zielFuer(wa1.fest + wa1.blass, WORT_UMFANG.de.a1) },
    { schluessel: 'wa2', art: 'wortschatz', stufe: 'A2', ...wa2, gesamt: zielFuer(wa2.fest + wa2.blass, WORT_UMFANG.de.a2) },
  ]
}

function Fortschritt({ profile, t }) {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    let weg = false
    supabase
      .from('inventory_status')
      .select('item_id,kind,status,source')
      .eq('profile', profile.id)
      .eq('status', 'sicher')
      .then(({ data, error }) => {
        if (weg) return
        setRows(error ? [] : (data ?? []))
      })
    return () => {
      weg = true
    }
  }, [profile.id])

  /* Noch keine Kalibrierung (oder offline): nichts zeigen */
  if (!rows || rows.length === 0) return null

  const balken = balkenDaten(rows, profile.id)
  const irgendwasFest = balken.some((b) => b.fest > 0)

  return (
    <section className="fortschritt">
      <h3 className="fortschritt-titel">{t.fortschrittTitle}</h3>
      {balken.map((b) => {
        const summe = b.fest + b.blass
        const pFest = Math.min(100, (b.fest / b.gesamt) * 100)
        const pBlass = Math.min(100 - pFest, (b.blass / b.gesamt) * 100)
        return (
          <div className="fortschritt-zeile" key={b.schluessel}>
            <span className="fortschritt-label">
              {b.art === 'grammatik' ? t.fortschrittGrammatik : t.fortschrittWortschatz}
              {' · '}
              {b.stufe}
            </span>
            <div className="fortschritt-balken" role="img" aria-label={`${summe}/${b.gesamt}`}>
              <div className="fortschritt-fest" style={{ width: `${pFest}%` }} />
              <div className="fortschritt-blass" style={{ width: `${pBlass}%` }} />
            </div>
            <span className="fortschritt-zahl">
              {summe}/{b.gesamt}
            </span>
          </div>
        )
      })}
      {/* Legende erst zeigen, wenn beide Qualitäten vorkommen */}
      {irgendwasFest && <p className="fortschritt-legende">{t.fortschrittLegende}</p>}
    </section>
  )
}

export default Fortschritt
