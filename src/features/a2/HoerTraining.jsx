import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../core/supabaseClient'
import { trainerA2Hoeren } from '../trainer/trainerApi'
import { playSequence, prewarmSequence, SpeakButton } from '../../shared/tts'
import { schreibeA2Beleg } from '../../core/storage'
import Auftrag from '../../shared/Auftrag'

/* ============================================================
   HÖRVERSTEHEN — alle 4 Teil-Formate des Goethe-Zertifikats A2
   (Konzept mit Franz, 03.09.)

   - Übungen werden ON DEMAND erzeugt (Etappen-Anzeige) und in
     der exercise_bank gepuffert; während geübt wird, füllt die
     App im Hintergrund die nächste Übung auf + wärmt ihr Audio
     vor (Hintergrund-Prinzip).
   - Vertont wird über den TTS-Cache: Monologe mit rotierenden
     Stimmen, Dialoge als abwechselnde Clips (A=nova, B/M=echo).
     Franz' eigene Aufnahmen ersetzen später die B-Spur.
   - PRÜFUNGSTREUE: Teil 2/3 nur EINMAL hören (der Knopf
     verschwindet), Teil 1/4 zweimal — im Lernmodus (Stufe 1)
     ist alles freier: langsameres Tempo (Abspielrate 0,85),
     beliebig oft hören, Transkript nach der Antwort.
   - Rubriken wörtlich wie im Übungssatz (Auftrag-Komponente).
   ============================================================ */

const RUBRIK = {
  1: { de: 'Sie hören fünf kurze Texte. Sie hören jeden Text zweimal. Wählen Sie die richtige Lösung a, b oder c.', ko: '짧은 글 5개를 각각 두 번 들어요. 맞는 답을 고르세요.' },
  2: { de: 'Sie hören ein Gespräch. Sie hören den Text einmal. Was hat die Person an welchem Tag gemacht? Wählen Sie.', ko: '대화를 딱 한 번만 들어요. 요일마다 무엇을 했는지 고르세요.' },
  3: { de: 'Sie hören fünf kurze Gespräche. Sie hören jeden Text einmal. Wählen Sie die richtige Lösung.', ko: '짧은 대화 5개를 각각 딱 한 번만 들어요.' },
  4: { de: 'Sie hören ein Interview. Sie hören den Text zweimal. Wählen Sie Ja oder Nein.', ko: '인터뷰를 두 번 들어요. 예/아니오를 고르세요.' },
}

const MONO_STIMMEN = ['nova', 'echo', 'ballad', 'onyx', 'coral']
const DIALOG_STIMME = { A: 'nova', B: 'echo', M: 'echo', G: 'nova' }
const MAX_HOEREN = { 1: 2, 2: 1, 3: 1, 4: 2 }

/* Clip-Liste für einen Übungsblock bauen */
function clips(teil, daten, blockIndex) {
  if (teil === 1) {
    const t = daten.texte[blockIndex]
    return [{ text: t.skript, voice: MONO_STIMMEN[blockIndex % MONO_STIMMEN.length] }]
  }
  if (teil === 3) {
    return daten.gespraeche[blockIndex].dialog.map((d) => ({ text: d.text, voice: DIALOG_STIMME[d.s] }))
  }
  /* Teil 2 + 4: ein großes Gespräch */
  return daten.dialog.map((d) => ({ text: d.text, voice: DIALOG_STIMME[d.s] }))
}

function alleClips(teil, daten) {
  if (teil === 1) return daten.texte.flatMap((_, i) => clips(1, daten, i))
  if (teil === 3) return daten.gespraeche.flatMap((_, i) => clips(3, daten, i))
  return clips(teil, daten, 0)
}

function transkript(teil, daten, blockIndex) {
  if (teil === 1) return [{ s: '', text: daten.texte[blockIndex].skript }]
  if (teil === 3) return daten.gespraeche[blockIndex].dialog
  return daten.dialog
}

