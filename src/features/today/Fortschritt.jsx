import { useEffect, useState } from 'react'
import { supabase } from '../../core/supabaseClient'
import { TOPIK1_GRAMMATIK } from '../../core/inventare/topik1-grammatik'
import { GER_GRAMMATIK } from '../../core/inventare/ger-grammatik'

/* ============================================================
   FORTSCHRITTS-LEISTEN — ehrlicher Level-Stand (Idee: Franz)

   Zeigt je Stufe, wie viel vom OFFIZIELLEN Grammatik-Kanon schon
   sitzt (TOPIK-I bzw. GER A1/A2). Gespeist aus inventory_status —
   also aus Kalibrierung, Studio-Lektionen und Übungs-Belegen.

   Zwei Qualitäten im Balken (Lernkompass: Können zeigen, ehrlich):
   - satt  = durch Übungen BESTÄTIGT (source != kalibrierung)
   - blass = selbst eingeschätzt (Kalibrierung)

   Die früheren Wortschatz-Balken ("Top 100") sind raus
   (Entscheidung Franz, 31.08.): Die Kalibrierung tastet den
   Wortschatz nur per Band-STICHPROBE ab — daraus lässt sich kein
   ehrlicher Zählerstand ableiten, und "0/100" war schlicht
   falsch. Wenn die tägliche Nutzung echte Wort-Belege liefert,
   kann eine ehrliche Schätzung zurückkommen.

   Vor der Kalibrierung (keine Daten) zeigt sie sich gar nicht —
   leere Balken würden nur demotivieren, das 🧭-Banner lädt ja
   schon ein.
   ============================================================ */

function balkenDaten(rows, profileId) {
  /* id -> Stufe für die Grammatikpunkte */
  const gramStufe = new Map()
  if (profileId === 'ko') {
    for (const g of TOPIK1_GRAMMATIK) gramStufe.set(`tg-${g.id}`, String(g.stufe))
  } else {
    for (const g of GER_GRAMMATIK) gramStufe.set(`gg-${g.id}`, g.stufe)
  }

  const z = {}
  const zaehle = (gruppe, bestaetigt) => {
    z[gruppe] = z[gruppe] || { fest: 0, blass: 0 }
    z[gruppe][bestaetigt ? 'fest' : 'blass']++
  }
  for (const r of rows) {
    if (r.kind !== 'grammatik') continue
    const stufe = gramStufe.get(r.item_id)
    if (stufe) zaehle(`g${stufe}`, r.source !== 'kalibrierung')
  }

  const leer = { fest: 0, blass: 0 }
  if (profileId === 'ko') {
    const g1 = TOPIK1_GRAMMATIK.filter((g) => g.stufe === 1).length
    const g2 = TOPIK1_GRAMMATIK.filter((g) => g.stufe === 2).length
    return [
      { schluessel: 'g1', stufe: 'TOPIK 1', ...(z.g1 || leer), gesamt: g1 },
      { schluessel: 'g2', stufe: 'TOPIK 2', ...(z.g2 || leer), gesamt: g2 },
    ]
  }
  const a1 = GER_GRAMMATIK.filter((g) => g.stufe === 'A1').length
  const a2 = GER_GRAMMATIK.filter((g) => g.stufe === 'A2').length
  return [
    { schluessel: 'ga1', stufe: 'A1', ...(z.gA1 || leer), gesamt: a1 },
    { schluessel: 'ga2', stufe: 'A2', ...(z.gA2 || leer), gesamt: a2 },
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
              {t.fortschrittGrammatik}
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
