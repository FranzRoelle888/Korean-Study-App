import { useState } from 'react'
import ClearableInput from '../../shared/ClearableInput'
import { SpeakButton } from '../../shared/tts'
import { Bedeutung, WortVergleich } from '../../shared/motorTeile'
import { istRichtig } from '../../core/vergleich'
import { ZEITRAEUME, fuerZeitraum } from '../../core/extraRunde'

/* ============================================================
   EXTRA-RUNDE (Franz 07./08.09.) — freiwilliges Nachfestigen

   Erst waehlen: die Woerter von heute, den letzten 3 oder 5 Tagen.
   Dann eins nach dem anderen: Bedeutung sehen, Koreanisch tippen.

   Drei Wege je Karte:
   - richtig  -> Haekchen, Karte ist durch
   - falsch   -> Vergleich, Karte kommt ans ENDE der Runde
   - „Weiß nicht" -> deckt sofort auf, Karte kommt ans ENDE

   Damit sich nichts im Kreis dreht, wandert eine Karte hoechstens
   zweimal nach hinten; danach ist sie durch.

   KEINE Bewertung: kein Termin, keine Stabilitaet, keine Historie
   aendert sich. Der Algorithmus sieht von dieser Runde nichts.
   ============================================================ */

function ExtraRunde({ material, onDone, onExit, profile, t }) {
  const [phase, setPhase] = useState('auswahl') /* auswahl | lauf */
  /* Standard ist „heute" — gibt es heute nichts, steht gleich der
     naechstgroessere Zeitraum bereit, der etwas enthaelt */
  const [tage, setTage] = useState(() => ZEITRAEUME.find((n) => fuerZeitraum(material, n).length > 0) ?? 1)
  const [queue, setQueue] = useState([])
  const [erledigt, setErledigt] = useState(0)
  const [gesamt, setGesamt] = useState(0)
  const [input, setInput] = useState('')
  const [urteil, setUrteil] = useState(null) /* null | 'ok' | 'bad' | 'gezeigt' */
  const [fehlIds, setFehlIds] = useState([])
  const lang = profile.targetLang
  const eintrag = queue[0]

  function starten() {
    const liste = fuerZeitraum(material, tage)
    if (!liste.length) return
    setQueue(liste.map((m) => ({ ...m, zurueck: 0 })))
    setGesamt(liste.length)
    setErledigt(0)
    setFehlIds([])
    setInput('')
    setUrteil(null)
    setPhase('lauf')
  }

  function loslassen() {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur()
  }

  function merkeFehler(id) {
    setFehlIds((f) => (f.includes(id) ? f : [...f, id]))
  }

  function pruefe(e) {
    e.preventDefault()
    if (!input.trim() || urteil) return
    const ok = istRichtig(input, eintrag.word.ko, lang)
    setUrteil(ok ? 'ok' : 'bad')
    if (!ok) merkeFehler(eintrag.word.id)
    loslassen()
  }

  function weissNicht() {
    if (urteil) return
    setUrteil('gezeigt')
    merkeFehler(eintrag.word.id)
    loslassen()
  }

  function weiter() {
    /* Nicht gewusst? Dann noch einmal ans Ende — hoechstens zweimal. */
    const nochmal = urteil !== 'ok' && eintrag.zurueck < 2
    setQueue((q) => {
      const [erste, ...rest] = q
      return nochmal ? [...rest, { ...erste, zurueck: erste.zurueck + 1 }] : rest
    })
    if (!nochmal) {
      const fertig = erledigt + 1
      setErledigt(fertig)
      if (fertig >= gesamt) onDone()
    }
    setInput('')
    setUrteil(null)
  }

  /* ---------- Auswahl ---------- */
  if (phase === 'auswahl') {
    const leer = material.length === 0
    return (
      <div className="number tc">
        <Kopf onExit={onExit} t={t} />
        <div className="number-body tc-body">
          <section className="tc-teil us-setup">
            <p className="tc-hinweis">{t.extraHinweis}</p>
            {leer ? (
              <p className="tc-hinweis">{t.extraLeer}</p>
            ) : (
              <>
                <div className="us-gruppe">
                  <span className="us-label">{t.extraZeitraum}</span>
                  <div className="us-chips">
                    {ZEITRAEUME.map((n) => {
                      const anzahl = fuerZeitraum(material, n).length
                      return (
                        <button
                          key={n}
                          className={n === tage ? 'us-chip us-chip-an' : 'us-chip'}
                          onClick={() => setTage(n)}
                          disabled={anzahl === 0}
                        >
                          {n === 1 ? t.extraHeute : t.extraTage(n)}
                          <span className="us-chip-zahl">{anzahl}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <button className="check-btn" onClick={starten} disabled={fuerZeitraum(material, tage).length === 0}>
                  {t.extraStart(fuerZeitraum(material, tage).length)}
                </button>
              </>
            )}
          </section>
        </div>
      </div>
    )
  }

  /* ---------- Ende ---------- */
  if (!eintrag) {
    return (
      <div className="daily">
        <div className="daily-done">
          <div className="done-emoji pop">💪</div>
          <p className="done-title">{t.extraFertig(gesamt - fehlIds.length, gesamt)}</p>
          {fehlIds.length > 0 && (
            <ul className="ab-fehl">
              {fehlIds.map((id) => {
                const w = material.find((m) => m.word.id === id)?.word
                return w ? (
                  <li key={id} lang={lang}>
                    <b>{w.ko}</b> <span className="ab-fehl-en">{w.en}</span>
                  </li>
                ) : null
              })}
            </ul>
          )}
          <p className="done-sub">{t.extraKeinEinfluss}</p>
          <button className="done-btn" onClick={onExit}>
            {t.back}
          </button>
        </div>
      </div>
    )
  }

  /* ---------- Eine Karte ---------- */
  const grundText =
    eintrag.grund === 'neu' ? t.extraGrundNeu : eintrag.grund === 'again' ? t.again : t.hard
  const tagText = eintrag.tagIndex === 0 ? t.extraHeute : t.extraVorTagen(eintrag.tagIndex)

  return (
    <div className="daily">
      <Kopf onExit={onExit} t={t} zaehler={`${erledigt + 1}/${gesamt}`} />
      <div className="daily-body">
        <div className={`flashcard motor-karte ${urteil === 'ok' ? 'flash-ok' : urteil ? 'flash-bad' : ''}`}>
          <span className="card-tag">
            {grundText} · {tagText}
          </span>
          <div className="card-front" lang={profile.knownLang}>
            <Bedeutung word={eintrag.word} />
          </div>
          {urteil && (
            <div className={urteil === 'ok' ? 'card-answer ok' : 'card-answer bad'}>
              {urteil === 'bad' ? (
                <WortVergleich eingabe={input} richtig={eintrag.word.ko} lang={lang} t={t} />
              ) : (
                <span lang={lang} className="answer-ko">
                  {eintrag.word.ko}
                  <SpeakButton text={eintrag.word.ko} lang={lang} className="speak-inline" />
                </span>
              )}
              {urteil !== 'ok' && eintrag.zurueck < 2 && <span className="answer-note">{t.extraNochmal}</span>}
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
            <button type="button" className="weiss-nicht" onClick={weissNicht}>
              {t.weissNicht}
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

function Kopf({ onExit, t, zaehler }) {
  return (
    <div className="review-header">
      <button className="back-btn" onClick={onExit} aria-label={t.back}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <span className="daily-label">
        💪 {t.extraRunde}
        {zaehler ? ` · ${zaehler}` : ''}
      </span>
    </div>
  )
}

export default ExtraRunde
