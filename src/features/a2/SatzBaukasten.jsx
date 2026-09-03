import { useState } from 'react'
import { SATZBAU_STUFEN } from './satzbau'
import { speak, SpeakButton } from '../../shared/tts'
import Auftrag from '../../shared/Auftrag'

/* ============================================================
   SATZ-BAUKASTEN — die Verbstellungs-Leiter (Phase 4, 04.09.)

   Wort-Bausteine in die richtige Reihenfolge tippen. Die
   koreanische Übersetzung steht SCHON VOR dem Bauen da (Feedback
   Haein 04.09.: sie soll wissen, was sie sagt — gelernt wird nur
   die Anordnung). Der erste Baustein ist vorgelegt (nimmt
   Mehrdeutigkeit raus), der Rest ist gemischt; Punkt/Fragezeichen
   werden von den Kacheln entfernt — sie würden die Position
   verraten. Feste Leiter: Hauptsatz -> Inversion ->
   Modalverb-Klammer -> Perfekt-Klammer -> weil/dass.
   Aufstieg: 3 richtige Sätze IN FOLGE schalten die nächste
   Stufe frei (gespeichert in localStorage). Komplett offline —
   kostenlos und streak-sicher; nur das Vorlesen des gelösten
   Satzes nutzt den TTS-Cache (degradiert sanft).
   ============================================================ */

