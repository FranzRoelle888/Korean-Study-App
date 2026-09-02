import { useRef, useState } from 'react'
import { ZAHLEN_SAETZE, zahlenGleich } from './zahlen'
import { playSequence } from '../../shared/tts'
import { schreibeA2Beleg } from '../../core/storage'
import Auftrag from '../../shared/Auftrag'

/* ============================================================
   ZAHLEN-DIKTAT — Uhrzeiten, Preise, Gleise nach Gehör tippen
   (A2-Sprint Phase 2; Hören Teil 1 besteht zur Hälfte daraus)

   8 Sätze pro Runde aus der festen Bank (zahlen.js). Jeder Satz
   darf ZWEIMAL gehört werden — wie Hören Teil 1. Vergleich über
   die Ziffern (14:37 = 1437), das Format zeigt der Hinweis.
   Deterministisch, alle Audios liegen im TTS-Cache.
   ============================================================ */

const PRO_RUNDE = 8

function mische(liste) {
  const a = [...liste]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function ZahlenDiktat({ profile, t, onExit }) {
  const [saetze] = useState(() => mische(ZAHLEN_SAETZE).slice(0, PRO_RUNDE))
  const [index, setIndex] = useState(0)
  const [eingabe, setEingabe] = useState('')
  const [gehoert, setGehoert] = useState(0)
  const [geloest, setGeloest] = useState(null) /* null | 'richtig' | 'falsch' */
  const [richtig, setRichtig] = useState(0)
  const [fertig, setFertig] = useState(false)
  const regler = useRef(null)

  const satz = saetze[index]

  function hoeren() {
    if (gehoert >= 2 && !geloest) return
    setGehoert((n) => n + 1)
    regler.current = playSequence([{ text: satz.satz }], 'de', {})
  }

  function pruefen() {
    if (geloest) return
    const ok = zahlenGleich(eingabe, satz.loesung)
    setGeloest(ok ? 'richtig' : 'falsch')
    if (ok) setRichtig((r) => r + 1)
  }

  function weiter() {
    regler.current?.stop()
    if (index + 1 < saetze.length) {
      setIndex(index + 1)
      setEingabe('')
      setGehoert(0)
      setGeloest(null)
    } else {
      schreibeA2Beleg({
        modul: 'hoeren',
        teil: 'zahlen',
        punkte: richtig,
        max: saetze.length,
      })
      setFertig(true)
    }
  }

  const kopf = (
    <div className="review-header">
      <button className="back-btn" onClick={() => { regler.current?.stop(); onExit() }} aria-label={t.back}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <span className="daily-label" lang="de">🔢 Zahlen-Diktat</span>
    </div>
  )

  if (fertig) {
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte">
          <div className="kal-emoji">{richtig >= 6 ? '🌱' : '💪'}</div>
          <p className="kal-text">{richtig} / {saetze.length}</p>
          <button className="done-btn" onClick={() => { setFertig(false); setIndex(0); setRichtig(0); setEingabe(''); setGehoert(0); setGeloest(null) }} lang="de">
            Noch eine Runde
          </button>
          <button className="done-btn lt2-fertigknopf" onClick={onExit}>{t.back}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      {kopf}
      <div className="lt2-scroll">
        <Auftrag
          id="zahlen-diktat"
          de="Hören Sie und schreiben Sie die Zahl. Sie hören jeden Satz zweimal."
          ko="듣고 숫자를 쓰세요. 문장마다 두 번 들을 수 있어요."
        />
        <p className="a2-ko-klein">{index + 1} / {saetze.length}</p>

        <button className="hv-play" onClick={hoeren} disabled={gehoert >= 2 && !geloest}>▶</button>
        <p className="a2-ko-klein" lang="ko">{gehoert >= 2 ? '더 들을 수 없어요' : `들을 수 있는 횟수: ${2 - gehoert}`}</p>

        <p className="rd-situation" lang="ko">{satz.frageKo}</p>

        {!geloest ? (
          <>
            <input
              className="lt2-feld lt2-feld-breit rd-eingabe"
              value={eingabe}
              onChange={(e) => setEingabe(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') pruefen()
              }}
              placeholder={satz.hinweis}
              inputMode="numeric"
            />
            <button className="done-btn lt2-pruefen" onClick={pruefen} disabled={!eingabe.trim()}>
              {t.check}
            </button>
          </>
        ) : (
          <div className="rd-aufloesung">
            <p className={geloest === 'richtig' ? 'rd-gut' : 'rd-schlecht'}>
              {geloest === 'richtig' ? '✓ 맞아요!' : `✗ ${satz.loesung}`}
            </p>
            <p className="rd-beispiel" lang="de">{satz.satz}</p>
            <button className="done-btn" onClick={weiter}>Weiter</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ZahlenDiktat
