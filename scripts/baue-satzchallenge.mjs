/* ============================================================
   TAGES-CHALLENGE NACHTS VORBEREITEN (Franz 14.09.)

   WARUM: Bisher erzeugte das Telefon die fuenf Saetze live, in dem
   Moment, in dem man die Challenge oeffnete — sieben Saetze, zwei
   Pruefstufen, zwanzig bis vierzig Sekunden. Safari bricht bei etwa
   sechzig ab, und wenn nach der Pruefung weniger als drei Saetze
   uebrig waren, stand in der App „offline und nichts vorbereitet",
   obwohl Netz da war. Dazu wiederholten sich Woerter (만나다 in
   fast jeder Runde), weil die Vermeidungsliste nur eine Bitte war und
   die Fokus-Woerter reiner Zufall.

   JETZT: Dieser Lauf legt je Seite drei Challenges auf Vorrat in die
   Aufgaben-Bank (exercise_bank, typ satzchallenge). Das Telefon liest
   nur noch. Die Erzeugung selbst laeuft weiter ueber die trainer-
   Edge-Function — dieselbe Logik wie in der App (Varianz, Funktions-
   woerter, zweistufige Abnahme). Der Lauf weist sich mit dem
   Service-Schluessel aus; die Function laesst ihn dafuer durch.

   FOKUS AUS DEM LERNSTAND statt Zufall (je Challenge acht Woerter,
   die das Modell zwingend unterbringen muss):
     3  in den letzten sieben Tagen neu gelernt
     3  wackelig — mit Fehlern (lapses) oder Stabilitaet unter 7 Tagen
     2  reif (Stabilitaet ab 21 Tagen), aber seit ueber zwei Wochen in
        keiner Challenge
   HARTE ROTATION: Woerter der letzten 14 Tage duerfen nicht Hauptverb
   oder Hauptnomen sein. Zusaetzlich verwirft der Lauf ein Ergebnis,
   dessen Inhaltswoerter sich zu mehr als der Haelfte mit den letzten
   zwei Wochen ueberschneiden, und versucht es neu — nachts spielt die
   Zeit keine Rolle.

   Aufruf: node scripts/baue-satzchallenge.mjs
             [--profil ko|de|beide] [--anzahl 3] [--dry]
   Secrets: SUPABASE_SERVICE_KEY (Datenbank UND Ausweis fuer die
   Function). Der Anthropic-Schluessel liegt in der Function.
   ============================================================ */
import { TOPIK1_GRAMMATIK } from '../src/core/inventare/topik1-grammatik.js'
import { GER_GRAMMATIK } from '../src/core/inventare/ger-grammatik.js'
import { SZENEN } from '../src/core/szenen.js'

const SUPABASE_URL = 'https://gkrubhwwzgekmbiltslt.supabase.co'
const DB_KEY = process.env.SUPABASE_SERVICE_KEY
if (!DB_KEY) {
  console.error('SUPABASE_SERVICE_KEY fehlt.')
  process.exit(1)
}

const argWert = (name) => {
  const i = process.argv.indexOf(name)
  return i === -1 ? null : process.argv[i + 1]
}
const TROCKEN = process.argv.includes('--dry')
const PROFIL_WAHL = argWert('--profil') ?? 'beide'
const ZIEL = Number(argWert('--anzahl') ?? 3)
const TYP = 'satzchallenge'
const ROTATION_TAGE = 14
const MAX_VERSUCHE = 3
const UEBERLAPPUNG_MAX = 0.5
const FOKUS = { neu: 3, wackelig: 3, reif: 2 }

const kopf = { apikey: DB_KEY, Authorization: `Bearer ${DB_KEY}`, 'Content-Type': 'application/json' }
async function hole(pfad) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${pfad}`, { headers: kopf })
  if (!r.ok) throw new Error(`GET ${pfad.slice(0, 60)}: ${r.status} ${(await r.text()).slice(0, 200)}`)
  return r.json()
}
async function lege(zeile) {
  if (TROCKEN) return { id: 'trocken' }
  const r = await fetch(`${SUPABASE_URL}/rest/v1/exercise_bank`, {
    method: 'POST',
    headers: { ...kopf, Prefer: 'return=representation' },
    body: JSON.stringify(zeile),
  })
  if (!r.ok) throw new Error(`INSERT exercise_bank: ${r.status} ${(await r.text()).slice(0, 200)}`)
  const [d] = await r.json()
  return d
}

/* Die Function mit dem Service-Schluessel als Ausweis aufrufen */
class Fatal extends Error {}
async function trainer(body) {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/trainer`, {
    method: 'POST',
    headers: kopf,
    body: JSON.stringify(body),
  })
  const text = await r.text()
  if (r.status === 429) throw new Fatal('Stundenlimit der Function erreicht')
  if (!r.ok) {
    if (/usage limits|credit balance|billing/i.test(text)) throw new Fatal(`Anthropic-Limit: ${text.slice(0, 160)}`)
    throw new Error(`trainer ${r.status}: ${text.slice(0, 200)}`)
  }
  return JSON.parse(text)
}

