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

/* Schreibwerkstatt: freien Text bewerten. Die Funktion prüft die
   Pflicht-Muster, schreibt Belege + Journal und liefert
   { muster: [{id, verwendet, korrekt, kommentar}], feedback,
     muster_version } zurück. */
export function trainerSchreiben({ profile, thema, muster, text }) {
  return call({ action: 'schreiben', profile, thema, muster, text })
}

/* Grammatik-Studio, drei Etappen (Konzept: Chat 31.08.).
   punkt: {id, muster, name, beispiel} aus dem Kanon. */
export function studioErklaerung({ profile, punkt }) {
  return call({ action: 'studio_erklaerung', profile, punkt })
}
export function studioAufgaben({ profile, punkt, bau }) {
  return call({ action: 'studio_aufgaben', profile, punkt, bau })
}
export function studioBilanz({ profile, punkt, antworten }) {
  return call({ action: 'studio_bilanz', profile, punkt, antworten })
}

/* Eine einzelne Drill-Antwort bewerten (läuft im Hintergrund,
   sobald ✓ getippt wird) -> { ampel: gruen|gelb|rot, kommentar } */
export function studioAntwort({ profile, punkt, frage, antwort }) {
  return call({ action: 'studio_antwort', profile, punkt, frage, antwort })
}

/* Nachfrage aufs Übungs-Feedback: kleiner Dialog mit Kontext.
   messages: [{role:'user'|'assistant', text}] -> { text } */
export function trainerNachfrage({ profile, kontext, messages }) {
  return call({ action: 'nachfrage', profile, kontext, messages })
}

/* Bedeutungs-Vorschlag beim Vokabel-Eintragen -> { vorschlag } */
export function trainerUebersetzung({ profile, wort }) {
  return call({ action: 'uebersetzung', profile, wort })
}

/* Grammatik-Erklärung (Text und/oder Foto) -> Vorschlagsliste.
   image: { media_type: 'image/jpeg', data: '<base64>' } oder null.
   Gespeichert wird erst nach Bestätigung in der App. */
export function trainerExtract({ profile, text, image }) {
  return call({ action: 'extract', profile, text, image: image || undefined })
}
