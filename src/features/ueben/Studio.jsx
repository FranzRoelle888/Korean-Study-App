import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../core/supabaseClient'
import { ladeGrammatikInventar } from '../../core/kalibrierung'
import { studioErklaerung, studioAufgaben, studioBilanz } from '../trainer/trainerApi'
import { SpeakButton } from '../../shared/tts'

/* ============================================================
   GRAMMATIK-STUDIO — neues Konzept lernen + einschleifen
   (Konzept: Chat 31.08., ersetzt die alte 5-Phasen-Lektion)

   Ein Bildschirm, zwei Zonen:
   - Oben die Erklärungskarte (wann / wie bauen / 3 Beispiele mit
     Vorlesen). Beim Scrollen bleibt eine kompakte SPICKZETTEL-
     Leiste oben kleben — antippen klappt die Bau-Regel auf.
   - Darunter 8 lehrbuchartige Drills, bewusst gleichförmig.
     Jede Antwort wird SOFORT lokal geprüft (grün/rot); unter 50%
     klappen 3 Reserve-Aufgaben auf ("noch einmal festigen").

   Am Ende EIN KI-Aufruf (studio_bilanz): erkennt Systemfehler vs.
   Ausrutscher, gibt Feedback und stuft den Punkt ein — bestanden
   -> wackelig (frisch Gelerntes ist nie "sicher"; sicher machen
   es die Belege der Folgetage in Lückentext & Schreibwerkstatt).

   Erzeugung in Etappen mit echtem Fortschritt: erst die
   Erklärung (sofort lesbar), dann die Aufgaben. Einmal erzeugte
   Lektionen werden in exercise_bank gecacht (typ 'studio') —
   Wiederholen kostet nichts mehr.
   ============================================================ */

/* Antworten großzügig vergleichen: Leerraum normalisieren, und
   fürs Koreanische zusätzlich ganz ohne Leerzeichen (die
   Worttrennung ist dort notorisch uneinheitlich getippt) */
function stimmt(antwort, aufgabe, profilId) {
  const norm = (s) => String(s).trim().replace(/\s+/g, ' ')
  const eng = (s) => String(s).replace(/\s+/g, '')
  const kandidaten = [aufgabe.loesung, ...(aufgabe.auch_ok ?? [])]
  return kandidaten.some(
    (k) => norm(antwort) === norm(k) || (profilId === 'ko' && eng(antwort) === eng(k))
  )
}

