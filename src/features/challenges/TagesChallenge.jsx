import { useEffect, useState } from 'react'
import ClearableInput from '../../shared/ClearableInput'
import { ladeTagesChallenge, sichereTagesChallenge } from '../../core/satzChallenge'
import { trainerSatzChallengeBewerten } from '../trainer/trainerApi'

/* ============================================================
   TAGES-CHALLENGE (Franz 07.09.) — ersetzt die Zahl des Tages

   Oben die Zahl wie gehabt (sino-koreanisch + rein koreanisch,
   beides getippt, so oft man will). Darunter fünf deutsche Sätze
   aus dem eigenen Wortschatz und der abgehakten Grammatik, je ein
   Feld für die koreanische Übersetzung. „Bewerten" schickt alles
   auf einmal an den Trainer: grün / gelb / rot je Satz, Korrektur
   mit deutscher Übersetzung, ein Satz Begründung, ein Fazit.

   Erledigt = Zahl richtig UND fünf Antworten abgeschickt. Die
   Bewertung braucht Netz; ohne Netz zählt das Abschicken trotzdem
   („später bewerten" bleibt möglich). Gibt es keine Sätze (Bank
   leer und kein Netz), zählt die Zahl allein — der Streak hängt
   nie am Trainer.
   ============================================================ */

const norm = (s) => s.replace(/\s+/g, '').trim()

