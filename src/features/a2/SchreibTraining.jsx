import { useEffect, useRef, useState } from 'react'
import { SCHREIB_AUFGABEN, WORTBAND } from './schreibaufgaben'
import { LERNBLATT_SCHREIBEN } from './lernblaetter'
import Lernblatt, { InfoKnopf, lernblattNeu } from '../../shared/Lernblatt'
import Auftrag from '../../shared/Auftrag'
import Nachfrage from '../ueben/Nachfrage'
import { trainerA2Schreiben } from '../trainer/trainerApi'
import { schreibeA2Beleg } from '../../core/storage'

/* ============================================================
   SMS & E-MAIL-TRAINING — Schreiben Teil 1 + 2 (A2-Sprint, Phase 1)

   Konzept mit Franz (03.09.) abgenommen:
   - Kuratierte Aufgaben-Bank im Goethe-Wortlaut (rotierend)
   - Live-Wortzähler, der wie die Prüfung wertet: unter 50 % der
     Vorgabe wäre 0 Punkte -> Abgeben gesperrt; Überlänge okay
   - Drei Stufen: ① mit Geländer (antippbare Baustein-Chips)
     ② frei ③ Prüfungsmodus = BEIDE Teile nacheinander mit einer
     gemeinsamen 30-Minuten-Uhr, Bewertung erst am Ende.
     Aufstieg wird nach 3 Ergebnissen mit >= 7/10 empfohlen,
     Haein kann aber jederzeit selbst wählen.
   - Bewertung strikt nach dem Prüfer-Raster (Edge Function
     a2schreiben), Feedback koreanisch, Muster-Antwort deutsch,
     Nachfrage-Dialog darunter. Jede Abgabe -> Radar-Beleg.
   ============================================================ */

const STUFEN_KEY = 'a2schreiben:stufe'
const INDEX_KEY = 'a2schreiben:index'
const SERIE_KEY = 'a2schreiben:gutserie'
const NOTEN_PUNKTE = { A: 5, B: 3.5, C: 2, D: 0.5, E: 0 }

const lies = (k, std) => {
  try {
    return localStorage.getItem(k) ?? std
  } catch {
    return std
  }
}
const schreib = (k, v) => {
  try {
    localStorage.setItem(k, String(v))
  } catch {
    /* egal */
  }
}

/* Aufgaben rotieren abwechselnd Teil 1 / Teil 2 */
function naechsteAufgabe(versatz = 0) {
  const i = (parseInt(lies(INDEX_KEY, '0'), 10) || 0) + versatz
  const t1 = SCHREIB_AUFGABEN.filter((a) => a.teil === 1)
  const t2 = SCHREIB_AUFGABEN.filter((a) => a.teil === 2)
  const liste = i % 2 === 0 ? t1 : t2
  return liste[Math.floor(i / 2) % liste.length]
}

