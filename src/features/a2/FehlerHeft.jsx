import { useEffect, useState } from 'react'
import { leseA2Fehler, hakeA2FehlerAb } from '../../core/storage'
import { SpeakButton, speak } from '../../shared/tts'
import Auftrag from '../../shared/Auftrag'

/* ============================================================
   FEHLER-HEFT „실수 노트" — AP2 (04.09.)

   Ihre eigenen Sprach-Korrekturen aus den Übungen, automatisch
   gesammelt (a2_fehler, Migration 013). Aktiver Mini-Drill
   (Entscheidung Franz): die richtige Form muss EINGETIPPT
   werden — erst dann gilt der Fehler als geschafft und wandert
   ins Archiv. Falsch getippt? Bleibt offen, kommt wieder.

   Eintipp-Vergleich: Groß-/Kleinschreibung wird verziehen,
   aber freundlich angemerkt (bei Nomen ist sie ja Inhalt).
   ============================================================ */

function normal(s) {
  return s.trim().replace(/\s+/g, ' ').replace(/[.?!]+$/, '')
}

function FehlerHeft({ t, onExit }) {
  const [eintraege, setEintraege] = useState(null) /* null = lädt */
  const [index, setIndex] = useState(0)
  const [eingabe, setEingabe] = useState('')
  const [status, setStatus] = useState('tippt') /* tippt | richtig | fastRichtig | falsch */
  const [geschafft, setGeschafft] = useState(0)

  useEffect(() => {
    leseA2Fehler('offen').then(setEintraege)
  }, [])

  const eintrag = eintraege?.[index]

  function pruefen() {
    if (!eintrag || !eingabe.trim()) return
    const ist = normal(eingabe)
    const soll = normal(eintrag.richtig)
    if (ist === soll) {
      setStatus('richtig')
      speak(eintrag.richtig, 'de')
      hakeA2FehlerAb(eintrag.id)
      setGeschafft((g) => g + 1)
    } else if (ist.toLowerCase() === soll.toLowerCase()) {
      /* Nur Groß-/Kleinschreibung — zählt, mit freundlichem Hinweis */
      setStatus('fastRichtig')
      speak(eintrag.richtig, 'de')
      hakeA2FehlerAb(eintrag.id)
      setGeschafft((g) => g + 1)
    } else {
      setStatus('falsch')
    }
  }

  function weiter() {
    setIndex(index + 1)
    setEingabe('')
    setStatus('tippt')
  }

  const kopf = (
    <div className="review-header">
      <button className="back-btn" onClick={onExit} aria-label={t.back}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <span className="daily-label" lang="de">
        📕 Fehler-Heft{eintraege?.length ? ` · ${Math.min(index + 1, eintraege.length)}/${eintraege.length}` : ''}
      </span>
    </div>
  )

  if (eintraege === null) {
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte">
          <div className="kal-emoji">📕</div>
          <p className="kal-text" lang="ko">실수 노트를 여는 중…</p>
        </div>
      </div>
    )
  }

  /* Leer oder alles abgearbeitet */
  if (!eintrag) {
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte">
          <div className="kal-emoji">{eintraege.length === 0 && geschafft === 0 ? '📕' : '🌱'}</div>
          {eintraege.length === 0 && geschafft === 0 ? (
            <p className="kal-text" lang="ko">
              실수 노트가 아직 비어 있어요.
              말하기 연습을 하면 교정된 문장이 자동으로 모여요.
            </p>
          ) : (
            <p className="kal-text" lang="ko">
              {geschafft}개 고쳤어요 — 노트가 깨끗해졌어요! 👏
            </p>
          )}
          <button className="done-btn" onClick={onExit}>{t.back}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      {kopf}
      <div className="lt2-scroll">
        <Auftrag
          id="fehlerheft"
          de="Schreiben Sie die richtige Form."
          ko="내가 했던 실수예요 — 맞는 형태로 고쳐 써 보세요."
        />

        {/* Der eigene Fehler, durchgestrichen — plus die Regel */}
        <div className="fh-karte">
          <p className="fh-falsch" lang="de">{eintrag.falsch}</p>
          {eintrag.warum && <p className="mn-warum" lang="ko">{eintrag.warum}</p>}
        </div>

        {status === 'tippt' && (
          <>
            <input
              className="fh-eingabe"
              value={eingabe}
              onChange={(e) => setEingabe(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') pruefen()
              }}
              placeholder="맞게 고쳐 쓰세요"
              lang="de"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <button className="done-btn lt2-pruefen" disabled={!eingabe.trim()} onClick={pruefen}>
              {t.check}
            </button>
          </>
        )}

        {status !== 'tippt' && (
          <div className="rd-aufloesung">
            <p className={status === 'falsch' ? 'rd-schlecht' : 'rd-gut'}>
              {status === 'richtig' ? '✓ 좋아요!' : status === 'fastRichtig' ? '✓ 맞아요!' : '✗ 아직이에요'}
            </p>
            {status === 'fastRichtig' && (
              <p className="a2-ko-klein" lang="ko">대문자만 조심하세요 — 독일어 명사는 대문자로 써요.</p>
            )}
            {status === 'falsch' && eingabe && <p className="fs-transkript" lang="de">🖊 „{eingabe}"</p>}
            <p className="rd-beispiel" lang="de">
              {eintrag.richtig}
              <SpeakButton text={eintrag.richtig} lang="de" className="speak-inline" />
            </p>
            {status === 'falsch' && (
              <p className="a2-ko-klein" lang="ko">이 실수는 노트에 남아 있어요 — 다음에 또 나와요.</p>
            )}
            <button className="done-btn" onClick={weiter} lang="de">Weiter</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default FehlerHeft