function TagesChallenge({ number, sino, native, numberDone, onNumberDone, saetzeDone, onSaetzeDone, words, profile, onExit, t }) {
  /* ---------- Zahl ---------- */
  const [sinoIn, setSinoIn] = useState('')
  const [nativeIn, setNativeIn] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [zahlOk, setZahlOk] = useState(numberDone)

  function pruefeZahl(e) {
    e.preventDefault()
    const sOk = norm(sinoIn) === norm(sino)
    const nOk = norm(nativeIn) === norm(native)
    if (sOk && nOk) {
      onNumberDone()
      setZahlOk(true)
    } else {
      setFeedback({ sino: sOk, native: nOk })
    }
  }

  /* ---------- Sätze ---------- */
  const [ch, setCh] = useState(undefined) /* undefined = lädt, null = keine */
  const [antworten, setAntworten] = useState([])
  const [bewertet, setBewertet] = useState(false)
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState('')

  useEffect(() => {
    let weg = false
    ladeTagesChallenge(words).then((d) => {
      if (weg) return
      setCh(d)
      if (d) {
        setAntworten(d.saetze.map((s, i) => d.antworten?.[i] ?? ''))
        setBewertet(!!d.bewertung)
      } else if (!saetzeDone) {
        /* keine Saetze (offline, nichts vorbereitet): die Zahl allein
           zaehlt — der Streak haengt nie am Trainer */
        onSaetzeDone()
      }
    })
    return () => {
      weg = true
    }
  }, [profile.id])

  const alleBeantwortet = ch && antworten.length === ch.saetze.length && antworten.every((a) => a.trim())

  async function bewerten() {
    if (!ch || laedt) return
    setLaedt(true)
    setFehler('')
    const paare = ch.saetze.map((s, i) => ({ nr: s.nr, de: s.de, muster: s.ko, antwort: antworten[i] || '' }))
    /* Abschicken zaehlt sofort als erledigt — auch wenn die Bewertung
       gleich am Netz scheitert */
    const naechst = { ...ch, antworten, fertig: true }
    if (!ch.fertig) onSaetzeDone()
    try {
      const res = await trainerSatzChallengeBewerten({ profile: profile.id, paare })
      naechst.bewertung = { ergebnisse: res.ergebnisse || [], fazit: res.fazit || '' }
      setBewertet(true)
    } catch (e) {
      setFehler(e && e.message === 'rate-limit' ? t.challengeLimit : t.challengeOffline)
    } finally {
      setCh(naechst)
      sichereTagesChallenge(naechst)
      setLaedt(false)
    }
  }

  const sinoMark = feedback ? (feedback.sino ? 'ok' : 'bad') : ''
  const nativeMark = feedback ? (feedback.native ? 'ok' : 'bad') : ''
  const urteilVon = (nr) => ch?.bewertung?.ergebnisse?.find((e) => e.nr === nr)

  return (
    <div className="number tc">
      <div className="review-header">
        <button className="back-btn" onClick={onExit} aria-label={t.back}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>
        <span className="daily-label">{t.tagesChallenge}</span>
      </div>

      <div className="number-body tc-body">
        {/* ---------- Teil 1: Zahl ---------- */}
        <section className="tc-teil">
          <h2 className="tc-titel">
            <span className="tc-nr">1</span> {t.numberOfDay}
            {zahlOk && <span className="tc-haken">✓</span>}
          </h2>
          {zahlOk ? (
            <div className="number-recap tc-recap">
              <span className="recap-num">{number}</span>
              <span className="recap-line">
                <b lang="ko">{sino}</b> · Sino-Korean
              </span>
              <span className="recap-line">
                <b lang="ko">{native}</b> · Native Korean
              </span>
            </div>
          ) : (
            <>
              <div className="big-number">{number}</div>
              <form className="number-form" onSubmit={pruefeZahl}>
                <label className={`num-field ${sinoMark}`}>
                  <span className="num-label">
                    Sino-Korean <em>(일, 이, 삼 …)</em>
                  </span>
                  <ClearableInput
                    value={sinoIn}
                    onChange={(e) => {
                      setSinoIn(e.target.value)
                      setFeedback(null)
                    }}
                    onClear={() => setSinoIn('')}
                    placeholder="e.g. 이십일"
                    lang="ko"
                    autoComplete="off"
                  />
                </label>
                <label className={`num-field ${nativeMark}`}>
                  <span className="num-label">
                    Native Korean <em>(하나, 둘, 셋 …)</em>
                  </span>
                  <ClearableInput
                    value={nativeIn}
                    onChange={(e) => {
                      setNativeIn(e.target.value)
                      setFeedback(null)
                    }}
                    onClear={() => setNativeIn('')}
                    placeholder="e.g. 스물하나"
                    lang="ko"
                    autoComplete="off"
                  />
                </label>
                {feedback && (
                  <p className="add-msg add-error">{feedback.sino || feedback.native ? t.almostFixRed : t.notQuite}</p>
                )}
                <button type="submit" className="check-btn">
                  {t.check}
                </button>
              </form>
            </>
          )}
        </section>

        {/* ---------- Teil 2: fünf Sätze ---------- */}
        <section className="tc-teil">
          <h2 className="tc-titel">
            <span className="tc-nr">2</span> {t.challengeSaetze}
            {(saetzeDone || ch?.fertig) && <span className="tc-haken">✓</span>}
          </h2>
          {ch === undefined && <p className="tc-hinweis">{t.loading}</p>}
          {ch === null && <p className="tc-hinweis">{t.challengeKeineSaetze}</p>}
          {ch && (
            <>
              <p className="tc-hinweis">{t.challengeHinweis}</p>
              <ol className="tc-liste">
                {ch.saetze.map((s, i) => {
                  const u = urteilVon(s.nr)
                  return (
                    <li key={s.nr} className={'tc-satz' + (u ? ` tc-${u.urteil}` : '')}>
                      <span className="tc-satz-nr">{s.nr}</span>
                      <div className="tc-satz-inhalt">
                        <p className="tc-de" lang="de">
                          {s.de}
                        </p>
                        {bewertet ? (
                          <>
                            <p className="tc-antwort" lang="ko">
                              {antworten[i] || '—'}
                            </p>
                            {u && u.urteil !== 'gruen' && (
                              <p className="tc-korrektur" lang="ko">
                                {u.korrektur}
                              </p>
                            )}
                            {u && u.hinweis && <p className="tc-hinweis-satz">{u.hinweis}</p>}
                          </>
                        ) : (
                          <textarea
                            className="tc-feld"
                            lang="ko"
                            rows={2}
                            value={antworten[i] || ''}
                            placeholder={t.typeKorean}
                            onChange={(e) => {
                              const next = [...antworten]
                              next[i] = e.target.value
                              setAntworten(next)
                            }}
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                          />
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
              {bewertet && ch.bewertung?.fazit && <p className="tc-fazit">{ch.bewertung.fazit}</p>}
              {fehler && <p className="add-msg add-error">{fehler}</p>}
              {!bewertet && (
                <button className="check-btn tc-bewerten" onClick={bewerten} disabled={!alleBeantwortet || laedt}>
                  {laedt ? t.challengeBewertet : ch.fertig ? t.challengeSpaeterBewerten : t.challengeBewerten}
                </button>
              )}
            </>
          )}
        </section>

        {zahlOk && (saetzeDone || ch?.fertig || ch === null) && (
          <button className="done-btn tc-fertig" onClick={onExit}>
            {t.back}
          </button>
        )}
      </div>
    </div>
  )
}

export default TagesChallenge
