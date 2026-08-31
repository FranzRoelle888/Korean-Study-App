import { useState } from 'react'
import { trainerNachfrage } from '../trainer/trainerApi'

/* ============================================================
   NACHFRAGE — kleiner Dialog unter jedem Übungs-Feedback
   (Idee Franz 31.08.: auf das Feedback antworten oder Folge-
   fragen stellen -> unmittelbarer Lerneffekt statt Abnicken)

   Wird überall gleich benutzt (Studio, Schreibwerkstatt,
   Lückentext): der aufrufende Bildschirm gibt den Übungs-
   Kontext mit (Aufgaben + Antworten + Feedback), damit der
   Trainer weiß, worüber gesprochen wird. Der Dialog ist
   unbegrenzt (Entscheidung Franz); die Edge Function deckelt
   nur die Längen einzelner Nachrichten.
   ============================================================ */

function Nachfrage({ profile, t, kontext }) {
  const [offen, setOffen] = useState(false)
  /* [{role:'user'|'assistant', text}] */
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
      const res = await trainerNachfrage({ profile: profile.id, kontext, messages: neu })
      setVerlauf([...neu, { role: 'assistant', text: res.text }])
    } catch {
      /* Frage bleibt im Verlauf sichtbar; kleiner Hinweis, nochmal
         senden geht jederzeit */
      setFehler(true)
    } finally {
      setLaedt(false)
    }
  }

  if (!offen) {
    return (
      <button type="button" className="nf-oeffnen" onClick={() => setOffen(true)}>
        💬 {t.nfOeffnen}
      </button>
    )
  }

  return (
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
          placeholder={t.nfPlatzhalter}
        />
        <button
          type="button"
          className="studio-check"
          onClick={senden}
          disabled={!eingabe.trim() || laedt}
          aria-label={t.nfSenden}
        >
          ↑
        </button>
      </div>
    </div>
  )
}

export default Nachfrage
