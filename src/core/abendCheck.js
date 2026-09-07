/* ============================================================
   ABEND-CHECK — Material fuer den zweiten Blick am Abend (Franz 07.09.)

   Ab 18 Uhr: die heute neuen Woerter plus alles, was heute Again oder
   Barely bekam. Getippte Produktion, KEINE Bewertung, kein Termin
   aendert sich — reine Festigung innerhalb der ersten 24 Stunden.

   Quelle fuer Again/Barely ist die Antwort-Historie (review_log) des
   laufenden Lerntags; die neuen Woerter erkennt man an createdAt.
   ============================================================ */
import { supabase } from './supabaseClient'
import { getActiveProfile, learningDayStartMs } from './storage'

export const ABEND_AB_STUNDE = 18

export function istAbend(jetzt = new Date()) {
  const h = jetzt.getHours()
  /* Lerntag laeuft bis 4 Uhr — nach Mitternacht zaehlt noch als Abend */
  return h >= ABEND_AB_STUNDE || h < 4
}

/* -> [{ word, grund: 'neu' | 'again' | 'barely' }] */
export async function ladeAbendMaterial(words, cards) {
  const start = learningDayStartMs()
  const byId = Object.fromEntries(words.map((w) => [w.id, w]))
  const material = new Map()
  const nimm = (wordId, grund) => {
    const w = byId[wordId]
    if (!w || material.has(w.id)) return
    material.set(w.id, { word: w, grund })
  }

  /* heute neu */
  for (const w of words) if ((w.createdAt || 0) >= start) nimm(w.id, 'neu')

  /* heute Again / Barely — aus der Historie */
  try {
    const { data } = await supabase
      .from('review_log')
      .select('card_id,word_id,rating')
      .eq('profile', getActiveProfile())
      .gte('created_at', new Date(start).toISOString())
      .in('rating', ['again', 'hard'])
      .limit(500)
    const cardsById = Object.fromEntries(cards.map((c) => [c.id, c]))
    for (const r of data || []) {
      const wordId = r.word_id || cardsById[r.card_id]?.wordId
      if (wordId) nimm(wordId, r.rating === 'again' ? 'again' : 'barely')
    }
  } catch {
    /* ohne Netz: nur die neuen Woerter */
  }
  return [...material.values()]
}
