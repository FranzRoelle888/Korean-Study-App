/* ============================================================
   TRAINER — Verbindung zur Edge Function

   Die Funktion hält den Anthropic-Schlüssel; die App schickt nur
   Verlauf + Modus. Der öffentliche Supabase-Schlüssel dient als
   Zugangsausweis fürs Function-Gateway.
   ============================================================ */
import { SUPABASE_URL, SUPABASE_KEY } from './supabaseClient'

const FN_URL = `${SUPABASE_URL}/functions/v1/trainer`

async function call(body) {
  const r = await fetch(FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
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
