import { useState } from 'react'

/* ============================================================
   INFO-KNOPF „Was ist neu?" über den Tageswörtern (해인)
   Wunsch Franz 06.09.: der neue Vokabel-Motor kurz auf Koreanisch
   erklärt, damit sie die Änderung sofort durchblickt. Verschwindet
   von selbst nach einer Woche (BIS). Deutsche Übersetzung des Texts
   steht im Chat-Protokoll vom 06.09.
   ============================================================ */

const BIS = '2026-09-14' /* letzter Tag, an dem der Knopf erscheint */

export function motorInfoSichtbar(profileId, heute) {
  return profileId !== 'ko' && heute <= BIS
}

export default function MotorInfo() {
  const [offen, setOffen] = useState(false)
  return (
    <div className="mi">
      <button className="mi-knopf" onClick={() => setOffen((o) => !o)} aria-expanded={offen}>
        <span className="mi-icon" aria-hidden="true">
          ✨
        </span>
        <span className="mi-titel">Neu · 새로워진 단어 학습</span>
        <span className="mi-pfeil" aria-hidden="true">
          {offen ? '▴' : '▾'}
        </span>
      </button>
      {offen && (
        <div className="mi-text" lang="ko">
          <p>
            <b>새 단어는 하루 3개.</b> 복습이 100장을 넘으면 그날은 새 단어가 안 나와요. 밀린 복습이
            먼저예요.
          </p>
          <p>
            <b>새 단어는 처음엔 뜻만 맞히면 돼요.</b> 독일어 단어를 보고 뜻을 두 글자 이상 입력한
            뒤, 목록에서 맞는 뜻을 탭하세요. 두 번 잘 맞히면 그다음 날부터 독일어로 쓰는 카드가
            생겨요.
          </p>
          <p>
            <b>쓰는 카드는 관사까지 정확히.</b> der·die·das가 틀리면 틀린 거예요. 틀리면 내 답과
            정답이 나란히 보여요.
          </p>
          <p>
            <b>단어가 오래 기억되면 듣기 카드로 바뀌어요.</b> 글자 없이 소리만 듣고 뜻을 고르는
            카드예요.
          </p>
          <p>
            <b>버튼 세 개.</b> 겨우 맞힘 · 맞힘 · 바로 맞힘. 틀렸을 때는 빨간 「다시」 또는 초록
            「실수로 눌렀어요」 (평가 없이 나중에 다시).
          </p>
          <p>
            <b>이미 배운 단어는 그대로.</b> 지금 복습 중인 카드는 하나도 안 바뀌어요. 직접 넣은
            단어도 예전처럼 바로 복습에 들어가요.
          </p>
          <p>
            <b>「오늘 쉬기」</b> 버튼으로 오늘의 새 단어를 멈출 수 있어요.
          </p>
        </div>
      )}
    </div>
  )
}
