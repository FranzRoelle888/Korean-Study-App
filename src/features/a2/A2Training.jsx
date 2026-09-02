import { useState } from 'react'
import ArtikelSwipe from '../ueben/ArtikelSwipe'
import SchreibTraining from './SchreibTraining'
import RedemittelDrill from './RedemittelDrill'
import HoerTraining from './HoerTraining'
import ZahlenDiktat from './ZahlenDiktat'
import { trainerA2Frage } from '../trainer/trainerApi'

/* ============================================================
   A2-TRAINING — der Prüfungs-Reiter (Umbau 02.09., Wunsch Franz)

   Aufbau spiegelt die Prüfung selbst:
   - Oben der Stärken-Radar
   - VIER Modul-Kacheln (je 25 Punkte) — Deutsch groß,
     Koreanisch klein
   - Mit Abstand darunter die Reihe „Grundlagen" für die
     Querschnitts-Übungen
   - Ganz unten: die Fragen-Ecke — ein Sprachmodell, das Haeins
     komplette Situation kennt (Lernstand, Prüfungstermin, alle
     Fakten zum Goethe-A2-Test UND die Funktionen dieser App) und
     bei Themen-Fragen auf die passende Übung verweist.

   Design-Motto (Franz): „Das Auge isst mit" — Infotexte sind
   STRUKTURIERT (fette Überschriften, Nummern untereinander) und
   AUSKLAPPBAR, damit sie den Bildschirm nicht fluten.
   ============================================================ */

const MODULE = [
  {
    id: 'hoeren',
    emoji: '🎧',
    de: 'Hören',
    ko: '듣기',
    kurz: '25점 · 약 30분 · 20문항',
    teile: [
      { name: '안내방송·자동응답기 5개', detail: '2번 들려줘요 · 3지선다' },
      { name: '긴 대화 1개', detail: '⚠️ 딱 1번만! · 그림 매칭' },
      { name: '짧은 대화 5개', detail: '⚠️ 딱 1번만! · 그림 3지선다' },
      { name: '인터뷰', detail: '2번 들려줘요 · 예/아니오 5문항' },
    ],
    achtung: [
      '파트 2·3은 한 번만 나와요 — 앱에서도 똑같이 한 번만 들려주며 연습해요.',
      '문제를 먼저 읽고 나서 들으세요 — 시험에서도 읽을 시간을 줘요.',
    ],
    aufgaben: [
      { id: 'hv', titel: 'Hörverstehen', ko: '듣기 연습', aktiv: true },
      { id: 'zahlen', titel: 'Zahlen-Diktat', ko: '숫자 받아쓰기', aktiv: true },
    ],
  },
  {
    id: 'sprechen',
    emoji: '🎤',
    de: 'Sprechen',
    ko: '말하기',
    kurz: '25점 · 2인 1조 15분 · ⚠️ 과락 주의',
    teile: [
      { name: '질문 카드로 묻고 답하기', detail: '4점 · 카드 4장으로 질문 만들기' },
      { name: '혼자 이야기하기', detail: '8점 · 카드 주제 + 4개 키워드, 약 1분' },
      { name: '함께 계획 세우기', detail: '8점 · 파트너와 제안하고 합의하기' },
      { name: '발음', detail: '5점 · 문장 억양, 단어 강세, 개별 소리' },
    ],
    achtung: [
      '⚠️ 15점 미만이면 다른 점수와 상관없이 전체 시험이 불합격이에요.',
      '파트너는 보통 다른 응시자예요. 점수는 각자 따로 받으니, 파트너가 약해도 손해 보지 않아요 — 대화를 이끄는 연습이 중요해요.',
    ],
    aufgaben: [
      { id: 'fragen', titel: 'Fragen-Spiel', ko: '질문 게임', aktiv: false },
      { id: 'monolog', titel: 'Erzählen', ko: '혼자 말하기', aktiv: false },
      { id: 'partner', titel: 'Zusammen planen', ko: '함께 계획하기', aktiv: false },
      { id: 'aussprache', titel: 'Aussprache', ko: '발음 따라 하기', aktiv: false },
    ],
  },
  {
    id: 'schreiben',
    emoji: '✉️',
    de: 'Schreiben',
    ko: '쓰기',
    kurz: '25점 · 30분 · 2개 과제',
    teile: [
      { name: '친구에게 SMS', detail: '20–30단어 · du로 · 요구된 내용 3가지' },
      { name: '반공식 이메일', detail: '30–40단어 · Sie로 · 요구된 내용 3가지' },
    ],
    achtung: [
      '⚠️ 단어 수가 요구량의 절반 미만이거나 주제를 벗어나면 그 과제는 0점이에요.',
      '채점 포인트: 3가지 내용을 모두 썼는가, du/Sie와 인사말이 상황에 맞는가.',
      'A2 수준의 작은 문법 실수는 관대하게 봐줘요 — 빠뜨린 내용이 훨씬 큰 감점이에요.',
    ],
    aufgaben: [
      { id: 'smsmail', titel: 'SMS & E-Mail', ko: 'SMS와 이메일', aktiv: true },
    ],
  },
  {
    id: 'lesen',
    emoji: '📖',
    de: 'Lesen',
    ko: '읽기',
    kurz: '25점 · 30분 · 20문항',
    teile: [
      { name: '신문 기사', detail: '3지선다 5문항' },
      { name: '안내판·프로그램', detail: '"어디로 가요?" 5문항' },
      { name: '개인 이메일', detail: '3지선다 5문항' },
      { name: '광고 매칭', detail: '사람 5명 ↔ 광고, ⚠️ 정답 없는 X 문제 1개!' },
    ],
    achtung: [
      '함정: 모든 보기의 단어가 본문에 그대로 나와요 — 단어가 아니라 "뜻이 같은" 보기를 골라야 해요.',
    ],
    aufgaben: [
      { id: 'lv', titel: 'Leseverstehen', ko: '읽기 연습', aktiv: false },
      { id: 'anzeigen', titel: 'Anzeigen-Detektiv', ko: '광고 매칭', aktiv: false },
    ],
  },
]

