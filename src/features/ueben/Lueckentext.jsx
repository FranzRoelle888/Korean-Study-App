import { useEffect, useState } from 'react'
import { supabase } from '../../core/supabaseClient'
import ClearableInput from '../../shared/ClearableInput'
import { SpeakButton, prewarmSpeech } from '../../shared/tts'

/* ============================================================
   LÜCKENTEXT — der erste Übungs-Modus aus der Aufgaben-Bank

   Ablauf: 5 Aufgaben pro Runde. Jede zeigt einen Satz mit EINER
   Lücke und dem Basis-Wort in Klammern — dadurch ist die Lösung
   eindeutig (Konzept-Entscheidung), die App prüft sofort und
   kostenlos. Unbekannte Wörter im Satz sind antippbar und zeigen
   ihre Bedeutung (Glossar, vom Nacht-Batch miterzeugt).

   Ergebnisse werden in der Bank vermerkt (korrekt/falsch) —
   daraus speist sich später das Grammatik-Wissensmodell.
   Leere Bank: freundlicher Hinweis, der Nacht-Batch füllt nach.
   ============================================================ */

const RUNDE = 5

/* Satz in Stücke zerlegen: Lücke + antippbare Glossar-Wörter */
function SatzMitLuecke({ satz, glossar, lang, kind, eingabe }) {
  const [offen, setOffen] = useState(null)

  /* erst an der Lücke teilen, dann Glossar-Wörter markieren */
  const teile = satz.split('___')
  const rendered = teile.map((teil, i) => {
    let rest = teil
    const stuecke = []
    for (const g of glossar ?? []) {
      const pos = rest.indexOf(g.wort)
      if (pos === -1) continue
      if (pos > 0) stuecke.push(rest.slice(0, pos))
      stuecke.push(
        <button
          type="button"
          className="lt-gloss"
          key={`${i}-${g.wort}`}
          onClick={() => setOffen(offen === g.wort ? null : g.wort)}
        >
          {g.wort}
        </button>
      )
      rest = rest.slice(pos + g.wort.length)
    }
    stuecke.push(rest)
    return (
      <span key={i}>
        {stuecke}
        {i < teile.length - 1 && <span className="lt-luecke">{eingabe}</span>}
      </span>
    )
  })

  const aktiv = (glossar ?? []).find((g) => g.wort === offen)
  return (
    <div className="lt-satz-block">
      <p className="lt-satz" lang={lang}>
        {rendered}
      </p>
      {aktiv && (
        <p className="lt-gloss-bubble">
          <strong lang={lang}>{aktiv.wort}</strong> — {aktiv.bedeutung}
        </p>
      )}
    </div>
  )
}

