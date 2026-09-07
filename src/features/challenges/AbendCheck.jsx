import { useState } from 'react'
import ClearableInput from '../../shared/ClearableInput'
import { SpeakButton } from '../../shared/tts'
import { Bedeutung, WortVergleich } from '../../shared/motorTeile'
import { istRichtig } from '../../core/vergleich'

/* ============================================================
   ABEND-CHECK (Franz 07.09.) — der zweite Blick am selben Tag

   Ein Wort nach dem anderen: Bedeutung sehen, Koreanisch tippen.
   Richtig -> Haekchen, weiter. Falsch -> Vergleich, dann weiter.
   Am Ende: x von y, die Fehlwoerter als Liste. KEINE Bewertung,
   kein Termin aendert sich, kein Streak — nur Festigung.
   ============================================================ */

function AbendCheck({ material, onDone, onExit, profile, t }) {
  const [i, setI] = useState(0)
  const [input, setInput] = useState('')
  const [urteil, setUrteil] = useState(null) /* null | 'ok' | 'bad' */
  const [fehl, setFehl] = useState([])
  const [treffer, setTreffer] = useState(0)
  const lang = profile.targetLang
  const eintrag = material[i]

  function pruefe(e) {
    e.preventDefault()
    if (!input.trim() || urteil) return
    const ok = istRichtig(input, eintrag.word.ko, lang)
    setUrteil(ok ? 'ok' : 'bad')
    if (ok) setTreffer((n) => n + 1)
    else setFehl((f) => [...f, eintrag.word])
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur()
  }

  function weiter() {
    if (i + 1 >= material.length) {
      onDone()
      setI(i + 1)
    } else {
      setI(i + 1)
    }
    setInput('')
    setUrteil(null)
  }

  if (!eintrag) {
    return (
      <div className="daily">
        <div className="daily-done">
          <div className="done-emoji pop">🌙</div>
          <p className="done-title">{t.abendFertig(treffer, material.length)}</p>
          {fehl.length > 0 && (
            <ul className="ab-fehl">
              {fehl.map((w) => (
                <li key={w.id} lang={lang}>
                  <b>{w.ko}</b> <span className="ab-fehl-en">{w.en}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="done-sub">{t.abendKeinEinfluss}</p>
          <button className="done-btn" onClick={onExit}>
            {t.back}
          </button>
        </div>
      </div>
    )
  }

  const grundText = eintrag.grund === 'neu' ? t.abendGrundNeu : eintrag.grund === 'again' ? t.again : t.hard

  return (
    <div className="daily">
      <div className="review-header">
        <button className="back-btn" onClick={onExit} aria-label={t.back}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>
        <span className="daily-label">
          🌙 {t.abendCheck} · {i + 1}/{material.length}
        </span>
      </div>

      <div className="daily-body">
        <div className={`flashcard motor-karte ${urteil === 'ok' ? 'flash-ok' : urteil === 'bad' ? 'flash-bad' : ''}`}>
          <span className="card-tag">{grundText}</span>
          <div className="card-front" lang={profile.knownLang}>
            <Bedeutung word={eintrag.word} />
          </div>
          {urteil && (
            <div className={urteil === 'ok' ? 'card-answer ok' : 'card-answer bad'}>
              {urteil === 'ok' ? (
                <span lang={lang} className="answer-ko">
                  {eintrag.word.ko}
                  <SpeakButton text={eintrag.word.ko} lang={lang} className="speak-inline" />
                </span>
              ) : (
                <WortVergleich eingabe={input} richtig={eintrag.word.ko} lang={lang} t={t} />
              )}
              {eintrag.word.ex && (
                <span className="card-example">
                  <span lang={lang}>{eintrag.word.ex}</span>
                  {eintrag.word.exTr && <span className="card-example-tr">{eintrag.word.exTr}</span>}
                </span>
              )}
            </div>
          )}
        </div>

        {!urteil ? (
          <form className="type-area" onSubmit={pruefe}>
            <ClearableInput
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onClear={() => setInput('')}
              placeholder={t.typeKorean}
              lang={lang}
              autoComplete="off"
            />
            <button type="submit" className="check-btn">
              {t.check}
            </button>
          </form>
        ) : (
          <button className="check-btn" onClick={weiter}>
            {t.weiter}
          </button>
        )}
      </div>
    </div>
  )
}

export default AbendCheck
