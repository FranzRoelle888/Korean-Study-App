import { useEffect, useState } from 'react'
import { supabase } from '../../core/supabaseClient'
import { trainerUebung } from '../trainer/trainerApi'
import { SpeakButton, prewarmSpeech } from '../../shared/tts'

/* ============================================================
   LÜCKENTEXT V2 — zusammenhängende Texte mit mehreren Lücken

   Nach Franz' Test-Feedback (28.08.2026) neu gebaut:
   - EIN Fließtext (2–4 Sätze), 6–8 Lücken aus gemischter
     Grammatik — fordernder, weil der Kontext trägt.
   - Form-Lücken zeigen die Grundform GRAU IM FELD (nicht mehr
     doppelt daneben); Partikel-Lücken sind schmal und leer.
   - Glossar-Wörter (gepunktet unterstrichen) sind antippbar.
   - Geprüft wird alles auf einen Schlag; falsche Lücken zeigen
     die Lösung, die eigene Antwort bleibt durchgestrichen sichtbar.
   - Danach: kurzes KI-Feedback (fließt zugleich als Beleg in
     Grammatik-Zustände und Lernjournal — der Rückfluss!).
   ============================================================ */

/* Text + Lücken + Glossar in eine renderbare Stückliste zerlegen */
function zerlege(payload) {
  const teile = payload.text.split('___')
  return teile.map((teil, i) => ({ text: teil, lueckeIdx: i < teile.length - 1 ? i : null }))
}

function GlossText({ text, glossar, lang, onGloss }) {
  const stuecke = []
  let rest = text
  let k = 0
  for (const g of glossar ?? []) {
    const pos = rest.indexOf(g.wort)
    if (pos === -1) continue
    if (pos > 0) stuecke.push(<span key={`t${k++}`}>{rest.slice(0, pos)}</span>)
    stuecke.push(
      <button type="button" className="lt-gloss" key={`g${k++}`} onClick={() => onGloss(g)}>
        {g.wort}
      </button>
    )
    rest = rest.slice(pos + g.wort.length)
  }
  stuecke.push(<span key={`r${k}`}>{rest}</span>)
  return <span lang={lang}>{stuecke}</span>
}

