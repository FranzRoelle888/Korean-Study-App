/* ============================================================
   GRAMMATIK-STAND — welche TOPIK-I-Punkte sind noch offen?
   (Aufgaben-Werkstatt, Franz 06.09.: „die nächsten 3 nicht
   angekreuzten Punkte" als Fokus einer Übungsrunde)

   Liest dieselben Haken wie die Checkliste in „Meine Grammatik"
   (inventory_status, item_id 'tg-<id>', status 'sicher') und gibt
   die ersten n noch offenen Punkte in Lern-Reihenfolge zurück.
   Offline: lokaler Puffer der Checkliste, sonst gilt nichts als
   gekonnt — die Runde beginnt dann ganz vorne.
   ============================================================ */
import { supabase } from './supabaseClient'
import { TOPIK1_GRAMMATIK } from './inventare/topik1-grammatik'

export async function naechsteGrammatikPunkte(profileId, n = 3) {
  let sicher = new Set()
  try {
    const { data, error } = await supabase
      .from('inventory_status')
      .select('item_id,status')
      .eq('profile', profileId)
      .eq('kind', 'grammatik')
      .eq('status', 'sicher')
    if (!error && data) sicher = new Set(data.map((r) => r.item_id))
    else throw error
  } catch {
    try {
      sicher = new Set(JSON.parse(localStorage.getItem('grammatik-liste-ko')) || [])
    } catch {
      /* egal */
    }
  }
  return TOPIK1_GRAMMATIK.filter((g) => !sicher.has(`tg-${g.id}`)).slice(0, n)
}

/* Fokus-Text fuer den Trainer: Muster, Name und je ein Beispielsatz */
export function grammatikFokusText(punkte) {
  return (
    'Grammar focus — the next points on the learner\'s TOPIK I path, not yet mastered: ' +
    punkte.map((g) => `${g.muster} (${g.name}) e.g. "${g.beispiel.ko}"`).join('; ') +
    '. Build the exercises around exactly these patterns.'
  )
}
