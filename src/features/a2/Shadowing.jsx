import { useState } from 'react'
import { SHADOWING_SAETZE } from './sprechen'
import { AufnahmeKnopf } from '../../shared/aufnahme'
import { playSequence } from '../../shared/tts'
import Auftrag from '../../shared/Auftrag'

/* ============================================================
   AUSSPRACHE-SHADOWING (Sprechen · Aussprache = 5 Punkte)

   Hören -> nachsprechen -> VERGLEICHEN: Original und eigene
   Aufnahme liegen direkt nebeneinander, das eigene Ohr urteilt.
   Grundsatz (Franz 04.09.): Aussprache wird NIEMALS maschinell
   bewertet — keine Note, keine Trefferquote, kein Transkript.
   Das kann keine KI seriös; Franz bleibt das menschliche Ohr.
   Darum läuft die Aufnahme hier auch ganz ohne Transkription
   (mitText={false}) — kostenlos und offlinefreundlich.
   ============================================================ */

function mische(liste) {
  const a = [...liste]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function Shadowing({ profile, t, onExit }) {
  const [saetze, setSaetze] = useState(() => mische(SHADOWING_SAETZE).slice(0, 6))
  const [index, setIndex] = useState(0)
  const [aufnahme, setAufnahme] = useState(null) /* {audioUrl} */
  const [fehler, setFehler] = useState(null)

  const satz = saetze[index]

  const kopf = (
    <div className="review-header">
      <button className="back-btn" onClick={onExit} aria-label={t.back}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <span className="daily-label" lang="de">🗣 Aussprache · {index + 1}/{saetze.length}</span>
    </div>
  )

  return (
    <div className="screen">
      {kopf}
      <div className="lt2-scroll">
        <Auftrag
          id="shadowing"
          de="Hören Sie und sprechen Sie nach."
          ko="듣고 따라 말해 보세요. 원본과 내 발음을 비교해요."
        />

        <div className="fs-karte sh-karte">
          <div className="fs-karte-kopf">{satz.fokus}</div>
          <div className="sh-satz" lang="de">{satz.satz}</div>
        </div>

        <div className="sh-vergleich">
          <button
            className="st-stufe"
            onClick={() => playSequence([{ text: satz.satz }], 'de', {})}
            lang="ko"
          >
            ▶ 원본 듣기
          </button>
          {aufnahme && (
            <button className="st-stufe" onClick={() => new Audio(aufnahme.audioUrl).play()} lang="ko">
              🔁 내 발음 듣기
            </button>
          )}
        </div>

        <AufnahmeKnopf
          profile={profile}
          maxSek={15}
          mitText={false}
          onFertig={({ audioUrl }) => {
            setFehler(null)
            setAufnahme({ audioUrl })
          }}
          onFehler={(art) =>
            setFehler(art === 'mikro' ? '마이크를 사용할 수 없어요 — 설정에서 허용해 주세요.' : art === 'limit' ? t.trainerRateLimit : t.trainerOffline)
          }
          label="눌러서 따라 말하기"
        />
        {fehler && <p className="sw-fehler" lang="ko">{fehler}</p>}

        {aufnahme && (
          <p className="a2-ko-klein" lang="ko">
            👂 번갈아 들으면서 비교해 보세요 — 다르게 들리는 곳을 다시 따라 하면 돼요.
          </p>
        )}

        <div className="lt2-ende">
          <button
            className="done-btn"
            onClick={() => {
              if (index + 1 < saetze.length) {
                setIndex(index + 1)
              } else {
                setSaetze(mische(SHADOWING_SAETZE).slice(0, 6))
                setIndex(0)
              }
              setAufnahme(null)
              setFehler(null)
            }}
            lang="de"
          >
            {index + 1 < saetze.length ? 'Nächster Satz' : 'Neue Runde'}
          </button>
          <button className="done-btn lt2-fertigknopf" onClick={onExit}>{t.back}</button>
        </div>
      </div>
    </div>
  )
}

export default Shadowing
