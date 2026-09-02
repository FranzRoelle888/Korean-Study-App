import { useState } from 'react'
import ArtikelSwipe from '../ueben/ArtikelSwipe'

/* ============================================================
   A2-TRAINING — der Prüfungs-Reiter (Umbau 02.09., Wunsch Franz)

   Aufbau spiegelt die Prüfung selbst:
   - Oben der Stärken-Radar (füllt sich über a2_belege)
   - Dann VIER Modul-Kacheln (Hören/Sprechen/Schreiben/Lesen —
     je 25 Punkte in der Prüfung). Deutsch groß, Koreanisch klein
     (Sprachregel: einfache Beschriftung zweisprachig).
   - Darunter eine schmale Reihe „Grundlagen" für die
     Querschnitts-Übungen (Artikel, Satzbau, Redemittel).

   Jede Modul-Seite beginnt mit einer KOREANISCHEN Infobox
   (Sprachregel: Verstehen-müssen-Texte auf Koreanisch) — Fakten
   direkt aus dem offiziellen Übungssatz: Gewichtung, Teile,
   Bestehensgrenzen, worauf die Prüfer achten.
   ============================================================ */

const MODULE = [
  {
    id: 'hoeren',
    emoji: '🎧',
    de: 'Hören',
    ko: '듣기',
    info: '듣기 · 25점 · 약 30분 · 4개 파트(20문항). ① 짧은 안내방송·자동응답기 5개(2번 들려줌) ② 긴 대화 1개(딱 1번!) ③ 짧은 대화 5개(딱 1번!) ④ 인터뷰(2번, 예/아니오). 파트 ②·③은 한 번만 나와요 — 앱에서도 똑같이 한 번만 들려주며 연습해요.',
    aufgaben: [
      { id: 'hv', titel: 'Hörverstehen', ko: '듣기 연습', aktiv: false },
      { id: 'zahlen', titel: 'Zahlen-Diktat', ko: '숫자 받아쓰기', aktiv: false },
    ],
  },
  {
    id: 'sprechen',
    emoji: '🎤',
    de: 'Sprechen',
    ko: '말하기',
    info: '말하기 · 25점 · 2인 1조 약 15분. ① 질문 카드로 서로 묻고 답하기(4점) ② 카드 주제로 혼자 이야기하기(8점) ③ 파트너와 함께 계획 세우고 합의하기(8점) + 발음(5점). ⚠️ 15점 미만이면 다른 점수와 상관없이 전체 시험 불합격이에요. 파트너는 보통 다른 응시자이고, 점수는 각자 따로 받아요.',
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
    info: '쓰기 · 25점 · 30분 · 2개 과제. ① 친구에게 SMS(20–30단어, du로) ② 반공식 이메일(30–40단어, Sie로). 채점 기준: 요구된 3가지 내용을 모두 썼는지, du/Sie와 인사말이 상황에 맞는지, 문법·어휘. ⚠️ 단어 수가 요구량의 절반 미만이거나 주제를 벗어나면 그 과제는 0점이에요. A2 수준의 작은 문법 실수는 관대하게 봐줘요.',
    aufgaben: [
      { id: 'smsmail', titel: 'SMS & E-Mail', ko: 'SMS와 이메일', aktiv: false },
    ],
  },
  {
    id: 'lesen',
    emoji: '📖',
    de: 'Lesen',
    ko: '읽기',
    info: '읽기 · 25점 · 30분 · 4개 파트(20문항). ① 신문 기사 ② 안내판·프로그램 ③ 개인 이메일 ④ 광고 5개를 사람과 매칭(정답이 없는 X 문제 1개 포함!). 함정: 모든 보기의 단어가 본문에 그대로 나와요 — 단어가 아니라 "뜻이 같은" 보기를 골라야 해요.',
    aufgaben: [
      { id: 'lv', titel: 'Leseverstehen', ko: '읽기 연습', aktiv: false },
      { id: 'anzeigen', titel: 'Anzeigen-Detektiv', ko: '광고 매칭', aktiv: false },
    ],
  },
]

const GRUNDLAGEN = [
  { id: 'artikel', emoji: '🃏', titel: 'Artikel-Spiel', ko: '관사 게임', aktiv: true },
  { id: 'satzbau', emoji: '🧱', titel: 'Satz-Baukasten', ko: '문장 조립', aktiv: false },
  { id: 'redemittel', emoji: '💬', titel: 'Redemittel', ko: '표현 카드', aktiv: false },
]

function A2Training({ profile, t }) {
  const [modul, setModul] = useState(null)
  const [uebung, setUebung] = useState(null)

  if (uebung === 'artikel') {
    return <ArtikelSwipe profile={profile} t={t} onExit={() => setUebung(null)} />
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
          {/* Prüfungs-Fakten auf Koreanisch (Sprachregel) */}
          <div className="a2-radar a2-info" lang="ko">
            {m.info}
          </div>

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

        {/* Grundlagen: Querschnitts-Übungen für alle Module */}
        <div className="a2-grundlagen">
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
      </main>
    </div>
  )
}

export default A2Training
