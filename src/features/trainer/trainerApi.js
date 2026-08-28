/* ============================================================
   TRAINER — Verbindung zur Edge Function

   Die Funktion hält den Anthropic-Schlüssel; die App schickt nur
   Verlauf + Modus. Der öffentliche Supabase-Schlüssel dient als
   Zugangsausweis fürs Function-Gateway.
   ============================================================ */
import { SUPABASE_URL, SUPABASE_KEY } from '../../core/supabaseClient'
import { accessToken } from '../../core/auth'

const FN_URL = `${SUPABASE_URL}/functions/v1/trainer`

async function call(body) {
  /* Seit dem Login weist sich die App mit dem Nutzer-Token aus —
     die Edge Function lehnt (bei eingeschalteter JWT-Prüfung)
     alles andere ab. */
  const token = await accessToken()
  const r = await fetch(FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  if (r.status === 429) throw new Error('rate-limit')
  if (!r.ok) throw new Error(`trainer ${r.status}`)
  return r.json()
}

/* Eine Trainer-Antwort. messages: [{role:'user'|'assistant', text}] */
export function trainerChat({ profile, mode, scenario, messages }) {
  return call({ action: 'chat', profile, mode, scenario, messages })
}

/* Einheit beenden -> Zusammenfassung ins Lernjournal, Feedback zurück */
export function trainerSummary({ profile, mode, scenario, messages }) {
  return call({ action: 'summary', profile, mode, scenario, messages })
}

/* Übungsrunde abgeschlossen -> kurzes KI-Feedback; die Funktion
   schreibt nebenbei Journal-Eintrag und Grammatik-Belege.
   ergebnisse: [{grammatik_id, grammatik_name, loesung, antwort, richtig}] */
export function trainerUebung({ profile, ergebnisse }) {
  return call({ action: 'uebung', profile, ergebnisse })
}

/* Eigener Satz im Produzieren-Schritt der Lektion -> Urteil
   { ok, feedback, korrektur } */
export function trainerSatz({ profile, muster, satz }) {
  return call({ action: 'satz', profile, muster, satz })
}

/* Grammatik-Erklärung (Text und/oder Foto) -> Vorschlagsliste.
   image: { media_type: 'image/jpeg', data: '<base64>' } oder null.
   Gespeichert wird erst nach Bestätigung in der App. */
export function trainerExtract({ profile, text, image }) {
  return call({ action: 'extract', profile, text, image: image || undefined })
}
