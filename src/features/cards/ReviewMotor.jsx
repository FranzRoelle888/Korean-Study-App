import { useState, useEffect } from 'react'
import { previewInterval, formatInterval, hoerKarteMitText } from '../../core/storage'
import { vorschlaege } from '../../core/motor'
import { istGleich } from '../../core/hangul'
import Confetti from '../../shared/Confetti'
import { MoonIcon, CardRidge } from '../../shared/icons'
import ClearableInput from '../../shared/ClearableInput'
import { SpeakButton, speak, prewarmSpeech } from '../../shared/tts'
import { HanjaZeile, Bedeutung, JamoVergleich } from '../../shared/motorTeile'

/* ============================================================
   WIEDERHOLSTAPEL — Vokabel-Motor V2 (nur Franz' Seite)
   Konzept docs/VOKABEL-KONZEPT.md §2, §3, §7

   Drei Kartenarten:
   ERKENNEN   Wort (+ Hanja, Stimme) -> Bedeutung antippen: ab dem
              2. Zeichen Vorschlagsliste aus der eigenen Bibliothek
              (Englisch + Deutsch). Nur der richtige Eintrag zählt.
   HÖREN      dieselbe Karte, nur Stimme statt Wort (spielt von
              selbst; Text-Rückfall nach 2 Fehlschlägen oder offline)
   PRODUKTION `water (Wasser·)` -> koreanisches Wort exakt tippen,
              bei Fehler Jamo-Vergleich

   Richtig -> drei Knöpfe Barely / Got it / Instant.
   Falsch -> Lösung sehen, „Weiter" = automatisch Again.
   Fokus-Regel: hat das Feld Fokus, verschwindet alles außer dem
   Prompt (auch die Lautsprecher); Fokus weg -> alles zurück.
   ============================================================ */

const RICHTIG_KNOEPFE = [
  { key: 'hard', cls: 'rate-hard' },
  { key: 'good', cls: 'rate-good' },
  { key: 'easy', cls: 'rate-easy' },
]

function artVon(card) {
  if (card.front === 'en' || card.front === 'type') return 'produktion'
  if (card.modus === 'audio' && !hoerKarteMitText(card)) return 'hoeren'
  return 'erkennen'
}

