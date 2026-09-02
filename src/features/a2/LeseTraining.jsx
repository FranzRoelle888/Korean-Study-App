import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../core/supabaseClient'
import { trainerA2Lesen } from '../trainer/trainerApi'
import { schreibeA2Beleg } from '../../core/storage'
import Nachfrage from '../ueben/Nachfrage'
import Auftrag from '../../shared/Auftrag'

/* ============================================================
   LESEVERSTEHEN — alle 4 Teil-Formate des Goethe-Zertifikats A2
   (A2-Sprint Phase 4, Konzept mit Franz 04.09.)

   - Übungen ON DEMAND (a2lesen) + exercise_bank-Puffer, wie beim
     Hören; während geübt wird, füllt sich der Vorrat im
     Hintergrund. Teil 4 = der „Anzeigen-Detektiv" (5 Personen,
     6 Anzeigen, EINE Person ohne Lösung -> X).
   - 🐢 Lernmodus ohne Zeit; ⏱ Prüfungsmodus mit sanfter
     7-Minuten-Uhr (nur sichtbar, bricht nichts ab — in der
     Prüfung sind es 30 min für alle 4 Teile).
   - Jede Auflösung erklärt WARUM (Koreanisch) — und der
     Nachfrage-Dialog ist immer da.
   ============================================================ */

const RUBRIK = {
  1: { de: 'Sie lesen in einer Zeitung diesen Text. Wählen Sie für die Aufgaben die richtige Lösung a, b oder c.', ko: '신문 기사를 읽고 맞는 답(a/b/c)을 고르세요.' },
  2: { de: 'Sie lesen die Informationstafel. Wählen Sie die richtige Lösung.', ko: '안내판을 읽고 어디로 가야 하는지 고르세요.' },
  3: { de: 'Sie lesen eine E-Mail. Wählen Sie für die Aufgaben die richtige Lösung a, b oder c.', ko: '이메일을 읽고 맞는 답(a/b/c)을 고르세요.' },
  4: { de: 'Welche Anzeige passt zu welcher Person? Für eine Person gibt es keine Lösung — markieren Sie X.', ko: '어떤 광고가 어울릴까요? ⚠️ 한 사람은 맞는 광고가 없어요 — X를 고르세요.' },
}

const PRUEFUNGS_SEKUNDEN = 7 * 60

