import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../core/supabaseClient'
import { ladeGrammatikInventar } from '../../core/kalibrierung'
import { studioErklaerung, studioAufgaben, studioAntwort, studioBilanz } from '../trainer/trainerApi'
import Nachfrage from './Nachfrage'
import { SpeakButton } from '../../shared/tts'

/* ============================================================
   GRAMMATIK-STUDIO — neues Konzept lernen + einschleifen
   (Konzept: Chat 31.08., V2 nach Franz' erstem Test)

   Ein Bildschirm, zwei Zonen:
   - Oben die Erklärungskarte (wann / wie bauen / ggf. Abgrenzung
     zu verwechselbaren Mustern / 3 Beispiele mit Vorlesen). Beim
     Scrollen bleibt eine SPICKZETTEL-Leiste oben kleben.
   - Darunter 8 OFFENE Drills (V2: keine hartkodierte Lösung mehr):
     jede bestätigte Antwort (✓) startet sofort eine HINTERGRUND-
     Bewertung durch die KI, während man schon weitertippt — der
     Stift daneben macht die Antwort wieder editierbar (die
     vorbereitete Bewertung verfällt dann).

   Ampel statt richtig/falsch (Entscheidung Franz):
     grün = grammatisch korrekt + passt zur Aufgabe (Wortwahl egal)
     gelb = Ziel-Muster im Kern richtig, aber Vokabel-/Tippfehler
     rot  = Muster falsch verstanden oder schwere Fehler
   Grün UND Gelb zählen als "Konzept angewandt"; über 50 % Rot
   klappen 3 Reserve-Aufgaben auf. Bei Gelb/Rot erscheint eine
   Muster-Antwort zum Vergleichen.

   Abschluss: studio_bilanz (Feedback + Einstufung: bestanden ->
   wackelig, nie ein sicher überschreiben) + Nachfrage-Dialog.
   Lektionen werden in exercise_bank gecacht (payload.version 2).
   ============================================================ */

const AMPEL_ZEICHEN = { gruen: '✓', gelb: '~', rot: '✗' }

