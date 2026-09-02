import { useEffect, useState } from 'react'

/* ============================================================
   LERNBLATT — das ⓘ-Wissensblatt je Aufgabentyp (A2-Sprint)

   Konzept (Franz, 02.09.): Zu jedem Aufgabentyp gibt es EIN
   großes, kuratiertes Blatt mit allem Wissenswerten — Regeln,
   worauf das Goethe-Institut achtet, typische Fallen. Beim
   ERSTEN Öffnen einer Übung erscheint es automatisch, danach
   jederzeit über den ⓘ-Knopf.

   Inhalte liegen als Repo-Daten vor (kein Laufzeit-KI-Aufruf):
   { id, titel, abschnitte: [{ ueberschrift, text, beispiele? }] }

   Benutzung in einer Übung:
     const [blatt, setBlatt] = useState(() => lernblattNeu(ID))
     {blatt && <Lernblatt daten={BLATT} onClose={...} />}
     <InfoKnopf onClick={() => setBlatt(true)} />
   ============================================================ */

/* Wurde dieses Blatt schon einmal gesehen? (pro Gerät) */
export function lernblattNeu(id) {
  try {
    return localStorage.getItem(`lernblatt:${id}`) !== '1'
  } catch {
    return false
  }
}

function merkeGesehen(id) {
  try {
    localStorage.setItem(`lernblatt:${id}`, '1')
  } catch {
    /* egal */
  }
}

export function InfoKnopf({ onClick, label }) {
  return (
    <button type="button" className="lb-info" onClick={onClick} aria-label={label || 'Info'}>
      ⓘ
    </button>
  )
}

function Lernblatt({ daten, onClose, t }) {
  useEffect(() => {
    if (daten?.id) merkeGesehen(daten.id)
  }, [daten?.id])

  if (!daten) return null
  return (
    <div className="lb-schleier" onClick={onClose}>
      <div className="lb-blatt" onClick={(e) => e.stopPropagation()}>
        <div className="lb-kopf">
          <span className="lb-titel">📋 {daten.titel}</span>
          <button type="button" className="lb-zu" onClick={onClose} aria-label={t?.back || 'Schließen'}>
            ✕
          </button>
        </div>
        <div className="lb-inhalt">
          {(daten.abschnitte ?? []).map((a, i) => (
            <section key={i}>
              <h3>{a.ueberschrift}</h3>
              <p>{a.text}</p>
              {(a.beispiele ?? []).map((b, k) => (
                <p className="lb-beispiel" key={k} lang="de">
                  {b}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Lernblatt
