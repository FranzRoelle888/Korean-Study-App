import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../core/supabaseClient'

/* ============================================================
   ARTIKEL-SWIPE — Tinder für der/die/das (Idee Franz, 01.09.,
   für 해인s größte Baustelle: die Artikel)

   Ein gemischter Stapel aus allen Nomen IHRER Bibliothek (nur
   Einträge, die mit "der/die/das " beginnen — der Artikel steckt
   ja im Eintrag). Die oberste Karte zeigt das Nomen OHNE Artikel;
   gewischt wird: links = der, oben = die, rechts = das.

   - Richtig: Karte fliegt raus, Serie +1.
   - Falsch: Karte färbt sich rot, die richtige Form steht kurz
     groß da (ohne Auflösung kein Lerneffekt), dann startet ein
     NEU gemischter Stapel und die Serie bei 0.
   - Stapel komplett geschafft: "Fantastisch!"-Bildschirm.
   - Unter dem Serien-Zähler: 👑 Alltime-Highscore. Der liegt in
     inventory_status als kind='meta'-Zeile — überlebt also
     Gerätewechsel; keine der Lernstand-Abfragen liest ihn mit
     (die filtern auf wort/grammatik bzw. sicher).
   - Ab 8 in Folge gilt die Runde als bestanden (kleines 🌱 am
     Zähler) — die Anbindung ans Tagespensum kommt später, wenn
     der Modus das Artikel-Quiz ersetzt.

   Gesten: Pointer-Events mit touch-action:none auf der Karte —
   das ist der iOS-verträgliche Weg (kein Scroll-Gerangel).
   ============================================================ */

const RICHTUNGEN = { links: 'der', oben: 'die', rechts: 'das' }
const SCHWELLE = 70 /* px Fingerweg, ab dem ein Wisch zählt */
const HIGHSCORE_ID = 'meta-artikel-highscore'

/* Timer wird mit der Serie stufig schneller (Kurve: Franz 01.09.).
   Die ersten 8 Karten (spätere Bestanden-Schwelle) bleiben fair;
   ab Serie 20 gilt die Untergrenze — darunter würde die Lesezeit
   langer Wörter zum Glücksspiel. */
function tempoFuer(serie) {
  if (serie >= 20) return 2200
  if (serie >= 15) return 2600
  if (serie >= 10) return 3200
  if (serie >= 5) return 4000
  return 5000
}
const stufeFuer = (serie) => Math.min(4, Math.floor(serie / 5))