function Lueckentext({ profile, t, onExit }) {
  const [aufgaben, setAufgaben] = useState(null) /* null = lädt */
  const [idx, setIdx] = useState(0)
  const [eingabe, setEingabe] = useState('')
  const [geprueft, setGeprueft] = useState(null) /* null | 'ok' | 'falsch' */
  const [punkte, setPunkte] = useState(0)
  const [fertig, setFertig] = useState(false)

  useEffect(() => {
    let weg = false
    supabase
      .from('exercise_bank')
      .select('id,payload')
      .eq('profile', profile.id)
      .eq('typ', 'lueckentext')
      .eq('status', 'neu')
      .order('created_at', { ascending: true })
      .limit(RUNDE)
      .then(({ data, error }) => {
        if (weg) return
        setAufgaben(error ? [] : (data ?? []))
      })
    return () => {
      weg = true
    }
  }, [profile.id])

  const aufgabe = aufgaben && aufgaben[idx]

  /* Stimme für den vollständigen Satz vorwärmen */
  useEffect(() => {
    if (aufgabe) {
      prewarmSpeech(aufgabe.payload.satz.replace('___', aufgabe.payload.loesung), profile.targetLang)
    }
  }, [aufgabe && aufgabe.id])

  function pruefen(e) {
    e.preventDefault()
    if (!aufgabe || geprueft) return
    const antwort = eingabe.trim()
    if (!antwort) return
    const p = aufgabe.payload
    const richtig =
      antwort === p.loesung || (p.auch_ok ?? []).some((a) => antwort === String(a).trim())
    setGeprueft(richtig ? 'ok' : 'falsch')
    if (richtig) setPunkte((z) => z + 1)
    /* Ergebnis in der Bank vermerken — Beleg fürs Wissensmodell.
       Fehler beim Speichern sind still: die Übung läuft weiter. */
    supabase
      .from('exercise_bank')
      .update({ status: 'erledigt', korrekt: richtig, erledigt_am: new Date().toISOString() })
      .eq('id', aufgabe.id)
      .then(() => {})
  }

  function weiter() {
    if (idx + 1 >= aufgaben.length) {
      setFertig(true)
    } else {
      setIdx(idx + 1)
      setEingabe('')
      setGeprueft(null)
    }
  }

  const kopf = (
    <div className="review-header">
      <button className="back-btn" onClick={onExit} aria-label={t.back}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <span className="daily-label">{t.modeGap}</span>
      {aufgaben && aufgaben.length > 0 && !fertig && (
        <span className="lt-zaehler">{idx + 1} / {aufgaben.length}</span>
      )}
    </div>
  )

  if (aufgaben === null) {
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte"><p className="kal-text">…</p></div>
      </div>
    )
  }

  if (aufgaben.length === 0) {
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte">
          <div className="kal-emoji">🌙</div>
          <p className="kal-text">{t.ltEmpty}</p>
          <button className="done-btn" onClick={onExit}>{t.back}</button>
        </div>
      </div>
    )
  }

  if (fertig) {
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte">
          <div className="kal-emoji pop">{punkte === aufgaben.length ? '🏆' : '🎉'}</div>
          <h2 className="kal-titel">{t.ltFertig(punkte, aufgaben.length)}</h2>
          <button className="done-btn" onClick={onExit}>{t.back}</button>
        </div>
      </div>
    )
  }

  const p = aufgabe.payload
  return (
    <div className="screen">
      {kopf}
      <div className="lt-mitte">
        <span className="lt-grammatik">{p.grammatik_name}</span>

        <SatzMitLuecke
          satz={p.satz}
          glossar={p.glossar}
          lang={profile.targetLang}
          eingabe={
            geprueft ? (
              <strong className={geprueft === 'ok' ? 'lt-ok' : 'lt-falsch'}>{p.loesung}</strong>
            ) : (
              '？'
            )
          }
        />

        <p className="lt-basis">
          [ <span lang={profile.targetLang}>{p.basis}</span> ]
        </p>

        {geprueft === null ? (
          <form className="lt-form" onSubmit={pruefen}>
            <ClearableInput
              autoFocus
              value={eingabe}
              onChange={(e) => setEingabe(e.target.value)}
              onClear={() => setEingabe('')}
              placeholder={t.ltPlaceholder}
              lang={profile.targetLang}
              autoComplete="off"
            />
            <button type="submit" className="add-btn" disabled={!eingabe.trim()}>
              {t.check}
            </button>
          </form>
        ) : (
          <div className="lt-aufloesung">
            {geprueft === 'falsch' && (
              <p className="lt-deine">
                {t.ltDeine}: <span lang={profile.targetLang}>{eingabe}</span>
              </p>
            )}
            <p className={geprueft === 'ok' ? 'lt-note lt-ok' : 'lt-note lt-falsch'}>
              {geprueft === 'ok' ? t.correct : t.ltLoesungWar(p.loesung)}
            </p>
            <p className="lt-uebersetzung">
              {p.uebersetzung}
              <SpeakButton
                text={p.satz.replace('___', p.loesung)}
                lang={profile.targetLang}
                className="speak-inline"
              />
            </p>
            <button className="done-btn" onClick={weiter}>
              {idx + 1 >= aufgaben.length ? t.ltErgebnis : t.ltWeiter}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Lueckentext