const mische = (liste) => {
  const a = [...liste]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const norm = (s) => String(s ?? '').normalize('NFC').trim()

/* ---------- Grammatik: abgehakt + Auffuellen auf 12 (wie in der App) ---------- */
async function nutzbareGrammatik(profil) {
  const ko = profil === 'ko'
  const liste = ko ? TOPIK1_GRAMMATIK : GER_GRAMMATIK
  const praefix = ko ? 'tg' : 'gg'
  const rows = await hole(`inventory_status?profile=eq.${profil}&kind=eq.grammatik&status=eq.sicher&select=item_id`)
  const sicher = new Set(rows.map((r) => r.item_id))
  const abgehakt = liste.filter((g) => sicher.has(`${praefix}-${g.id}`))
  const rest = liste.filter((g) => !sicher.has(`${praefix}-${g.id}`))
  const nutz = abgehakt.length >= 12 ? abgehakt : [...abgehakt, ...rest.slice(0, 12 - abgehakt.length)]
  return nutz.map((g) => ({ muster: g.muster, name: g.name, beispiel: ko ? g.beispiel.ko : g.beispiel.de }))
}

/* ---------- Was in den letzten 14 Tagen dran war ---------- */
async function zuletztBenutzt(profil) {
  const seit = new Date(Date.now() - ROTATION_TAGE * 86400000).toISOString()
  const rows = await hole(`exercise_bank?profile=eq.${profil}&typ=eq.${TYP}&created_at=gt.${seit}&select=payload`)
  const woerter = new Set()
  const grammatik = new Set()
  for (const r of rows) {
    for (const s of r.payload?.saetze || []) {
      for (const w of s.woerter || []) woerter.add(norm(w))
      for (const g of s.grammatik || []) grammatik.add(norm(g))
    }
  }
  return { woerter, grammatik }
}

/* ---------- Fokus aus dem Lernstand ---------- */
function fokusWaehlen(words, cards, zuletzt) {
  const jetzt = Date.now()
  const proWort = new Map()
  for (const c of cards) {
    const e = proWort.get(c.word_id) ?? { lapses: 0, stab: null, reps: 0 }
    e.lapses = Math.max(e.lapses, c.lapses ?? 0)
    e.reps = Math.max(e.reps, c.reps ?? 0)
    if (c.stab != null) e.stab = e.stab == null ? c.stab : Math.min(e.stab, c.stab)
    proWort.set(c.word_id, e)
  }
  const neu = []
  const wackelig = []
  const reif = []
  for (const w of words) {
    const k = proWort.get(w.id)
    const alter = jetzt - new Date(w.created_at).getTime()
    const ko = norm(w.ko)
    if (!k) continue
    if (alter < 7 * 86400000 && k.reps > 0) neu.push(ko)
    else if (k.lapses >= 1 || (k.stab != null && k.stab < 7)) wackelig.push(ko)
    else if (k.stab != null && k.stab >= 21 && !zuletzt.has(ko)) reif.push(ko)
  }
  const gewaehlt = []
  const nimm = (liste, n) => {
    for (const w of mische(liste)) {
      if (gewaehlt.length >= 8) break
      if (n <= 0) break
      if (gewaehlt.includes(w)) continue
      gewaehlt.push(w)
      n--
    }
  }
  nimm(neu, FOKUS.neu)
  nimm(wackelig, FOKUS.wackelig)
  nimm(reif, FOKUS.reif)
  /* Luecken aus den anderen Toepfen auffuellen, zuletzt Zufall */
  if (gewaehlt.length < 8) nimm([...wackelig, ...neu, ...reif], 8 - gewaehlt.length)
  if (gewaehlt.length < 8) nimm(words.map((w) => norm(w.ko)).filter((k) => !zuletzt.has(k)), 8 - gewaehlt.length)
  return { fokus: gewaehlt, bilanz: `neu ${neu.length} · wackelig ${wackelig.length} · reif ${reif.length}` }
}

/* ---------- Eine Challenge erzeugen, mit Rotation und Pruefung ---------- */
async function erzeugeEine(profil, words, grammatik, zuletzt, fokusInfo, nr) {
  const woerter = words.map((w) => ({ ko: w.ko, en: w.en }))
  for (let versuch = 1; versuch <= MAX_VERSUCHE; versuch++) {
    const szenen = mische(SZENEN).slice(0, 7)
    let res
    try {
      res = await trainer({
        action: 'satzChallengeErzeugen',
        profile: profil,
        woerter,
        grammatik,
        vermeiden: { woerter: [...zuletzt.woerter].slice(0, 120), grammatik: [...zuletzt.grammatik].slice(0, 40) },
        anzahl: 5,
        schwierigkeit: 'mittel',
        wunsch: '',
        szenen,
        fokus: fokusInfo.fokus,
      })
    } catch (e) {
      if (e instanceof Fatal) throw e
      console.error(`  Challenge ${nr}, Versuch ${versuch}: ${e.message}`)
      continue
    }
    const saetze = Array.isArray(res?.saetze) ? res.saetze.slice(0, 5) : []
    if (saetze.length < 3) {
      console.warn(`  Challenge ${nr}, Versuch ${versuch}: nur ${saetze.length} Saetze (${res?.grund ?? '?'})`)
      continue
    }
    /* Ueberlappung mit den letzten zwei Wochen */
    const inhalt = new Set()
    for (const s of saetze) for (const w of s.woerter || []) inhalt.add(norm(w))
    const doppelt = [...inhalt].filter((w) => zuletzt.woerter.has(w))
    const quote = inhalt.size ? doppelt.length / inhalt.size : 0
    const fokusDrin = fokusInfo.fokus.filter((f) => inhalt.has(f))
    console.log(
      `  Challenge ${nr}, Versuch ${versuch}: ${saetze.length} Saetze · Ueberlappung ${(quote * 100).toFixed(0)} % · Fokus ${fokusDrin.length}/${fokusInfo.fokus.length}`
    )
    if (quote > UEBERLAPPUNG_MAX && versuch < MAX_VERSUCHE) {
      console.warn(`    zu viel Wiederholung (${doppelt.slice(0, 6).join(', ')}) — neuer Versuch`)
      continue
    }
    if (fokusDrin.length < Math.ceil(fokusInfo.fokus.length / 2) && versuch < MAX_VERSUCHE) {
      console.warn('    zu wenig Fokus-Woerter — neuer Versuch')
      continue
    }
    for (const s of saetze) console.log(`    ${s.de}`)
    const zeile = await lege({
      profile: profil,
      typ: TYP,
      payload: { saetze, verworfen: res.verworfen || [], fokus: fokusInfo.fokus, szenen, quelle: 'nachtlauf' },
      status: 'neu',
    })
    /* fuer die naechste Challenge desselben Laufs zaehlt das schon als benutzt */
    for (const w of inhalt) zuletzt.woerter.add(w)
    for (const s of saetze) for (const g of s.grammatik || []) zuletzt.grammatik.add(norm(g))
    return zeile
  }
  return null
}

/* ---------- Je Profil ---------- */
async function fuelle(profil) {
  console.log(`\n=== ${profil}: Tages-Challenges auf Vorrat (Ziel ${ZIEL}) ===`)
  const offen = await hole(`exercise_bank?profile=eq.${profil}&typ=eq.${TYP}&status=eq.neu&select=id`)
  const fehlen = Math.max(0, ZIEL - offen.length)
  console.log(`Auf Vorrat: ${offen.length} · fehlen: ${fehlen}`)
  if (!fehlen) return
  const [words, cards, grammatik, zuletzt] = await Promise.all([
    hole(`words?profile=eq.${profil}&select=id,ko,en,created_at`),
    hole(`cards?profile=eq.${profil}&select=word_id,front,stab,lapses,reps`),
    nutzbareGrammatik(profil),
    zuletztBenutzt(profil),
  ])
  if (words.length < 15) {
    console.log('Zu wenige Woerter in der Bibliothek — nichts erzeugt.')
    return
  }
  console.log(`Bibliothek ${words.length} Woerter · Grammatik ${grammatik.length} Muster · zuletzt benutzt ${zuletzt.woerter.size} Woerter`)
  let gelegt = 0
  for (let nr = 1; nr <= fehlen; nr++) {
    const fokusInfo = fokusWaehlen(words, cards, zuletzt.woerter)
    console.log(`  Fokus (${fokusInfo.bilanz}): ${fokusInfo.fokus.join(', ')}`)
    const z = await erzeugeEine(profil, words, grammatik, zuletzt, fokusInfo, nr)
    if (z) gelegt++
  }
  console.log(`${profil}: ${gelegt} von ${fehlen} Challenges gelegt${TROCKEN ? ' (Trockenlauf — NICHTS gespeichert)' : ''}.`)
}

const profile = PROFIL_WAHL === 'beide' ? ['ko', 'de'] : [PROFIL_WAHL]
try {
  for (const p of profile) await fuelle(p)
  console.log('\nok')
} catch (e) {
  if (e instanceof Fatal) {
    console.error(`\n=== ABBRUCH: ${e.message} ===`)
    console.error('  Was bis hierher gelegt wurde, bleibt. Der naechste Lauf macht weiter.')
    console.log('abgebrochen')
  } else throw e
}