function LeseTraining({ profile, t, onExit }) {
  const [stufe, setStufe] = useState(() => {
    try {
      return parseInt(localStorage.getItem('a2lesen:stufe') ?? '1', 10) || 1
    } catch {
      return 1
    }
  })
  const [uebung, setUebung] = useState('laedt')
  const [antworten, setAntworten] = useState([])
  const [fertig, setFertig] = useState(false)
  const [runde, setRunde] = useState(0)
  const [restSek, setRestSek] = useState(PRUEFUNGS_SEKUNDEN)

  /* ---------- Vorrat: laden oder erzeugen (wie beim Hören) ---------- */
  async function besorgeUebung(imHintergrund = false) {
    let wahl = 'mix'
    try {
      wahl = localStorage.getItem('a2lesen:wahl') ?? 'mix'
    } catch {
      /* egal */
    }
    const zaehler = (() => {
      try {
        return parseInt(localStorage.getItem('a2lesen:teil') ?? '0', 10) || 0
      } catch {
        return 0
      }
    })()
    const teil =
      wahl === 'mix' ? [1, 4, 3, 2][(zaehler + (imHintergrund ? 1 : 0)) % 4] : parseInt(wahl, 10)

    const { data } = await supabase
      .from('exercise_bank')
      .select('id,payload')
      .eq('profile', profile.id)
      .eq('typ', 'lesen')
      .eq('status', 'neu')
      .eq('payload->>teil', String(teil))
      .limit(1)
    if (data && data.length) {
      if (imHintergrund) return null
      return { id: data[0].id, ...data[0].payload }
    }
    if (imHintergrund) {
      /* Hintergrund-Auffüllung */
      const res = await trainerA2Lesen({ profile: profile.id, teil })
      await supabase.from('exercise_bank').insert({
        profile: profile.id,
        typ: 'lesen',
        payload: { version: 1, teil: res.teil, daten: res.daten },
        status: 'neu',
      })
      return null
    }
    const res = await trainerA2Lesen({ profile: profile.id, teil })
    const eingefuegt = await supabase
      .from('exercise_bank')
      .insert({ profile: profile.id, typ: 'lesen', payload: { version: 1, teil: res.teil, daten: res.daten }, status: 'neu' })
      .select('id')
    return { id: eingefuegt.data?.[0]?.id, teil: res.teil, daten: res.daten }
  }

  useEffect(() => {
    let weg = false
    besorgeUebung()
      .then((u) => {
        if (weg) return
        setUebung(u)
        besorgeUebung(true).catch(() => {})
      })
      .catch(() => {
        if (!weg) setUebung('fehlermeldung')
      })
    return () => {
      weg = true
    }
  }, [runde]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Sanfte Prüfungs-Uhr: zählt nur, bricht nichts ab */
  useEffect(() => {
    if (stufe !== 2 || fertig || typeof uebung !== 'object' || !uebung) return undefined
    const start = Date.now()
    const timer = setInterval(() => {
      setRestSek(Math.max(0, PRUEFUNGS_SEKUNDEN - Math.round((Date.now() - start) / 1000)))
    }, 1000)
    return () => clearInterval(timer)
  }, [stufe, fertig, uebung])

  const d = typeof uebung === 'object' && uebung ? uebung.daten : null

  function fragen() {
    if (!d) return []
    return uebung.teil === 4 ? d.situationen : d.fragen
  }

  function loesungVon(i) {
    return uebung.teil === 4 ? d.loesungen[i] : d.fragen[i].loesung
  }

  function warumVon(i) {
    return uebung.teil === 4 ? d.warum?.[i] : d.fragen[i].warum
  }

  function richtigeAntworten(final) {
    return fragen().filter((_, i) => final[i] === loesungVon(i)).length
  }

  function abschliessen() {
    const punkte = richtigeAntworten(antworten)
    schreibeA2Beleg({
      modul: 'lesen',
      teil: `t${uebung.teil}`,
      punkte,
      max: 5,
      details: { stufe },
    })
    if (uebung.id) {
      supabase.from('exercise_bank').update({ status: 'erledigt', korrekt: punkte >= 4 }).eq('id', uebung.id).then(() => {})
    }
    setFertig(true)
  }

  function naechsteUebung() {
    try {
      const z = (parseInt(localStorage.getItem('a2lesen:teil') ?? '0', 10) || 0) + 1
      localStorage.setItem('a2lesen:teil', String(z))
    } catch {
      /* egal */
    }
    setUebung('laedt')
    setAntworten([])
    setFertig(false)
    setRestSek(PRUEFUNGS_SEKUNDEN)
    setRunde((r) => r + 1)
  }

  function stufeWaehlen(s) {
    setStufe(s)
    setRestSek(PRUEFUNGS_SEKUNDEN)
    try {
      localStorage.setItem('a2lesen:stufe', String(s))
    } catch {
      /* egal */
    }
  }

  const kopf = (
    <div className="review-header">
      <button className="back-btn" onClick={onExit} aria-label={t.back}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <span className="daily-label" lang="de">📖 Lesen{typeof uebung === 'object' && uebung?.teil ? ` · Teil ${uebung.teil}` : ''}</span>
      {stufe === 2 && typeof uebung === 'object' && uebung && !fertig && (
        <span className={restSek === 0 ? 'ls-uhr ls-uhr-um' : 'ls-uhr'}>
          ⏱ {Math.floor(restSek / 60)}:{String(restSek % 60).padStart(2, '0')}
        </span>
      )}
    </div>
  )

  const stufenLeiste = (
    <div className="st-stufen">
      <button className={stufe === 1 ? 'st-stufe st-stufe-an' : 'st-stufe'} onClick={() => stufeWaehlen(1)}>
        🐢 학습 모드 <span className="hv-stufe-sub">시간 제한 없이</span>
      </button>
      <button className={stufe === 2 ? 'st-stufe st-stufe-an' : 'st-stufe'} onClick={() => stufeWaehlen(2)}>
        ⏱ 시험 모드 <span className="hv-stufe-sub">7분 시계와 함께</span>
      </button>
    </div>
  )

  if (uebung === 'laedt') {
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte">
          <div className="kal-emoji">📖</div>
          <p className="kal-text" lang="ko">읽기 연습을 준비하는 중…</p>
        </div>
      </div>
    )
  }

  if (uebung === 'fehlermeldung') {
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte">
          <div className="kal-emoji">🌙</div>
          <p className="kal-text" lang="ko">지금은 연습을 만들 수 없어요 — 연결을 확인하고 다시 와요.</p>
          <button className="done-btn" onClick={onExit}>{t.back}</button>
        </div>
      </div>
    )
  }

  const anzahl = fragen().length
  const alleBeantwortet = fragen().every((_, i) => antworten[i] !== undefined)

  /* ---------- Ergebnis ---------- */
  if (fertig) {
    const punkte = richtigeAntworten(antworten)
    return (
      <div className="screen">
        {kopf}
        <div className="lt2-scroll">
          <div className="kal-mitte studio-fertig">
            <div className="kal-emoji">{punkte >= 4 ? '🌱' : '💪'}</div>
            <p className="kal-text">{punkte} / {anzahl}</p>
          </div>

          <div className="hv-aufloesung">
            {fragen().map((f, i) => {
              const richtig = antworten[i] === loesungVon(i)
              const soll =
                uebung.teil === 4
                  ? loesungVon(i) === 'x' ? 'X (keine Anzeige)' : `Anzeige ${loesungVon(i)}`
                  : f.optionen[loesungVon(i)]
              return (
                <div key={i} className="ls-aufloesung-block">
                  <p className={richtig ? 'hv-zeile hv-ok' : 'hv-zeile hv-falsch'} lang="de">
                    {richtig ? '✓' : '✗'} {uebung.teil === 4 ? `${f.name}: ${f.text}` : (f.frage ?? f.situation)} → <strong>{soll}</strong>
                  </p>
                  {warumVon(i) && <p className="mn-warum" lang="ko">{warumVon(i)}</p>}
                </div>
              )
            })}
          </div>

          <Nachfrage
            profile={profile}
            t={t}
            kontext={
              `Goethe A2 Lesen Teil ${uebung.teil}. Exercise data: ${JSON.stringify(d).slice(0, 2500)}\n` +
              `Her answers (indices/ids): ${JSON.stringify(antworten)} — score ${punkte}/${anzahl}.`
            }
          />

          <div className="hv-wahl">
            <span className="a2-ko-klein" lang="ko">다음 연습:</span>
            {['mix', '1', '2', '3', '4'].map((w) => {
              const aktiv = (() => {
                try {
                  return (localStorage.getItem('a2lesen:wahl') ?? 'mix') === w
                } catch {
                  return w === 'mix'
                }
              })()
              return (
                <button
                  key={w}
                  className={aktiv ? 'st-stufe st-stufe-an hv-wahl-knopf' : 'st-stufe hv-wahl-knopf'}
                  onClick={() => {
                    try {
                      localStorage.setItem('a2lesen:wahl', w)
                    } catch {
                      /* egal */
                    }
                    naechsteUebung()
                  }}
                  lang="de"
                >
                  {w === 'mix' ? 'Mix' : w === '4' ? '🕵️ Teil 4' : `Teil ${w}`}
                </button>
              )
            })}
          </div>
          <div className="lt2-ende">
            <button className="done-btn lt2-fertigknopf" onClick={onExit}>{t.back}</button>
          </div>
        </div>
      </div>
    )
  }

  /* ---------- Übungs-Ansicht ---------- */
  return (
    <div className="screen">
      {kopf}
      <div className="lt2-scroll">
        {stufenLeiste}
        <Auftrag id={`lesen-t${uebung.teil}`} de={RUBRIK[uebung.teil].de} ko={RUBRIK[uebung.teil].ko} />

        {/* Lesetext je Teil */}
        {(uebung.teil === 1 || uebung.teil === 3) && (
          <div className="ls-text" lang="de">
            {uebung.teil === 1 && d.titel && <p className="ls-titel">{d.titel}</p>}
            {d.text.split('\n').map((z, i) => (
              <p key={i}>{z}</p>
            ))}
            {uebung.teil === 3 && d.von && <p className="ls-gruss">{d.von}</p>}
          </div>
        )}

        {uebung.teil === 2 && (
          <div className="ls-text ls-tafel" lang="de">
            {d.titel && <p className="ls-titel">{d.titel}</p>}
            {d.zeilen.map((z, i) => (
              <p key={i} className="ls-tafel-zeile">
                <strong>{z.ort}</strong> {z.inhalt}
              </p>
            ))}
          </div>
        )}

        {uebung.teil === 4 && (
          <div className="ls-anzeigen">
            {d.anzeigen.map((a) => (
              <div key={a.id} className="ls-anzeige" lang="de">
                <span className="ls-anzeige-id">{a.id}</span>
                <p className="ls-anzeige-titel">{a.titel}</p>
                <p className="ls-anzeige-text">{a.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Fragen */}
        <div className="ls-fragen">
          {uebung.teil !== 4 &&
            d.fragen.map((f, i) => (
              <div key={i} className="ls-frage">
                <p className="rd-situation" lang="de">
                  {i + 1}. {f.frage ?? f.situation}
                </p>
                <div className="ls-optionen">
                  {f.optionen.map((o, k) => (
                    <button
                      key={k}
                      className={antworten[i] === k ? 'rd-option ls-gewaehlt' : 'rd-option'}
                      lang="de"
                      onClick={() => {
                        const neu = [...antworten]
                        neu[i] = k
                        setAntworten(neu)
                      }}
                    >
                      {['a', 'b', 'c'][k]}) {o}
                    </button>
                  ))}
                </div>
              </div>
            ))}

          {uebung.teil === 4 &&
            d.situationen.map((s, i) => (
              <div key={i} className="ls-frage">
                <p className="rd-situation" lang="de">
                  {i + 1}. {s.name}: {s.text}
                </p>
                <div className="hv-janein ls-zuordnung">
                  {[...d.anzeigen.map((a) => a.id), 'x'].map((id) => (
                    <button
                      key={id}
                      className={antworten[i] === id ? 'st-stufe st-stufe-an' : 'st-stufe'}
                      onClick={() => {
                        const neu = [...antworten]
                        neu[i] = id
                        setAntworten(neu)
                      }}
                      lang="de"
                    >
                      {id === 'x' ? 'X' : id}
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </div>

        <button className="done-btn lt2-pruefen" disabled={!alleBeantwortet} onClick={abschliessen}>
          {t.check}
        </button>
      </div>
    </div>
  )
}

export default LeseTraining
