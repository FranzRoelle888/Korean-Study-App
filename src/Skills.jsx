import { useEffect, useState } from 'react'
import { loadSkills, addSkill, deleteSkill } from './storage'
import ClearableInput from './ClearableInput'

/* ============================================================
   MEIN GRAMMATIK-STAND

   Hier trägt man ein, welche Grammatik man schon beherrscht —
   jede Zeile ein Punkt, kurz und knapp. Der Trainer liest diese
   Liste vor JEDEM Gespräch: was hier steht, benutzt er aktiv;
   was fehlt, vermeidet er. Je gepflegter die Liste, desto besser
   passt das Niveau.

   Bewusst simpel gehalten: Thema + optionale Notiz, löschen per
   ✕. Foto-Upload (Übungsblatt abfotografieren) kommt als
   nächste Stufe.
   ============================================================ */

function Skills({ profile, t, onBack }) {
  const [skills, setSkills] = useState(null) /* null = lädt noch */
  const [topic, setTopic] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let weg = false
    loadSkills()
      .then((rows) => {
        if (!weg) setSkills(rows)
      })
      .catch(() => {
        if (!weg) {
          setSkills([])
          setError(t.skillsError)
        }
      })
    return () => {
      weg = true
    }
  }, [])

  async function hinzufuegen(e) {
    e.preventDefault()
    const thema = topic.trim()
    if (!thema || busy) return
    setBusy(true)
    setError(null)
    try {
      const neu = await addSkill(thema, note.trim())
      setSkills((cur) => [neu, ...(cur || [])])
      setTopic('')
      setNote('')
    } catch {
      setError(t.skillsError)
    }
    setBusy(false)
  }

  async function loeschen(id) {
    setError(null)
    /* Erst optimistisch aus der Liste, bei Fehler zurückholen */
    const vorher = skills
    setSkills((cur) => cur.filter((s) => s.id !== id))
    try {
      await deleteSkill(id)
    } catch {
      setSkills(vorher)
      setError(t.skillsError)
    }
  }

  return (
    <div className="screen">
      <div className="review-header">
        <button className="back-btn" onClick={onBack} aria-label={t.back}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>
        <span className="daily-label">{t.skillsTitle}</span>
      </div>

      <main className="skills-main">
        <p className="skills-hint">{t.skillsSub}</p>

        <form className="skills-form" onSubmit={hinzufuegen}>
          <ClearableInput
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onClear={() => setTopic('')}
            placeholder={t.skillsTopicPh}
            lang={profile.targetLang}
            autoComplete="off"
          />
          <ClearableInput
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onClear={() => setNote('')}
            placeholder={t.skillsNotePh}
            lang={profile.targetLang}
            autoComplete="off"
          />
          <button type="submit" className="add-btn skills-add" disabled={busy || !topic.trim()}>
            {busy ? '…' : t.skillsAdd}
          </button>
        </form>

        {error && <p className="chat-error">{error}</p>}

        {skills === null ? (
          <p className="skills-empty">…</p>
        ) : skills.length === 0 ? (
          <p className="skills-empty">{t.skillsEmpty}</p>
        ) : (
          <ul className="skills-list">
            {skills.map((s) => (
              <li className="skill-row" key={s.id}>
                <div className="skill-text">
                  <span className="skill-topic" lang={profile.targetLang}>
                    {s.topic}
                  </span>
                  {s.note && <span className="skill-note">{s.note}</span>}
                </div>
                <button className="skill-del" onClick={() => loeschen(s.id)} aria-label="Delete">
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

export default Skills
