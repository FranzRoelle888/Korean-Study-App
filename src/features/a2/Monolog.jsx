import { useRef, useState } from 'react'
import { MONOLOG_THEMEN } from './sprechen'
import { AufnahmeKnopf } from '../../shared/aufnahme'
import { playSequence, SpeakButton } from '../../shared/tts'
import { trainerA2Sprechen1, trainerA2Sprechen2 } from '../trainer/trainerApi'
import { schreibeA2Beleg } from '../../core/storage'
import Nachfrage from '../ueben/Nachfrage'
import Auftrag from '../../shared/Auftrag'

/* ============================================================
   MONOLOG — Sprechen Teil 2 (A2-Sprint Phase 3, Etappe 2)

   Themenkarte (Frage + 4 Stichwörter) wie in der Prüfung.
   Zwei Stufen (Wunsch Franz 04.09.):
   - 🐢 Lernmodus: Stichwort für Stichwort einzeln einsprechen,
     sofortiges Feedback pro Punkt — sanfter Einstieg.
   - ⏱ Prüfungsmodus: Monolog am Stück, danach Checkliste
     (welcher Punkt kam vor?), präzise Grammatik-Hinweise und
     ZWEI Prüfer-Zusatzfragen, die sich auf IHREN Monolog
     beziehen (nur hörbar, wie in der Prüfung).
   Am Ende immer ein EINFACHES Muster (nur A1/A2-Grammatik —
   ein Vorbild, das sie versteht, lehrt mehr als ein perfektes).
   Aussprache wird nie bewertet; benotet wird das Transkript.
   ============================================================ */

function zufallsKarte() {
  return MONOLOG_THEMEN[Math.floor(Math.random() * MONOLOG_THEMEN.length)]
}

