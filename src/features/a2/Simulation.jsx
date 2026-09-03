import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../core/supabaseClient'
import { trainerA2Hoeren, trainerA2Lesen } from '../trainer/trainerApi'
import { playSequence, prewarmSequence } from '../../shared/tts'
import { schreibeA2Beleg } from '../../core/storage'
import { clips, alleClips } from './HoerTraining'

/* ============================================================
   GENERALPROBE — ein ganzes Modul am Stück (AP3, 04.09.)

   Entscheidungen Franz: nur Hören + Lesen (Schreiben/Sprechen
   haben ihre Prüfungsmodi schon) · Auflösung erst GANZ am Ende ·
   Lesen mit echter 30-Minuten-Uhr, bei 0:00 wird automatisch
   abgegeben (Vorwarnung ab 5 Minuten) · am Ende der Link zum
   offiziellen interaktiven Modellsatz.

   Ablauf: Intro erklärt die Regeln -> alle 4 Teile werden
   besorgt (exercise_bank zuerst, sonst frisch erzeugt) ->
   durcharbeiten ohne Zwischenstand -> Ergebnis auf der echten
   Skala (20 Fragen × 1,25 = /25) + Auflösung pro Teil.
   Hören: strenge Hör-Regeln (Teil 1/4 zweimal, Teil 2/3 einmal).
   Lesen: freie Navigation zwischen den Teilen, wie im Ernstfall.
   Belege: je Teil einer (stufe 'sim', zählt im Radar doppelt).
   ============================================================ */

const MAX_HOEREN = { 1: 2, 2: 1, 3: 1, 4: 2 }
const LESEN_SEKUNDEN = 30 * 60

const RUBRIK_KURZ = {
  hoeren: { 1: '짧은 글 5개 · 2번씩', 2: '요일 대화 · ⚠️ 1번만', 3: '짧은 대화 5개 · ⚠️ 1번만', 4: '인터뷰 · 2번' },
  lesen: { 1: '신문 기사', 2: '안내판', 3: '이메일', 4: '광고 매칭 (X 주의!)' },
}

function hoerRichtig(teil, daten, antworten) {
  if (teil === 1) return antworten.filter((a, i) => a === daten.texte[i].loesung).length
  if (teil === 3) return antworten.filter((a, i) => a === daten.gespraeche[i].loesung).length
  if (teil === 2) return antworten.filter((a, i) => a === daten.loesungen[i]).length
  return antworten.filter((a, i) => a === daten.aussagen[i].wahr).length
}

function leseRichtig(teil, daten, antworten) {
  if (teil === 4) return daten.situationen.filter((_, i) => antworten[i] === daten.loesungen[i]).length
  return daten.fragen.filter((f, i) => antworten[i] === f.loesung).length
}

