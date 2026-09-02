import { useEffect, useState } from 'react'
import { REDEMITTEL_PAKETE } from './redemittel'
import { SpeakButton, speak } from '../../shared/tts'
import { schreibeA2Beleg, getActiveProfile } from '../../core/storage'

/* ============================================================
   REDEMITTEL-DRILL — „erst kennenlernen, dann spielen"
   (Konzept mit Franz, 03.09.)

   - 7 Pakete à 7 Formeln, immer nur das nächste offen
   - KENNENLERN-Runde beim ersten Öffnen: Karten durchblättern
     (Formel groß + automatisch vorgelesen, Bedeutung, Beispiel,
     Einsatz-Situation) — kein Druck, kein Timer
   - BLITZ direkt danach: Situation (koreanisch) -> 4 Formeln,
     nur die 8 gerade gesehenen; Ablenker kommen IMMER aus
     fremden Paketen, damit die Antwort eindeutig ist. 8 s je
     Karte. Zwei fehlerfreie Runden = Paket „sitzt" -> ab dann
     mischen ältere Formeln mit (~30 %) und die LÜCKEN-Stufe
     (Formel selbst tippen) ist frei.
   - PAKET-BIBLIOTHEK (Wunsch Franz): jedes gesehene Paket
     bleibt dauerhaft als Nachschlagewerk aufschlagbar.

   Deterministisch, kein KI-Aufruf; Runden-Belege für den Radar.
   ============================================================ */

const BLITZ_SEK = 8

function ladeStand() {
  try {
    return JSON.parse(localStorage.getItem(`korean-app:${getActiveProfile()}:redemittel`)) ?? {}
  } catch {
    return {}
  }
}
function speichereStand(stand) {
  try {
    localStorage.setItem(`korean-app:${getActiveProfile()}:redemittel`, JSON.stringify(stand))
  } catch {
    /* egal */
  }
}

