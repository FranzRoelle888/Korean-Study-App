import { useRef, useState } from 'react'
import { SPRECHEN_KARTEN } from './sprechen'
import { AufnahmeKnopf } from '../../shared/aufnahme'
import { playSequence, SpeakButton } from '../../shared/tts'
import { trainerA2Sprechen1 } from '../trainer/trainerApi'
import { schreibeA2Beleg } from '../../core/storage'
import Auftrag from '../../shared/Auftrag'

/* ============================================================
   FRAGEN-SPIEL — Sprechen Teil 1 (A2-Sprint Phase 3, Etappe 1)

   Wie in der Prüfung, beide Rollen im Wechsel über 4 Karten:
   - SIE zieht eine Stichwortkarte („Geburtstag?") und SPRICHT
     ihre Frage ein -> Transkript -> Bewertung; der KI-Partner
     ANTWORTET ihr per Stimme.
   - Dann fragt der PARTNER (Musterfrage der nächsten Karte, per
     TTS) und SIE antwortet mündlich -> Bewertung.
   Die App trackt W-Fragen vs. Ja/Nein-Fragen und zeigt das
   Transkript jeder Aufnahme — als Transparenz: GENAU dieser
   Text wurde bewertet. Aussprache wird nie bewertet (Franz
   04.09.); benotet wird nur die Sprache im Transkript, dort
   aber genau (Artikel, Endungen, Verbstellung).
   ============================================================ */

