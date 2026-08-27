import { useEffect, useRef, useState } from 'react'
import {
  ladeWortInventar,
  ladeGrammatikInventar,
  bandProbe,
  naechsterSchritt,
  startBand,
  speichereStatus,
  merkeKalibrierungErledigt,
} from '../../core/kalibrierung'
import { addSkill } from '../../core/storage'

/* ============================================================
   KALIBRIERUNG — einmalig pro Person (~5–10 Minuten)

   Vier Phasen:
   1. cando     8 Selbsteinschätzungs-Fragen -> Startposition
   2. wischen   Wörter aus dem Inventar: rechts = kenne ich,
                links = kenne ich nicht. Band-Stichproben mit
                Sprung-Logik — nie die ganze Liste.
   3. grammatik Beispielsätze statt Fachbegriffe: "Könntest du
                so einen Satz selbst bilden?" Ja / So halb / Nein
   4. fertig    Zusammenfassung; ein Skills-Eintrag fasst das
                Ergebnis für den Trainer zusammen (Intuition!)

   Braucht Internet (einmaliges Einrichten, kein Tagespensum) —
   scheitert das Speichern, bleibt alles wiederholbar.
   ============================================================ */

/* nurGrammatik: Direkteinstieg in Phase 3 — zum Nachholen oder
   Wiederholen des Grammatik-Checks (von "My grammar" aus).
   Ergebnisse überschreiben alte Urteile sauber per Upsert. */
