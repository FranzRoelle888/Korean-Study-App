import { useState } from 'react'
import { supabase } from '../../core/supabaseClient'
import { trainerSatz } from '../trainer/trainerApi'
import { SpeakButton } from '../../shared/tts'

/* ============================================================
   LEKTION — der 5-Schritte-Bogen (Konzept: Chat 28.08.2026)

   1 Verstehen   Erklärung + 3 Beispiele (Lautsprecher)
   2 Erkennen    2× "Welcher Satz ist richtig?"
   3 Anwenden    3 geblockte Lücken (Hinweis = Bedeutung)
   4 Produzieren eigener Satz, KI beurteilt (offline: übersprungen)
   5 Fertig      Ergebnis; der Punkt wandert als "wackelig"
                 (Quelle: lektion) in den Lernstand — SICHER wird
                 er erst durch die gemischten Texte der Folgetage
                 (gepflanzt heute, satt später — Balken-Ehrlichkeit)
   ============================================================ */

function Lektion({ profile, t, punktId, lektion, titelFallback, aktuellerStatus, onExit }) {
  const [phase, setPhase] = useState('verstehen')
  const [schritt, setSchritt] = useState(0)
  const [antwort, setAntwort] = useState('')
  const [aufgeloest, setAufgeloest] = useState(null) /* null | 'ok' | 'falsch' */
  const [richtige, setRichtige] = useState(0)
  const [erkWahl, setErkWahl] = useState(null)
  const [satzUrteil, setSatzUrteil] = useState(null) /* null | 'laedt' | {ok, feedback, korrektur} */

  if (!lektion) {
    return (
      <div className="screen">
        <LektionKopf titel={titelFallback} t={t} onExit={onExit} />
        <div className="kal-mitte">
          <p className="kal-text">{t.gramFolgt}</p>
          <button className="done-btn" onClick={onExit}>{t.back}</button>
        </div>
      </div>
    )
  }

  /* Erkennen: die zwei Sätze in stabiler, aber gemischter Reihenfolge */
  const erkPaar = lektion.erkennen[schritt] ?? lektion.erkennen[0]
  const erkOptionen =
    schritt % 2 === 0 ? [erkPaar.richtig, erkPaar.falsch] : [erkPaar.falsch, erkPaar.richtig]

  function weiterNach(warRichtig) {
    if (warRichtig) setRichtige((z) => z + 1)
    setAufgeloest(null)
    setErkWahl(null)
    setAntwort('')
    if (phase === 'erkennen') {
      if (schritt + 1 < lektion.erkennen.length) setSchritt(schritt + 1)
      else {
        setPhase('luecken')
        setSchritt(0)
      }
    } else if (phase === 'luecken') {
      if (schritt + 1 < lektion.luecken.length) setSchritt(schritt + 1)
      else setPhase('produzieren')
    }
  }

  async function satzAbgeben() {
    if (!antwort.trim() || satzUrteil) return
    setSatzUrteil('laedt')
    try {
      const u = await trainerSatz({ profile: profile.id, muster: lektion.titel, satz: antwort.trim() })
      setSatzUrteil(u)
      if (u.ok) setRichtige((z) => z + 1)
    } catch {
      /* offline: Schritt gilt als übersprungen, Lektion bleibt abschließbar */
      setSatzUrteil({ ok: true, feedback: t.gramSatzOffline, korrektur: '' })
    }
  }

  async function abschliessen() {
    /* Der Punkt wandert in den Lernstand — aber nie ein "sicher"
       überschreiben (Lektion ansehen darf nichts verschlechtern) */
    if (aktuellerStatus !== 'sicher') {
      await supabase
        .from('inventory_status')
        .upsert(
          [{
            profile: profile.id,
            item_id: punktId,
            kind: 'grammatik',
            status: 'wackelig',
            label: lektion.titel,
            source: 'lektion',
          }],
          { onConflict: 'profile,item_id' }
        )
        .then(() => {})
    }
    setPhase('fertig')
  }

  const gesamt = lektion.erkennen.length + lektion.luecken.length + 1

  return (
    <div className="screen">
      <LektionKopf titel={lektion.titel} t={t} onExit={onExit} />
      <div className="gram-scroll">

        {phase === 'verstehen' && (
          <>
            <p className="lektion-erklaerung">{lektion.erklaerung}</p>
            <div className="lektion-beispiele">
              {lektion.beispiele.map((b, i) => (
                <div className="lektion-beispiel" key={i}>
                  <span lang={profile.targetLang}>
                    {b.satz}
                    <SpeakButton text={b.satz} lang={profile.targetLang} className="speak-inline" />
                  </span>
                  <span className="lektion-tr">{b.tr}</span>
                </div>
              ))}
            </div>
            <button className="done-btn" onClick={() => setPhase('erkennen')}>
              {t.gramLos}
            </button>
          </>
        )}

        {phase === 'erkennen' && (
          <>
            <span className="kal-schritt">{schritt + 1} / {lektion.erkennen.length}</span>
            <p className="kal-frage">{t.gramErkennenFrage}</p>
            <div className="lektion-erk">
              {erkOptionen.map((satz) => {
                const istRichtig = satz === erkPaar.richtig
                const gewaehlt = erkWahl === satz
                const klasse = aufgeloest
                  ? istRichtig
                    ? 'lektion-erk-satz lektion-erk-richtig'
                    : gewaehlt
                      ? 'lektion-erk-satz lektion-erk-falsch'
                      : 'lektion-erk-satz'
                  : 'lektion-erk-satz'
                return (
                  <button
                    key={satz}
                    className={klasse}
                    lang={profile.targetLang}
                    disabled={!!aufgeloest}
                    onClick={() => {
                      setErkWahl(satz)
                      setAufgeloest(istRichtig ? 'ok' : 'falsch')
                    }}
                  >
                    {satz}
                  </button>
                )
              })}
            </div>
            {aufgeloest && (
              <div className="lt-aufloesung">
                <p className="lt-uebersetzung">{erkPaar.tr}</p>
                <button className="done-btn" onClick={() => weiterNach(aufgeloest === 'ok')}>
                  {t.ltWeiter}
                </button>
              </div>
            )}
          </>
        )}

        {phase === 'luecken' && (() => {
          const g = lektion.luecken[schritt]
          const teile = g.satz.split('___')
          const richtig =
            antwort.trim() === g.loesung ||
            (g.auch_ok ?? []).some((x) => antwort.trim() === String(x).trim())
          return (
            <>
              <span className="kal-schritt">{schritt + 1} / {lektion.luecken.length}</span>
              <div className="lt-satz-block lt2-text">
                <p className="lt-satz" lang={profile.targetLang}>
                  {teile[0]}
                  {aufgeloest ? (
                    aufgeloest === 'ok' ? (
                      <strong className="lt-ok">{g.loesung}</strong>
                    ) : (
                      <span className="lt2-korrektur">
                        <s className="lt-falsch">{antwort}</s>{' '}
                        <strong className="lt-ok">{g.loesung}</strong>
                      </span>
                    )
                  ) : (
                    <input
                      className="lt2-feld"
                      value={antwort}
                      onChange={(e) => setAntwort(e.target.value)}
                      placeholder={g.hinweis}
                      lang={profile.targetLang}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      size={Math.max(5, Math.min(14, g.hinweis.length))}
                    />
                  )}
                  {teile[1]}
                </p>
              </div>
              {aufgeloest ? (
                <button className="done-btn" onClick={() => weiterNach(aufgeloest === 'ok')}>
                  {t.ltWeiter}
                </button>
              ) : (
                <button
                  className="done-btn"
                  disabled={!antwort.trim()}
                  onClick={() => setAufgeloest(richtig ? 'ok' : 'falsch')}
                >
                  {t.check}
                </button>
              )}
            </>
          )
        })()}

        {phase === 'produzieren' && (
          <>
            <p className="kal-frage">{lektion.produzieren}</p>
            {!satzUrteil ? (
              <>
                <textarea
                  className="lektion-satzfeld"
                  rows={2}
                  value={antwort}
                  onChange={(e) => setAntwort(e.target.value)}
                  lang={profile.targetLang}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <button className="done-btn" disabled={!antwort.trim()} onClick={satzAbgeben}>
                  {t.check}
                </button>
              </>
            ) : satzUrteil === 'laedt' ? (
              <p className="lt2-feedback lt2-feedback-laedt">{t.ltFeedbackLaedt}</p>
            ) : (
              <div className="lt-aufloesung">
                <p className={satzUrteil.ok ? 'lt-note lt-ok' : 'lt-note lt-falsch'}>
                  {satzUrteil.ok ? t.correct : t.gramSatzFastRichtig}
                </p>
                {satzUrteil.korrektur && (
                  <p className="lt-uebersetzung" lang={profile.targetLang}>{satzUrteil.korrektur}</p>
                )}
                <p className="lt2-feedback">{satzUrteil.feedback}</p>
                <button className="done-btn" onClick={abschliessen}>
                  {t.gramFertigKnopf}
                </button>
              </div>
            )}
          </>
        )}

        {phase === 'fertig' && (
          <div className="kal-mitte">
            <div className="kal-emoji pop">🌱</div>
            <h2 className="kal-titel">{t.gramFertigTitel}</h2>
            <p className="kal-text">{t.gramFertigText(richtige, gesamt)}</p>
            <button className="done-btn" onClick={onExit}>{t.back}</button>
          </div>
        )}
      </div>
    </div>
  )
}

function LektionKopf({ titel, t, onExit }) {
  return (
    <div className="review-header">
      <button className="back-btn" onClick={onExit} aria-label={t.back}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <span className="daily-label">{titel}</span>
    </div>
  )
}

export default Lektion
