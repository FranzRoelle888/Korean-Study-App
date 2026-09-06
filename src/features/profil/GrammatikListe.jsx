import { useEffect, useState } from 'react'
import { supabase } from '../../core/supabaseClient'
import { TOPIK1_GRAMMATIK } from '../../core/inventare/topik1-grammatik'

/* ============================================================
   GRAMMATIK-CHECKLISTE (Meine Grammatik, nur Franz) — 06.09.

   Der TOPIK-I-Grammatik-Kanon in Lern-Reihenfolge als Liste zum
   Abhaken: „Das kann ich." Oben der Zähler „x von 72" mit Balken,
   je Stufe eine Zwischensumme. Jeder Punkt zeigt Muster, Name und
   einen Beispielsatz — so ist die Liste zugleich der Leitfaden,
   in welcher Reihenfolge man weiterlernt.

   Gespeichert wird in inventory_status (Migration 009), dieselbe
   Tabelle, die Kalibrierung und Fortschritts-Leisten nutzen:
   item_id 'tg-<id>', kind 'grammatik', status 'sicher' bzw.
   'unbekannt', source 'kalibrierung' (= Selbsteinschätzung, im
   Fortschritts-Balken deshalb blass, nicht satt). Ein Haken hier
   erscheint also sofort auch in den Leisten. Lokaler Puffer, damit
   die Liste offline sichtbar bleibt.
   ============================================================ */

const PUFFER = 'grammatik-liste-ko'

function lesePuffer() {
  try {
    return new Set(JSON.parse(localStorage.getItem(PUFFER)) || [])
  } catch {
    return new Set()
  }
}
function schreibePuffer(set) {
  try {
    localStorage.setItem(PUFFER, JSON.stringify([...set]))
  } catch {
    /* egal */
  }
}

export default function GrammatikListe({ profile, t }) {
  const [sicher, setSicher] = useState(lesePuffer)

  useEffect(() => {
    let weg = false
    supabase
      .from('inventory_status')
      .select('item_id,status')
      .eq('profile', profile.id)
      .eq('kind', 'grammatik')
      .then(({ data, error }) => {
        if (weg || error || !data) return
        const s = new Set(data.filter((r) => r.status === 'sicher').map((r) => r.item_id))
        setSicher(s)
        schreibePuffer(s)
      })
    return () => {
      weg = true
    }
  }, [profile.id])

  function toggle(g) {
    const id = `tg-${g.id}`
    const an = !sicher.has(id)
    const next = new Set(sicher)
    if (an) next.add(id)
    else next.delete(id)
    setSicher(next)
    schreibePuffer(next)
    supabase
      .from('inventory_status')
      .upsert(
        {
          profile: profile.id,
          item_id: id,
          kind: 'grammatik',
          status: an ? 'sicher' : 'unbekannt',
          label: `${g.muster} (${g.name})`,
          source: 'kalibrierung',
        },
        { onConflict: 'profile,item_id' }
      )
      .then(({ error }) => {
        if (error) console.warn('Grammatik-Haken nicht gespeichert:', error.message)
      })
  }

  const gesamt = TOPIK1_GRAMMATIK.length
  const anzahl = TOPIK1_GRAMMATIK.filter((g) => sicher.has(`tg-${g.id}`)).length
  const stufen = [...new Set(TOPIK1_GRAMMATIK.map((g) => g.stufe))]

  return (
    <section className="gl">
      <div className="gl-kopf">
        <span className="gl-zahl">
          {anzahl} / {gesamt}
          <small>{t.grammatikBeherrscht}</small>
        </span>
        <div className="gl-balken">
          <div style={{ transform: `scaleX(${gesamt ? anzahl / gesamt : 0})` }} />
        </div>
        <p className="gl-hinweis">{t.grammatikLeitfaden}</p>
      </div>

      {stufen.map((stufe) => {
        const punkte = TOPIK1_GRAMMATIK.filter((g) => g.stufe === stufe)
        const n = punkte.filter((g) => sicher.has(`tg-${g.id}`)).length
        return (
          <div key={stufe}>
            <div className="gl-stufe">
              <span>{t.grammatikStufe(stufe)}</span>
              <span>
                {n} / {punkte.length}
              </span>
            </div>
            <ul className="gl-liste">
              {punkte.map((g) => {
                const an = sicher.has(`tg-${g.id}`)
                const nr = TOPIK1_GRAMMATIK.indexOf(g) + 1
                return (
                  <li key={g.id}>
                    <button
                      type="button"
                      className={an ? 'gl-punkt gl-punkt-an' : 'gl-punkt'}
                      onClick={() => toggle(g)}
                      aria-pressed={an}
                    >
                      <span className="gl-nr">{nr}</span>
                      <span className="gl-box">{an ? '✓' : ''}</span>
                      <span className="gl-text">
                        <span className="gl-muster" lang="ko">
                          {g.muster}
                        </span>
                        <span className="gl-name">{g.name}</span>
                        <span className="gl-satz" lang="ko">
                          {g.beispiel.ko}
                        </span>
                        <span className="gl-satz-tr">{g.beispiel.tr}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </section>
  )
}