function zaehleWoerter(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function SchreibTraining({ profile, t, onExit }) {
  const [stufe, setStufe] = useState(() => parseInt(lies(STUFEN_KEY, '1'), 10) || 1)
  const [aufgabe, setAufgabe] = useState(() => naechsteAufgabe())
  const [text, setText] = useState('')
  /* null | 'laedt' | 'fehler' | Ergebnis */
  const [ergebnis, setErgebnis] = useState(null)
  const [blatt, setBlatt] = useState(() => lernblattNeu(LERNBLATT_SCHREIBEN.id))
  /* Prüfungsmodus: Teil 1 wird eingefroren (nicht bewertet!),
     dann Teil 2 — bewertet wird erst am Ende, wie im Ernstfall */
  const [pruefungsTeil1, setPruefungsTeil1] = useState(null)
  const [teil1Ergebnis, setTeil1Ergebnis] = useState(null)
  const [restSek, setRestSek] = useState(null)
  const feldRef = useRef(null)

  const band = WORTBAND[aufgabe.teil]
  const woerter = zaehleWoerter(text)
  const zuWenig = woerter < Math.ceil(band.min / 2)
  const imZiel = woerter >= band.min

  /* Prüfungs-Uhr (Stufe 3): 30 Minuten über beide Teile */
  useEffect(() => {
    if (stufe !== 3 || ergebnis) return
    if (restSek === null) setRestSek(30 * 60)
    const timer = setInterval(() => setRestSek((s) => (s === null || s <= 0 ? s : s - 1)), 1000)
    return () => clearInterval(timer)
  }, [stufe, ergebnis === null]) // eslint-disable-line react-hooks/exhaustive-deps

  function weiterZaehlen(neuePunkte) {
    /* Aufstiegs-Empfehlung: 3 Ergebnisse >= 7/10 in Folge */
    const serie = neuePunkte >= 7 ? (parseInt(lies(SERIE_KEY, '0'), 10) || 0) + 1 : 0
    schreib(SERIE_KEY, serie)
    if (serie >= 3 && stufe < 3) {
      schreib(SERIE_KEY, 0)
      schreib(STUFEN_KEY, stufe + 1)
      return true /* Aufstieg! */
    }
    return false
  }

  async function bewerte(auf, txt) {
    const res = await trainerA2Schreiben({
      profile: profile.id,
      teil: auf.teil,
      situation: auf.situation,
      leitpunkte: auf.leitpunkte,
      text: txt,
    })
    schreibeA2Beleg({
      modul: 'schreiben',
      teil: `t${auf.teil}`,
      punkte: res.punkte,
      max: 10,
      details: { stufe, aufgabe: auf.id, ae: res.aufgabenerfuellung, sp: res.sprache },
    })
    return res
  }

  async function abgeben() {
    if (ergebnis === 'laedt' || zuWenig) return

    /* Prüfungsmodus, Teil 1: einfrieren und OHNE Bewertung zu
       Teil 2 weiter — die Uhr läuft durch (wie im Ernstfall) */
    if (stufe === 3 && aufgabe.teil === 1 && !pruefungsTeil1) {
      setPruefungsTeil1({ aufgabe, text: text.trim() })
      const i = (parseInt(lies(INDEX_KEY, '0'), 10) || 0) + 1
      schreib(INDEX_KEY, i)
      setAufgabe(naechsteAufgabe())
      setText('')
      return
    }

    setErgebnis('laedt')
    try {
      /* Im Prüfungsmodus jetzt BEIDE Teile bewerten */
      if (stufe === 3 && pruefungsTeil1) {
        const r1 = await bewerte(pruefungsTeil1.aufgabe, pruefungsTeil1.text)
        setTeil1Ergebnis(r1)
        const r2 = await bewerte(aufgabe, text.trim())
        const aufgestiegen = weiterZaehlen((r1.punkte + r2.punkte) / 2)
        setErgebnis({ ...r2, aufgestiegen })
      } else {
        const res = await bewerte(aufgabe, text.trim())
        const aufgestiegen = weiterZaehlen(res.punkte)
        setErgebnis({ ...res, aufgestiegen })
      }
    } catch {
      setErgebnis('fehler')
    }
  }

  function naechste(vor = 1) {
    const i = (parseInt(lies(INDEX_KEY, '0'), 10) || 0) + vor
    schreib(INDEX_KEY, i)
    const neu = naechsteAufgabe()
    setAufgabe(neu)
    setText('')
    setErgebnis(null)
    setPruefungsTeil1(null)
    setTeil1Ergebnis(null)
    setRestSek(null)
    /* Aufstiegs-Empfehlung übernehmen */
    setStufe(parseInt(lies(STUFEN_KEY, '1'), 10) || 1)
  }

  function stufeWaehlen(s) {
    setStufe(s)
    schreib(STUFEN_KEY, s)
    schreib(SERIE_KEY, 0)
    setRestSek(null)
    setPruefungsTeil1(null)
    setTeil1Ergebnis(null)
    /* Der Prüfungsmodus beginnt wie die echte Prüfung mit Teil 1 */
    if (s === 3 && aufgabe.teil === 2) {
      const i = (parseInt(lies(INDEX_KEY, '0'), 10) || 0) + 1
      schreib(INDEX_KEY, i)
      setAufgabe(naechsteAufgabe())
      setText('')
    }
  }

  const minuten = restSek === null ? null : `${Math.floor(restSek / 60)}:${String(restSek % 60).padStart(2, '0')}`

  const kopf = (
    <div className="review-header">
      <button className="back-btn" onClick={onExit} aria-label={t.back}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <span className="daily-label" lang="de">
        ✉️ Schreiben · Teil {aufgabe.teil}
      </span>
      {stufe === 3 && minuten && <span className="sw-uhr">{minuten}</span>}
      <InfoKnopf onClick={() => setBlatt(true)} />
    </div>
  )

  const fertig = ergebnis && ergebnis !== 'laedt' && ergebnis !== 'fehler'

  return (
    <div className="screen">
      {blatt && <Lernblatt daten={LERNBLATT_SCHREIBEN} onClose={() => setBlatt(false)} t={t} />}
      {kopf}
      <div className="lt2-scroll">
        {/* Stufen-Wahl */}
        {!fertig && (
          <div className="st-stufen">
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                className={stufe === s ? 'st-stufe st-stufe-an' : 'st-stufe'}
                onClick={() => stufeWaehlen(s)}
              >
                {s === 1 ? '🪜 Hilfe' : s === 2 ? '✏️ Frei' : '⏱ Prüfung'}
              </button>
            ))}
          </div>
        )}

        {/* Auftrag im Goethe-Wortlaut */}
        <div className="sw-auftrag">
          <Auftrag id={`schreiben-t${aufgabe.teil}`} de={aufgabe.situation} ko={aufgabe.situationKo} />
          <ul className="st-leitpunkte">
            {aufgabe.leitpunkte.map((l, i) => {
              const status = fertig ? ergebnis.leitpunkte?.[i]?.status : null
              return (
                <li key={i} className={status ? `st-lp-${status}` : ''}>
                  <span className="st-lp-zeichen">
                    {status === 'voll' ? '✓' : status === 'teil' ? '~' : status === 'fehlt' ? '✗' : '–'}
                  </span>
                  <span>
                    <span lang="de">{l}</span>
                    <span className="st-lp-ko" lang="ko"> {aufgabe.leitpunkteKo[i]}</span>
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="st-vorgabe" lang="de">
            Schreiben Sie {band.min}–{band.max} Wörter. Schreiben Sie zu allen drei Punkten.
          </p>
        </div>

        {!fertig && (
          <>
            {/* Stufe 1: Baustein-Chips zum Einfügen */}
            {stufe === 1 && (
              <div className="st-chips">
                {[aufgabe.anrede, ...aufgabe.hilfen, aufgabe.gruss].map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    className="lt-gloss st-chip"
                    lang="de"
                    onClick={() => {
                      setText((alt) => (alt ? `${alt.replace(/\s+$/, '')}\n${c} ` : `${c} `))
                      feldRef.current?.focus()
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            <textarea
              ref={feldRef}
              className="sw-feld"
              value={text}
              onChange={(e) => setText(e.target.value)}
              lang="de"
              rows={7}
              autoCapitalize="sentences"
              autoCorrect="off"
              spellCheck={false}
            />

            {/* Wortzähler mit Prüfungs-Ampel: rot = wäre 0 Punkte */}
            <p className={`st-zaehler ${zuWenig ? 'st-rot' : imZiel ? 'st-gruen' : 'st-gelb'}`}>
              {woerter} / {band.min}–{band.max} Wörter
              {zuWenig && <span lang="ko"> · 절반 미만이면 0점!</span>}
            </p>

            {ergebnis === 'fehler' && <p className="sw-fehler">{t.swFehler}</p>}
            <button
              className="done-btn lt2-pruefen"
              onClick={abgeben}
              disabled={ergebnis === 'laedt' || zuWenig}
            >
              {ergebnis === 'laedt' ? t.ltFeedbackLaedt : 'Abgeben'}
            </button>
          </>
        )}

        {/* ---------- Ergebnis ---------- */}
        {fertig && (
          <div className="lt-aufloesung">
            {/* Prüfungsmodus: kompakte Teil-1-Bilanz über dem
                Teil-2-Ergebnis + Gesamtsumme wie auf dem Bogen */}
            {teil1Ergebnis && (
              <div className="st-teil1">
                <p className="st-teil1-kopf" lang="de">
                  Teil 1: <strong>{teil1Ergebnis.punkte} / 10</strong>
                  <span className="a2-ko-klein" lang="ko"> · 합계 {teil1Ergebnis.punkte + ergebnis.punkte} / 20</span>
                </p>
                {teil1Ergebnis.feedback && <p lang="ko">{teil1Ergebnis.feedback}</p>}
              </div>
            )}
            <p className="sw-eigener" lang="de">{text}</p>

            <div className="st-noten">
              <div className="st-note">
                <span className="st-note-label" lang="ko">과제 수행</span>
                <span className={`st-note-wert st-note-${ergebnis.aufgabenerfuellung}`}>
                  {ergebnis.aufgabenerfuellung}
                </span>
              </div>
              <div className="st-note">
                <span className="st-note-label" lang="ko">언어</span>
                <span className={`st-note-wert st-note-${ergebnis.sprache}`}>{ergebnis.sprache}</span>
              </div>
              <div className="st-note">
                <span className="st-note-label" lang="ko">점수</span>
                <span className="st-note-wert">{ergebnis.punkte} / 10</span>
              </div>
            </div>

            {!ergebnis.register?.ok && ergebnis.register?.kommentar && (
              <p className="st-register" lang="ko">⚠️ {ergebnis.register.kommentar}</p>
            )}
            {ergebnis.leitpunkte?.some((l) => l.kommentar) && (
              <div className="st-lp-kommentare" lang="ko">
                {ergebnis.leitpunkte.map((l, i) =>
                  l.kommentar ? <p key={i}>• {l.kommentar}</p> : null
                )}
              </div>
            )}
            {ergebnis.feedback && <p className="lt2-feedback" lang="ko">{ergebnis.feedback}</p>}

            {ergebnis.muster && (
              <div className="sw-vorbild">
                <p className="sw-vorbild-label" lang="ko">모범 답안:</p>
                <p lang="de">{ergebnis.muster}</p>
              </div>
            )}

            {ergebnis.aufgestiegen && (
              <p className="st-aufstieg" lang="ko">🎉 3번 연속 7점 이상 — 다음 단계로 올라갔어요!</p>
            )}

            <Nachfrage
              profile={profile}
              t={t}
              kontext={
                `Goethe A2 Schreiben Teil ${aufgabe.teil}. Task: ${aufgabe.situation}\n` +
                `Learner's text: ${text}\nGrades: Aufgabenerfüllung ${ergebnis.aufgabenerfuellung}, Sprache ${ergebnis.sprache} (${ergebnis.punkte}/10)\n` +
                `Feedback: ${ergebnis.feedback}\nModel answer: ${ergebnis.muster}`
              }
            />

            <div className="lt2-ende">
              <button className="done-btn" onClick={() => naechste(1)}>
                Nächste Aufgabe
              </button>
              <button className="done-btn lt2-fertigknopf" onClick={onExit}>
                {t.back}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SchreibTraining