function Studio({ profile, t, onExit, punkt: punktProp }) {
  const [punkt, setPunkt] = useState(punktProp ?? null)
  /* 'waehlt' | 'leer' | 'erklaerung' | 'aufgaben' | 'fehler' | 'bereit' */
  const [phase, setPhase] = useState(punktProp ? 'erklaerung' : 'waehlt')
  const [lektion, setLektion] = useState(null) /* {wann,bau,beispiele,aufgaben,reserve} */
  const [spickOffen, setSpickOffen] = useState(false)
  /* je Aufgabe: {wert, geprueft, richtig} */
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

  /* Lektion besorgen: erst Cache, sonst in zwei Etappen erzeugen */
  useEffect(() => {
    if (!punkt || gestartet.current) return
    gestartet.current = true
    let weg = false
    ;(async () => {
      try {
        /* Cache-Blick: schon einmal erzeugt? */
        const { data } = await supabase
          .from('exercise_bank')
          .select('payload')
          .eq('profile', profile.id)
          .eq('typ', 'studio')
          .eq('grammatik_id', punkt.id)
          .eq('payload->>version', '1')
          .limit(1)
        if (weg) return
        if (data && data.length) {
          const p = data[0].payload
          setLektion(p)
          setAntworten(p.aufgaben.map(() => ({ wert: '', geprueft: false, richtig: false })))
          setPhase('bereit')
          return
        }
        /* Etappe 1: Erklärung — sofort anzeigen, Lesezeit = Wartezeit */
        const erk = await studioErklaerung({
          profile: profile.id,
          punkt: { id: punkt.id, muster: punkt.muster, name: punkt.name, beispiel: punkt.satz },
        })
        if (weg) return
        setLektion({ ...erk, aufgaben: null, reserve: [] })
        setPhase('aufgaben')
        /* Etappe 2: Drills */
        const auf = await studioAufgaben({
          profile: profile.id,
          punkt: { id: punkt.id, muster: punkt.muster, name: punkt.name },
          bau: erk.bau,
        })
        if (weg) return
        const voll = { version: 1, ...erk, aufgaben: auf.aufgaben, reserve: auf.reserve }
        setLektion(voll)
        setAntworten(auf.aufgaben.map(() => ({ wert: '', geprueft: false, richtig: false })))
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

  function pruefe(i) {
    setAntworten((alt) =>
      alt.map((a, k) =>
        k === i && a.wert.trim()
          ? { ...a, geprueft: true, richtig: stimmt(a.wert, aktive[i], profile.id) }
          : a
      )
    )
  }

  const alleGeprueft = antworten.length > 0 && antworten.every((a) => a.geprueft)
  const quote = alleGeprueft
    ? antworten.filter((a) => a.richtig).length / antworten.length
    : null
  /* Unter 50 % nach den Haupt-Drills: Reserve aufklappen */
  useEffect(() => {
    if (!alleGeprueft || reserveAktiv || bilanz) return
    if (quote < 0.5 && (lektion?.reserve ?? []).length) {
      setReserveAktiv(true)
      setAntworten((alt) => [
        ...alt,
        ...lektion.reserve.map(() => ({ wert: '', geprueft: false, richtig: false })),
      ])
    }
  }, [alleGeprueft]) // eslint-disable-line react-hooks/exhaustive-deps

  async function abschliessen() {
    setBilanz('laedt')
    try {
      const res = await studioBilanz({
        profile: profile.id,
        punkt: { id: punkt.id, muster: punkt.muster, name: punkt.name },
        antworten: aktive.map((a, i) => ({
          frage: a.frage,
          loesung: a.loesung,
          antwort: antworten[i].wert.trim(),
          richtig: antworten[i].richtig,
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

  /* Bilanz-Bildschirm */
  if (bilanz && bilanz !== 'laedt') {
    const bestanden = bilanz === 'offline' ? quote >= 0.5 : bilanz.bestanden
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte">
          <div className="kal-emoji">{bestanden ? '🌱' : '💪'}</div>
          <p className="kal-text">
            {t.studioErgebnis(antworten.filter((a) => a.richtig).length, antworten.length)}
          </p>
          {bilanz !== 'offline' && bilanz.feedback && (
            <p className="lt2-feedback studio-feedback">{bilanz.feedback}</p>
          )}
          <p className="studio-hinweis">
            {bilanz === 'offline' ? t.studioOffline : bestanden ? t.studioGepflanzt : t.studioSpaeter}
          </p>
          <button className="done-btn" onClick={onExit}>{t.back}</button>
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
                  {st.geprueft ? (
                    st.richtig ? (
                      <p className="studio-ok" lang={profile.targetLang}>✓ {st.wert}</p>
                    ) : (
                      <p className="studio-falsch">
                        <s lang={profile.targetLang}>{st.wert}</s>{' '}
                        <strong className="lt-ok" lang={profile.targetLang}>{a.loesung}</strong>
                      </p>
                    )
                  ) : (
                    <div className="studio-eingabe">
                      <input
                        className="lt2-feld studio-feld"
                        value={st.wert}
                        onChange={(e) => setzeWert(i, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') pruefe(i)
                        }}
                        lang={profile.targetLang}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                      <button
                        type="button"
                        className="studio-check"
                        onClick={() => pruefe(i)}
                        disabled={!st.wert.trim()}
                        aria-label={t.check}
                      >
                        ✓
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {alleGeprueft && (
              <button
                className="done-btn lt2-pruefen"
                onClick={abschliessen}
                disabled={bilanz === 'laedt'}
              >
                {bilanz === 'laedt' ? t.ltFeedbackLaedt : t.studioAbschliessen}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Studio
