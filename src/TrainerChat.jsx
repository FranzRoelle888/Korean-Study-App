import { useEffect, useRef, useState } from 'react'
import { trainerChat, trainerSummary } from './trainerApi'
import { SpeakButton } from './tts'

/* ============================================================
   TRAINER-CHAT — Messenger-Ansicht

   Eigene Nachrichten rechts (Akzentfarbe), Trainer links auf
   Karten-Weiß, Tipp-Indikator während der Trainer "schreibt".

   Besonderheiten aus dem Konzept:
   - Leise Korrektur: hat die eigene Nachricht einen Fehler, steht
     die korrigierte Form dezent darunter; Antippen zeigt die
     kurze Erklärung.
   - Verbessern & neu senden: nur bei der LETZTEN eigenen
     Nachricht. Der Text wandert zurück ins Eingabefeld, die alte
     Version und die Trainer-Antwort darauf werden ersetzt.
   - canEnd: der Abschluss-Knopf erscheint erst, wenn der Trainer
     genug gelungene Wechsel gesehen hat (nur Szenario-Modus).

   Der laufende Verlauf überlebt Tab-Wechsel (localStorage), wird
   aber beim Abschluss oder Verwerfen geräumt.
   ============================================================ */

function storeKey(profileId) {
  return `korean-app:${profileId}:trainerChat`
}

function readStored(profileId, mode, scenario) {
  try {
    const d = JSON.parse(localStorage.getItem(storeKey(profileId)))
    if (d && d.mode === mode && d.scenario === scenario && Array.isArray(d.messages)) {
      return d.messages
    }
  } catch {
    /* egal */
  }
  return []
}

/* Fürs Menü: läuft gerade ein Gespräch? Dann direkt hinein statt
   ein neues Szenario auszulosen — wie in einem echten Messenger. */
export function readActiveChat(profileId) {
  try {
    const d = JSON.parse(localStorage.getItem(storeKey(profileId)))
    if (d && Array.isArray(d.messages) && d.messages.length > 0 && d.title) {
      return { mode: d.mode, scenario: d.scenario, title: d.title }
    }
  } catch {
    /* egal */
  }
  return null
}

/* ---------- Avatar ----------
   Die Cartoon-Bilder (200×200 PNG) kommen später einfach als
     src/assets/trainer-avatar-ko.png   (Trainer auf Franz' Seite)
     src/assets/trainer-avatar-de.png   (Trainer auf 해인s Seite)
   ins Repo. import.meta.glob findet sie beim Bauen — fehlt die
   Datei noch, bleibt der Buchstaben-Platzhalter. */
const AVATAR_FILES = import.meta.glob('./assets/trainer-avatar-*.png', {
  eager: true,
  query: '?url',
  import: 'default',
})

function Avatar({ profileId }) {
  const src = AVATAR_FILES[`./assets/trainer-avatar-${profileId}.png`]
  return (
    <span className="msg-avatar" aria-hidden="true">
      {src ? <img src={src} alt="" /> : profileId === 'ko' ? '해' : 'F'}
    </span>
  )
}