const GRUNDLAGEN = [
  { id: 'artikel', emoji: '🃏', titel: 'Artikel-Spiel', ko: '관사 게임', aktiv: true },
  { id: 'satzbau', emoji: '🧱', titel: 'Satz-Baukasten', ko: '문장 조립', aktiv: false },
  { id: 'redemittel', emoji: '💬', titel: 'Redemittel', ko: '표현 카드', aktiv: true },
]

/* Ausklappbare, schön formatierte Prüfungs-Infobox (Koreanisch) */
function Infobox({ modul }) {
  const [offen, setOffen] = useState(false)
  return (
    <div className="a2-infobox">
      <button type="button" className="a2-infobox-kopf" onClick={() => setOffen(!offen)}>
        <span className="a2-infobox-titel">📋 시험 정보</span>
        <span className="a2-infobox-kurz" lang="ko">{modul.kurz}</span>
        <span className="a2-infobox-pfeil">{offen ? '▴' : '▾'}</span>
      </button>
      {offen && (
        <div className="a2-infobox-inhalt" lang="ko">
          <h4>구성</h4>
          <ol>
            {modul.teile.map((tl, i) => (
              <li key={i}>
                <strong>{tl.name}</strong>
                <span>{tl.detail}</span>
              </li>
            ))}
          </ol>
          <h4>꼭 알아두기</h4>
          <ul>
            {modul.achtung.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/* Fragen-Ecke: Dialog mit dem Prüfungs-Assistenten */
function FragenEcke({ profile, t }) {
  const [verlauf, setVerlauf] = useState([])
  const [eingabe, setEingabe] = useState('')
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState(false)

  async function senden() {
    const frage = eingabe.trim()
    if (!frage || laedt) return
    const neu = [...verlauf, { role: 'user', text: frage }]
    setVerlauf(neu)
    setEingabe('')
    setLaedt(true)
    setFehler(false)
    try {
      const res = await trainerA2Frage({ profile: profile.id, messages: neu })
      setVerlauf([...neu, { role: 'assistant', text: res.text }])
    } catch {
      setFehler(true)
    } finally {
      setLaedt(false)
    }
  }

  return (
    <div className="a2-fragen">
      <p className="a2-fragen-titel">💬 {t.a2FrageTitel}</p>
      <p className="a2-radar-leer" lang="ko">{t.a2FrageSub}</p>
      <div className="nf-box">
        {verlauf.map((m, i) => (
          <p key={i} className={m.role === 'user' ? 'nf-frage' : 'nf-antwort'}>
            {m.text}
          </p>
        ))}
        {laedt && <p className="nf-antwort nf-laedt">…</p>}
        {fehler && <p className="nf-fehler">{t.nfFehler}</p>}
        <div className="nf-eingabe">
          <input
            className="nf-feld"
            value={eingabe}
            onChange={(e) => setEingabe(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') senden()
            }}
            placeholder={t.a2FragePlatzhalter}
          />
          <button
            type="button"
            className="studio-check"
            onClick={senden}
            disabled={!eingabe.trim() || laedt}
            aria-label={t.send}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}

function A2Training({ profile, t }) {
  const [modul, setModul] = useState(null)
  const [uebung, setUebung] = useState(null)

  if (uebung === 'artikel') {
    return <ArtikelSwipe profile={profile} t={t} onExit={() => setUebung(null)} />
  }

  if (uebung === 'smsmail') {
    return <SchreibTraining profile={profile} t={t} onExit={() => setUebung(null)} />
  }

  if (uebung === 'redemittel') {
    return <RedemittelDrill profile={profile} t={t} onExit={() => setUebung(null)} />
  }

  if (uebung === 'hv') {
    return <HoerTraining profile={profile} t={t} onExit={() => setUebung(null)} />
  }

  if (uebung === 'zahlen') {
    return <ZahlenDiktat profile={profile} t={t} onExit={() => setUebung(null)} />
  }

  /* ---------- Modul-Seite ---------- */
  if (modul) {
    const m = MODULE.find((x) => x.id === modul)
    return (
      <div className="screen sets-screen">
        <div className="review-header">
          <button className="back-btn" onClick={() => setModul(null)} aria-label={t.back}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 6-6 6 6 6" />
            </svg>
          </button>
          <span className="daily-label">
            {m.emoji} {m.de} <span className="a2-ko-klein">{m.ko}</span>
          </span>
        </div>

        <main className="trainer-menu">
          <Infobox modul={m} />

          <div className="mode-grid">
            {m.aufgaben.map((u) => (
              <button
                key={u.id}
                className={u.aktiv ? 'mode-card' : 'mode-card a2-bald'}
                onClick={() => u.aktiv && setUebung(u.id)}
                disabled={!u.aktiv}
              >
                <span className="mode-title" lang="de">{u.titel}</span>
                <span className="mode-sub" lang="ko">{u.aktiv ? u.ko : `${u.ko} · ${t.a2Folgt}`}</span>
              </button>
            ))}
          </div>
        </main>
      </div>
    )
  }

  /* ---------- Übersicht ---------- */
  return (
    <div className="screen sets-screen">
      <header className="header">
        <h1 className="sets-title">{t.a2Titel}</h1>
        <p className="sets-sub">{t.a2Sub}</p>
      </header>

      <main className="trainer-menu">
        <div className="a2-radar">
          <p className="a2-radar-titel">📊 {t.a2RadarTitel}</p>
          <p className="a2-radar-leer">{t.a2RadarLeer}</p>
        </div>

        {/* Die vier Prüfungsmodule — Deutsch groß, Koreanisch klein */}
        <div className="mode-grid">
          {MODULE.map((m) => (
            <button key={m.id} className="mode-card" onClick={() => setModul(m.id)}>
              <span className="mode-emoji">{m.emoji}</span>
              <span className="mode-title" lang="de">{m.de}</span>
              <span className="mode-sub" lang="ko">{m.ko} · 25점</span>
            </button>
          ))}
        </div>

        {/* Grundlagen: mit Luft und eigener Überschrift abgesetzt */}
        <div className="a2-grundlagen">
          <p className="a2-abschnitt" lang="de">
            Grundlagen <span className="a2-ko-klein" lang="ko">기본기</span>
          </p>
          {GRUNDLAGEN.map((g) => (
            <button
              key={g.id}
              className={g.aktiv ? 'a2-werkzeug' : 'a2-werkzeug a2-bald'}
              onClick={() => g.aktiv && setUebung(g.id)}
              disabled={!g.aktiv}
            >
              <span>{g.emoji}</span>
              <span className="a2-werkzeug-titel" lang="de">{g.titel}</span>
              <span className="a2-ko-klein" lang="ko">{g.aktiv ? g.ko : t.a2Folgt}</span>
            </button>
          ))}
        </div>

        <FragenEcke profile={profile} t={t} />
      </main>
    </div>
  )
}

export default A2Training
