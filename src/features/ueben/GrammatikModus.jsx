import { useEffect, useState } from 'react'
import { supabase } from '../../core/supabaseClient'
import { ladeGrammatikInventar } from '../../core/kalibrierung'
import Lektion from './Lektion'

/* ============================================================
   GRAMMATIK-MODUS — Übersicht (Konzept: Chat 28.08.2026)

   Oben: "Weiter lernen" — der Meister-Takt-Vorschlag (erst
   Reparatur wackliger Punkte, dann der nächste offene im Kanon).
   Darunter: die Kanon-Liste, jede Zeile mit Status und antippbar
   — freie Wahl, Nachschlagewerk und begehbare Fortschritts-
   Ansicht in einem.

   Lektionen liegen als Repo-Datei vor (baue-lektionen.mjs);
   Punkte ohne Lektion zeigen "folgt" und sind nicht antippbar.
   ============================================================ */

function GrammatikModus({ profile, t, onExit }) {
  const [inventar, setInventar] = useState(null)
  const [lektionen, setLektionen] = useState({})
  const [status, setStatus] = useState(new Map())
  const [offenId, setOffenId] = useState(null)

  useEffect(() => {
    let weg = false
    /* Vite kann dynamische Import-Pfade nur mit einfachen Mustern
       auflösen — deshalb die explizite Verzweigung */
    const lektionenLaden =
      profile.id === 'ko'
        ? import('../../core/lektionen/ko.json')
        : import('../../core/lektionen/de.json')
    Promise.all([
      ladeGrammatikInventar(profile.id),
      lektionenLaden.then((m) => m.default).catch(() => ({})),
      supabase
        .from('inventory_status')
        .select('item_id,status')
        .eq('profile', profile.id)
        .eq('kind', 'grammatik')
        .then(({ data }) => data ?? []),
    ])
      .then(([inv, lek, st]) => {
        if (weg) return
        setInventar(inv)
        setLektionen(lek)
        setStatus(new Map(st.map((z) => [z.item_id, z.status])))
      })
      .catch(() => {
        if (!weg) setInventar([])
      })
    return () => {
      weg = true
    }
  }, [profile.id])

  if (offenId) {
    return (
      <Lektion
        profile={profile}
        t={t}
        punktId={offenId}
        lektion={lektionen[offenId]}
        titelFallback={(inventar ?? []).find((g) => g.id === offenId)?.label}
        aktuellerStatus={status.get(offenId)}
        onExit={() => setOffenId(null)}
      />
    )
  }

  const kopf = (
    <div className="review-header">
      <button className="back-btn" onClick={onExit} aria-label={t.back}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <span className="daily-label">{t.modeGrammar}</span>
    </div>
  )

  if (!inventar) {
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte"><p className="kal-text">…</p></div>
      </div>
    )
  }

  /* Meister-Takt: erst wacklige MIT Lektion, dann offene mit Lektion */
  const naechster =
    inventar.find((g) => status.get(g.id) === 'wackelig' && lektionen[g.id]) ||
    inventar.find((g) => !status.get(g.id) && lektionen[g.id]) ||
    inventar.find((g) => status.get(g.id) !== 'sicher' && lektionen[g.id])

  const zeichen = (s) => (s === 'sicher' ? '✓' : s === 'wackelig' ? '~' : '○')

  return (
    <div className="screen">
      {kopf}
      <div className="gram-scroll">
        {naechster ? (
          <button className="gram-weiter" onClick={() => setOffenId(naechster.id)}>
            <span className="gram-weiter-label">{t.gramWeiter}</span>
            <span className="gram-weiter-titel">{lektionen[naechster.id].titel}</span>
          </button>
        ) : (
          <p className="kal-text">{t.gramKeineLektion}</p>
        )}

        <h3 className="sheet-block-label">{t.gramListe}</h3>
        <ul className="gram-liste">
          {inventar.map((g) => {
            const s = status.get(g.id)
            const hatLektion = !!lektionen[g.id]
            return (
              <li key={g.id}>
                <button
                  className={`gram-zeile${s === 'sicher' ? ' gram-sicher' : ''}`}
                  onClick={() => hatLektion && setOffenId(g.id)}
                  disabled={!hatLektion}
                >
                  <span className={`gram-status gram-status-${s ?? 'offen'}`}>{zeichen(s)}</span>
                  <span className="gram-muster" lang={g.lang}>{g.muster}</span>
                  <span className="gram-name">
                    {hatLektion ? g.name : `${g.name} · ${t.gramFolgt}`}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export default GrammatikModus