function HoerTraining({ profile, t, onExit }) {
  const [stufe, setStufe] = useState(() => {
    try {
      return parseInt(localStorage.getItem('a2hoeren:stufe') ?? '1', 10) || 1
    } catch {
      return 1
    }
  })
  /* 'laedt' | 'fehlermeldung' | Übung {id?, teil, daten} */
  const [uebung, setUebung] = useState('laedt')
  const [etappe, setEtappe] = useState('')
  const [block, setBlock] = useState(0)
  const [antworten, setAntworten] = useState([])
  const [gehoert, setGehoert] = useState(0)
  const [spielt, setSpielt] = useState(false)
  const [fertig, setFertig] = useState(false)
  const [zeigeSkript, setZeigeSkript] = useState(false)
  const [runde, setRunde] = useState(0)
  const regler = useRef(null)

  /* ---------- Vorrat: laden oder erzeugen ---------- */
  async function besorgeUebung(imHintergrund = false) {
    /* Gezielt wiederholen (Feedback Franz): eine gespeicherte
       Teil-Wahl schlägt die Mix-Rotation. Der Vorrat ist ENDLOS —
       jede "Nächste Übung" holt oder erzeugt eine frische. */
    let wahl = 'mix'
    try {
      wahl = localStorage.getItem('a2hoeren:wahl') ?? 'mix'
    } catch {
      /* egal */
    }
    const zaehler = (() => {
      try {
        return parseInt(localStorage.getItem('a2hoeren:teil') ?? '0', 10) || 0
      } catch {
        return 0
      }
    })()
    const teil =
      wahl === 'mix' ? [1, 3, 4, 2][(zaehler + (imHintergrund ? 1 : 0)) % 4] : parseInt(wahl, 10)

    const { data } = await supabase
      .from('exercise_bank')
      .select('id,payload')
      .eq('profile', profile.id)
      .eq('typ', 'hoeren')
      .eq('status', 'neu')
      .eq('payload->>teil', String(teil))
      .limit(1)
    if (data && data.length) {
      if (imHintergrund) {
        prewarmSequence(alleClips(data[0].payload.teil, data[0].payload.daten), 'de')
        return null
      }
      return { id: data[0].id, ...data[0].payload }
    }
    if (!imHintergrund) setEtappe('✍️ 스크립트를 만드는 중…')
    const res = await trainerA2Hoeren({ profile: profile.id, teil })
    const zeile = { profile: profile.id, typ: 'hoeren', payload: { version: 1, teil: res.teil, daten: res.daten }, status: 'neu' }
    const eingefuegt = await supabase.from('exercise_bank').insert(zeile).select('id')
    if (!imHintergrund) setEtappe('🔊 오디오를 준비하는 중…')
    prewarmSequence(alleClips(res.teil, res.daten), 'de')
    if (imHintergrund) return null
    return { id: eingefuegt.data?.[0]?.id, teil: res.teil, daten: res.daten }
  }

  useEffect(() => {
    let weg = false
    besorgeUebung()
      .then((u) => {
        if (weg) return
        setUebung(u)
        /* Hintergrund: die NÄCHSTE Übung schon mal vorbereiten */
        besorgeUebung(true).catch(() => {})
      })
      .catch(() => {
        if (!weg) setUebung('fehlermeldung')
      })
    return () => {
      weg = true
      regler.current?.stop()
    }
  }, [runde]) // eslint-disable-line react-hooks/exhaustive-deps

  function hoeren() {
    if (spielt) return
    const maxH = stufe === 1 ? 99 : MAX_HOEREN[uebung.teil]
    if (gehoert >= maxH) return
    setSpielt(true)
    setGehoert((n) => n + 1)
    regler.current = playSequence(clips(uebung.teil, uebung.daten, block), 'de', {
      rate: stufe === 1 ? 0.85 : 1,
      onEnde: () => setSpielt(false),
    })
  }

  function stoppen() {
    regler.current?.stop()
    setSpielt(false)
  }

  const bloecke = uebung?.teil === 1 ? 5 : uebung?.teil === 3 ? 5 : 1

  function antworte(wert) {
    const neu = [...antworten]
    neu[uebung.teil === 2 || uebung.teil === 4 ? wert.index : block] =
      uebung.teil === 2 || uebung.teil === 4 ? wert.wahl : wert
    setAntworten(neu)
    /* Teil 1/3: nach der Antwort weiter zum nächsten Block */
    if ((uebung.teil === 1 || uebung.teil === 3) && block + 1 < bloecke) {
      stoppen()
      setBlock(block + 1)
      setGehoert(0)
    } else if (uebung.teil === 1 || uebung.teil === 3) {
      abschliessen(neu)
    }
  }

  function richtigeAntworten(final) {
    const d = uebung.daten
    if (uebung.teil === 1) return final.filter((a, i) => a === d.texte[i].loesung).length
    if (uebung.teil === 3) return final.filter((a, i) => a === d.gespraeche[i].loesung).length
    if (uebung.teil === 2) return final.filter((a, i) => a === d.loesungen[i]).length
    return final.filter((a, i) => a === d.aussagen[i].wahr).length
  }

  function abschliessen(final) {
    stoppen()
    const punkte = richtigeAntworten(final)
    schreibeA2Beleg({
      modul: 'hoeren',
      teil: `t${uebung.teil}`,
      punkte,
      max: 5,
      details: { stufe },
    })
    if (uebung.id) {
      supabase.from('exercise_bank').update({ status: 'erledigt', korrekt: punkte >= 4 }).eq('id', uebung.id).then(() => {})
    }
    setAntworten(final)
    setFertig(true)
  }

  function naechsteUebung() {
    try {
      const z = (parseInt(localStorage.getItem('a2hoeren:teil') ?? '0', 10) || 0) + 1
      localStorage.setItem('a2hoeren:teil', String(z))
    } catch {
      /* egal */
    }
    stoppen()
    setUebung('laedt')
    setBlock(0)
    setAntworten([])
    setGehoert(0)
    setFertig(false)
    setZeigeSkript(false)
    setRunde((r) => r + 1)
  }

  const kopf = (
    <div className="review-header">
      <button className="back-btn" onClick={() => { stoppen(); onExit() }} aria-label={t.back}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <span className="daily-label" lang="de">🎧 Hören{uebung?.teil ? ` · Teil ${uebung.teil}` : ''}</span>
    </div>
  )

  function stufeWaehlen(s) {
    setStufe(s)
    try {
      localStorage.setItem('a2hoeren:stufe', String(s))
    } catch {
      /* egal */
    }
  }

  /* Zwei klar erkennbare Modus-Knöpfe (Feedback Franz 03.09.:
     der einzelne Umschalter war nicht verständlich) */
  const stufenLeiste = (
    <div className="st-stufen">
      <button className={stufe === 1 ? 'st-stufe st-stufe-an' : 'st-stufe'} onClick={() => stufeWaehlen(1)}>
        🐢 학습 모드 <span className="hv-stufe-sub">천천히 · 여러 번</span>
      </button>
      <button className={stufe === 2 ? 'st-stufe st-stufe-an' : 'st-stufe'} onClick={() => stufeWaehlen(2)}>
        ⏱ 시험 모드 <span className="hv-stufe-sub">실제 규칙대로</span>
      </button>
    </div>
  )

  if (uebung === 'laedt') {
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte">
          <div className="kal-emoji">🎧</div>
          <p className="kal-text" lang="ko">{etappe || '연습을 불러오는 중…'}</p>
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

  const d = uebung.daten
  const maxH = stufe === 1 ? Infinity : MAX_HOEREN[uebung.teil]
  const nochHoeren = gehoert < maxH

  /* ---------- Ergebnis ---------- */
  if (fertig) {
    const punkte = richtigeAntworten(antworten)
    return (
      <div className="screen">
        {kopf}
        <div className="lt2-scroll">
          <div className="kal-mitte studio-fertig">
            <div className="kal-emoji">{punkte >= 4 ? '🌱' : '💪'}</div>
            <p className="kal-text">{punkte} / 5</p>
          </div>

          {/* Auflösung je Frage */}
          <div className="hv-aufloesung">
            {(uebung.teil === 1 ? d.texte : uebung.teil === 3 ? d.gespraeche : uebung.teil === 2 ? d.tage : d.aussagen).map((x, i) => {
              const richtig =
                uebung.teil === 1 ? antworten[i] === d.texte[i].loesung
                : uebung.teil === 3 ? antworten[i] === d.gespraeche[i].loesung
                : uebung.teil === 2 ? antworten[i] === d.loesungen[i]
                : antworten[i] === d.aussagen[i].wahr
              const soll =
                uebung.teil === 1 ? d.texte[i].optionen[d.texte[i].loesung]
                : uebung.teil === 3 ? d.gespraeche[i].optionen[d.gespraeche[i].loesung]
                : uebung.teil === 2 ? d.optionen[d.loesungen[i]]
                : d.aussagen[i].wahr ? 'Ja' : 'Nein'
              const label = uebung.teil === 2 ? d.tage[i] : uebung.teil === 4 ? d.aussagen[i].text : (x.frage ?? `Text ${i + 1}`)
              return (
                <p key={i} className={richtig ? 'hv-zeile hv-ok' : 'hv-zeile hv-falsch'} lang="de">
                  {richtig ? '✓' : '✗'} {label} → <strong>{soll}</strong>
                </p>
              )
            })}
          </div>

          {/* Transkript — der Lernmotor */}
          <button type="button" className="nf-oeffnen" onClick={() => setZeigeSkript(!zeigeSkript)}>
            📄 {zeigeSkript ? '스크립트 닫기' : '스크립트 보기'}
          </button>
          {zeigeSkript && (
            <div className="hv-skript">
              {(uebung.teil === 1 ? d.texte.map((tx) => ({ s: '', text: tx.skript }))
                : uebung.teil === 3 ? d.gespraeche.flatMap((g, gi) => [{ s: '', text: `— Gespräch ${gi + 1} —` }, ...g.dialog])
                : d.dialog
              ).map((z, i) => (
                <p key={i} lang="de">
                  {z.s ? <strong>{z.s}: </strong> : null}
                  {z.text}
                  {z.s !== '' && !z.text.startsWith('—') && (
                    <SpeakButton text={z.text} lang="de" className="speak-inline" />
                  )}
                </p>
              ))}
            </div>
          )}

          {/* Gezielt weiterüben: Mix oder ein bestimmter Teil —
              der Nachschub ist endlos (jede Runde wird frisch
              erzeugt), Feedback inklusive */}
          <div className="hv-wahl">
            <span className="a2-ko-klein" lang="ko">다음 연습:</span>
            {['mix', '1', '2', '3', '4'].map((w) => {
              const aktiv = (() => {
                try {
                  return (localStorage.getItem('a2hoeren:wahl') ?? 'mix') === w
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
                      localStorage.setItem('a2hoeren:wahl', w)
                    } catch {
                      /* egal */
                    }
                    naechsteUebung()
                  }}
                  lang="de"
                >
                  {w === 'mix' ? 'Mix' : `Teil ${w}`}
                </button>
              )
            })}
          </div>
          <div className="lt2-ende">
            <button className="done-btn lt2-fertigknopf" onClick={() => { stoppen(); onExit() }}>{t.back}</button>
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
        <Auftrag id={`hoeren-t${uebung.teil}`} de={RUBRIK[uebung.teil].de} ko={RUBRIK[uebung.teil].ko} />

        {(uebung.teil === 1 || uebung.teil === 3) && (
          <p className="a2-ko-klein" lang="de">
            {uebung.teil === 1 ? 'Text' : 'Gespräch'} {block + 1} / 5
          </p>
        )}

        {/* Abspielen — prüfungstreu limitiert */}
        <button className="hv-play" onClick={spielt ? stoppen : hoeren} disabled={!spielt && !nochHoeren}>
          {spielt ? '⏸' : '▶'}
        </button>
        <p className="a2-ko-klein" lang="ko">
          {stufe === 1 ? '학습 모드: 천천히, 여러 번 들어도 돼요' : nochHoeren ? `들을 수 있는 횟수: ${maxH - gehoert}` : '더 들을 수 없어요 — 시험처럼!'}
        </p>

        {/* Fragen je Teil */}
        {uebung.teil === 1 && (
          <div className="rd-optionen">
            <p className="rd-situation" lang="de">{d.texte[block].frage}</p>
            {d.texte[block].optionen.map((o, i) => (
              <button key={i} className="rd-option" lang="de" onClick={() => antworte(i)}>
                {['a', 'b', 'c'][i]}) {o}
              </button>
            ))}
          </div>
        )}

        {uebung.teil === 3 && (
          <div className="rd-optionen">
            <p className="rd-situation" lang="de">{d.gespraeche[block].frage}</p>
            {d.gespraeche[block].optionen.map((o, i) => (
              <button key={i} className="rd-option" lang="de" onClick={() => antworte(i)}>
                {['a', 'b', 'c'][i]}) {o}
              </button>
            ))}
          </div>
        )}

        {uebung.teil === 2 && (
          <div className="hv-tage">
            {d.tage.map((tag, i) => (
              <div key={i} className="hv-tag">
                <span className="hv-tag-name" lang="de">{tag}</span>
                <select
                  className="hv-select"
                  value={antworten[i] ?? ''}
                  onChange={(e) => antworte({ index: i, wahl: parseInt(e.target.value, 10) })}
                  lang="de"
                >
                  <option value="" disabled>—</option>
                  {d.optionen.map((o, k) => (
                    <option key={k} value={k}>{o}</option>
                  ))}
                </select>
              </div>
            ))}
            <button
              className="done-btn lt2-pruefen"
              disabled={d.tage.some((_, i) => antworten[i] === undefined || antworten[i] === '')}
              onClick={() => abschliessen(antworten)}
            >
              {t.check}
            </button>
          </div>
        )}

        {uebung.teil === 4 && (
          <div className="hv-tage">
            {d.aussagen.map((a, i) => (
              <div key={i} className="hv-aussage">
                <span lang="de">{a.text}</span>
                <div className="hv-janein">
                  {[true, false].map((w) => (
                    <button
                      key={String(w)}
                      className={antworten[i] === w ? 'st-stufe st-stufe-an' : 'st-stufe'}
                      onClick={() => antworte({ index: i, wahl: w })}
                      lang="de"
                    >
                      {w ? 'Ja' : 'Nein'}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button
              className="done-btn lt2-pruefen"
              disabled={d.aussagen.some((_, i) => antworten[i] === undefined)}
              onClick={() => abschliessen(antworten)}
            >
              {t.check}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default HoerTraining