function mische(liste) {
  const a = [...liste]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function RedemittelDrill({ profile, t, onExit }) {
  const [stand, setStand] = useState(ladeStand)
  /* {modus:'uebersicht'} | {modus:'kennen',paket,index}
     | {modus:'blitz',paket,fragen,index,richtig,geloest}
     | {modus:'luecken',paket,index,eingabe,geloest,richtig}
     | {modus:'bibliothek',paket} */
  const [ansicht, setAnsicht] = useState({ modus: 'uebersicht' })

  function merke(aenderung) {
    const neu = { ...stand, ...aenderung }
    setStand(neu)
    speichereStand(neu)
  }

  const paketStand = (id) => stand[id] ?? { gesehen: false, runden: 0, sauber: 0 }
  const sitzt = (id) => paketStand(id).sauber >= 2
  /* offen = erstes Paket immer; jedes weitere, sobald der
     Vorgänger mindestens eine Blitzrunde gespielt hat */
  function istOffen(index) {
    if (index === 0) return true
    const vorher = REDEMITTEL_PAKETE[index - 1]
    return paketStand(vorher.id).runden >= 1
  }

  /* ---------- Blitz-Runde bauen ---------- */
  function starteBlitz(paket) {
    const eigene = paket.formeln.map((f) => ({ ...f, paketId: paket.id }))
    /* Sitzt das Paket schon, mischen ältere gesehene Pakete mit */
    let basis = eigene
    if (sitzt(paket.id)) {
      const alte = REDEMITTEL_PAKETE.filter((p) => p.id !== paket.id && paketStand(p.id).gesehen)
        .flatMap((p) => p.formeln.map((f) => ({ ...f, paketId: p.id })))
      basis = mische([...mische(eigene).slice(0, 5), ...mische(alte).slice(0, 3)])
    }
    const fragen = mische(basis).map((f) => {
      /* Ablenker aus FREMDEN Paketen — so ist die richtige Antwort
         immer eindeutig (innerhalb einer Kategorie wären mehrere
         Formeln plausibel) */
      const fremde = REDEMITTEL_PAKETE.filter((p) => p.id !== f.paketId)
        .flatMap((p) => p.formeln)
      const ablenker = mische(fremde).slice(0, 3)
      return { formel: f, optionen: mische([f, ...ablenker]) }
    })
    setAnsicht({ modus: 'blitz', paket, fragen, index: 0, richtig: 0, geloest: null })
  }

  function blitzAntwort(gewaehlt) {
    const a = ansicht
    if (a.geloest) return
    const richtig = gewaehlt.de === a.fragen[a.index].formel.de
    speak(a.fragen[a.index].formel.de, 'de')
    setAnsicht({ ...a, geloest: richtig ? 'richtig' : 'falsch', richtig: a.richtig + (richtig ? 1 : 0) })
  }

  function blitzWeiter() {
    const a = ansicht
    if (a.index + 1 < a.fragen.length) {
      setAnsicht({ ...a, index: a.index + 1, geloest: null })
      return
    }
    /* Runde fertig: Stand + Radar-Beleg */
    const ps = paketStand(a.paket.id)
    const sauber = a.richtig === a.fragen.length
    merke({
      [a.paket.id]: { ...ps, runden: ps.runden + 1, sauber: sauber ? ps.sauber + 1 : ps.sauber },
    })
    schreibeA2Beleg({
      modul: 'grundlagen',
      teil: 'redemittel',
      punkte: a.richtig,
      max: a.fragen.length,
      details: { paket: a.paket.id },
    })
    setAnsicht({ modus: 'fertig', paket: a.paket, richtig: a.richtig, max: a.fragen.length, sauber })
  }

  /* ---------- Lücken-Runde ---------- */
  function starteLuecken(paket) {
    setAnsicht({
      modus: 'luecken',
      paket,
      reihenfolge: mische(paket.formeln),
      index: 0,
      eingabe: '',
      geloest: null,
      richtig: 0,
    })
  }

  function lueckenPruefen() {
    const a = ansicht
    if (a.geloest) return
    const f = a.reihenfolge[a.index]
    const ok = a.eingabe.trim().toLowerCase() === f.luecke.loesung.toLowerCase()
    speak(f.beispiel || f.de, 'de')
    setAnsicht({ ...a, geloest: ok ? 'richtig' : 'falsch', richtig: a.richtig + (ok ? 1 : 0) })
  }

  function lueckenWeiter() {
    const a = ansicht
    if (a.index + 1 < a.reihenfolge.length) {
      setAnsicht({ ...a, index: a.index + 1, eingabe: '', geloest: null })
      return
    }
    schreibeA2Beleg({
      modul: 'grundlagen',
      teil: 'redemittel-luecken',
      punkte: a.richtig,
      max: a.reihenfolge.length,
      details: { paket: a.paket.id },
    })
    setAnsicht({ modus: 'fertig', paket: a.paket, richtig: a.richtig, max: a.reihenfolge.length, sauber: false })
  }

  const kopf = (titel) => (
    <div className="review-header">
      <button
        className="back-btn"
        onClick={() => (ansicht.modus === 'uebersicht' ? onExit() : setAnsicht({ modus: 'uebersicht' }))}
        aria-label={t.back}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <span className="daily-label">{titel}</span>
    </div>
  )

  /* ================= Übersicht + Bibliothek ================= */
  if (ansicht.modus === 'uebersicht') {
    return (
      <div className="screen sets-screen">
        {kopf('💬 Redemittel')}
        <main className="trainer-menu">
          <p className="a2-radar-leer" lang="ko">
            시험에서 꼭 쓰는 표현들이에요. 패키지를 하나씩 열어요: 먼저 카드로 익히고, 바로 퀴즈로 굳혀요. 한 번 본 패키지는 언제든 아래에서 다시 볼 수 있어요. 📚
          </p>
          <div className="a2-grundlagen">
            {REDEMITTEL_PAKETE.map((p, i) => {
              const ps = paketStand(p.id)
              const offen = istOffen(i)
              const status = !offen ? '🔒' : !ps.gesehen ? '✨' : sitzt(p.id) ? '✅' : '🎯'
              return (
                <div key={p.id} className={`rd-paket${offen ? '' : ' a2-bald'}`}>
                  <button
                    className="rd-paket-kopf"
                    disabled={!offen}
                    onClick={() => {
                      if (!ps.gesehen) setAnsicht({ modus: 'kennen', paket: p, index: 0 })
                      else starteBlitz(p)
                    }}
                  >
                    <span className="rd-status">{status}</span>
                    <span className="rd-paket-titel">
                      <span lang="de">{p.titel}</span>
                      <span className="a2-ko-klein" lang="ko"> {p.titelKo}</span>
                    </span>
                    <span className="a2-ko-klein">
                      {!offen ? '' : !ps.gesehen ? '시작하기' : sitzt(p.id) ? `${ps.sauber}×👑` : `${ps.sauber}/2 ✓`}
                    </span>
                  </button>
                  {ps.gesehen && (
                    <div className="rd-paket-aktionen">
                      {/* die aufgabeninterne Bibliothek */}
                      <button onClick={() => setAnsicht({ modus: 'bibliothek', paket: p })}>📖 보기</button>
                      <button onClick={() => starteBlitz(p)}>⚡ 퀴즈</button>
                      {sitzt(p.id) && <button onClick={() => starteLuecken(p)}>✏️ 빈칸</button>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </main>
      </div>
    )
  }

  if (ansicht.modus === 'bibliothek') {
    const p = ansicht.paket
    return (
      <div className="screen sets-screen">
        {kopf(`📖 ${p.titel}`)}
        <main className="trainer-menu">
          <div className="rd-bibliothek">
            {p.formeln.map((f, i) => (
              <div key={i} className="rd-karte-klein">
                <p className="rd-formel-klein" lang="de">
                  {f.de}
                  <SpeakButton text={f.de} lang="de" className="speak-inline" />
                </p>
                <p className="rd-ko" lang="ko">{f.ko} · {f.situationKo}</p>
                <p className="rd-beispiel" lang="de">{f.beispiel}</p>
              </div>
            ))}
          </div>
          <button className="done-btn" onClick={() => starteBlitz(p)}>⚡ 퀴즈 시작</button>
        </main>
      </div>
    )
  }

  /* ================= Kennenlern-Runde ================= */
  if (ansicht.modus === 'kennen') {
    const p = ansicht.paket
    const f = p.formeln[ansicht.index]
    const letzte = ansicht.index === p.formeln.length - 1
    return (
      <div className="screen">
        {kopf(`✨ ${p.titel} · ${ansicht.index + 1}/${p.formeln.length}`)}
        <div className="kal-mitte">
          <div className="rd-karte">
            <p className="rd-formel" lang="de">
              {f.de}
              <SpeakButton text={f.de} lang="de" className="speak-inline" />
            </p>
            <p className="rd-ko" lang="ko">{f.ko}</p>
            <p className="rd-wann" lang="ko">💡 {f.situationKo}</p>
            <p className="rd-beispiel" lang="de">{f.beispiel}</p>
          </div>
          <button
            className="done-btn"
            onClick={() => {
              if (letzte) {
                merke({ [p.id]: { ...paketStand(p.id), gesehen: true } })
                starteBlitz(p)
              } else {
                const naechste = p.formeln[ansicht.index + 1]
                speak(naechste.de, 'de')
                setAnsicht({ ...ansicht, index: ansicht.index + 1 })
              }
            }}
          >
            {letzte ? '⚡ 퀴즈 시작!' : 'Weiter'}
          </button>
        </div>
      </div>
    )
  }

  /* ================= Blitz ================= */
  if (ansicht.modus === 'blitz') {
    const frage = ansicht.fragen[ansicht.index]
    return (
      <div className="screen">
        {kopf(`⚡ ${ansicht.paket.titel} · ${ansicht.index + 1}/${ansicht.fragen.length}`)}
        <div className="lt2-scroll">
          {/* Timer nur solange ungelöst; key startet ihn je Frage neu */}
          {!ansicht.geloest && (
            <BlitzTimer key={ansicht.index} sekunden={BLITZ_SEK} abgelaufen={() => blitzAntwort({ de: '__zeit__' })} />
          )}
          <p className="rd-situation" lang="ko">{frage.formel.situationKo}</p>
          <div className="rd-optionen">
            {frage.optionen.map((o, i) => {
              const klasse = !ansicht.geloest
                ? 'rd-option'
                : o.de === frage.formel.de
                  ? 'rd-option rd-option-richtig'
                  : 'rd-option rd-option-blass'
              return (
                <button key={i} className={klasse} lang="de" onClick={() => blitzAntwort(o)}>
                  {o.de}
                </button>
              )
            })}
          </div>
          {ansicht.geloest && (
            <div className="rd-aufloesung">
              <p className={ansicht.geloest === 'richtig' ? 'rd-gut' : 'rd-schlecht'}>
                {ansicht.geloest === 'richtig' ? '✓ 맞아요!' : '✗ 정답은:'}
              </p>
              {ansicht.geloest === 'falsch' && (
                <p className="rd-formel-klein" lang="de">{frage.formel.de} <span className="a2-ko-klein" lang="ko">{frage.formel.ko}</span></p>
              )}
              <p className="rd-beispiel" lang="de">{frage.formel.beispiel}</p>
              <button className="done-btn" onClick={blitzWeiter}>Weiter</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ================= Lücken ================= */
  if (ansicht.modus === 'luecken') {
    const f = ansicht.reihenfolge[ansicht.index]
    return (
      <div className="screen">
        {kopf(`✏️ ${ansicht.paket.titel} · ${ansicht.index + 1}/${ansicht.reihenfolge.length}`)}
        <div className="lt2-scroll">
          <p className="rd-situation" lang="ko">{f.situationKo}</p>
          <p className="rd-lueckensatz" lang="de">{f.luecke.satz}</p>
          {!ansicht.geloest ? (
            <>
              <input
                className="lt2-feld lt2-feld-breit rd-eingabe"
                value={ansicht.eingabe}
                onChange={(e) => setAnsicht({ ...ansicht, eingabe: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') lueckenPruefen()
                }}
                lang="de"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <button className="done-btn lt2-pruefen" onClick={lueckenPruefen} disabled={!ansicht.eingabe.trim()}>
                {t.check}
              </button>
            </>
          ) : (
            <div className="rd-aufloesung">
              <p className={ansicht.geloest === 'richtig' ? 'rd-gut' : 'rd-schlecht'}>
                {ansicht.geloest === 'richtig' ? '✓ 맞아요!' : `✗ ${f.luecke.loesung}`}
              </p>
              <p className="rd-beispiel" lang="de">{f.beispiel}</p>
              <button className="done-btn" onClick={lueckenWeiter}>Weiter</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ================= Runden-Ende ================= */
  const quote = ansicht.richtig / ansicht.max
  return (
    <div className="screen">
      {kopf(`💬 ${ansicht.paket.titel}`)}
      <div className="kal-mitte">
        <div className="kal-emoji">{ansicht.sauber ? '👑' : quote >= 0.75 ? '🌱' : '💪'}</div>
        <p className="kal-text">
          {ansicht.richtig} / {ansicht.max}
        </p>
        <p className="a2-radar-leer" lang="ko">
          {ansicht.sauber
            ? '완벽한 라운드! 두 번 완벽하면 패키지가 완성돼요.'
            : quote >= 0.75
              ? '좋아요 — 한 번 더 하면 완벽해질 거예요.'
              : '괜찮아요, 카드를 다시 보고(📖) 한 번 더 해봐요.'}
        </p>
        <button className="done-btn" onClick={() => starteBlitz(ansicht.paket)}>⚡ 한 번 더</button>
        <button className="done-btn lt2-fertigknopf" onClick={() => setAnsicht({ modus: 'uebersicht' })}>
          {t.back}
        </button>
      </div>
    </div>
  )
}

/* Sichtbarer Countdown-Balken; die echte Uhr ist ein JS-Timer
   (gleiches Muster wie im Artikel-Spiel). key={frageIndex} beim
   Aufrufer startet ihn je Frage neu und räumt beim Wechsel auf. */
function BlitzTimer({ sekunden, abgelaufen }) {
  useEffect(() => {
    const timer = setTimeout(abgelaufen, sekunden * 1000)
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <span className="as-timer rd-timer" style={{ animationDuration: `${sekunden * 1000}ms` }} />
  )
}

export default RedemittelDrill
