import { useEffect, useState } from 'react'
import { leseA2Belege } from '../../core/storage'
import { werteAus, empfehlung, dTage, PRUEFUNGS_DATUM } from './radarLogik'

/* ============================================================
   STÄRKEN-RADAR — die Steuerungs-Schicht im A2-Tab (Phase 5)

   Leitmotiv (Franz 04.09.): sofort durchblicken. Deshalb:
   - vier Balken mit den bekannten Modul-Emojis + Prozent
   - EIN großer Prognose-Wert auf der echten Punkteskala,
     mit der 60-Punkte-Bestehenslinie
   - EIN Empfehlungs-Knopf, der direkt in die Übung springt
   - Tap auf ein Modul klappt die Teil-Zeilen auf — mehr nicht.
   Aussprache (5 P.) wird nie maschinell bewertet — die Prognose
   sagt das ehrlich dazu („+ 최대 5").
   ============================================================ */

function Prozent({ quote }) {
  if (quote === null) return <span className="ra-wert ra-leer">—</span>
  return <span className="ra-wert">{Math.round(quote * 100)}%</span>
}

function Radar({ profile, t, starte }) {
  const [belege, setBelege] = useState(null) /* null = lädt */
  const [offen, setOffen] = useState(null) /* aufgeklapptes Modul */

  useEffect(() => {
    let weg = false
    leseA2Belege().then((b) => {
      if (!weg) setBelege(b)
    })
    return () => {
      weg = true
    }
  }, [profile.id])

  const tage = dTage()
  const datumKo = `${PRUEFUNGS_DATUM.getMonth() + 1}월 ${PRUEFUNGS_DATUM.getDate()}일`

  /* Countdown-Chip gibt es immer — auch ohne Daten */
  const dChip = (
    <span className="ra-dday" lang="ko">
      {tage >= 0 ? `D-${tage}` : '끝!'} · {datumKo}
    </span>
  )

  if (belege === null) {
    return (
      <div className="a2-radar">
        <div className="ra-kopf">
          <p className="a2-radar-titel">📊 {t.a2RadarTitel}</p>
          {dChip}
        </div>
      </div>
    )
  }

  const auswertung = werteAus(belege)
  const keineDaten = auswertung.module.every((m) => m.quote === null)

  if (keineDaten) {
    return (
      <div className="a2-radar">
        <div className="ra-kopf">
          <p className="a2-radar-titel">📊 {t.a2RadarTitel}</p>
          {dChip}
        </div>
        <p className="a2-radar-leer">{t.a2RadarLeer}</p>
      </div>
    )
  }

  const tipp = empfehlung(auswertung)

  function tippStarten() {
    if (!tipp) return
    /* Gezielte Teil-Vorwahl setzen (Hören/Lesen), dann öffnen */
    if (tipp.teil.wahl) {
      try {
        localStorage.setItem(tipp.teil.wahl[0], tipp.teil.wahl[1])
      } catch {
        /* egal */
      }
    }
    starte(tipp.teil.uebung)
  }

  return (
    <div className="a2-radar">
      <div className="ra-kopf">
        <p className="a2-radar-titel">📊 {t.a2RadarTitel}</p>
        {dChip}
      </div>

      {/* Prognose: erst wenn alle 4 Module Daten haben — vorher
          motiviert die Lücke („네 모듈 모두 연습하면…") */}
      {auswertung.alleDa ? (
        <div className="ra-prognose">
          <span className="ra-prognose-zahl">{auswertung.gesamt}</span>
          <span className="ra-prognose-max" lang="ko">/ 95점 예상 <small>(+ 발음 최대 5점)</small></span>
          <span className={auswertung.gesamt >= 60 ? 'ra-linie ra-linie-ok' : 'ra-linie'} lang="ko">
            합격선 60점 {auswertung.gesamt >= 60 ? '↑ 넘었어요!' : ''}
          </span>
        </div>
      ) : (
        <p className="a2-radar-leer" lang="ko">네 모듈을 모두 연습하면 예상 점수가 나와요.</p>
      )}

      {/* Vier Modul-Balken; Tap klappt die Teile auf */}
      <div className="ra-liste">
        {auswertung.module.map((m) => (
          <div key={m.id}>
            <button
              type="button"
              className="ra-modul"
              onClick={() => setOffen(offen === m.id ? null : m.id)}
            >
              <span className="ra-emoji">{m.emoji}</span>
              <span className="ra-name" lang="ko">{m.ko}</span>
              <span className="ra-balken">
                {m.quote !== null && <span className="ra-fuellung" style={{ width: `${Math.round(m.quote * 100)}%` }} />}
              </span>
              <Prozent quote={m.quote} />
            </button>
            {offen === m.id && (
              <div className="ra-teile">
                {m.teile.map((teil) => (
                  <p key={teil.id} className="ra-teil" lang="ko">
                    <span>{teil.ko}</span>
                    <Prozent quote={teil.quote} />
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {tipp && (
        <button type="button" className="ra-empfehlung" onClick={tippStarten} lang="ko">
          💡 오늘 추천: {tipp.modul.emoji} {tipp.teil.ko}
          {tipp.grund === 'neu' ? ' (아직 안 해봤어요)' : ''} →
        </button>
      )}
    </div>
  )
}

export default Radar