function mische(liste) {
  const a = [...liste]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function FragenSpiel({ profile, t, onExit }) {
  const [karten, setKarten] = useState(() => mische(SPRECHEN_KARTEN).slice(0, 4))
  const [schritt, setSchritt] = useState(0) /* 0..3: Karte; gerade = sie fragt, ungerade = sie antwortet */
  const [phase, setPhase] = useState('aufnahme') /* aufnahme | denkt | ergebnis | fertig */
  const [ergebnis, setErgebnis] = useState(null)
  const [transkript, setTranskript] = useState('')
  const [audioUrl, setAudioUrl] = useState(null)
  const [punkte, setPunkte] = useState(0)
  const [fehler, setFehler] = useState(null)
  const fragetypen = useRef([])

  const karte = karten[schritt]
  const sieFragt = schritt % 2 === 0

  /* Partner stellt seine Frage vor (bei „sie antwortet"-Schritten) */
  function partnerFrageAbspielen() {
    playSequence([{ text: karte.musterfrage, voice: 'echo' }], 'de', {})
  }

  async function aufgenommen({ text, audioUrl: url }) {
    setTranskript(text)
    setAudioUrl(url)
    setPhase('denkt')
    setFehler(null)
    try {
      const res = await trainerA2Sprechen1({
        profile: profile.id,
        modus: sieFragt ? 'frage' : 'antwort',
        stichwort: karte.wort,
        frage: karte.musterfrage,
        transkript: text,
      })
      if (res.ok) setPunkte((p) => p + 1)
      if (res.fragetyp) fragetypen.current.push(res.fragetyp)
      setErgebnis(res)
      setPhase('ergebnis')
      /* Partner-Antwort vorlesen — das Gespräch lebt */
      if (sieFragt && res.partnerAntwort) {
        playSequence([{ text: res.partnerAntwort, voice: 'echo' }], 'de', {})
      }
    } catch (e) {
      setPhase('aufnahme')
      setFehler(e?.message === 'rate-limit' ? t.trainerRateLimit : t.trainerOffline)
    }
  }

  function weiter() {
    if (schritt + 1 < karten.length) {
      setSchritt(schritt + 1)
      setPhase('aufnahme')
      setErgebnis(null)
      setTranskript('')
      setAudioUrl(null)
    } else {
      schreibeA2Beleg({
        modul: 'sprechen',
        teil: 't1',
        punkte,
        max: karten.length,
        details: { fragetypen: fragetypen.current },
      })
      setPhase('fertig')
    }
  }

  const kopf = (
    <div className="review-header">
      <button className="back-btn" onClick={onExit} aria-label={t.back}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <span className="daily-label" lang="de">🎤 Fragen-Spiel · {Math.min(schritt + 1, 4)}/4</span>
    </div>
  )

  if (phase === 'fertig') {
    const wTypen = fragetypen.current.filter((x) => x === 'w').length
    const jnTypen = fragetypen.current.filter((x) => x === 'janein').length
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte">
          <div className="kal-emoji">{punkte >= 3 ? '🌱' : '💪'}</div>
          <p className="kal-text">{punkte} / {karten.length}</p>
          {wTypen + jnTypen > 0 && wTypen === 0 && (
            <p className="a2-radar-leer" lang="ko">💡 W-질문(Wann? Wo? Was?)도 연습해 보세요 — 시험에서는 다양한 질문이 좋아요.</p>
          )}
          {wTypen + jnTypen > 0 && jnTypen === 0 && wTypen >= 2 && (
            <p className="a2-radar-leer" lang="ko">💡 예/아니오 질문(Hast du…? Machst du…?)도 섞어 보세요.</p>
          )}
          <button
            className="done-btn"
            onClick={() => {
              setKarten(mische(SPRECHEN_KARTEN).slice(0, 4))
              setSchritt(0)
              setPhase('aufnahme')
              setErgebnis(null)
              setTranskript('')
              setAudioUrl(null)
              setPunkte(0)
              fragetypen.current = []
            }}
            lang="de"
          >
            Neue Runde
          </button>
          <button className="done-btn lt2-fertigknopf" onClick={onExit}>{t.back}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      {kopf}
      <div className="lt2-scroll">
        <Auftrag
          id="sprechen-t1"
          de={sieFragt ? 'Stellen Sie eine Frage mit dieser Karte.' : 'Ihr Partner fragt. Antworten Sie.'}
          ko={sieFragt ? '이 카드로 질문을 만들어서 말해 보세요.' : '파트너가 질문해요. 대답해 보세요.'}
        />

        {/* Die Karte im Original-Look */}
        <div className="fs-karte">
          <div className="fs-karte-kopf" lang="de">Fragen zur Person</div>
          <div className="fs-karte-wort" lang="de">{sieFragt ? karte.wort : '❓'}</div>
        </div>

        {!sieFragt && phase === 'aufnahme' && (
          <button className="hv-play fs-partner" onClick={partnerFrageAbspielen} aria-label="Partnerfrage anhören">
            ▶
          </button>
        )}

        {phase === 'aufnahme' && (
          <>
            <AufnahmeKnopf
              profile={profile}
              maxSek={30}
              onFertig={aufgenommen}
              onFehler={(art) =>
                setFehler(art === 'mikro' ? '마이크를 사용할 수 없어요 — 설정에서 허용해 주세요.' : art === 'limit' ? t.trainerRateLimit : t.trainerOffline)
              }
              label={sieFragt ? '눌러서 질문하기' : '눌러서 대답하기'}
            />
            {fehler && <p className="sw-fehler" lang="ko">{fehler}</p>}
          </>
        )}

        {phase === 'denkt' && <p className="a2-ko-klein" lang="ko">파트너가 생각하는 중…</p>}

        {phase === 'ergebnis' && ergebnis && (
          <div className="rd-aufloesung">
            {/* Transparenz: genau dieser Text wurde bewertet */}
            <p className="fs-transkript" lang="de">
              🗣 „{transkript}"
              {audioUrl && (
                <button type="button" className="lb-info" onClick={() => new Audio(audioUrl).play()} aria-label="Meine Aufnahme">
                  🔁
                </button>
              )}
            </p>
            <p className={ergebnis.ok ? 'rd-gut' : 'rd-schlecht'}>
              {ergebnis.ok ? '✓ 좋아요!' : '✗ 아직이에요'}
            </p>
            {ergebnis.kommentar && <p className="a2-radar-leer" lang="ko">{ergebnis.kommentar}</p>}
            {ergebnis.korrektur && (
              <p className="rd-beispiel" lang="de">
                {ergebnis.korrektur}
                <SpeakButton text={ergebnis.korrektur} lang="de" className="speak-inline" />
              </p>
            )}
            {sieFragt && ergebnis.partnerAntwort && (
              <p className="fs-partner-text" lang="de">🧑 {ergebnis.partnerAntwort}</p>
            )}
            <button className="done-btn" onClick={weiter} lang="de">Weiter</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default FragenSpiel