function Lueckentext({ profile, t, onExit }) {
  const [texte, setTexte] = useState(null) /* null = lädt */
  /* Diagnose für den Leer-Bildschirm: was liegt WIRKLICH in der Bank? */
  const [bankInfo, setBankInfo] = useState(null)
  const [idx, setIdx] = useState(0)
  const [antworten, setAntworten] = useState([])
  const [geprueft, setGeprueft] = useState(false)
  const [gloss, setGloss] = useState(null)
  /* welcher Grammatik-Chip ist aufgeklappt (nicht-neue Punkte) */
  const [punktOffen, setPunktOffen] = useState(null)
  /* in dieser Sitzung als "kann ich längst" markierte Punkte */
  const [laengstOk, setLaengstOk] = useState(() => new Set())
  const [feedback, setFeedback] = useState(null) /* null | 'laedt' | string */

  useEffect(() => {
    let weg = false
    supabase
      .from('exercise_bank')
      .select('id,payload')
      .eq('profile', profile.id)
      .eq('typ', 'lueckentext')
      .eq('status', 'neu')
      .eq('payload->>version', '3')
      .order('created_at', { ascending: true })
      .limit(3)
      .then(({ data, error }) => {
        if (weg) return
        setTexte(error ? [] : (data ?? []))
        if (error || !data || data.length === 0) {
          /* Leer? Dann nachzählen, was überhaupt da ist — die
             Zahlen erscheinen klein auf dem Leer-Bildschirm und
             verraten sofort, WO es klemmt (Bank leer vs. Filter) */
          Promise.all([
            supabase
              .from('exercise_bank')
              .select('id', { count: 'exact', head: true })
              .eq('profile', profile.id)
              .eq('typ', 'lueckentext'),
            supabase
              .from('exercise_bank')
              .select('id', { count: 'exact', head: true })
              .eq('profile', profile.id)
              .eq('typ', 'lueckentext')
              .eq('status', 'neu'),
          ]).then(([alle, neue]) => {
            if (!weg) setBankInfo({ alle: alle.count ?? 0, neu: neue.count ?? 0, fehler: error?.message })
          })
        }
      })
    return () => {
      weg = true
    }
  }, [profile.id])

  const aufgabe = texte && texte[idx]
  const luecken = aufgabe ? aufgabe.payload.luecken : []

  /* Antwort-Felder zurücksetzen + Stimme vorwärmen, wenn ein
     neuer Text dran ist */
  useEffect(() => {
    if (!aufgabe) return
    setAntworten(aufgabe.payload.luecken.map(() => ''))
    setGeprueft(false)
    setFeedback(null)
    setGloss(null)
    let voll = aufgabe.payload.text
    for (const l of aufgabe.payload.luecken) voll = voll.replace('___', l.loesung)
    prewarmSpeech(voll, profile.targetLang)
  }, [aufgabe && aufgabe.id])

  /* "Kann ich längst": die direkteste Lernstand-Info, die es gibt —
     der Punkt wird sofort als sicher gebucht und taucht damit in
     künftigen Texten seltener als Ziel auf. source bleibt
     'kalibrierung', denn es ist eine SELBSTeinschätzung — im
     Fortschritts-Balken zählt sie deshalb blass, nicht satt. */
  function kannIchLaengst(pt) {
    setLaengstOk((alt) => new Set([...alt, pt.id]))
    setPunktOffen(pt.id) /* Box offen halten, damit die Bestätigung sichtbar ist */
    supabase
      .from('inventory_status')
      .upsert(
        [{ profile: profile.id, item_id: pt.id, kind: 'grammatik', status: 'sicher', label: pt.name, source: 'kalibrierung' }],
        { onConflict: 'profile,item_id' }
      )
      .then(() => {})
  }

  function istRichtig(i) {
    const a = (antworten[i] ?? '').trim()
    const l = luecken[i]
    return a === l.loesung || (l.auch_ok ?? []).some((x) => a === String(x).trim())
  }

  async function pruefen() {
    if (geprueft || antworten.some((a) => !a.trim())) return
    setGeprueft(true)
    const ergebnisse = luecken.map((l, i) => ({
      grammatik_id: l.grammatik_id,
      grammatik_name:
        (aufgabe.payload.punkte ?? []).find((p) => p.id === l.grammatik_id)?.name ?? l.grammatik_id,
      loesung: l.loesung,
      antwort: antworten[i].trim(),
      richtig: istRichtig(i),
    }))
    /* Ergebnis in der Bank vermerken (still bei Fehlern) */
    supabase
      .from('exercise_bank')
      .update({
        status: 'erledigt',
        korrekt: ergebnisse.every((e) => e.richtig),
        erledigt_am: new Date().toISOString(),
      })
      .eq('id', aufgabe.id)
      .then(() => {})
    /* KI-Feedback + Beleg-Rückfluss — der Kern des Konzepts.
       Offline/Fehler: die Übung bleibt trotzdem abgeschlossen. */
    setFeedback('laedt')
    try {
      const res = await trainerUebung({ profile: profile.id, ergebnisse })
      setFeedback(res.feedback || '')
    } catch {
      setFeedback('')
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
      {geprueft && (
        <span className="lt-zaehler">
          {luecken.filter((_, i) => istRichtig(i)).length} / {luecken.length}
        </span>
      )}
    </div>
  )

  if (texte === null) {
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte"><p className="kal-text">…</p></div>
      </div>
    )
  }

  if (!aufgabe) {
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte">
          <div className="kal-emoji">🌙</div>
          <p className="kal-text">{t.ltEmpty}</p>
          {bankInfo && (
            <p className="lt-bankinfo">
              Bank: {bankInfo.alle} gesamt · {bankInfo.neu} offen · 0 im aktuellen Format (v3)
              {bankInfo.fehler ? ` · Fehler: ${bankInfo.fehler}` : ''}
            </p>
          )}
          <button className="done-btn" onClick={onExit}>{t.back}</button>
        </div>
      </div>
    )
  }

  const p = aufgabe.payload
  const stuecke = zerlege(p)
  const alleGefuellt = antworten.every((a) => a.trim())

  return (
    <div className="screen">
      {kopf}
      <div className="lt2-scroll">
        <div className="lt-punkte">
          {(p.punkte ?? []).map((pt) => (
            <button
              type="button"
              className="lt-grammatik"
              key={pt.id}
              onClick={() => setPunktOffen(punktOffen === pt.id ? null : pt.id)}
            >
              {pt.name}
            </button>
          ))}
        </div>

        {/* Kurz-Erklärungen: noch nicht felsenfeste Punkte automatisch,
            sichere auf Chip-Tipp (Feedback Franz: Neues nie unerklärt) */}
        {(() => {
          const zeigen = (p.punkte ?? []).filter(
            (pt) => pt.kurz && ((pt.neu && !laengstOk.has(pt.id)) || punktOffen === pt.id)
          )
          if (!zeigen.length) return null
          return (
            <div className="lt-kurzbox">
              {zeigen.map((pt) => (
                <div key={pt.id}>
                  <p>
                    <strong>{pt.name}:</strong> {pt.kurz}
                  </p>
                  {/* Direkter Draht ins Wissensmodell: sofort als
                      sicher buchen, statt es die App raten zu lassen */}
                  {pt.neu && (
                    laengstOk.has(pt.id) ? (
                      <p className="lt-kannich-ok">✓ {t.ltKannIchOk}</p>
                    ) : (
                      <button type="button" className="lt-kannich" onClick={() => kannIchLaengst(pt)}>
                        ✓ {t.ltKannIch}
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          )
        })()}

        <div className="lt-satz-block lt2-text">
          <p className="lt-satz" lang={profile.targetLang}>
            {stuecke.map((s, i) => (
              <span key={i}>
                <GlossText text={s.text} glossar={p.glossar} lang={profile.targetLang} onGloss={(g) => setGloss(gloss?.wort === g.wort ? null : g)} />
                {s.lueckeIdx !== null && (
                  geprueft ? (
                    istRichtig(s.lueckeIdx) ? (
                      <strong className="lt-ok">{luecken[s.lueckeIdx].loesung}</strong>
                    ) : (
                      <span className="lt2-korrektur">
                        <s className="lt-falsch">{antworten[s.lueckeIdx]}</s>{' '}
                        <strong className="lt-ok">{luecken[s.lueckeIdx].loesung}</strong>
                      </span>
                    )
                  ) : (
                    <input
                      className={
                        luecken[s.lueckeIdx].art === 'partikel'
                          ? 'lt2-feld lt2-feld-kurz'
                          : luecken[s.lueckeIdx].art === 'chunk'
                            ? 'lt2-feld lt2-feld-breit lt2-feld-chunk'
                            : /* einheitlich breite Wort-Felder (Feedback Franz) */
                              'lt2-feld lt2-feld-breit'
                      }
                      value={antworten[s.lueckeIdx]}
                      onChange={(e) => {
                        const neu = [...antworten]
                        neu[s.lueckeIdx] = e.target.value
                        setAntworten(neu)
                      }}
                      placeholder={
                        luecken[s.lueckeIdx].art === 'partikel'
                          ? '…'
                          : /* Der Denk-Hinweis: die BEDEUTUNG in der gekonnten
                               Sprache — Wort abrufen UND Form bauen */
                            luecken[s.lueckeIdx].hinweis || luecken[s.lueckeIdx].basis
                      }
                      lang={profile.targetLang}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      size={luecken[s.lueckeIdx].art === 'partikel' ? 2 : undefined}
                    />
                  )
                )}
              </span>
            ))}
          </p>
          {gloss && (
            <p className="lt-gloss-bubble">
              <strong lang={profile.targetLang}>{gloss.wort}</strong> — {gloss.bedeutung}
            </p>
          )}
        </div>

        {!geprueft && <p className="lt2-hinweis">{t.ltHinweis}</p>}

        {!geprueft ? (
          <button className="done-btn lt2-pruefen" onClick={pruefen} disabled={!alleGefuellt}>
            {t.check}
          </button>
        ) : (
          <div className="lt-aufloesung">
            <p className="lt-uebersetzung">
              {p.uebersetzung}
              <SpeakButton
                text={luecken.reduce((txt, l) => txt.replace('___', l.loesung), p.text)}
                lang={profile.targetLang}
                className="speak-inline"
              />
            </p>
            {feedback === 'laedt' ? (
              <p className="lt2-feedback lt2-feedback-laedt">{t.ltFeedbackLaedt}</p>
            ) : feedback ? (
              <p className="lt2-feedback">{feedback}</p>
            ) : null}
            <div className="lt2-ende">
              {idx + 1 < texte.length && (
                <button className="done-btn" onClick={() => setIdx(idx + 1)}>
                  {t.ltNochEiner}
                </button>
              )}
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

export default Lueckentext