function Simulation({ profile, t, art, onExit }) {
  const [phase, setPhase] = useState('intro') /* intro | laedt | laeuft | fertig */
  const [etappe, setEtappe] = useState('')
  const [material, setMaterial] = useState([]) /* [{teil, daten, id}] für Teil 1-4 */
  const [teilIndex, setTeilIndex] = useState(0)
  const [antworten, setAntworten] = useState([[], [], [], []])
  const [aufgeklappt, setAufgeklappt] = useState(null)
  /* Hören */
  const [block, setBlock] = useState(0)
  const [gehoert, setGehoert] = useState(0)
  const [spielt, setSpielt] = useState(false)
  const regler = useRef(null)
  /* Lesen */
  const [restSek, setRestSek] = useState(LESEN_SEKUNDEN)
  const abgegeben = useRef(false)

  useEffect(() => {
    return () => regler.current?.stop()
  }, [])

  /* ---------- Material für alle 4 Teile besorgen ---------- */
  async function starten() {
    setPhase('laedt')
    try {
      const teile = []
      for (let teil = 1; teil <= 4; teil++) {
        setEtappe(`${teil}/4 준비 중…`)
        const { data } = await supabase
          .from('exercise_bank')
          .select('id,payload')
          .eq('profile', profile.id)
          .eq('typ', art)
          .eq('status', 'neu')
          .eq('payload->>teil', String(teil))
          .limit(1)
        if (data && data.length) {
          teile.push({ id: data[0].id, ...data[0].payload })
        } else {
          const res = art === 'hoeren'
            ? await trainerA2Hoeren({ profile: profile.id, teil })
            : await trainerA2Lesen({ profile: profile.id, teil })
          const eingefuegt = await supabase
            .from('exercise_bank')
            .insert({ profile: profile.id, typ: art, payload: { version: 1, teil: res.teil, daten: res.daten }, status: 'neu' })
            .select('id')
          teile.push({ id: eingefuegt.data?.[0]?.id, teil: res.teil, daten: res.daten })
        }
        if (art === 'hoeren') prewarmSequence(alleClips(teil, teile[teile.length - 1].daten), 'de')
      }
      setMaterial(teile)
      setAntworten([[], [], [], []])
      setTeilIndex(0)
      setBlock(0)
      setGehoert(0)
      setRestSek(LESEN_SEKUNDEN)
      abgegeben.current = false
      setPhase('laeuft')
    } catch {
      setPhase('intro')
      setEtappe('지금은 준비할 수 없어요 — 연결을 확인해 주세요.')
    }
  }

  /* ---------- Lesen: die echte Uhr ----------
     WICHTIG: über die Ref abgeben — der Timer-Callback würde
     sonst die Antworten vom Start-Moment einfrieren (Stale-
     Closure) und leere Bögen bewerten. */
  useEffect(() => {
    if (art !== 'lesen' || phase !== 'laeuft') return undefined
    const start = Date.now()
    const timer = setInterval(() => {
      const rest = Math.max(0, LESEN_SEKUNDEN - Math.round((Date.now() - start) / 1000))
      setRestSek(rest)
      if (rest === 0) abgebenRef.current() /* Zeit um -> automatisch abgeben */
    }, 1000)
    return () => clearInterval(timer)
  }, [art, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  function abgeben() {
    if (abgegeben.current) return
    abgegeben.current = true
    regler.current?.stop()
    setSpielt(false)
    /* Belege je Teil (stufe 'sim' zählt im Radar doppelt) +
       verbrauchte Bank-Einträge schließen */
    material.forEach((m, i) => {
      const richtig = art === 'hoeren' ? hoerRichtig(m.teil, m.daten, antworten[i]) : leseRichtig(m.teil, m.daten, antworten[i])
      schreibeA2Beleg({ modul: art, teil: `t${m.teil}`, punkte: richtig, max: 5, details: { stufe: 'sim' } })
      if (m.id) supabase.from('exercise_bank').update({ status: 'erledigt', korrekt: richtig >= 4 }).eq('id', m.id).then(() => {})
    })
    setPhase('fertig')
  }

  /* ---------- Hören: Abspielen + Antworten ---------- */
  const aktuelle = material[teilIndex]

  function hoeren() {
    if (spielt || gehoert >= MAX_HOEREN[aktuelle.teil]) return
    setSpielt(true)
    setGehoert((n) => n + 1)
    regler.current = playSequence(clips(aktuelle.teil, aktuelle.daten, block), 'de', {
      onEnde: () => setSpielt(false),
    })
  }

  function stoppen() {
    regler.current?.stop()
    setSpielt(false)
  }

  function hoerAntwort(wert) {
    const neu = antworten.map((a) => [...a])
    const teil = aktuelle.teil
    if (teil === 2 || teil === 4) {
      neu[teilIndex][wert.index] = wert.wahl
      setAntworten(neu)
      return
    }
    neu[teilIndex][block] = wert
    setAntworten(neu)
    stoppen()
    if (block + 1 < 5) {
      setBlock(block + 1)
      setGehoert(0)
    } else {
      naechsterHoerTeil(neu)
    }
  }

  function naechsterHoerTeil(neu) {
    if (teilIndex + 1 < material.length) {
      setTeilIndex(teilIndex + 1)
      setBlock(0)
      setGehoert(0)
    } else {
      /* letzte Antworten direkt mitgeben — State wäre noch alt */
      abgebenMit(neu)
    }
  }

  function abgebenMit(neu) {
    setAntworten(neu)
    /* kleiner Umweg, damit abgeben() die frischen Antworten sieht */
    setTimeout(() => abgebenRef.current(), 0)
  }
  const abgebenRef = useRef(abgeben)
  abgebenRef.current = abgeben

  const kopf = (
    <div className="review-header">
      <button className="back-btn" onClick={() => { stoppen(); onExit() }} aria-label={t.back}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <span className="daily-label" lang="de">🎯 Generalprobe · {art === 'hoeren' ? 'Hören' : 'Lesen'}</span>
      {art === 'lesen' && phase === 'laeuft' && (
        <span className={restSek <= 300 ? 'ls-uhr ls-uhr-um' : 'ls-uhr'}>
          ⏱ {Math.floor(restSek / 60)}:{String(restSek % 60).padStart(2, '0')}
        </span>
      )}
    </div>
  )

  /* ---------- Intro ---------- */
  if (phase === 'intro') {
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte">
          <div className="fs-intro">
            <p className="fs-intro-titel" lang="de">🎯 Generalprobe — wie am Prüfungstag</p>
            <ol className="fs-intro-liste" lang="ko">
              <li><b>네 파트를 한 번에</b> 풀어요 — 중간 정답 확인은 없어요.</li>
              {art === 'hoeren' ? (
                <li>🎧 듣기 규칙 그대로: 파트 1·4는 <b>2번</b>, 파트 2·3은 <b>딱 1번만</b> 들려요.</li>
              ) : (
                <li>⏱ <b>30분 시계</b>가 진짜처럼 돌아가요 — 0:00이 되면 자동 제출!</li>
              )}
              <li>✅ 마지막에 점수(25점 만점)와 전체 풀이가 나와요.</li>
            </ol>
          </div>
          {etappe && <p className="sw-fehler" lang="ko">{etappe}</p>}
          <button className="done-btn" onClick={starten} lang="de">Los geht's!</button>
          <button className="done-btn lt2-fertigknopf" onClick={onExit}>{t.back}</button>
        </div>
      </div>
    )
  }

  if (phase === 'laedt') {
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte">
          <div className="kal-emoji">🎯</div>
          <p className="kal-text" lang="ko">시험지를 준비하는 중… {etappe}</p>
        </div>
      </div>
    )
  }

  /* ---------- Ergebnis ---------- */
  if (phase === 'fertig') {
    const jeTeil = material.map((m, i) =>
      art === 'hoeren' ? hoerRichtig(m.teil, m.daten, antworten[i]) : leseRichtig(m.teil, m.daten, antworten[i])
    )
    const roh = jeTeil.reduce((s, x) => s + x, 0)
    const punkte25 = Math.round(roh * 1.25 * 2) / 2
    return (
      <div className="screen">
        {kopf}
        <div className="lt2-scroll">
          <div className="kal-mitte studio-fertig">
            <div className="kal-emoji">{punkte25 >= 15 ? '🌱' : '💪'}</div>
            <p className="ra-prognose-zahl">{punkte25}</p>
            <p className="a2-ko-klein" lang="ko">/ 25점 ({roh}/20 문제 × 1.25)</p>
          </div>

          <div className="hv-aufloesung">
            {material.map((m, i) => (
              <div key={i} className="ls-aufloesung-block">
                <button type="button" className="hv-zeile sim-teilzeile" onClick={() => setAufgeklappt(aufgeklappt === i ? null : i)} lang="ko">
                  <b>Teil {m.teil}</b> · {RUBRIK_KURZ[art][m.teil]} — <b>{jeTeil[i]}/5</b> {aufgeklappt === i ? '▾' : '▸'}
                </button>
                {aufgeklappt === i && (
                  <div className="ra-teile">
                    {(art === 'hoeren'
                      ? m.teil === 1 ? m.daten.texte.map((x, k) => ({ label: x.frage, richtig: antworten[i][k] === x.loesung, soll: x.optionen[x.loesung] }))
                        : m.teil === 3 ? m.daten.gespraeche.map((x, k) => ({ label: x.frage, richtig: antworten[i][k] === x.loesung, soll: x.optionen[x.loesung] }))
                        : m.teil === 2 ? m.daten.tage.map((tag, k) => ({ label: tag, richtig: antworten[i][k] === m.daten.loesungen[k], soll: m.daten.optionen[m.daten.loesungen[k]] }))
                        : m.daten.aussagen.map((x, k) => ({ label: x.text, richtig: antworten[i][k] === x.wahr, soll: x.wahr ? 'Ja' : 'Nein' }))
                      : m.teil === 4
                        ? m.daten.situationen.map((s, k) => ({ label: `${s.name}: ${s.text}`, richtig: antworten[i][k] === m.daten.loesungen[k], soll: m.daten.loesungen[k] === 'x' ? 'X' : `Anzeige ${m.daten.loesungen[k]}` }))
                        : m.daten.fragen.map((f, k) => ({ label: f.frage ?? f.situation, richtig: antworten[i][k] === f.loesung, soll: f.optionen[f.loesung] }))
                    ).map((z, k) => (
                      <p key={k} className={z.richtig ? 'hv-zeile hv-ok' : 'hv-zeile hv-falsch'} lang="de">
                        {z.richtig ? '✓' : '✗'} {z.label} → <strong>{z.soll}</strong>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Die allerletzte Probe: das Original vom Goethe-Institut */}
          <div className="fs-intro sim-modellsatz">
            <p className="fs-intro-titel" lang="ko">🏛 진짜 마지막 리허설</p>
            <p className="coach-intro-text" lang="ko">
              괴테 공식 <b>인터랙티브 모의시험</b>도 꼭 한번 풀어보세요 — 실제 기출 문제예요:
            </p>
            <a className="sim-link" href="https://www.goethe.de/ins/de/de/prf/prf/gzsd2/ub2.html" target="_blank" rel="noreferrer" lang="de">
              goethe.de — Interaktiver Modellsatz ↗
            </a>
          </div>

          <div className="lt2-ende">
            <button className="done-btn" onClick={() => { setPhase('intro'); setEtappe('') }} lang="de">Neue Probe</button>
            <button className="done-btn lt2-fertigknopf" onClick={onExit}>{t.back}</button>
          </div>
        </div>
      </div>
    )
  }

  /* ---------- Laufender Durchgang ---------- */
  const d = aktuelle.daten
  const nochHoeren = art === 'hoeren' && gehoert < MAX_HOEREN[aktuelle.teil]

  return (
    <div className="screen">
      {kopf}
      <div className="lt2-scroll">
        {/* Fortschritt / Navigation */}
        {art === 'hoeren' ? (
          <p className="a2-ko-klein" lang="de">Teil {aktuelle.teil} / 4</p>
        ) : (
          <div className="hv-wahl">
            {material.map((m, i) => (
              <button
                key={i}
                className={i === teilIndex ? 'st-stufe st-stufe-an hv-wahl-knopf' : 'st-stufe hv-wahl-knopf'}
                onClick={() => setTeilIndex(i)}
                lang="de"
              >
                Teil {m.teil}
              </button>
            ))}
            <button className="st-stufe hv-wahl-knopf sim-abgeben" onClick={abgeben} lang="ko">제출</button>
          </div>
        )}

        <p className="a2-ko-klein" lang="ko">{RUBRIK_KURZ[art][aktuelle.teil]}</p>

        {/* ===== HÖREN ===== */}
        {art === 'hoeren' && (
          <>
            {(aktuelle.teil === 1 || aktuelle.teil === 3) && (
              <p className="a2-ko-klein" lang="de">{aktuelle.teil === 1 ? 'Text' : 'Gespräch'} {block + 1} / 5</p>
            )}
            <button className="hv-play" onClick={spielt ? stoppen : hoeren} disabled={!spielt && !nochHoeren}>
              {spielt ? '⏸' : '▶'}
            </button>
            <p className="a2-ko-klein" lang="ko">
              {nochHoeren ? `들을 수 있는 횟수: ${MAX_HOEREN[aktuelle.teil] - gehoert}` : '더 들을 수 없어요 — 시험처럼!'}
            </p>

            {(aktuelle.teil === 1 || aktuelle.teil === 3) && (
              <div className="rd-optionen">
                <p className="rd-situation" lang="de">{(aktuelle.teil === 1 ? d.texte : d.gespraeche)[block].frage}</p>
                {(aktuelle.teil === 1 ? d.texte : d.gespraeche)[block].optionen.map((o, i) => (
                  <button key={i} className="rd-option" lang="de" onClick={() => hoerAntwort(i)}>
                    {['a', 'b', 'c'][i]}) {o}
                  </button>
                ))}
              </div>
            )}

            {aktuelle.teil === 2 && (
              <div className="hv-tage">
                {d.tage.map((tag, i) => (
                  <div key={i} className="hv-tag">
                    <span className="hv-tag-name" lang="de">{tag}</span>
                    <select
                      className="hv-select"
                      value={antworten[teilIndex][i] ?? ''}
                      onChange={(e) => hoerAntwort({ index: i, wahl: parseInt(e.target.value, 10) })}
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
                  disabled={d.tage.some((_, i) => antworten[teilIndex][i] === undefined || antworten[teilIndex][i] === '')}
                  onClick={() => naechsterHoerTeil(antworten.map((a) => [...a]))}
                  lang="de"
                >
                  Weiter
                </button>
              </div>
            )}

            {aktuelle.teil === 4 && (
              <div className="hv-tage">
                {d.aussagen.map((a, i) => (
                  <div key={i} className="hv-aussage">
                    <span lang="de">{a.text}</span>
                    <div className="hv-janein">
                      {[true, false].map((w) => (
                        <button
                          key={String(w)}
                          className={antworten[teilIndex][i] === w ? 'st-stufe st-stufe-an' : 'st-stufe'}
                          onClick={() => hoerAntwort({ index: i, wahl: w })}
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
                  disabled={d.aussagen.some((_, i) => antworten[teilIndex][i] === undefined)}
                  onClick={() => naechsterHoerTeil(antworten.map((a) => [...a]))}
                  lang="de"
                >
                  Abgeben
                </button>
              </div>
            )}
          </>
        )}

        {/* ===== LESEN ===== */}
        {art === 'lesen' && (
          <>
            {(aktuelle.teil === 1 || aktuelle.teil === 3) && (
              <div className="ls-text" lang="de">
                {aktuelle.teil === 1 && d.titel && <p className="ls-titel">{d.titel}</p>}
                {d.text.split('\n').map((z, i) => (
                  <p key={i}>{z}</p>
                ))}
                {aktuelle.teil === 3 && d.von && <p className="ls-gruss">{d.von}</p>}
              </div>
            )}
            {aktuelle.teil === 2 && (
              <div className="ls-text ls-tafel" lang="de">
                {d.titel && <p className="ls-titel">{d.titel}</p>}
                {d.zeilen.map((z, i) => (
                  <p key={i} className="ls-tafel-zeile"><strong>{z.ort}</strong> {z.inhalt}</p>
                ))}
              </div>
            )}
            {aktuelle.teil === 4 && (
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

            <div className="ls-fragen">
              {aktuelle.teil !== 4 &&
                d.fragen.map((f, i) => (
                  <div key={i} className="ls-frage">
                    <p className="rd-situation" lang="de">{i + 1}. {f.frage ?? f.situation}</p>
                    <div className="ls-optionen">
                      {f.optionen.map((o, k) => (
                        <button
                          key={k}
                          className={antworten[teilIndex][i] === k ? 'rd-option ls-gewaehlt' : 'rd-option'}
                          lang="de"
                          onClick={() => {
                            const neu = antworten.map((a) => [...a])
                            neu[teilIndex][i] = k
                            setAntworten(neu)
                          }}
                        >
                          {['a', 'b', 'c'][k]}) {o}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              {aktuelle.teil === 4 &&
                d.situationen.map((s, i) => (
                  <div key={i} className="ls-frage">
                    <p className="rd-situation" lang="de">{i + 1}. {s.name}: {s.text}</p>
                    <div className="hv-janein ls-zuordnung">
                      {[...d.anzeigen.map((a) => a.id), 'x'].map((id) => (
                        <button
                          key={id}
                          className={antworten[teilIndex][i] === id ? 'st-stufe st-stufe-an' : 'st-stufe'}
                          onClick={() => {
                            const neu = antworten.map((a) => [...a])
                            neu[teilIndex][i] = id
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

            {teilIndex + 1 < material.length ? (
              <button className="done-btn lt2-pruefen" onClick={() => setTeilIndex(teilIndex + 1)} lang="de">
                Weiter zu Teil {material[teilIndex + 1].teil}
              </button>
            ) : (
              <button className="done-btn lt2-pruefen" onClick={abgeben} lang="de">
                Abgeben
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Simulation
