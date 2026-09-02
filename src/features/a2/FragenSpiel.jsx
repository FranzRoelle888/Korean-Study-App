import { useRef, useState } from 'react'
import { SPRECHEN_KARTEN } from './sprechen'
import { AufnahmeKnopf } from '../../shared/aufnahme'
import { playSequence, prewarmSequence, SpeakButton } from '../../shared/tts'
import { trainerA2Sprechen1 } from '../trainer/trainerApi'
import { schreibeA2Beleg } from '../../core/storage'
import Nachfrage from '../ueben/Nachfrage'
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
  const [phase, setPhase] = useState('intro') /* intro | aufnahme | denkt | ergebnis | fertig */
  const [ergebnis, setErgebnis] = useState(null)
  const [transkript, setTranskript] = useState('')
  const [audioUrl, setAudioUrl] = useState(null)
  const [punkte, setPunkte] = useState(0)
  const [fehler, setFehler] = useState(null)
  /* Solange der Partner noch SPRICHT, ist „Weiter" gesperrt —
     erst hören, dann weiter (Wunsch Franz 04.09.) */
  const [partnerSpricht, setPartnerSpricht] = useState(false)
  const fragetypen = useRef([])

  /* Sicherheitsnetz: falls Audio klemmt, nach 20 s trotzdem freigeben */
  const sprichtBis = useRef(null)
  function sprechenBeginnt() {
    setPartnerSpricht(true)
    clearTimeout(sprichtBis.current)
    sprichtBis.current = setTimeout(() => setPartnerSpricht(false), 20000)
  }
  function sprechenFertig() {
    clearTimeout(sprichtBis.current)
    setPartnerSpricht(false)
  }

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
      /* Partner-Antwort vorlesen — das Gespräch lebt. Bis er
         fertig gesprochen hat, bleibt „Weiter" gesperrt. */
      if (sieFragt && res.partnerAntwort) {
        sprechenBeginnt()
        playSequence([{ text: res.partnerAntwort, voice: 'echo' }], 'de', { onEnde: sprechenFertig })
      }
    } catch (e) {
      setPhase('aufnahme')
      setFehler(e?.message === 'rate-limit' ? t.trainerRateLimit : t.trainerOffline)
    }
  }

  function weiter() {
    if (schritt + 1 < karten.length) {
      const naechste = schritt + 1
      setSchritt(naechste)
      setPhase('aufnahme')
      setErgebnis(null)
      setTranskript('')
      setAudioUrl(null)
      /* Partner-Schritt? Dann stellt er seine Frage SOFORT —
         direkt im Tipp gestartet (iOS-Audio-Regel). Der ▶-Knopf
         bleibt zum Nochmal-Hören. */
      if (naechste % 2 === 1) {
        playSequence([{ text: karten[naechste].musterfrage, voice: 'echo' }], 'de', {})
      }
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

  /* Erst der Ablauf in Ruhe — dann geht's los (Wunsch Franz
     04.09.: der Ablauf war beim Reinklicken nicht klar) */
  if (phase === 'intro') {
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte">
          <div className="fs-intro">
            <p className="fs-intro-titel" lang="de">🎤 So funktioniert das Fragen-Spiel</p>
            <ol className="fs-intro-liste" lang="ko">
              <li><b>카드 4장</b>이 나와요 — 시험 Teil 1처럼 번갈아 해요.</li>
              <li>🎙 <b>내 차례:</b> 카드 단어로 질문을 만들어 <b>말해요</b>. 파트너가 대답해 줘요.</li>
              <li>❓ <b>파트너 차례:</b> 파트너가 먼저 물어봐요 — 듣고 <b>대답해요</b>.</li>
              <li>✅ 매번 바로 피드백이 나와요 — 작은 문법 실수도 알려줘요.</li>
            </ol>
          </div>
          <button
            className="done-btn"
            onClick={() => {
              /* Partnerfragen vorwärmen — beim Zug des Partners
                 kommt seine Frage dann ohne Wartezeit */
              prewarmSequence(karten.map((k) => ({ text: k.musterfrage, voice: 'echo' })), 'de')
              setPhase('aufnahme')
            }}
            lang="de"
          >
            Los geht's!
          </button>
        </div>
      </div>
    )
  }

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
              const neu = mische(SPRECHEN_KARTEN).slice(0, 4)
              prewarmSequence(neu.map((k) => ({ text: k.musterfrage, voice: 'echo' })), 'de')
              setKarten(neu)
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
            <Nachfrage
              profile={profile}
              t={t}
              kontext={
                `Goethe A2 Sprechen Teil 1 (question game). Keyword card: ${karte.wort}. ` +
                (sieFragt ? 'She had to ASK a question.' : `The partner asked: ${karte.musterfrage} — she answered.`) +
                `\nHer words (STT): ${transkript}\nFeedback: ${JSON.stringify(ergebnis)}`
              }
            />
            <button className="done-btn" onClick={weiter} disabled={partnerSpricht} lang="de">
              {partnerSpricht ? '🔊 …' : 'Weiter'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default FragenSpiel
