import { useEffect, useRef, useState } from 'react'
import { SUPABASE_URL, SUPABASE_KEY } from '../core/supabaseClient'
import { accessToken } from '../core/auth'

/* ============================================================
   AUFNAHME — Mikrofon + Transkription (Sprech-Werkbank, Phase 3)

   Ein wiederverwendbarer Baustein für alle Sprech-Übungen:
   - Roter Aufnahme-Knopf mit laufender Sekunden-Anzeige
   - Stopp -> Transkription über die speech-Function (Whisper-
     Nachfolger; kann die iOS-Audioformate)
   - Eigene Aufnahme bleibt lokal anhörbar (Vergleichen!)

   iOS-Hinweise: Beim allerersten Mal fragt das System nach der
   Mikrofon-Erlaubnis. MediaRecorder liefert auf iOS audio/mp4,
   auf Android/Desktop audio/webm — beides versteht die Function.
   ============================================================ */

function passendesFormat() {
  if (typeof MediaRecorder === 'undefined') return null
  for (const typ of ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']) {
    if (MediaRecorder.isTypeSupported(typ)) return typ
  }
  return ''
}

/* Blob -> Base64 (ohne data:-Präfix) */
function alsBase64(blob) {
  return new Promise((resolve, reject) => {
    const leser = new FileReader()
    leser.onload = () => resolve(String(leser.result).split(',')[1] ?? '')
    leser.onerror = reject
    leser.readAsDataURL(blob)
  })
}

export async function transkribiere(blob, mime, profileId, lang = 'de') {
  const token = await accessToken()
  const r = await fetch(`${SUPABASE_URL}/functions/v1/speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action: 'stt',
      lang,
      profile: profileId,
      audio: { data: await alsBase64(blob), media_type: mime || 'audio/mp4' },
    }),
  })
  if (r.status === 429) throw new Error('rate-limit')
  if (!r.ok) throw new Error(`speech ${r.status}`)
  return (await r.json()).text ?? ''
}

/* ---------- Der Aufnahme-Knopf ----------
   Zustände: bereit -> nimmt auf -> transkribiert -> bereit.
   onFertig({ text, audioUrl, dauer }) feuert nach der
   Transkription; onFehler(art) bei Mikrofon-/Netzproblemen.
   mitText={false}: nur aufnehmen, KEINE Transkription (z. B.
   Shadowing — reines Vergleichshören, kostet dann auch nichts). */
export function AufnahmeKnopf({ profile, lang = 'de', maxSek = 90, mitText = true, onFertig, onFehler, label }) {
  const [zustand, setZustand] = useState('bereit') /* bereit | läuft | denkt */
  const [sekunden, setSekunden] = useState(0)
  const rekorder = useRef(null)
  const stuecke = useRef([])
  const timer = useRef(null)

  useEffect(() => {
    return () => {
      clearInterval(timer.current)
      try {
        rekorder.current?.stream?.getTracks().forEach((t) => t.stop())
      } catch {
        /* egal */
      }
    }
  }, [])

  async function starten() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = passendesFormat()
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      stuecke.current = []
      r.ondataavailable = (e) => {
        if (e.data.size > 0) stuecke.current.push(e.data)
      }
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(stuecke.current, { type: r.mimeType || 'audio/mp4' })
        const audioUrl = URL.createObjectURL(blob)
        if (!mitText) {
          setZustand('bereit')
          onFertig?.({ text: '', audioUrl, dauer: sekunden })
          return
        }
        setZustand('denkt')
        try {
          const text = await transkribiere(blob, r.mimeType, profile.id, lang)
          setZustand('bereit')
          onFertig?.({ text, audioUrl, dauer: sekunden })
        } catch (e) {
          setZustand('bereit')
          onFehler?.(e?.message === 'rate-limit' ? 'limit' : 'netz')
        }
      }
      rekorder.current = r
      r.start()
      setSekunden(0)
      setZustand('läuft')
      timer.current = setInterval(() => {
        setSekunden((s) => {
          if (s + 1 >= maxSek) stoppen()
          return s + 1
        })
      }, 1000)
    } catch {
      onFehler?.('mikro')
    }
  }

  function stoppen() {
    clearInterval(timer.current)
    try {
      if (rekorder.current?.state === 'recording') rekorder.current.stop()
    } catch {
      /* egal */
    }
  }

  if (zustand === 'denkt') {
    return (
      <div className="auf-bereich">
        <span className="lib-kreis" aria-hidden="true" />
        <span className="a2-ko-klein" lang="ko">알아듣는 중…</span>
      </div>
    )
  }

  return (
    <div className="auf-bereich">
      <button
        type="button"
        className={zustand === 'läuft' ? 'auf-knopf auf-laeuft' : 'auf-knopf'}
        onClick={zustand === 'läuft' ? stoppen : starten}
        aria-label={label || 'Aufnahme'}
      >
        {zustand === 'läuft' ? '■' : '🎙'}
      </button>
      <span className="a2-ko-klein">
        {zustand === 'läuft' ? `● ${sekunden}s — 끝나면 ■` : label || '눌러서 말하기'}
      </span>
    </div>
  )
}
