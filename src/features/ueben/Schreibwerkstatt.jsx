import { useEffect, useState } from 'react'
import { supabase } from '../../core/supabaseClient'
import { trainerSchreiben } from '../trainer/trainerApi'
import { baueSchreibauftrag } from './schreibauftrag'
import Nachfrage from './Nachfrage'
import { SpeakButton } from '../../shared/tts'

/* ============================================================
   SCHREIBWERKSTATT — freie Textproduktion (Konzept: Chat 30.08.,
   überarbeitet nach Franz' Test-Feedback vom 31.08.)

   Warum dieser Modus die wertvollste Übung ist: Selbst
   formulieren (statt wiedererkennen) verankert am tiefsten, und
   erst beim Schreiben merkt man, was wirklich fehlt.

   Ablauf:
   1. Auftrag (kostenlos komponiert): Thema + Pflicht-Muster +
      4 NEUE, thematisch passende Wort-Ideen (antippbar)
   2. Jedes Pflicht-Muster ist antippbar -> Beispielsatz mit
      Übersetzung; behauptet das Modell fälschlich "kannst du",
      korrigiert der "Kenn ich noch nicht"-Knopf das sofort und
      wechselt ein anderes Muster ein
   3. Ein einziger KI-Aufruf bewertet: Muster-Bilanz (fließt als
      Beleg ins Wissensmodell), die 1-2 wichtigsten Fehler, eine
      Muttersprachler-Version zum Vergleichen
   4. Benutzte neue Wörter lassen sich mit einem Tipp ins
      Vokabel-Deck übernehmen (Entscheidung Franz: Angebot statt
      Automatik — das Deck bleibt kuratiert)

   Offline/KI-Ausfall: Der Text bleibt stehen, ein erneuter
   Versuch ist jederzeit möglich — nichts geht verloren.
   ============================================================ */

