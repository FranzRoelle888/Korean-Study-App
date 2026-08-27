/* ============================================================
   ANMELDUNG — dünne Schicht über Supabase Auth.

   Supabase erledigt das Schwere selbst: Die Sitzung landet im
   localStorage, überlebt App-Neustarts monatelang und frischt
   ihr Zugangs-Token automatisch auf. Nach dem Login hängt der
   supabase-Client das Token von allein an jede Datenbank-Anfrage
   — storage.js muss davon nichts wissen.
   ============================================================ */
import { supabase, SUPABASE_KEY } from './supabaseClient'

/* Die gespeicherte Sitzung lesen (auch offline verfügbar) */
export async function readSession() {
  const { data } = await supabase.auth.getSession()
  return data.session ?? null
}

/* Bei Änderungen (Login, Logout, Token-Auffrischung) Bescheid sagen.
   Gibt eine Aufräum-Funktion zurück. */
export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session ?? null)
  })
  return () => data.subscription.unsubscribe()
}

export async function login(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function logout() {
  await supabase.auth.signOut()
}

/* Für Aufrufe an Edge Functions: das Nutzer-Token, solange man
   eingeloggt ist — sonst (z. B. lokal vor dem Login) der
   öffentliche Schlüssel als harmloser Platzhalter. */
export async function accessToken() {
  const session = await readSession()
  return session?.access_token ?? SUPABASE_KEY
}