function ReviewMotor({ initialQueue, words, onRate, onUndo, onExit, profile, t, tt }) {
  const [queue, setQueue] = useState(initialQueue)
  const [total] = useState(initialQueue.length)
  const [typed, setTyped] = useState('')
  const [checked, setChecked] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [tippt, setTippt] = useState(false)
  const [flash, setFlash] = useState(null)
  const [exiting, setExiting] = useState(false)
  const [last, setLast] = useState(null)

  const done = total - queue.length
  const card = queue[0]
  const lang = profile.targetLang
  const art = card ? artVon(card) : null

  /* Stimme vorwärmen; Hör-Karte spielt von selbst */
  useEffect(() => {
    if (!card) return
    prewarmSpeech(card.ko, lang)
    if (card.ex) prewarmSpeech(card.ex, lang)
    if (art === 'hoeren') speak(card.ko, lang)
  }, [card && card.id])

  if (!card) {
    const celebrate = total > 0
    return (
      <div className="review">
        {celebrate && <Confetti />}
        <div className="review-done">
          {celebrate ? (
            <>
              <div className="done-emoji pop">🎉</div>
              <p className="done-title done-ko pop" lang="ko">
                좋아요!
              </p>
              <p className="done-sub">{t.clearedAll}</p>
            </>
          ) : (
            <>
              <div className="success-mark">
                <MoonIcon />
              </div>
              <p className="done-title">{t.nothingToReview}</p>
              <p className="done-sub">{t.stackEmpty}</p>
            </>
          )}
          <button className="done-btn" onClick={onExit}>
            {t.back}
          </button>
          {last && (
            <button className="undo-chip" onClick={undo}>
              ↩ {t.undo}
            </button>
          )}
        </div>
      </div>
    )
  }

  function reset() {
    setTyped('')
    setChecked(false)
    setCorrect(false)
    setTippt(false)
    setFlash(null)
    setExiting(false)
  }

  function nextCard(afterRequeue) {
    setQueue((q) => {
      const [first, ...rest] = q
      return afterRequeue ? [...rest, first] : rest
    })
    reset()
  }

  function undo() {
    if (!last) return
    onUndo(last.card)
    setQueue(last.queue)
    reset()
    setLast(null)
  }

  function rate(rating) {
    if (exiting) return
    setLast({ queue, card })
    if (rating !== 'again') {
      setExiting(true)
      setTimeout(() => {
        onRate(card.id, rating)
        nextCard(false)
      }, 320)
    } else {
      onRate(card.id, rating)
      nextCard(true)
    }
  }

  function urteil(ok) {
    setCorrect(ok)
    setChecked(true)
    setFlash(ok ? 'ok' : 'bad')
    setTimeout(() => setFlash(null), 700)
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur()
    setTippt(false)
  }

  /* Produktion: exakt, keine Toleranz */
  function pruefeTippen(e) {
    e.preventDefault()
    if (!typed.trim()) return
    urteil(istGleich(typed, card.ko))
  }

  /* Erkennen/Hören: nur das Antippen des richtigen Eintrags zählt */
  function waehle(v) {
    urteil(v.id === card.wordId)
  }

  const liste = art !== 'produktion' && !checked ? vorschlaege(words, typed) : []
  const flashClass = flash === 'ok' ? 'flash-ok' : flash === 'bad' ? 'flash-bad' : ''
  const tag = art === 'produktion' ? t.tagProduktion : art === 'hoeren' ? t.tagHoeren : t.tagErkennen

  return (
    <div className="review">
      <ReviewHeader done={done} total={total} onExit={onExit} t={t} />

      {last && !checked && (
        <button className="undo-chip" onClick={undo}>
          ↩ {t.undo}
        </button>
      )}

      <div className="review-body">
        <div className={`flashcard motor-karte ${flashClass} ${exiting ? 'card-fly-right' : ''} ${tippt ? 'tippt' : ''}`}>
          <CardRidge />
          <span className="card-tag">{tag}</span>

          {/* ---------- Vorderseite ---------- */}
          {art === 'produktion' && (
            <div className="card-front" lang={profile.knownLang}>
              <Bedeutung word={card} />
            </div>
          )}
          {art === 'erkennen' && (
            <>
              <div className="card-front" lang={lang}>
                {card.ko}
              </div>
              <HanjaZeile hanja={card.hanja} ko={card.ko} className="verbergbar" />
              {card.modus === 'audio' && (
                <span className="hoer-hinweis verbergbar">{t.hoerMitText}</span>
              )}
              <span className="verbergbar">
                <SpeakButton text={card.ko} lang={lang} />
              </span>
            </>
          )}
          {art === 'hoeren' && !checked && (
            <button
              type="button"
              className="hoer-knopf verbergbar"
              onClick={() => speak(card.ko, lang)}
              aria-label={t.nochmalHoeren}
            >
              <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 5 6.5 9H3v6h3.5L11 19z" fill="currentColor" stroke="none" />
                <path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a8 8 0 0 1 0 11" />
              </svg>
              <span className="hoer-knopf-text">{t.nochmalHoeren}</span>
            </button>
          )}
          {art === 'hoeren' && checked && (
            <>
              <div className="card-front" lang={lang}>
                {card.ko}
              </div>
              <HanjaZeile hanja={card.hanja} ko={card.ko} />
            </>
          )}

          {/* ---------- Rückseite ---------- */}
          {checked && (
            <div className={correct ? 'card-answer ok' : 'card-answer bad'}>
              {art === 'produktion' ? (
                correct ? (
                  <span lang={lang} className="answer-ko">
                    {card.ko}
                    <SpeakButton text={card.ko} lang={lang} className="speak-inline" />
                  </span>
                ) : (
                  <JamoVergleich eingabe={typed} richtig={card.ko} t={t} />
                )
              ) : (
                <span lang={profile.knownLang} className="answer-en">
                  <Bedeutung word={card} />
                </span>
              )}
              {art === 'produktion' && <HanjaZeile hanja={card.hanja} ko={card.ko} />}
              <span className="answer-note">{correct ? t.correct : t.wrong}</span>
              {card.ex && (
                <span className="card-example">
                  <span lang={lang}>
                    {card.ex}
                    <SpeakButton text={card.ex} lang={lang} className="speak-inline" />
                  </span>
                  {card.exTr && <span className="card-example-tr">{card.exTr}</span>}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ---------- Eingabe ---------- */}
        {!checked && art === 'produktion' && (
          <form className="type-area" onSubmit={pruefeTippen}>
            <ClearableInput
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onClear={() => setTyped('')}
              onFocus={() => setTippt(true)}
              onBlur={() => setTippt(false)}
              placeholder={tt.typePlaceholder}
              lang={lang}
              autoComplete="off"
            />
            <button type="submit" className="check-btn">
              {t.check}
            </button>
          </form>
        )}

        {!checked && art !== 'produktion' && (
          <div className="type-area">
            <ClearableInput
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onClear={() => setTyped('')}
              onFocus={() => setTippt(true)}
              onBlur={() => setTippt(false)}
              placeholder={t.bedeutungPlatzhalter}
              lang={profile.knownLang}
              autoComplete="off"
            />
            {liste.length > 0 ? (
              <ul className="vorschlaege">
                {liste.map((v) => (
                  <li key={v.id}>
                    <button type="button" className="vorschlag" onMouseDown={(e) => e.preventDefault()} onClick={() => waehle(v)}>
                      {v.text}
                      {v.nuance && <span className="vorschlag-nuance">{v.nuance}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="vorschlag-hinweis">{typed.trim().length >= 2 ? t.keinTreffer : t.vorschlagHinweis}</p>
            )}
            <button type="button" className="weiss-nicht" onClick={() => urteil(false)}>
              {t.weissNicht}
            </button>
          </div>
        )}
      </div>

      {/* ---------- Bewertung ---------- */}
      {checked && correct && (
        <div className="ratings ratings-drei">
          {RICHTIG_KNOEPFE.map((r) => (
            <button key={r.key} className={`rate ${r.cls}`} onClick={() => rate(r.key)}>
              <span className="rate-label">{t[r.key]}</span>
              <span className="rate-when">{formatInterval(previewInterval(card, r.key))}</span>
            </button>
          ))}
        </div>
      )}
      {checked && !correct && (
        <div className="ratings ratings-eins">
          <button className="rate rate-again" onClick={() => rate('again')}>
            <span className="rate-label">{t.weiter}</span>
            <span className="rate-when">{t.again}</span>
          </button>
        </div>
      )}
    </div>
  )
}

function ReviewHeader({ done, total, onExit, t }) {
  const pct = total > 0 ? (done / total) * 100 : 0
  return (
    <div className="review-header">
      <button className="back-btn" onClick={onExit} aria-label={t.back}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <div className="progress">
        <div className="progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <span className="progress-count">
        {done}/{total}
      </span>
    </div>
  )
}

export default ReviewMotor