function mische(liste) {
  const a = [...liste]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const SAETZE_PRO_RUNDE = 8

/* Satzzeichen am Baustein-Ende verraten die Position — in der
   Übung weglassen, in Auflösung und Vorlesen bleiben sie drin */
function ohneZeichen(baustein) {
  return baustein.replace(/[.?!]+$/, '')
}

function liesZahl(key, standard) {
  try {
    return parseInt(localStorage.getItem(key) ?? String(standard), 10) || standard
  } catch {
    return standard
  }
}

function schreibZahl(key, wert) {
  try {
    localStorage.setItem(key, String(wert))
  } catch {
    /* egal */
  }
}

function SatzBaukasten({ t, onExit }) {
  /* frei = höchste freigeschaltete Stufe */
  const [frei, setFrei] = useState(() => liesZahl('a2satzbau:frei', 1))
  const [stufeId, setStufeId] = useState(() => Math.min(liesZahl('a2satzbau:stufe', 1), liesZahl('a2satzbau:frei', 1)))
  const [runde, setRunde] = useState(() => mische(SATZBAU_STUFEN[0].saetze).slice(0, SAETZE_PRO_RUNDE))
  const [index, setIndex] = useState(0)
  const [gelegt, setGelegt] = useState([]) /* Indizes in die Baustein-Liste */
  const [kacheln, setKacheln] = useState([]) /* gemischte Rest-Bausteine (Indizes) */
  const [status, setStatus] = useState('baut') /* baut | richtig | falsch */
  const [punkte, setPunkte] = useState(0)
  const [serie, setSerie] = useState(() => liesZahl('a2satzbau:serie', 0))
  const [aufgestiegen, setAufgestiegen] = useState(false)
  const [fertig, setFertig] = useState(false)

  const stufe = SATZBAU_STUFEN.find((s) => s.id === stufeId)
  const satz = runde[index]

  /* Kacheln beim Satzwechsel neu mischen (alle außer Baustein 0) */
  if (satz && kacheln.length === 0 && gelegt.length === 0 && status === 'baut' && !fertig) {
    setKacheln(mische(satz.teile.map((_, i) => i).slice(1)))
  }

  function stufeWechseln(id) {
    if (id > frei) return
    setStufeId(id)
    schreibZahl('a2satzbau:stufe', id)
    const s = SATZBAU_STUFEN.find((x) => x.id === id)
    setRunde(mische(s.saetze).slice(0, SAETZE_PRO_RUNDE))
    setIndex(0)
    setGelegt([])
    setKacheln([])
    setStatus('baut')
    setPunkte(0)
    setFertig(false)
    setAufgestiegen(false)
  }

  function legen(kachelIndex) {
    setGelegt([...gelegt, kachelIndex])
    setKacheln(kacheln.filter((k) => k !== kachelIndex))
  }

  function zurücknehmen(position) {
    const kachelIndex = gelegt[position]
    setGelegt(gelegt.filter((_, i) => i !== position))
    setKacheln([...kacheln, kachelIndex])
  }

  function pruefen() {
    /* Vergleich ohne Satzzeichen — die Kacheln zeigen sie ja auch nicht */
    const gebaut = [0, ...gelegt].map((i) => ohneZeichen(satz.teile[i])).join(' ')
    const soll = satz.teile.map(ohneZeichen).join(' ')
    if (gebaut === soll) {
      setStatus('richtig')
      setPunkte((p) => p + 1)
      speak(satz.teile.join(' '), 'de')
      const neueSerie = serie + 1
      /* Aufstieg: 3 in Folge auf der HÖCHSTEN freien Stufe */
      if (neueSerie >= 3 && stufeId === frei && frei < SATZBAU_STUFEN.length) {
        setFrei(frei + 1)
        schreibZahl('a2satzbau:frei', frei + 1)
        setSerie(0)
        schreibZahl('a2satzbau:serie', 0)
        setAufgestiegen(true)
      } else {
        setSerie(neueSerie)
        schreibZahl('a2satzbau:serie', neueSerie)
      }
    } else {
      setStatus('falsch')
      setSerie(0)
      schreibZahl('a2satzbau:serie', 0)
    }
  }

  function weiter() {
    setAufgestiegen(false)
    if (index + 1 < runde.length) {
      setIndex(index + 1)
      setGelegt([])
      setKacheln([])
      setStatus('baut')
    } else {
      setFertig(true)
    }
  }

  function neueRunde() {
    setRunde(mische(stufe.saetze).slice(0, SAETZE_PRO_RUNDE))
    setIndex(0)
    setGelegt([])
    setKacheln([])
    setStatus('baut')
    setPunkte(0)
    setFertig(false)
    setAufgestiegen(false)
  }

  const kopf = (
    <div className="review-header">
      <button className="back-btn" onClick={onExit} aria-label={t.back}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <span className="daily-label" lang="de">🧱 Satz-Baukasten{!fertig ? ` · ${index + 1}/${runde.length}` : ''}</span>
    </div>
  )

  const stufenChips = (
    <div className="hv-wahl sb-stufen">
      {SATZBAU_STUFEN.map((s) => (
        <button
          key={s.id}
          className={s.id === stufeId ? 'st-stufe st-stufe-an hv-wahl-knopf' : 'st-stufe hv-wahl-knopf'}
          onClick={() => stufeWechseln(s.id)}
          disabled={s.id > frei}
          lang="de"
        >
          {s.id > frei ? '🔒' : s.id}. {s.titel}
        </button>
      ))}
    </div>
  )

  if (fertig) {
    return (
      <div className="screen">
        {kopf}
        <div className="lt2-scroll">
          <div className="kal-mitte studio-fertig">
            <div className="kal-emoji">{punkte >= 6 ? '🌱' : '💪'}</div>
            <p className="kal-text">{punkte} / {runde.length}</p>
            <p className="a2-ko-klein" lang="ko">{stufe.ko} — {punkte >= 6 ? '아주 잘했어요!' : '한 번 더 해봐요!'}</p>
          </div>
          {stufenChips}
          <div className="lt2-ende">
            <button className="done-btn" onClick={neueRunde} lang="de">Neue Runde</button>
            <button className="done-btn lt2-fertigknopf" onClick={onExit}>{t.back}</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      {kopf}
      <div className="lt2-scroll">
        {stufenChips}
        <Auftrag
          id="satzbau"
          de="Bauen Sie den Satz in der richtigen Reihenfolge."
          ko="단어 블록을 눌러서 올바른 순서로 문장을 만들어요."
        />
        <p className="a2-ko-klein sb-tipp" lang="ko">💡 {stufe.tipp}</p>

        {/* Die Bedeutung ZUERST — sie weiß, was sie sagt, und
            lernt wirklich nur die Anordnung */}
        <p className="sb-ko" lang="ko">{satz.ko}</p>

        {/* Der Bau-Bereich: erster Baustein vorgelegt */}
        <div className="sb-satzfeld">
          <span className="sb-baustein sb-fest" lang="de">{ohneZeichen(satz.teile[0])}</span>
          {gelegt.map((kachelIndex, pos) => (
            <button
              key={pos}
              className="sb-baustein"
              onClick={() => status === 'baut' && zurücknehmen(pos)}
              lang="de"
            >
              {ohneZeichen(satz.teile[kachelIndex])}
            </button>
          ))}
          {gelegt.length < satz.teile.length - 1 && <span className="sb-luecke" />}
        </div>

        {/* Die Vorrats-Kacheln */}
        {status === 'baut' && (
          <div className="sb-kacheln">
            {kacheln.map((kachelIndex) => (
              <button key={kachelIndex} className="sb-baustein sb-vorrat" onClick={() => legen(kachelIndex)} lang="de">
                {ohneZeichen(satz.teile[kachelIndex])}
              </button>
            ))}
          </div>
        )}

        {status === 'baut' && (
          <button className="done-btn lt2-pruefen" disabled={gelegt.length !== satz.teile.length - 1} onClick={pruefen}>
            {t.check}
          </button>
        )}

        {status === 'richtig' && (
          <div className="rd-aufloesung">
            <p className="rd-gut">✓ 좋아요!</p>
            <p className="rd-beispiel" lang="de">
              {satz.teile.join(' ')}
              <SpeakButton text={satz.teile.join(' ')} lang="de" className="speak-inline" />
            </p>
            <p className="a2-ko-klein" lang="ko">{satz.ko}</p>
            {aufgestiegen && (
              <p className="st-aufstieg" lang="ko">🎉 3문장 연속 성공 — 다음 단계가 열렸어요!</p>
            )}
            <button className="done-btn" onClick={weiter} lang="de">Weiter</button>
          </div>
        )}

        {status === 'falsch' && (
          <div className="rd-aufloesung">
            <p className="rd-schlecht">✗ 아직이에요</p>
            <p className="rd-beispiel" lang="de">
              {satz.teile.join(' ')}
              <SpeakButton text={satz.teile.join(' ')} lang="de" className="speak-inline" />
            </p>
            <p className="a2-ko-klein" lang="ko">{satz.ko}</p>
            <p className="a2-ko-klein" lang="ko">💡 {stufe.tipp}</p>
            <button className="done-btn" onClick={weiter} lang="de">Weiter</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default SatzBaukasten
