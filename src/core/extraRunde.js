/* ============================================================
   EXTRA-RUNDE — freiwilliges Nachfestigen (Franz 07./08.09.)

   Frueher „Abend-Check" und erst ab 18 Uhr sichtbar. Jetzt: sobald
   die neuen Tageswoerter durch sind, den ganzen Tag verfuegbar — und
   vor dem Start waehlbar, ob es um die Woerter von HEUTE, den letzten
   3 oder den letzten 5 Lerntagen geht.

   Material sind je Tag:
   - die an dem Tag neu eingefuehrten Woerter (createdAt)
   - alles, was an dem Tag „Again" oder „Barely" bekam (review_log)

   Getippte Produktion, KEINE Bewertung: kein Termin, keine
   Stabilitaet, keine Historie aendert sich. Reine Uebung.
   ============================================================ */
import { supabase } from './supabaseClient'
import { getActiveProfile, learningDayStartMs } from './storage'

/* Auswahl vor dem Start: heute / 3 Tage / 5 Tage */
export const ZEITRAEUME = [1, 3, 5]
const MAX_TAGE = 5
const TAG_MS = 86400000

/* Zu welchem Lerntag gehoert dieser Zeitpunkt? 0 = heute, 1 = gestern … */
function tagIndexVon(ms, heuteStart) {
  if (ms >= heuteStart) return 0
  return Math.ceil((heuteStart - ms) / TAG_MS)
}

/* Alles Material der letzten 5 Lerntage auf einmal — damit die Auswahl
   ihre Zahlen sofort zeigen kann, ohne je Klick neu zu fragen.
   -> [{ word, grund: 'neu' | 'again' | 'barely', tagIndex }] */
export async function ladeExtraMaterial(words, cards) {
  const heuteStart = learningDayStartMs()
  const vonMs = heuteStart - (MAX_TAGE - 1) * TAG_MS
  const byId = Object.fromEntries(words.map((w) => [w.id, w]))
  const material = new Map()

  /* Ein Wort kann mehrfach auftauchen (z. B. vorgestern neu, heute
     falsch). Es gilt der JUENGSTE Tag — sonst faende man es in der
     Auswahl „heute" nicht wieder. */
  const nimm = (wordId, grund, tagIndex) => {
    const w = byId[wordId]
    if (!w || tagIndex < 0 || tagIndex >= MAX_TAGE) return
    const da = material.get(w.id)
    if (da && da.tagIndex <= tagIndex) return
    material.set(w.id, { word: w, grund, tagIndex })
  }

  /* neu eingefuehrte Woerter */
  for (const w of words) {
    const ms = w.createdAt || 0
    if (ms >= vonMs) nimm(w.id, 'neu', tagIndexVon(ms, heuteStart))
  }

  /* Again / Barely aus der Antwort-Historie */
  try {
    const { data } = await supabase
      .from('review_log')
      .select('card_id,word_id,rating,created_at')
      .eq('profile', getActiveProfile())
      .gte('created_at', new Date(vonMs).toISOString())
      .in('rating', ['again', 'hard'])
      .order('created_at', { ascending: false })
      .limit(1500)
    const cardsById = Object.fromEntries(cards.map((c) => [c.id, c]))
    for (const r of data || []) {
      const wordId = r.word_id || cardsById[r.card_id]?.wordId
      if (!wordId) continue
      nimm(wordId, r.rating === 'again' ? 'again' : 'barely', tagIndexVon(new Date(r.created_at).getTime(), heuteStart))
    }
  } catch {
    /* ohne Netz: nur die neuen Woerter */
  }
  return [...material.values()].sort((a, b) => a.tagIndex - b.tagIndex)
}

/* Auf den gewaehlten Zeitraum eingrenzen (1 = nur heute) */
export function fuerZeitraum(material, tage) {
  return material.filter((m) => m.tagIndex < tage)
}