function Kalibrierung({ profile, t, onExit, nurGrammatik = false }) {
  const [phase, setPhase] = useState(nurGrammatik ? 'laden' : 'intro')
  const [fehler, setFehler] = useState(false)
  const [busy, setBusy] = useState(false)

  /* Can-do */
  const [candoIdx, setCandoIdx] = useState(0)
  const [candoPunkte, setCandoPunkte] = useState(0)

  /* Wischen */
  const [inventar, setInventar] = useState(null)
  const [band, setBand] = useState(0)
  const [probe, setProbe] = useState([])
  const [probeIdx, setProbeIdx] = useState(0)
  const [bandBekannt, setBandBekannt] = useState(0)
  const [gewischteBaender, setGewischteBaender] = useState(0)
  const [wortStatus, setWortStatus] = useState([])
  const [zaehler, setZaehler] = useState({ sicher: 0, unbekannt: 0 })
  /* Wisch-Animation: 'rechts' | 'links' | null */
  const [flug, setFlug] = useState(null)
  const dragX = useRef(0)
  const [dragDelta, setDragDelta] = useState(0)

  /* Grammatik */
  const [grammatik, setGrammatik] = useState(null)
  const [gramIdx, setGramIdx] = useState(0)
  const [gramStatus, setGramStatus] = useState([])

  const fragen = t.candoFragen(profile.targetName)

  /* Nachhol-Modus: direkt bei der Grammatik einsteigen */
  useEffect(() => {
    if (nurGrammatik) grammatikStarten([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- Phase 1: Can-do ---------- */
  function candoAntwort(punkte) {
    const neu = candoPunkte + punkte
    if (candoIdx + 1 >= fragen.length) {
      setCandoPunkte(neu)
      wischenStarten(Math.round(neu))
    } else {
      setCandoPunkte(neu)
      setCandoIdx(candoIdx + 1)
    }
  }

  /* ---------- Phase 2: Wischen ---------- */
  async function wischenStarten(punkte) {
    setPhase('laden')
    try {
      const inv = await ladeWortInventar(profile.id)
      const b = startBand(punkte)
      setInventar(inv)
      setBand(b)
      setProbe(bandProbe(inv, b))
      setProbeIdx(0)
      setBandBekannt(0)
      setGewischteBaender(0)
      setPhase('wischen')
    } catch {
      setFehler(true)
      setPhase('intro')
    }
  }

  function wischen(bekannt) {
    const eintrag = probe[probeIdx]
    if (!eintrag) return
    setFlug(bekannt ? 'rechts' : 'links')
    setTimeout(() => {
      setFlug(null)
      setDragDelta(0)
      const status = [
        ...wortStatus,
        {
          item_id: eintrag.id,
          kind: 'wort',
          status: bekannt ? 'sicher' : 'unbekannt',
          label: eintrag.label,
        },
      ]
      setWortStatus(status)
      setZaehler((z) => ({
        sicher: z.sicher + (bekannt ? 1 : 0),
        unbekannt: z.unbekannt + (bekannt ? 0 : 1),
      }))
      const neuBekannt = bandBekannt + (bekannt ? 1 : 0)

      if (probeIdx + 1 < probe.length) {
        setBandBekannt(neuBekannt)
        setProbeIdx(probeIdx + 1)
        return
      }
      /* Band fertig: Quote auswerten, springen oder aufhören */
      const quote = neuBekannt / probe.length
      const gewischt = gewischteBaender + 1
      const schritt = naechsterSchritt(quote, band, inventar.length, gewischt)
      if (schritt.fertig) {
        grammatikStarten(status)
      } else {
        setBand(schritt.band)
        setProbe(bandProbe(inventar, schritt.band))
        setProbeIdx(0)
        setBandBekannt(0)
        setGewischteBaender(gewischt)
      }
    }, 220)
  }

  /* Fingerwischen (zusätzlich zu den Knöpfen) */
  function dragStart(e) {
    dragX.current = e.touches ? e.touches[0].clientX : e.clientX
  }
  function dragMove(e) {
    if (dragX.current === 0) return
    const x = e.touches ? e.touches[0].clientX : e.clientX
    setDragDelta(x - dragX.current)
  }
  function dragEnd() {
    if (Math.abs(dragDelta) > 70) wischen(dragDelta > 0)
    else setDragDelta(0)
    dragX.current = 0
  }

  /* ---------- Phase 3: Grammatik ---------- */
  async function grammatikStarten(status) {
    setPhase('laden')
    try {
      /* Wort-Urteile jetzt sichern (Teilschritt-Sicherung) */
      await speichereStatus(profile.id, status)
      const g = await ladeGrammatikInventar(profile.id)
      setGrammatik(g)
      setGramIdx(0)
      setPhase('grammatik')
    } catch (e) {
      console.warn('Grammatik-Start fehlgeschlagen:', e?.message || e)
      setFehler(true)
      /* Im Nachhol-Modus gibt es keine Wisch-Phase zum Zurückfallen */
      setPhase(nurGrammatik ? 'intro' : 'wischen')
    }
  }

  function gramAntwort(status) {
    const eintrag = grammatik[gramIdx]
    const neu = [
      ...gramStatus,
      { item_id: eintrag.id, kind: 'grammatik', status, label: eintrag.label },
    ]
    setGramStatus(neu)
    /* Bewusst OHNE Früh-Stopp (Entscheidung Franz): wilde Lerner
       haben Wissensinseln weit hinter ihrer "Grenze" — die komplette
       Liste dauert nur ein, zwei Minuten und erwischt sie alle. */
    if (gramIdx + 1 >= grammatik.length) {
      abschliessen(neu)
    } else {
      setGramIdx(gramIdx + 1)
    }
  }

  /* ---------- Phase 4: Abschluss ---------- */
  async function abschliessen(gramFinal) {
    setBusy(true)
    setFehler(false)
    try {
      await speichereStatus(profile.id, gramFinal)
      /* Die Intuitions-Zusammenfassung für den Trainer: EIN
         Skills-Eintrag statt hundert Einzelfakten */
      const sicherGram = gramFinal.filter((g) => g.status === 'sicher').length
      const kanon = profile.id === 'ko' ? 'TOPIK I' : 'CEFR A1-A2'
      const wortTeil =
        zaehler.sicher + zaehler.unbekannt > 0
          ? `Vocabulary self-check: knows ~${zaehler.sicher} of ${zaehler.sicher + zaehler.unbekannt} sampled inventory words. `
          : ''
      await addSkill(
        `Kalibrierung ${new Date().toISOString().slice(0, 10)}`,
        `${wortTeil}Grammar self-check: confident in ${sicherGram} of ${gramFinal.length} checked points of the canonical ${kanon} sequence.`
      )
      merkeKalibrierungErledigt(profile.id)
      setPhase('fertig')
    } catch {
      setFehler(true)
    }
    setBusy(false)
  }

  /* ---------- Ansichten ---------- */
  const kopf = (
    <div className="review-header">
      <button className="back-btn" onClick={onExit} aria-label={t.back}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <span className="daily-label">{t.kalTitle}</span>
    </div>
  )

  if (phase === 'intro') {
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte">
          <div className="kal-emoji">🧭</div>
          <h2 className="kal-titel">{t.kalIntroTitle}</h2>
          <p className="kal-text">{t.kalIntroText}</p>
          {fehler && <p className="chat-error">{t.kalFehler}</p>}
          <button className="done-btn" onClick={() => setPhase('cando')}>
            {t.kalStart}
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'laden') {
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte"><p className="kal-text">…</p></div>
      </div>
    )
  }

  if (phase === 'cando') {
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte">
          <span className="kal-schritt">{candoIdx + 1} / {fragen.length}</span>
          <p className="kal-frage">{fragen[candoIdx]}</p>
          <div className="kal-antworten">
            <button className="kal-btn kal-ja" onClick={() => candoAntwort(1)}>{t.kalJa}</button>
            <button className="kal-btn kal-halb" onClick={() => candoAntwort(0.5)}>{t.kalHalb}</button>
            <button className="kal-btn kal-nein" onClick={() => candoAntwort(0)}>{t.kalNein}</button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'wischen') {
    const eintrag = probe[probeIdx]
    const stil = flug
      ? { transform: `translateX(${flug === 'rechts' ? 420 : -420}px) rotate(${flug === 'rechts' ? 14 : -14}deg)`, opacity: 0, transition: 'all 0.22s ease-in' }
      : dragDelta
        ? { transform: `translateX(${dragDelta}px) rotate(${dragDelta / 18}deg)` }
        : undefined
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte">
          <span className="kal-schritt">{t.kalWischenHint}</span>
          {eintrag && (
            <div
              className="kal-karte"
              style={stil}
              onTouchStart={dragStart}
              onTouchMove={dragMove}
              onTouchEnd={dragEnd}
              onMouseDown={dragStart}
              onMouseMove={dragMove}
              onMouseUp={dragEnd}
            >
              <span className="kal-wort" lang={eintrag.lang}>{eintrag.wort}</span>
            </div>
          )}
          <div className="kal-antworten">
            <button className="kal-btn kal-nein" onClick={() => wischen(false)}>✗ {t.kalKenneNicht}</button>
            <button className="kal-btn kal-ja" onClick={() => wischen(true)}>✓ {t.kalKenne}</button>
          </div>
          <p className="kal-zaehler">{zaehler.sicher} ✓ · {zaehler.unbekannt} ✗</p>
          {fehler && <p className="chat-error">{t.kalFehler}</p>}
        </div>
      </div>
    )
  }

  if (phase === 'grammatik') {
    const eintrag = grammatik[gramIdx]
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte">
          <span className="kal-schritt">{gramIdx + 1} / {grammatik.length}</span>
          <p className="kal-frage">{t.kalGrammatikFrage}</p>
          <div className="kal-karte kal-karte-satz">
            <span className="kal-satz" lang={eintrag.lang}>{eintrag.satz}</span>
            <span className="kal-satz-tr">{eintrag.satzTr}</span>
          </div>
          <div className="kal-antworten">
            <button className="kal-btn kal-ja" onClick={() => gramAntwort('sicher')} disabled={busy}>{t.kalJa}</button>
            <button className="kal-btn kal-halb" onClick={() => gramAntwort('wackelig')} disabled={busy}>{t.kalHalb}</button>
            <button className="kal-btn kal-nein" onClick={() => gramAntwort('unbekannt')} disabled={busy}>{t.kalNein}</button>
          </div>
          {fehler && (
            <>
              <p className="chat-error">{t.kalFehler}</p>
              <button className="kal-btn kal-halb" onClick={() => abschliessen(gramStatus)}>{t.kalNochmal}</button>
            </>
          )}
        </div>
      </div>
    )
  }

  /* fertig */
  return (
    <div className="screen">
      {kopf}
      <div className="kal-mitte">
        <div className="kal-emoji pop">🎉</div>
        <h2 className="kal-titel">{t.kalFertigTitle}</h2>
        <p className="kal-text">
          {nurGrammatik ? t.kalGramFertig : t.kalFertigText(zaehler.sicher)}
        </p>
        <button className="done-btn" onClick={onExit}>{t.back}</button>
      </div>
    </div>
  )
}

export default Kalibrierung