function TrainerChat({ profile, mode, scenario, scenarioTitle, onDone, onExit, t }) {
  const [messages, setMessages] = useState(() => readStored(profile.id, mode, scenario))
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [canEnd, setCanEnd] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [error, setError] = useState(null)
  /* Index der Korrektur, deren Erklärung gerade aufgeklappt ist */
  const [openNote, setOpenNote] = useState(null)
  /* Verbessern-Modus: Index der Nachricht, die ersetzt wird */
  const [editing, setEditing] = useState(null)
  const endRef = useRef(null)
  const boxRef = useRef(null)

  /* Verlauf sichern und ans Ende scrollen */
  useEffect(() => {
    try {
      localStorage.setItem(
        storeKey(profile.id),
        JSON.stringify({ mode, scenario, title: scenarioTitle, messages })
      )
    } catch {
      /* egal */
    }
    if (endRef.current) endRef.current.scrollIntoView({ block: 'end' })
  }, [messages, sending])

  /* Beim allerersten Öffnen eröffnet der Trainer das Gespräch.
     Der Riegel (ref) verhindert, dass der Effekt doppelt feuert —
     Reacts StrictMode tut genau das und würde sonst zwei
     Begrüßungen (= zwei bezahlte API-Aufrufe) auslösen. */
  const eroeffnet = useRef(false)
  useEffect(() => {
    if (eroeffnet.current) return
    eroeffnet.current = true
    if (messages.length === 0) senden(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Das Eingabefeld wächst mit dem Text mit (bis ~4 Zeilen) */
  function wachsen() {
    const el = boxRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 112) + 'px'
  }

  useEffect(wachsen, [input])

  async function senden(userText, replaceFrom = null) {
    setError(null)
    let next = messages
    if (replaceFrom !== null) {
      /* Verbessern: alte eigene Nachricht + Trainer-Antwort raus */
      next = messages.slice(0, replaceFrom)
    }
    if (userText !== null) {
      next = [...next, { role: 'user', text: userText }]
    }
    setMessages(next)
    setSending(true)
    try {
      const reply = await trainerChat({
        profile: profile.id,
        mode,
        scenario,
        messages: next.map((m) => ({ role: m.role, text: m.text })),
      })
      setMessages((cur) => {
        const updated = [...cur]
        /* Korrektur gehört zur letzten EIGENEN Nachricht */
        if (reply.correction) {
          for (let i = updated.length - 1; i >= 0; i--) {
            if (updated[i].role === 'user') {
              updated[i] = { ...updated[i], correction: reply.correction }
              break
            }
          }
        }
        return [...updated, { role: 'assistant', text: reply.message }]
      })
      setCanEnd(!!reply.canEnd)
    } catch (e) {
      setError(e.message === 'rate-limit' ? t.trainerRateLimit : t.trainerOffline)
      /* Die eigene Nachricht zurück ins Feld, damit nichts verloren geht */
      if (userText !== null) {
        setMessages((cur) => cur.filter((m, i) => !(i === cur.length - 1 && m.role === 'user')))
        setInput(userText)
      }
    }
    setSending(false)
  }

  function abschicken(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setOpenNote(null)
    if (editing !== null) {
      const idx = editing
      setEditing(null)
      senden(text, idx)
    } else {
      senden(text)
    }
  }

  /* Verbessern: nur die letzte eigene Nachricht */
  function verbessern(idx) {
    setInput(messages[idx].text)
    setEditing(idx)
    setOpenNote(null)
    if (boxRef.current) boxRef.current.focus()
  }

  async function beenden() {
    if (finishing) return
    setFinishing(true)
    setError(null)
    try {
      const res = await trainerSummary({
        profile: profile.id,
        mode,
        scenario,
        messages: messages.map((m) => ({ role: m.role, text: m.text })),
      })
      setFeedback(res.feedback)
      localStorage.removeItem(storeKey(profile.id))
      onDone()
    } catch {
      setError(t.trainerOffline)
    }
    setFinishing(false)
  }

  function verwerfen() {
    localStorage.removeItem(storeKey(profile.id))
    onExit()
  }

  /* Index der letzten eigenen Nachricht (nur dort gibt es Verbessern) */
  let lastUserIdx = -1
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      lastUserIdx = i
      break
    }
  }

  /* ---------- Abschluss-Feedback ---------- */
  if (feedback) {
    return (
      <div className="chat">
        <ChatHeader title={scenarioTitle} onExit={onExit} t={t} />
        <div className="chat-feedback">
          <div className="done-emoji pop">🎉</div>
          <p className="chat-feedback-text">{feedback}</p>
          <button className="done-btn" onClick={onExit}>
            {t.back}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="chat">
      <ChatHeader title={scenarioTitle} onExit={verwerfen} t={t} />

      <div className="chat-scroll">
        {messages.map((m, i) =>
          m.role === 'assistant' ? (
            <div className="msg-row msg-left" key={i}>
              <Avatar profileId={profile.id} />
              <div className="msg-bubble msg-trainer" lang={profile.targetLang}>
                {m.text}
                <SpeakButton text={m.text} lang={profile.targetLang} className="speak-msg" />
              </div>
            </div>
          ) : (
            <div className="msg-row msg-right" key={i}>
              <div className="msg-own-wrap">
                <div className="msg-bubble msg-own" lang={profile.targetLang}>
                  {m.text}
                </div>
                {/* Leise Korrektur unter der eigenen Nachricht */}
                {m.correction && (
                  <button
                    className="msg-correction"
                    onClick={() => setOpenNote(openNote === i ? null : i)}
                  >
                    ✎ {m.correction.fixed}
                  </button>
                )}
                {m.correction && openNote === i && (
                  <div className="msg-note">{m.correction.note}</div>
                )}
                {/* Verbessern nur bei der letzten eigenen Nachricht */}
                {m.correction && i === lastUserIdx && editing === null && !sending && (
                  <button className="msg-improve" onClick={() => verbessern(i)}>
                    {t.improve}
                  </button>
                )}
              </div>
            </div>
          )
        )}

        {/* Tipp-Indikator: der Trainer "schreibt" */}
        {sending && (
          <div className="msg-row msg-left">
            <Avatar profileId={profile.id} />
            <div className="msg-bubble msg-trainer msg-typing">
              <span className="tdot" />
              <span className="tdot" />
              <span className="tdot" />
            </div>
          </div>
        )}

        {error && <p className="chat-error">{error}</p>}
        <div ref={endRef} />
      </div>

      {/* Abschluss anbieten, sobald der Trainer es freigibt */}
      {canEnd && mode === 'scenario' && !sending && (
        <button className="chat-end" onClick={beenden} disabled={finishing}>
          {finishing ? '…' : t.endTalk}
        </button>
      )}

      <form className="chat-input" onSubmit={abschicken}>
        {editing !== null && <span className="chat-editing">{t.improving}</span>}
        <div className="chat-input-row">
          <div className="chat-pill">
            <textarea
              ref={boxRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.typeMessage}
              lang={profile.targetLang}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="send"
              onKeyDown={(e) => {
                /* Enter schickt ab (Shift+Enter = Zeilenumbruch) */
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  abschicken(e)
                }
              }}
            />
            {input && (
              <button
                type="button"
                className="chat-clear"
                onClick={() => {
                  setInput('')
                  setEditing(null)
                  if (boxRef.current) boxRef.current.focus()
                }}
                aria-label="Clear"
              >
                ×
              </button>
            )}
          </div>
          <button type="submit" className="chat-send" disabled={sending || !input.trim()} aria-label={t.send}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
              <path d="M3.4 20.6 21.8 12 3.4 3.4l2.5 7.2 9.4 1.4-9.4 1.4z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}

function ChatHeader({ title, onExit, t }) {
  return (
    <div className="review-header chat-header">
      <button className="back-btn" onClick={onExit} aria-label={t.back}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <span className="daily-label">{title}</span>
    </div>
  )
}

export default TrainerChat
