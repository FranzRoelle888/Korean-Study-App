import { useEffect, useRef, useState } from 'react'
import { loadSkills, addSkill, addSkills, deleteSkill } from './storage'
import { trainerExtract } from './trainerApi'
import ClearableInput from './ClearableInput'

/* ============================================================
   MEIN GRAMMATIK-STAND

   Der Weg hinein ist bewusst ein Gespräch, kein Formular:
   1. Frei erzählen, was man gelernt hat — oder ein Übungsblatt
      fotografieren (oder beides).
   2. Die KI zerlegt das in kurze, atomare Einträge und fasst
      zusammen, was sie verstanden hat.
   3. Erst wenn man die Vorschläge bestätigt (einzelne lassen
      sich abwählen), wird gespeichert.

   Der Trainer liest die Liste vor JEDEM Gespräch: was hier
   steht, benutzt er; was fehlt, vermeidet er.

   Für den Notfall gibt es darunter weiter die Eingabe von Hand.
   ============================================================ */

/* Fotos vom iPhone sind riesig (und HEIC). Der Canvas-Umweg
   verkleinert auf max. 1600px und macht daraus ein JPEG, das
   jede Seite versteht und schnell hochgeladen ist. */
async function fotoVerkleinern(file) {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    await new Promise((res, rej) => {
      img.onload = res
      img.onerror = rej
      img.src = url
    })
    const max = 1600
    const f = Math.min(1, max / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * f)
    c.height = Math.round(img.height * f)
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
    const dataUrl = c.toDataURL('image/jpeg', 0.8)
    return { media_type: 'image/jpeg', data: dataUrl.split(',')[1], preview: dataUrl }
  } finally {
    URL.revokeObjectURL(url)
  }
}

function Skills({ profile, t, onBack }) {
  const [skills, setSkills] = useState(null) /* null = lädt noch */
  const [error, setError] = useState(null)

  /* Erzähl-Box */
  const [text, setText] = useState('')
  const [foto, setFoto] = useState(null)
  const [analysiere, setAnalysiere] = useState(false)
  /* Vorschläge der KI: { reply, items: [{topic, note, on}] } */
  const [vorschlag, setVorschlag] = useState(null)
  const [speichere, setSpeichere] = useState(false)

  /* Hand-Eingabe (eingeklappt) */
  const [handAuf, setHandAuf] = useState(false)
  const [topic, setTopic] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const fileRef = useRef(null)
  const boxRef = useRef(null)

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

  /* Die Erzähl-Box wächst mit (wie im Chat) */
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }, [text])

  async function fotoWaehlen(e) {
    const file = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    try {
      setFoto(await fotoVerkleinern(file))
    } catch {
      setError(t.skillsPhotoError)
    }
  }

  async function analysieren() {
    if (analysiere || (!text.trim() && !foto)) return
    setAnalysiere(true)
    setError(null)
    try {
      const res = await trainerExtract({
        profile: profile.id,
        text: text.trim(),
        image: foto ? { media_type: foto.media_type, data: foto.data } : null,
      })
      setVorschlag({
        reply: res.reply,
        items: (res.items || []).map((it) => ({ ...it, on: true })),
      })
    } catch (e) {
      setError(e.message === 'rate-limit' ? t.trainerRateLimit : t.trainerOffline)
    }
    setAnalysiere(false)
  }

  function umschalten(idx) {
    setVorschlag((v) => ({
      ...v,
      items: v.items.map((it, i) => (i === idx ? { ...it, on: !it.on } : it)),
    }))
  }

  async function uebernehmen() {
    const gewaehlt = vorschlag.items.filter((it) => it.on)
    if (speichere || gewaehlt.length === 0) return
    setSpeichere(true)
    setError(null)
    try {
      const neu = await addSkills(gewaehlt)
      setSkills((cur) => [...neu, ...(cur || [])])
      setVorschlag(null)
      setText('')
      setFoto(null)
    } catch {
      setError(t.skillsError)
    }
    setSpeichere(false)
  }

  async function handHinzufuegen(e) {
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

  const anzahlGewaehlt = vorschlag ? vorschlag.items.filter((it) => it.on).length : 0

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

        {/* ---------- Schritt 1: erzählen (und/oder Foto) ---------- */}
        {!vorschlag && (
          <div className="skills-tell">
            <textarea
              ref={boxRef}
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t.skillsExplainPh}
              disabled={analysiere}
            />
            {foto && (
              <div className="skills-photo-chip">
                <img src={foto.preview} alt="" />
                <button type="button" onClick={() => setFoto(null)} aria-label="Remove photo">
                  ×
                </button>
              </div>
            )}
            <div className="skills-tell-row">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={fotoWaehlen}
              />
              <button
                type="button"
                className="skills-photo-btn"
                onClick={() => fileRef.current && fileRef.current.click()}
                disabled={analysiere}
              >
                📷 {t.skillsPhoto}
              </button>
              <button
                type="button"
                className="add-btn skills-analyze"
                onClick={analysieren}
                disabled={analysiere || (!text.trim() && !foto)}
              >
                {analysiere ? t.skillsAnalyzing : t.skillsAnalyze}
              </button>
            </div>
          </div>
        )}

        {/* ---------- Schritt 2: bestätigen ---------- */}
        {vorschlag && (
          <div className="skills-proposal">
            <p className="skills-reply">{vorschlag.reply}</p>
            {vorschlag.items.length > 0 && (
              <ul className="skills-proposal-list">
                {vorschlag.items.map((it, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      className={it.on ? 'skills-pick skills-pick-on' : 'skills-pick'}
                      onClick={() => umschalten(i)}
                    >
                      <span className="skills-pick-mark">{it.on ? '✓' : ''}</span>
                      <span className="skill-text">
                        <span className="skill-topic" lang={profile.targetLang}>
                          {it.topic}
                        </span>
                        {it.note && <span className="skill-note">{it.note}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="skills-proposal-row">
              <button
                type="button"
                className="skills-discard"
                onClick={() => setVorschlag(null)}
                disabled={speichere}
              >
                {t.skillsDiscard}
              </button>
              {vorschlag.items.length > 0 && (
                <button
                  type="button"
                  className="add-btn"
                  onClick={uebernehmen}
                  disabled={speichere || anzahlGewaehlt === 0}
                >
                  {speichere ? '…' : t.skillsSave(anzahlGewaehlt)}
                </button>
              )}
            </div>
          </div>
        )}

        {error && <p className="chat-error">{error}</p>}

        {/* ---------- Bestand ---------- */}
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

        {/* ---------- Notlösung: von Hand ---------- */}
        <button type="button" className="skills-manual-toggle" onClick={() => setHandAuf(!handAuf)}>
          {handAuf ? '▾' : '▸'} {t.skillsManual}
        </button>
        {handAuf && (
          <form className="skills-form" onSubmit={handHinzufuegen}>
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
        )}
      </main>
    </div>
  )
}

export default Skills
