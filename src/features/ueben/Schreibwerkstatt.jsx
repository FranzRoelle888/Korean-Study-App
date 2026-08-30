import { useEffect, useState } from 'react'
import { trainerSchreiben } from '../trainer/trainerApi'
import { baueSchreibauftrag } from './schreibauftrag'
import { SpeakButton } from '../../shared/tts'

/* ============================================================
   SCHREIBWERKSTATT — freie Textproduktion (Konzept: Chat 30.08.)

   Warum dieser Modus die wertvollste Übung ist: Selbst
   formulieren (statt wiedererkennen) verankert am tiefsten, und
   erst beim Schreiben merkt man, was wirklich fehlt.

   Ablauf:
   1. Auftrag (kostenlos komponiert): Thema + Pflicht-Muster mit
      Zählern + antippbare Wort-Inspiration
   2. Schreiben (Textfeld, 16px — iOS-Zoom!)
   3. Ein einziger KI-Aufruf bewertet: Muster-Bilanz je
      Pflicht-Muster (fließt als Beleg ins Wissensmodell),
      die 1-2 wichtigsten Fehler, eine Muttersprachler-Version
      zum Vergleichen (NACH dem eigenen Versuch — so herum
      wirkt es).

   Offline/KI-Ausfall: Der Text bleibt stehen, ein erneuter
   Versuch ist jederzeit möglich — nichts geht verloren.
   ============================================================ */

function Schreibwerkstatt({ profile, t, onExit }) {
  const [auftrag, setAuftrag] = useState(null) /* null = lädt */
  const [text, setText] = useState('')
  const [wortOffen, setWortOffen] = useState(null)
  /* null = schreiben | 'laedt' | 'fehler' | Ergebnis-Objekt */
  const [ergebnis, setErgebnis] = useState(null)

  useEffect(() => {
    let weg = false
    baueSchreibauftrag(profile.id)
      .then((a) => {
        if (!weg) setAuftrag(a)
      })
      .catch(() => {
        if (!weg) setAuftrag(false)
      })
    return () => {
      weg = true
    }
  }, [profile.id])

  async function abgeben() {
    if (ergebnis === 'laedt' || text.trim().length < 20) return
    setErgebnis('laedt')
    try {
      const res = await trainerSchreiben({
        profile: profile.id,
        thema: auftrag.themaIntern,
        muster: auftrag.muster,
        text: text.trim(),
      })
      setErgebnis(res)
    } catch {
      /* Der Text bleibt im Feld — nichts geht verloren */
      setErgebnis('fehler')
    }
  }

  const kopf = (
    <div className="review-header">
      <button className="back-btn" onClick={onExit} aria-label={t.back}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <span className="daily-label">{t.modeWrite}</span>
    </div>
  )

  if (auftrag === null) {
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte"><p className="kal-text">…</p></div>
      </div>
    )
  }

  if (auftrag === false) {
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte">
          <div className="kal-emoji">🌙</div>
          <p className="kal-text">{t.swKeinAuftrag}</p>
          <button className="done-btn" onClick={onExit}>{t.back}</button>
        </div>
      </div>
    )
  }

  const fertig = ergebnis && ergebnis !== 'laedt' && ergebnis !== 'fehler'

  return (
    <div className="screen">
      {kopf}
      <div className="lt2-scroll">
        {/* --- Der Auftrag --- */}
        <div className="sw-auftrag">
          <p className="sw-thema">✍️ {t.swAuftrag(auftrag.thema)}</p>
          <ul className="sw-pflicht">
            {auftrag.muster.map((m) => (
              <li key={m.id}>
                <strong lang={profile.targetLang}>{m.muster}</strong> ({m.name}) — {t.swMindestens(m.min)}
              </li>
            ))}
          </ul>
          {auftrag.woerter.length > 0 && (
            <div className="sw-woerter">
              <span className="sw-woerter-label">{t.swInspiration}</span>
              {auftrag.woerter.map((w) => (
                <button
                  type="button"
                  className="lt-gloss sw-wort"
                  key={w.wort}
                  lang={profile.targetLang}
                  onClick={() => setWortOffen(wortOffen === w.wort ? null : w.wort)}
                >
                  {w.wort}
                </button>
              ))}
              {wortOffen && (
                <p className="lt-gloss-bubble">
                  <strong lang={profile.targetLang}>{wortOffen}</strong> —{' '}
                  {auftrag.woerter.find((w) => w.wort === wortOffen)?.bedeutung}
                </p>
              )}
            </div>
          )}
        </div>

        {/* --- Schreiben --- */}
        {!fertig && (
          <>
            <textarea
              className="sw-feld"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t.swPlatzhalter}
              lang={profile.targetLang}
              rows={6}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            {ergebnis === 'fehler' && <p className="sw-fehler">{t.swFehler}</p>}
            <button
              className="done-btn lt2-pruefen"
              onClick={abgeben}
              disabled={ergebnis === 'laedt' || text.trim().length < 20}
            >
              {ergebnis === 'laedt' ? t.ltFeedbackLaedt : t.swAbgeben}
            </button>
          </>
        )}

        {/* --- Ergebnis --- */}
        {fertig && (
          <div className="lt-aufloesung">
            {/* der eigene Text bleibt sichtbar — zum Vergleichen */}
            <p className="sw-eigener" lang={profile.targetLang}>{text}</p>

            {/* Muster-Bilanz: je Pflicht-Muster ein ehrliches Urteil */}
            <div className="sw-bilanz">
              {(ergebnis.muster ?? []).map((m) => {
                const soll = auftrag.muster.find((x) => x.id === m.id)
                return (
                  <p key={m.id} className={m.verwendet === 0 ? 'sw-b-offen' : m.korrekt ? 'sw-b-ok' : 'sw-b-halb'}>
                    {m.verwendet === 0 ? '○' : m.korrekt ? '✓' : '~'}{' '}
                    <strong lang={profile.targetLang}>{soll?.muster ?? m.id}</strong>{' '}
                    {t.swBilanz(m.verwendet, soll?.min ?? 1)}
                    {m.kommentar ? ` — ${m.kommentar}` : ''}
                  </p>
                )
              })}
            </div>

            {ergebnis.feedback && <p className="lt2-feedback">{ergebnis.feedback}</p>}

            {ergebnis.muster_version && (
              <div className="sw-vorbild">
                <p className="sw-vorbild-label">{t.swVorbild}</p>
                <p lang={profile.targetLang}>
                  {ergebnis.muster_version}
                  <SpeakButton text={ergebnis.muster_version} lang={profile.targetLang} className="speak-inline" />
                </p>
              </div>
            )}

            <button className="done-btn lt2-fertigknopf" onClick={onExit}>{t.back}</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Schreibwerkstatt