function Schreibwerkstatt({ profile, t, onExit, onAddWord }) {
  const [auftrag, setAuftrag] = useState(null) /* null = lädt */
  /* Muster + Ersatzbank leben im State, weil der "Kenn ich noch
     nicht"-Knopf sie zur Laufzeit umbaut */
  const [muster, setMuster] = useState([])
  const [ersatz, setErsatz] = useState([])
  const [text, setText] = useState('')
  const [wortOffen, setWortOffen] = useState(null)
  const [musterOffen, setMusterOffen] = useState(null)
  /* null = schreiben | 'laedt' | 'fehler' | Ergebnis-Objekt */
  const [ergebnis, setErgebnis] = useState(null)
  /* mit einem Tipp übernommene Wörter (fürs Häkchen) */
  const [uebernommen, setUebernommen] = useState(() => new Set())

  useEffect(() => {
    let weg = false
    baueSchreibauftrag(profile.id)
      .then((a) => {
        if (weg) return
        setAuftrag(a)
        setMuster(a.muster)
        setErsatz(a.ersatz)
        /* Ein neues Streck-Muster erklärt sich von selbst: Detail
           direkt aufklappen, damit nichts Unerklärtes dasteht */
        const neu = a.muster.find((m) => m.neu)
        if (neu) setMusterOffen(neu.id)
      })
      .catch(() => {
        if (!weg) setAuftrag(false)
      })
    return () => {
      weg = true
    }
  }, [profile.id])

  /* "Kenn ich noch nicht": die Behauptung des Modells war falsch —
     Punkt sofort auf unbekannt zurückstufen (Selbstauskunft, daher
     Quelle kalibrierung) und ein Ersatz-Muster einwechseln */
  function kenneIchNicht(m) {
    supabase
      .from('inventory_status')
      .upsert(
        [{ profile: profile.id, item_id: m.id, kind: 'grammatik', status: 'unbekannt', label: `${m.muster} (${m.name})`, source: 'kalibrierung' }],
        { onConflict: 'profile,item_id' }
      )
      .then(() => {})
    const naechster = ersatz[0]
    setErsatz(ersatz.slice(1))
    setMuster(
      naechster
        ? muster.map((x) => (x.id === m.id ? { ...naechster, min: m.min } : x))
        : muster.filter((x) => x.id !== m.id)
    )
    setMusterOffen(naechster ? naechster.id : null)
  }

  async function abgeben() {
    if (ergebnis === 'laedt' || text.trim().length < 20) return
    setErgebnis('laedt')
    try {
      const res = await trainerSchreiben({
        profile: profile.id,
        thema: auftrag.themaIntern,
        muster: muster.map((m) => ({ id: m.id, muster: m.muster, name: m.name, min: m.min })),
        text: text.trim(),
      })
      setErgebnis(res)
    } catch {
      /* Der Text bleibt im Feld — nichts geht verloren */
      setErgebnis('fehler')
    }
  }

  function uebernehmen(w) {
    if (!onAddWord || uebernommen.has(w.wort)) return
    const res = onAddWord(w.bedeutung, w.wort, null)
    /* Duplikat heißt: liegt schon im Deck — fürs Häkchen dasselbe */
    if (!res?.error || res.error === 'duplicate') {
      setUebernommen((alt) => new Set([...alt, w.wort]))
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
  /* Welche der neuen Wort-Ideen stehen wirklich im Text? Nur die
     werden nach der Übung zur Übernahme angeboten */
  const benutzteWoerter = fertig
    ? auftrag.woerter.filter((w) => text.includes(w.wort.replace(/^(der|die|das)\s+/, '')))
    : []

  return (
    <div className="screen">
      {kopf}
      <div className="lt2-scroll">
        {/* --- Der Auftrag --- */}
        <div className="sw-auftrag">
          <p className="sw-thema">✍️ {t.swAuftrag(auftrag.thema)}</p>
          <div className="sw-pflicht">
            {muster.map((m) => (
              <div key={m.id}>
                <button
                  type="button"
                  className="sw-muster"
                  onClick={() => setMusterOffen(musterOffen === m.id ? null : m.id)}
                >
                  {m.neu && <span className="sw-neu-badge">{t.swNeu}</span>}
                  <strong lang={profile.targetLang}>{m.muster}</strong> ({m.name}) — {t.swMindestens(m.min)}
                </button>
                {musterOffen === m.id && (
                  <div className="sw-muster-detail">
                    <p>
                      <span lang={profile.targetLang}>{m.beispiel}</span>
                      {m.beispielTr ? <span className="sw-muster-tr"> — {m.beispielTr}</span> : null}
                    </p>
                    {!m.neu && (
                      <button type="button" className="lt-kannich" onClick={() => kenneIchNicht(m)}>
                        {t.swKennIchNicht}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
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
                const soll = muster.find((x) => x.id === m.id)
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

            {/* Nachfragen aufs Feedback — unmittelbarer Lerneffekt */}
            <Nachfrage
              profile={profile}
              t={t}
              kontext={
                `Writing task about "${auftrag.themaIntern}". Required patterns: ` +
                muster.map((m) => m.muster).join(', ') +
                `.\nLearner's text: ${text}\nTrainer feedback: ${ergebnis.feedback ?? ''}` +
                (ergebnis.muster_version ? `\nNative version: ${ergebnis.muster_version}` : '')
              }
            />

            {/* Benutzte neue Wörter: Ein-Tipp-Übernahme ins Deck */}
            {onAddWord && benutzteWoerter.length > 0 && (
              <div className="sw-uebernahme">
                <p className="sw-vorbild-label">{t.swUebernahme}</p>
                {benutzteWoerter.map((w) => (
                  <button
                    type="button"
                    key={w.wort}
                    className={uebernommen.has(w.wort) ? 'sw-add sw-add-ok' : 'sw-add'}
                    onClick={() => uebernehmen(w)}
                  >
                    {uebernommen.has(w.wort) ? '✓ ' : '+ '}
                    <span lang={profile.targetLang}>{w.wort}</span> ({w.bedeutung})
                  </button>
                ))}
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
