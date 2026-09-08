import { useEffect, useState } from 'react'
import { supabase } from '../../core/supabaseClient'
import { TOPIK1_GRAMMATIK } from '../../core/inventare/topik1-grammatik'
import { GER_GRAMMATIK } from '../../core/inventare/ger-grammatik'

/* ============================================================
   GRAMMATIK-CHECKLISTE (Meine Grammatik) — 06.09., beide Seiten 08.09.

   Der Kanon der jeweiligen Sprache in Lern-Reihenfolge zum Abhaken:
   „Das kann ich." Oben der Zähler mit Balken, je Stufe eine
   Zwischensumme. Jeder Punkt zeigt Muster, Name und einen
   Beispielsatz — die Liste ist damit zugleich der Leitfaden, in
   welcher Reihenfolge man weiterlernt.

   Franz: TOPIK-I (Stufe 1/2) · 해인: Goethe A1/A2.

   Gespeichert wird in inventory_status (Migration 009), dieselbe
   Tabelle, die Kalibrierung und Fortschritts-Leisten nutzen:
   item_id 'tg-<id>' bzw. 'gg-<id>', kind 'grammatik', status
   'sicher' bzw. 'unbekannt', source 'kalibrierung' (= Selbst-
   einschätzung, im Fortschritts-Balken deshalb blass).

   Die Haken sind zugleich die Grundlage, aus der der Trainer die
   Übersetzungs-Aufgaben baut (satzChallenge.js).
   ============================================================ */

const KANON = {
  ko: { liste: TOPIK1_GRAMMATIK, praefix: 'tg', satz: (g) => g.beispiel.ko, lang: 'ko' },
  de: { liste: GER_GRAMMATIK, praefix: 'gg', satz: (g) => g.beispiel.de, lang: 'de' },
}

const puffend = (praefix) => `grammatik-liste-${praefix}`

function lesePuffer(praefix) {
  try {
    return new Set(JSON.parse(localStorage.getItem(puffend(praefix))) || [])
  } catch {
    return new Set()
  }
}
function schreibePuffer(praefix, set) {
  try {
    localStorage.setItem(puffend(praefix), JSON.stringify([...set]))
  } catch {
    /* egal */
  }
}

export default function GrammatikListe({ profile, t }) {
  const kanon = KANON[profile.id === 'ko' ? 'ko' : 'de']
  const [sicher, setSicher] = useState(() => lesePuffer(kanon.praefix))

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
        schreibePuffer(kanon.praefix, s)
      })
    return () => {
      weg = true
    }
  }, [profile.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(g) {
    const id = `${kanon.praefix}-${g.id}`
    const an = !sicher.has(id)
    const next = new Set(sicher)
    if (an) next.add(id)
    else next.delete(id)
    setSicher(next)
    schreibePuffer(kanon.praefix, next)
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

  const gesamt = kanon.liste.length
  const anzahl = kanon.liste.filter((g) => sicher.has(`${kanon.praefix}-${g.id}`)).length
  const stufen = [...new Set(kanon.liste.map((g) => g.stufe))]

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
        const punkte = kanon.liste.filter((g) => g.stufe === stufe)
        const n = punkte.filter((g) => sicher.has(`${kanon.praefix}-${g.id}`)).length
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
                const an = sicher.has(`${kanon.praefix}-${g.id}`)
                const nr = kanon.liste.indexOf(g) + 1
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
                        <span className="gl-muster" lang={kanon.lang}>
                          {g.muster}
                        </span>
                        <span className="gl-name" lang={profile.id === 'ko' ? 'en' : 'ko'}>
                          {g.name}
                        </span>
                        <span className="gl-satz" lang={kanon.lang}>
                          {kanon.satz(g)}
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
