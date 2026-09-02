import { useState } from 'react'

/* ============================================================
   AUFTRAG — zweisprachige Aufgabenstellung (Sprachregel Franz,
   02.09., für alle A2-Übungen)

   Aufgabenstellungen stehen GROSS auf Deutsch — wortwörtlich im
   Goethe-Rubriken-Deutsch („Wählen Sie die richtige Lösung a, b
   oder c.") — und KLEIN auf Koreanisch darunter. Nach ~10
   Begegnungen mit derselben Aufgabenstellung (gezählt pro id,
   pro Gerät) verschwindet die koreanische Zeile von selbst;
   ein Tipp auf den deutschen Satz holt sie zur Not zurück.

   Benutzung:  <Auftrag id="hv-t1" de="Sie hören fünf kurze
               Texte…" ko="짧은 글 5개를 들어요…" />
   ============================================================ */

const SCHWELLE = 10

function zaehleBegegnung(id) {
  try {
    const k = `auftrag:${id}`
    const n = (parseInt(localStorage.getItem(k) ?? '0', 10) || 0) + 1
    localStorage.setItem(k, String(n))
    return n
  } catch {
    return 0
  }
}

function Auftrag({ id, de, ko }) {
  /* pro Anzeige einmal zählen (State-Initialisierer läuft genau
     einmal je eingeblendetem Auftrag) */
  const [anzahl] = useState(() => zaehleBegegnung(id))
  const [aufgedeckt, setAufgedeckt] = useState(false)
  const zeigeKo = ko && (anzahl <= SCHWELLE || aufgedeckt)

  return (
    <div className="auftrag">
      <p
        className="auftrag-de"
        lang="de"
        onClick={() => !zeigeKo && setAufgedeckt(true)}
      >
        {de}
      </p>
      {zeigeKo && (
        <p className="auftrag-ko" lang="ko">
          {ko}
        </p>
      )}
    </div>
  )
}

export default Auftrag