function mischen(liste) {
  const a = [...liste]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function ArtikelSwipe({ profile, t, onExit }) {
  const [nomen, setNomen] = useState(null) /* null = lädt, [] = zu wenig */
  const [stapel, setStapel] = useState([])
  const [idx, setIdx] = useState(0)
  const [serie, setSerie] = useState(0)
  const [highscore, setHighscore] = useState(0)
  /* 'spiel' | 'fail' | 'fertig' */
  const [phase, setPhase] = useState('spiel')
  /* Finger-Versatz der obersten Karte + Rauswerf-Animation */
  const [zug, setZug] = useState(null) /* {dx, dy} */
  const [flug, setFlug] = useState(null) /* 'links' | 'oben' | 'rechts' */
  const start = useRef(null)
  const highRef = useRef(0)

  /* Nomen laden: alle Bibliotheks-Einträge, die mit Artikel
     beginnen — der Artikel ist die Lösung, das Nomen die Karte */
  useEffect(() => {
    let weg = false
    Promise.all([
      supabase.from('words').select('ko').eq('profile', profile.id),
      supabase
        .from('inventory_status')
        .select('label')
        .eq('profile', profile.id)
        .eq('item_id', HIGHSCORE_ID)
        .then(({ data }) => data ?? []),
    ])
      .then(([w, hs]) => {
        if (weg) return
        const liste = (w.data ?? [])
          .map((z) => /^(der|die|das)\s+(\S.*)$/i.exec(String(z.ko).trim()))
          .filter(Boolean)
          .map((m) => ({ artikel: m[1].toLowerCase(), nomen: m[2] }))
        setNomen(liste)
        setStapel(mischen(liste))
        const alt = parseInt(hs[0]?.label ?? '0', 10) || 0
        setHighscore(alt)
        highRef.current = alt
      })
      .catch(() => {
        if (!weg) setNomen([])
      })
    return () => {
      weg = true
    }
  }, [profile.id])

  function highscoreSichern(wert) {
    /* still bei Fehlern — die Krone ist nett, aber nie blockierend */
    supabase
      .from('inventory_status')
      .upsert(
        [{ profile: profile.id, item_id: HIGHSCORE_ID, kind: 'meta', status: 'meta', label: String(wert), source: 'spiel' }],
        { onConflict: 'profile,item_id' }
      )
      .then(() => {})
  }

  function neustart() {
    setStapel(mischen(nomen))
    setIdx(0)
    setSerie(0)
    setZug(null)
    setFlug(null)
    setPhase('spiel')
  }

  /* Auflösung zeigen (Entscheidung Franz), dann neuer Stapel —
     gilt für Fehlwisch UND abgelaufenen Timer */
  function fehlgeschlagen() {
    setPhase('fail')
    setZug(null)
    start.current = null
    setTimeout(neustart, 1800)
  }

  /* Der 5-Sekunden-Timer: ein JS-Timer je Karte (der rote Balken
     auf der Karte ist reine Optik mit derselben Laufzeit). Läuft
     er ab, gilt das wie ein Fehlwisch. Fairness: Wer die App
     zwischendurch verlässt (Anruf, Sperrbildschirm), bekommt beim
     Zurückkommen frische 5 Sekunden statt eines Sofort-Fails. */
  useEffect(() => {
    if (phase !== 'spiel' || flug || !stapel.length) return
    const dauer = tempoFuer(serie)
    let timer = setTimeout(fehlgeschlagen, dauer)
    const sichtbarkeit = () => {
      if (!document.hidden) {
        clearTimeout(timer)
        timer = setTimeout(fehlgeschlagen, dauer)
      }
    }
    document.addEventListener('visibilitychange', sichtbarkeit)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', sichtbarkeit)
    }
  }, [idx, phase, flug, stapel, serie]) // eslint-disable-line react-hooks/exhaustive-deps

  function geantwortet(richtung) {
    const karte = stapel[idx]
    if (!karte) return
    if (RICHTUNGEN[richtung] === karte.artikel) {
      const neu = serie + 1
      setSerie(neu)
      if (neu > highRef.current) {
        highRef.current = neu
        setHighscore(neu)
        highscoreSichern(neu)
      }
      setFlug(richtung)
      /* kurz ausfliegen lassen, dann nächste Karte */
      setTimeout(() => {
        setFlug(null)
        setZug(null)
        if (idx + 1 >= stapel.length) setPhase('fertig')
        else setIdx(idx + 1)
      }, 180)
    } else {
      fehlgeschlagen()
    }
  }

  /* ---------- Gesten ---------- */
  function anfassen(e) {
    if (phase !== 'spiel' || flug) return
    start.current = { x: e.clientX, y: e.clientY }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* synthetische Events (Tests) können das nicht — egal */
    }
  }
  function ziehen(e) {
    if (!start.current) return
    setZug({ dx: e.clientX - start.current.x, dy: e.clientY - start.current.y })
  }
  function loslassen() {
    if (!start.current) return
    const { dx, dy } = zug ?? { dx: 0, dy: 0 }
    start.current = null
    if (Math.abs(dx) >= SCHWELLE && Math.abs(dx) >= Math.abs(dy)) {
      geantwortet(dx < 0 ? 'links' : 'rechts')
    } else if (dy <= -SCHWELLE) {
      geantwortet('oben')
    } else {
      setZug(null) /* zurückschnappen */
    }
  }

  const kopf = (
    <div className="review-header">
      <button className="back-btn" onClick={onExit} aria-label={t.back}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <span className="daily-label">{t.modeArtikel}</span>
    </div>
  )

  if (nomen === null) {
    return (
      <div className="screen">{kopf}<div className="kal-mitte"><p className="kal-text">…</p></div></div>
    )
  }

  if (nomen.length < 5) {
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte">
          <div className="kal-emoji">🃏</div>
          <p className="kal-text">{t.artikelZuWenig}</p>
          <button className="done-btn" onClick={onExit}>{t.back}</button>
        </div>
      </div>
    )
  }

  if (phase === 'fertig') {
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte">
          <div className="kal-emoji">🎉</div>
          <p className="kal-text">{t.artikelFantastisch}</p>
          <p className="as-krone">👑 {highscore}</p>
          <button className="done-btn" onClick={neustart}>{t.artikelNochmal}</button>
          <button className="done-btn lt2-fertigknopf" onClick={onExit}>{t.back}</button>
        </div>
      </div>
    )
  }

  const karte = stapel[idx]
  const naechste = stapel[idx + 1]
  const dx = zug?.dx ?? 0
  const dy = zug?.dy ?? 0
  /* Richtung, die beim aktuellen Fingerweg gewinnen würde —
     für das Aufleuchten der Ziel-Labels */
  const zielt =
    Math.abs(dx) >= SCHWELLE && Math.abs(dx) >= Math.abs(dy)
      ? dx < 0 ? 'links' : 'rechts'
      : dy <= -SCHWELLE ? 'oben' : null
  const flugStil = {
    links: { transform: 'translate(-120vw, 0) rotate(-20deg)' },
    oben: { transform: 'translate(0, -120vh)' },
    rechts: { transform: 'translate(120vw, 0) rotate(20deg)' },
  }

  return (
    <div className="screen as-screen">
      {kopf}

      {/* Ziel-Labels: links der, oben die, rechts das */}
      <div className={`as-ziel as-ziel-oben${zielt === 'oben' ? ' as-ziel-an' : ''}`}>die</div>
      <div className="as-mitte">
        <div className={`as-ziel as-ziel-links${zielt === 'links' ? ' as-ziel-an' : ''}`}>der</div>

        <div className="as-stapelplatz">
          {/* die nächste Karte lugt hinten hervor */}
          {naechste && phase === 'spiel' && (
            <div className="as-karte as-karte-hinten" aria-hidden="true">
              <span className="as-nomen">{naechste.nomen}</span>
            </div>
          )}
          {phase === 'fail' ? (
            <div className="as-karte as-karte-falsch">
              <span className="as-aufloesung" lang="de">
                {karte.artikel} {karte.nomen}
              </span>
            </div>
          ) : (
            karte && (
              <div
                className="as-karte"
                style={
                  flug
                    ? { ...flugStil[flug], transition: 'transform 0.18s ease-in' }
                    : zug
                      ? { transform: `translate(${dx}px, ${Math.min(dy, 40)}px) rotate(${dx * 0.06}deg)` }
                      : undefined
                }
                onPointerDown={anfassen}
                onPointerMove={ziehen}
                onPointerUp={loslassen}
                onPointerCancel={loslassen}
              >
                {/* Der schrumpfende Balken (reine Optik — die echte
                    Uhr ist der JS-Timer oben); key={idx} startet
                    ihn mit jeder Karte neu, die Laufzeit folgt der
                    aktuellen Tempo-Stufe */}
                <span
                  key={idx}
                  className="as-timer"
                  style={{ animationDuration: `${tempoFuer(serie)}ms` }}
                />
                <span className="as-nomen" lang="de">{karte.nomen}</span>
              </div>
            )
          )}
        </div>

        <div className={`as-ziel as-ziel-rechts${zielt === 'rechts' ? ' as-ziel-an' : ''}`}>das</div>
      </div>

      {/* Zähler, Krone, Ausstieg */}
      <div className="as-fuss">
        {/* key = Tempo-Stufe: beim Stufenwechsel pulst der Zähler
            kurz auf — der Level-up-Moment */}
        <p className={`as-serie${stufeFuer(serie) > 0 ? ' as-serie-puls' : ''}`} key={stufeFuer(serie)}>
          {serie}
          {serie >= 8 && <span className="as-bestanden"> 🌱</span>}
        </p>
        <p className="as-krone">👑 {highscore}</p>
        <button className="as-ende" onClick={onExit} aria-label={t.back}>✕</button>
      </div>
    </div>
  )
}

export default ArtikelSwipe