function Studio({ profile, t, onExit, punkt: punktProp }) {
  const [punkt, setPunkt] = useState(punktProp ?? null)
  /* 'waehlt' | 'leer' | 'erklaerung' | 'aufgaben' | 'fehler' | 'bereit' */
  const [phase, setPhase] = useState(punktProp ? 'erklaerung' : 'waehlt')
  const [lektion, setLektion] = useState(null)
  const [spickOffen, setSpickOffen] = useState(false)
  /* je Aufgabe: {wert, status: 'offen'|'wartet'|'fertig',
     ampel, kommentar, token} — token verwirft veraltete
     Hintergrund-Antworten nach einem Stift-Klick */
  const [antworten, setAntworten] = useState([])
  const [reserveAktiv, setReserveAktiv] = useState(false)
  /* null | 'laedt' | 'offline' | {feedback, bestanden} */
  const [bilanz, setBilanz] = useState(null)
  const gestartet = useRef(false)

  /* Ohne vorgegebenen Punkt: den nächsten offenen an der Front
     wählen (gleiche Logik wie Lückentext-Ziele/Schreibwerkstatt) */
  useEffect(() => {
    if (punktProp) return
    let weg = false
    Promise.all([
      ladeGrammatikInventar(profile.id),
      supabase
        .from('inventory_status')
        .select('item_id,status')
        .eq('profile', profile.id)
        .eq('kind', 'grammatik')
        .then(({ data }) => data ?? []),
    ])
      .then(([inv, st]) => {
        if (weg) return
        const stand = new Map(st.map((z) => [z.item_id, z.status]))
        const mitRang = inv.map((g, rang) => ({ ...g, rang }))
        const bekannt = mitRang.filter(
          (g) => stand.get(g.id) === 'sicher' || stand.get(g.id) === 'wackelig'
        )
        const grenze = bekannt.length ? bekannt[Math.floor(bekannt.length / 2)].rang : 0
        const offen = mitRang.filter(
          (g) => stand.get(g.id) !== 'sicher' && stand.get(g.id) !== 'wackelig'
        )
        const wahl = offen.find((g) => g.rang >= grenze) ?? offen[0]
        if (!wahl) setPhase('leer')
        else {
          setPunkt(wahl)
          setPhase('erklaerung')
        }
      })
      .catch(() => {
        if (!weg) setPhase('fehler')
      })
    return () => {
      weg = true
    }
  }, [profile.id])

  /* Lektion besorgen: erst Cache (Version 2!), sonst in zwei
     Etappen erzeugen — die Erklärung kommt zuerst und ist lesbar,
     während die Aufgaben noch entstehen */
  useEffect(() => {
    if (!punkt || gestartet.current) return
    gestartet.current = true
    let weg = false
    const frisch = (n) =>
      Array.from({ length: n }, () => ({
        wert: '', status: 'offen', ampel: null, kommentar: '', token: 0,
      }))
    ;(async () => {
      try {
        const { data } = await supabase
          .from('exercise_bank')
          .select('payload')
          .eq('profile', profile.id)
          .eq('typ', 'studio')
          .eq('grammatik_id', punkt.id)
          .eq('payload->>version', '2')
          .limit(1)
        if (weg) return
        if (data && data.length) {
          const p = data[0].payload
          setLektion(p)
          setAntworten(frisch(p.aufgaben.length))
          setPhase('bereit')
          return
        }
        const erk = await studioErklaerung({
          profile: profile.id,
          punkt: { id: punkt.id, muster: punkt.muster, name: punkt.name, beispiel: punkt.satz },
        })
        if (weg) return
        setLektion({ ...erk, aufgaben: null, reserve: [] })
        setPhase('aufgaben')
        const auf = await studioAufgaben({
          profile: profile.id,
          punkt: { id: punkt.id, muster: punkt.muster, name: punkt.name },
          bau: erk.bau,
        })
        if (weg) return
        const voll = { version: 2, ...erk, aufgaben: auf.aufgaben, reserve: auf.reserve }
        setLektion(voll)
        setAntworten(frisch(auf.aufgaben.length))
        setPhase('bereit')
        /* In den Cache — Wiederholen ist dann gratis (still bei Fehlern) */
        supabase
          .from('exercise_bank')
          .insert({ profile: profile.id, typ: 'studio', grammatik_id: punkt.id, payload: voll, status: 'neu' })
          .then(() => {})
      } catch {
        if (!weg) setPhase('fehler')
      }
    })()
    return () => {
      weg = true
    }
  }, [punkt && punkt.id])

  const aufgaben = lektion?.aufgaben ?? []
  const aktive = reserveAktiv ? [...aufgaben, ...(lektion?.reserve ?? [])] : aufgaben

  function setzeWert(i, wert) {
    setAntworten((alt) => alt.map((a, k) => (k === i ? { ...a, wert } : a)))
  }

  /* ✓: Antwort einfrieren und die Bewertung im HINTERGRUND
     anstoßen — der Lernende macht derweil die nächste Aufgabe */
  function bestaetige(i) {
    const a = antworten[i]
    if (!a.wert.trim() || a.status !== 'offen') return
    const token = a.token + 1
    setAntworten((alt) =>
      alt.map((x, k) => (k === i ? { ...x, status: 'wartet', token } : x))
    )
    studioAntwort({
      profile: profile.id,
      punkt: { id: punkt.id, muster: punkt.muster, name: punkt.name },
      frage: aktive[i].frage,
      antwort: a.wert.trim(),
    })
      .then((res) => {
        setAntworten((alt) =>
          alt.map((x, k) =>
            k === i && x.token === token && x.status === 'wartet'
              ? { ...x, status: 'fertig', ampel: res.ampel, kommentar: res.kommentar || '' }
              : x
          )
        )
      })
      .catch(() => {
        /* Bewertung fehlgeschlagen: Feld wieder öffnen, ✓ erneut
           tippen versucht es noch einmal */
        setAntworten((alt) =>
          alt.map((x, k) =>
            k === i && x.token === token && x.status === 'wartet'
              ? { ...x, status: 'offen' }
              : x
          )
        )
      })
  }

  /* Stift: wieder bearbeiten — eine laufende oder fertige
     Bewertung verfällt (token zählt hoch, Stale-Antworten
     werden ignoriert) */
  function bearbeite(i) {
    setAntworten((alt) =>
      alt.map((x, k) =>
        k === i ? { ...x, status: 'offen', ampel: null, kommentar: '', token: x.token + 1 } : x
      )
    )
  }

  const alleFertig = antworten.length > 0 && antworten.every((a) => a.status === 'fertig')
  const rotAnteil = alleFertig
    ? antworten.filter((a) => a.ampel === 'rot').length / antworten.length
    : 0
  const gekonnt = antworten.filter((a) => a.ampel === 'gruen' || a.ampel === 'gelb').length

  /* Über die Hälfte rot nach den Haupt-Drills: Reserve aufklappen */
  useEffect(() => {
    if (!alleFertig || reserveAktiv || bilanz) return
    if (rotAnteil > 0.5 && (lektion?.reserve ?? []).length) {
      setReserveAktiv(true)
      setAntworten((alt) => [
        ...alt,
        ...lektion.reserve.map(() => ({
          wert: '', status: 'offen', ampel: null, kommentar: '', token: 0,
        })),
      ])
    }
  }, [alleFertig]) // eslint-disable-line react-hooks/exhaustive-deps

  async function abschliessen() {
    setBilanz('laedt')
    try {
      const res = await studioBilanz({
        profile: profile.id,
        punkt: { id: punkt.id, muster: punkt.muster, name: punkt.name },
        antworten: aktive.map((a, i) => ({
          frage: a.frage,
          antwort: antworten[i].wert.trim(),
          ampel: antworten[i].ampel,
        })),
      })
      setBilanz(res)
    } catch {
      /* Offline: Übung zählt trotzdem, nur Feedback + Einstufung
         entfallen — der Streak hängt nie an der KI */
      setBilanz('offline')
    }
  }

  const kopf = (
    <div className="review-header">
      <button className="back-btn" onClick={onExit} aria-label={t.back}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <span className="daily-label">{t.studioTitle}</span>
    </div>
  )

  if (phase === 'waehlt') {
    return (
      <div className="screen">{kopf}<div className="kal-mitte"><p className="kal-text">…</p></div></div>
    )
  }

  if (phase === 'leer') {
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte">
          <div className="kal-emoji">🏆</div>
          <p className="kal-text">{t.studioAlleFertig}</p>
          <button className="done-btn" onClick={onExit}>{t.back}</button>
        </div>
      </div>
    )
  }

  if (phase === 'fehler') {
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte">
          <div className="kal-emoji">🌙</div>
          <p className="kal-text">{t.studioFehler}</p>
          <button className="done-btn" onClick={onExit}>{t.back}</button>
        </div>
      </div>
    )
  }

  /* Bilanz-Bildschirm — mit Nachfrage-Dialog (Idee Franz) */
  if (bilanz && bilanz !== 'laedt') {
    const bestanden = bilanz === 'offline' ? gekonnt / antworten.length >= 0.5 : bilanz.bestanden
    const kontext =
      `Grammar studio drill for "${punkt.muster}" (${punkt.name}). Results:\n` +
      aktive
        .map((a, i) => `${a.frage} -> "${antworten[i].wert}" (${antworten[i].ampel})`)
        .join('\n') +
      (bilanz !== 'offline' && bilanz.feedback ? `\nTrainer feedback: ${bilanz.feedback}` : '')
    return (
      <div className="screen">
        {kopf}
        <div className="lt2-scroll">
          <div className="kal-mitte studio-fertig">
            <div className="kal-emoji">{bestanden ? '🌱' : '💪'}</div>
            <p className="kal-text">{t.studioErgebnis(gekonnt, antworten.length)}</p>
            {bilanz !== 'offline' && bilanz.feedback && (
              <p className="lt2-feedback studio-feedback">{bilanz.feedback}</p>
            )}
            <p className="studio-hinweis">
              {bilanz === 'offline' ? t.studioOffline : bestanden ? t.studioGepflanzt : t.studioSpaeter}
            </p>
            {bilanz !== 'offline' && <Nachfrage profile={profile} t={t} kontext={kontext} />}
            <button className="done-btn" onClick={onExit}>{t.back}</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      {kopf}
      <div className="lt2-scroll studio-scroll">
        {/* Spickzettel-Leiste: klebt beim Scrollen oben */}
        {lektion && (
          <button type="button" className="studio-spick" onClick={() => setSpickOffen(!spickOffen)}>
            <span className="studio-spick-muster" lang={profile.targetLang}>{punkt.muster}</span>
            <span className="studio-spick-pfeil">{spickOffen ? '▴' : '▾'}</span>
            {spickOffen && <span className="studio-spick-bau">{lektion.bau}</span>}
          </button>
        )}

        {/* Erklärungskarte */}
        {lektion && (
          <div className="studio-karte">
            <p className="studio-muster" lang={profile.targetLang}>{punkt.muster}</p>
            <p className="studio-name">{punkt.name}</p>
            <p className="studio-wann">{lektion.wann}</p>
            <p className="studio-bau">🔧 {lektion.bau}</p>
            {/* Abgrenzung zu verwechselbaren Mustern — genau der
                Teil, der bei 어떤/무슨 gefehlt hat */}
            {lektion.abgrenzung ? (
              <p className="studio-abgrenzung">⚠️ {lektion.abgrenzung}</p>
            ) : null}
            <div className="studio-beispiele">
              {(lektion.beispiele ?? []).map((b, i) => (
                <p key={i}>
                  <span lang={profile.targetLang}>{b.satz}</span>
                  <SpeakButton text={b.satz} lang={profile.targetLang} className="speak-inline" />
                  <span className="studio-tr">{b.tr}</span>
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Etappen-Fortschritt statt stummem Spinner */}
        {phase === 'erklaerung' && <p className="studio-laden">✍️ {t.studioLadenErkl}</p>}
        {phase === 'aufgaben' && <p className="studio-laden">🧩 {t.studioLadenAufg}</p>}

        {/* Drills */}
        {phase === 'bereit' && (
          <div className="studio-drills">
            <p className="lt2-hinweis">{t.studioAnleitung}</p>
            {aktive.map((a, i) => {
              const st = antworten[i]
              const istReserve = i >= aufgaben.length
              return (
                <div className="studio-drill" key={i}>
                  {istReserve && i === aufgaben.length && (
                    <p className="studio-reserve-titel">💪 {t.studioReserve}</p>
                  )}
                  <p className="studio-frage">
                    <span className="studio-nr">{i + 1}</span> {a.frage}
                  </p>
                  {st.status === 'offen' ? (
                    <div className="studio-eingabe">
                      <input
                        className="lt2-feld studio-feld"
                        value={st.wert}
                        onChange={(e) => setzeWert(i, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') bestaetige(i)
                        }}
                        lang={profile.targetLang}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                      <button
                        type="button"
                        className="studio-check"
                        onClick={() => bestaetige(i)}
                        disabled={!st.wert.trim()}
                        aria-label={t.check}
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <div className={`studio-ergebnis studio-a-${st.ampel ?? 'wartet'}`}>
                      <div className="studio-ergebnis-zeile">
                        <span className="studio-ampel">
                          {st.status === 'wartet' ? '⋯' : AMPEL_ZEICHEN[st.ampel] ?? '?'}
                        </span>
                        <span className="studio-antwort-text" lang={profile.targetLang}>{st.wert}</span>
                        <button
                          type="button"
                          className="studio-stift"
                          onClick={() => bearbeite(i)}
                          aria-label={t.studioBearbeiten}
                        >
                          ✎
                        </button>
                      </div>
                      {st.kommentar && <p className="studio-kommentar">{st.kommentar}</p>}
                      {/* Muster-Antwort bei Gelb/Rot (Entscheidung Franz) */}
                      {(st.ampel === 'gelb' || st.ampel === 'rot') && a.muster && (
                        <p className="studio-kommentar">
                          {t.studioMusterLabel}{' '}
                          <span lang={profile.targetLang}>{a.muster}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {antworten.length > 0 && antworten.every((a) => a.status !== 'offen') && (
              <button
                className="done-btn lt2-pruefen"
                onClick={abschliessen}
                disabled={!alleFertig || bilanz === 'laedt'}
              >
                {!alleFertig
                  ? t.studioWartet
                  : bilanz === 'laedt'
                    ? t.ltFeedbackLaedt
                    : t.studioAbschliessen}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Studio