function Monolog({ profile, t, onExit }) {
  const [stufe, setStufe] = useState(null) /* null (Intro) | 'lern' | 'pruefung' */
  const [karte, setKarte] = useState(zufallsKarte)
  const [phase, setPhase] = useState('aufnahme')
  /* Lernmodus: welcher der 4 Punkte ist dran */
  const [punktIndex, setPunktIndex] = useState(0)
  const [punktOk, setPunktOk] = useState(0)
  const transkripte = useRef([])
  /* Prüfungsmodus */
  const [bewertung, setBewertung] = useState(null) /* Ergebnis von a2sprechen2 */
  const [zusatzIndex, setZusatzIndex] = useState(0)
  const [zusatzOk, setZusatzOk] = useState(0)
  /* gemeinsam */
  const [ergebnis, setErgebnis] = useState(null) /* Feedback der letzten Aufnahme */
  const [transkript, setTranskript] = useState('')
  const [audioUrl, setAudioUrl] = useState(null)
  const [fehler, setFehler] = useState(null)

  const stichwort = karte.stichworte[punktIndex]

  function zuruecksetzen(neueKarte) {
    setKarte(neueKarte ? zufallsKarte() : karte)
    setPhase('aufnahme')
    setPunktIndex(0)
    setPunktOk(0)
    transkripte.current = []
    setBewertung(null)
    setZusatzIndex(0)
    setZusatzOk(0)
    setErgebnis(null)
    setTranskript('')
    setAudioUrl(null)
    setFehler(null)
  }

  function fehlerZeigen(art) {
    setFehler(art === 'mikro' ? '마이크를 사용할 수 없어요 — 설정에서 허용해 주세요.' : art === 'limit' ? t.trainerRateLimit : t.trainerOffline)
  }

  /* ---------- Lernmodus: ein Stichwort eingesprochen ---------- */
  async function punktAufgenommen({ text, audioUrl: url }) {
    setTranskript(text)
    setAudioUrl(url)
    setPhase('denkt')
    setFehler(null)
    try {
      const res = await trainerA2Sprechen1({
        profile: profile.id,
        modus: 'antwort',
        frage: `${karte.thema} — Erzählen Sie etwas zu: ${stichwort}`,
        transkript: text,
      })
      transkripte.current.push(text)
      if (res.ok) setPunktOk((p) => p + 1)
      setErgebnis(res)
      setPhase('punktErgebnis')
    } catch (e) {
      setPhase('aufnahme')
      fehlerZeigen(e?.message === 'rate-limit' ? 'limit' : 'netz')
    }
  }

  async function lernAbschluss() {
    setPhase('musterDenkt')
    schreibeA2Beleg({
      modul: 'sprechen',
      teil: 't2',
      punkte: punktOk,
      max: 4,
      details: { stufe: 'lern', thema: karte.thema },
    })
    try {
      /* Aus den 4 Einzel-Aufnahmen wird ein „Monolog" — daraus
         entsteht das einfache Muster zum Vergleichen */
      const res = await trainerA2Sprechen2({
        profile: profile.id,
        thema: karte.thema,
        stichworte: karte.stichworte,
        transkript: transkripte.current.join(' '),
      })
      setBewertung(res)
    } catch {
      setBewertung(null) /* ohne Muster abschließen — kein Blocker */
    }
    setPhase('abschluss')
  }

  /* ---------- Prüfungsmodus: Monolog am Stück ---------- */
  async function monologAufgenommen({ text, audioUrl: url }) {
    setTranskript(text)
    setAudioUrl(url)
    setPhase('denkt')
    setFehler(null)
    try {
      const res = await trainerA2Sprechen2({
        profile: profile.id,
        thema: karte.thema,
        stichworte: karte.stichworte,
        transkript: text,
      })
      setBewertung(res)
      setPhase('ergebnis')
    } catch (e) {
      setPhase('aufnahme')
      fehlerZeigen(e?.message === 'rate-limit' ? 'limit' : 'netz')
    }
  }

  function zusatzStarten() {
    /* Im Tipp gestartet (iOS-Audio-Regel): der Prüfer stellt
       seine Frage sofort — nur hörbar, wie in der Prüfung */
    const frage = bewertung?.zusatzfragen?.[zusatzIndex]
    if (!frage) return pruefungAbschluss()
    setErgebnis(null)
    setTranskript('')
    setAudioUrl(null)
    setPhase('zusatz')
    playSequence([{ text: frage, voice: 'echo' }], 'de', {})
  }

  async function zusatzAufgenommen({ text, audioUrl: url }) {
    setTranskript(text)
    setAudioUrl(url)
    setPhase('zusatzDenkt')
    setFehler(null)
    try {
      const res = await trainerA2Sprechen1({
        profile: profile.id,
        modus: 'antwort',
        frage: bewertung.zusatzfragen[zusatzIndex],
        transkript: text,
      })
      if (res.ok) setZusatzOk((z) => z + 1)
      setErgebnis(res)
      setPhase('zusatzErgebnis')
    } catch (e) {
      setPhase('zusatz')
      fehlerZeigen(e?.message === 'rate-limit' ? 'limit' : 'netz')
    }
  }

  function pruefungAbschluss() {
    const abgedeckt = (bewertung?.abgedeckt ?? []).filter(Boolean).length
    schreibeA2Beleg({
      modul: 'sprechen',
      teil: 't2',
      punkte: abgedeckt + zusatzOk,
      max: 6,
      details: { stufe: 'pruefung', thema: karte.thema },
    })
    setPhase('abschluss')
  }

  const kopf = (
    <div className="review-header">
      <button className="back-btn" onClick={onExit} aria-label={t.back}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <span className="daily-label" lang="de">🗣 Erzählen{stufe === 'lern' ? ` · ${Math.min(punktIndex + 1, 4)}/4` : ''}</span>
    </div>
  )

  /* Die Themenkarte im Original-Look; im Lernmodus ist der
     aktuelle Punkt markiert */
  const themenKarte = (markiert) => (
    <div className="fs-karte mn-karte">
      <div className="fs-karte-kopf" lang="de">Sprechen Teil 2</div>
      <div className="mn-thema" lang="de">{karte.thema}</div>
      <div className="mn-stichworte">
        {karte.stichworte.map((s, i) => (
          <div key={s} className={markiert === i ? 'mn-stichwort mn-aktiv' : 'mn-stichwort'} lang="de">
            {s}
          </div>
        ))}
      </div>
    </div>
  )

  const transkriptZeile = transkript && (
    <p className="fs-transkript" lang="de">
      🗣 „{transkript}"
      {audioUrl && (
        <button type="button" className="lb-info" onClick={() => new Audio(audioUrl).play()} aria-label="Meine Aufnahme">
          🔁
        </button>
      )}
    </p>
  )

  const fehlerListe = bewertung?.fehler?.length > 0 && (
    <div className="mn-fehlerliste">
      {bewertung.fehler.filter((f) => f.falsch && f.richtig).map((f) => (
        <div key={f.falsch} className="mn-fehlerblock">
          <p className="mn-fehlerzeile" lang="de">
            <span className="mn-falsch">{f.falsch}</span> → <b>{f.richtig}</b>
            <SpeakButton text={f.richtig} lang="de" className="speak-inline" />
          </p>
          {f.warum && <p className="mn-warum" lang="ko">{f.warum}</p>}
        </div>
      ))}
    </div>
  )

  /* Übungs-Kontext für den Nachfrage-Dialog — der Trainer weiß
     dann genau, worüber gesprochen wird */
  const nachfrageKontext =
    `Goethe A2 Sprechen Teil 2 (monologue). Topic card: ${karte.thema} — keywords: ${karte.stichworte.join(', ')}.\n` +
    (transkripte.current.length ? `Her spoken sentences (STT): ${transkripte.current.join(' ')}\n` : '') +
    (transkript ? `Latest transcript: ${transkript}\n` : '') +
    (bewertung
      ? `Coverage: ${JSON.stringify(bewertung.abgedeckt)}. Corrections: ${JSON.stringify(bewertung.fehler)}. Feedback: ${bewertung.kommentar}\nModel: ${bewertung.muster}`
      : '') +
    (ergebnis ? `\nLast single-answer feedback: ${JSON.stringify(ergebnis)}` : '')

  /* ---------- Intro: Stufe wählen ---------- */
  if (!stufe) {
    return (
      <div className="screen">
        {kopf}
        <div className="kal-mitte">
          <div className="fs-intro">
            <p className="fs-intro-titel" lang="de">🗣 Erzählen — Sprechen Teil 2</p>
            <ol className="fs-intro-liste" lang="ko">
              <li>주제 카드 하나와 <b>키워드 4개</b>가 나와요.</li>
              <li>🎙 키워드에 대해 <b>이야기해요</b> — 나의 이야기면 돼요.</li>
              <li>❓ 그다음 시험관이 내 이야기에 대해 <b>질문 2개</b>를 해요.</li>
              <li>✅ 마지막에 쉬운 <b>모범 답안</b>을 듣고 비교할 수 있어요.</li>
            </ol>
          </div>
          <button className="mn-stufe" onClick={() => setStufe('lern')} lang="ko">
            🐢 학습 모드
            <span className="hv-stufe-sub">키워드 하나씩 · 바로 피드백</span>
          </button>
          <button className="mn-stufe" onClick={() => setStufe('pruefung')} lang="ko">
            ⏱ 시험 모드
            <span className="hv-stufe-sub">한 번에 다 말하기 + 시험관 질문</span>
          </button>
        </div>
      </div>
    )
  }

  /* ---------- Abschluss (beide Stufen) ---------- */
  if (phase === 'abschluss' || phase === 'musterDenkt') {
    const punkte = stufe === 'lern' ? punktOk : (bewertung?.abgedeckt ?? []).filter(Boolean).length + zusatzOk
    const max = stufe === 'lern' ? 4 : 6
    return (
      <div className="screen">
        {kopf}
        <div className="lt2-scroll">
          <div className="kal-emoji">{punkte >= max - 1 ? '🌱' : '💪'}</div>
          <p className="kal-text">{punkte} / {max}</p>
          {phase === 'musterDenkt' && <p className="a2-ko-klein" lang="ko">모범 답안을 만드는 중…</p>}
          {phase === 'abschluss' && bewertung?.muster && (
            <div className="rd-aufloesung mn-muster">
              <p className="a2-abschnitt" lang="ko">📖 쉬운 모범 답안</p>
              <p className="rd-beispiel" lang="de">
                {bewertung.muster}
                <SpeakButton text={bewertung.muster} lang="de" className="speak-inline" />
              </p>
            </div>
          )}
          {phase === 'abschluss' && (
            <>
              <Nachfrage profile={profile} t={t} kontext={nachfrageKontext} />
              <div className="lt2-ende">
                <button className="done-btn" onClick={() => zuruecksetzen(true)} lang="de">Neue Karte</button>
                <button className="done-btn lt2-fertigknopf" onClick={onExit}>{t.back}</button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      {kopf}
      <div className="lt2-scroll">
        {stufe === 'lern' ? (
          <Auftrag
            id="monolog-lern"
            de="Sagen Sie 1–2 Sätze zu dem markierten Punkt."
            ko="표시된 키워드에 대해 1-2문장 말해 보세요."
          />
        ) : (
          <Auftrag
            id="monolog-pruefung"
            de="Erzählen Sie über das Thema. Sprechen Sie zu allen vier Punkten."
            ko="주제에 대해 이야기하세요 — 네 가지 키워드를 모두 말해 보세요."
          />
        )}

        {themenKarte(stufe === 'lern' && (phase === 'aufnahme' || phase === 'denkt' || phase === 'punktErgebnis') ? punktIndex : null)}

        {/* ---------- Aufnahme (Monolog bzw. aktueller Punkt) ---------- */}
        {phase === 'aufnahme' && (
          <>
            <AufnahmeKnopf
              profile={profile}
              maxSek={stufe === 'lern' ? 30 : 90}
              onFertig={stufe === 'lern' ? punktAufgenommen : monologAufgenommen}
              onFehler={fehlerZeigen}
              label={stufe === 'lern' ? '눌러서 말하기' : '눌러서 이야기 시작'}
            />
            {fehler && <p className="sw-fehler" lang="ko">{fehler}</p>}
          </>
        )}
        {(phase === 'denkt' || phase === 'zusatzDenkt') && <p className="a2-ko-klein" lang="ko">시험관이 듣고 생각하는 중…</p>}

        {/* ---------- Lernmodus: Feedback zu einem Punkt ---------- */}
        {phase === 'punktErgebnis' && ergebnis && (
          <div className="rd-aufloesung">
            {transkriptZeile}
            <p className={ergebnis.ok ? 'rd-gut' : 'rd-schlecht'}>{ergebnis.ok ? '✓ 좋아요!' : '✗ 아직이에요'}</p>
            {ergebnis.kommentar && <p className="a2-radar-leer" lang="ko">{ergebnis.kommentar}</p>}
            {ergebnis.korrektur && (
              <p className="rd-beispiel" lang="de">
                {ergebnis.korrektur}
                <SpeakButton text={ergebnis.korrektur} lang="de" className="speak-inline" />
              </p>
            )}
            <Nachfrage
              profile={profile}
              t={t}
              kontext={
                `Goethe A2 Sprechen Teil 2 (guided step). Topic: ${karte.thema}, keyword: ${stichwort}.\n` +
                `Her spoken answer (STT): ${transkript}\nFeedback: ${JSON.stringify(ergebnis)}`
              }
            />
            <button
              className="done-btn"
              onClick={() => {
                if (punktIndex + 1 < 4) {
                  setPunktIndex(punktIndex + 1)
                  setPhase('aufnahme')
                  setErgebnis(null)
                  setTranskript('')
                  setAudioUrl(null)
                } else {
                  lernAbschluss()
                }
              }}
              lang="de"
            >
              Weiter
            </button>
          </div>
        )}

        {/* ---------- Prüfungsmodus: Checkliste + Fehler ---------- */}
        {phase === 'ergebnis' && bewertung && (
          <div className="rd-aufloesung">
            {transkriptZeile}
            <div className="mn-check">
              {karte.stichworte.map((s, i) => (
                <p key={s} className={bewertung.abgedeckt[i] ? 'mn-checkzeile hv-ok' : 'mn-checkzeile hv-falsch'} lang="de">
                  {bewertung.abgedeckt[i] ? '✓' : '–'} {s}
                </p>
              ))}
            </div>
            {fehlerListe}
            {bewertung.kommentar && <p className="a2-radar-leer mn-feedback" lang="ko">{bewertung.kommentar}</p>}
            <Nachfrage profile={profile} t={t} kontext={nachfrageKontext} />
            <button className="done-btn" onClick={zusatzStarten} lang="de">
              Weiter — der Prüfer hat noch Fragen
            </button>
          </div>
        )}

        {/* ---------- Zusatzfrage: nur hörbar, sie antwortet ---------- */}
        {phase === 'zusatz' && (
          <>
            <p className="a2-ko-klein" lang="ko">❓ 시험관 질문 {zusatzIndex + 1}/2 — 듣고 대답하세요.</p>
            <button
              className="hv-play fs-partner"
              onClick={() => playSequence([{ text: bewertung.zusatzfragen[zusatzIndex], voice: 'echo' }], 'de', {})}
              aria-label="Frage nochmal anhören"
            >
              ▶
            </button>
            <AufnahmeKnopf
              profile={profile}
              maxSek={30}
              onFertig={zusatzAufgenommen}
              onFehler={fehlerZeigen}
              label="눌러서 대답하기"
            />
            {fehler && <p className="sw-fehler" lang="ko">{fehler}</p>}
          </>
        )}

        {phase === 'zusatzErgebnis' && ergebnis && (
          <div className="rd-aufloesung">
            <p className="mn-zusatzfrage" lang="de">❓ {bewertung.zusatzfragen[zusatzIndex]}</p>
            {transkriptZeile}
            <p className={ergebnis.ok ? 'rd-gut' : 'rd-schlecht'}>{ergebnis.ok ? '✓ 좋아요!' : '✗ 아직이에요'}</p>
            {ergebnis.kommentar && <p className="a2-radar-leer" lang="ko">{ergebnis.kommentar}</p>}
            {ergebnis.korrektur && (
              <p className="rd-beispiel" lang="de">
                {ergebnis.korrektur}
                <SpeakButton text={ergebnis.korrektur} lang="de" className="speak-inline" />
              </p>
            )}
            <Nachfrage
              profile={profile}
              t={t}
              kontext={
                `Goethe A2 Sprechen Teil 2, examiner follow-up question: ${bewertung.zusatzfragen[zusatzIndex]}\n` +
                `Her spoken answer (STT): ${transkript}\nFeedback: ${JSON.stringify(ergebnis)}`
              }
            />
            <button
              className="done-btn"
              onClick={() => {
                if (zusatzIndex + 1 < (bewertung.zusatzfragen?.length ?? 0)) {
                  setZusatzIndex(zusatzIndex + 1)
                  const frage = bewertung.zusatzfragen[zusatzIndex + 1]
                  setErgebnis(null)
                  setTranskript('')
                  setAudioUrl(null)
                  setPhase('zusatz')
                  playSequence([{ text: frage, voice: 'echo' }], 'de', {})
                } else {
                  pruefungAbschluss()
                }
              }}
              lang="de"
            >
              Weiter
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Monolog
