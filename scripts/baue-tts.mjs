/* ============================================================
   TTS-VORRAT — alle Vokabel-Audios vorab erzeugen
   (Wunsch 해인/Franz 31.08.: null Latenz beim Lautsprecher-Knopf)

   Erzeugt für jedes Wort und jeden Beispielsatz das MP3 genau so,
   wie es die App live erzeugen würde, und legt es in den
   tts-cache-Bucket. Die App findet es dann sofort (Cache-Treffer)
   — kein Warten mehr. Läuft einmalig bzw. bei Bedarf neu; was
   schon im Cache liegt, wird übersprungen (HEAD-Check), der Lauf
   kostet beim zweiten Mal also nichts.

   WICHTIG: Hash, Pfad, Modell, Stimme und Instructions müssen
   EXAKT zu src/shared/tts.jsx + supabase/functions/speech passen —
   sonst entstehen Dateien, die die App nie findet.

   Quellen:
     - words-Tabelle beider Profile (Wort + Beispielsatz ex)
     - Nachziehstapel (koreanPool/germanPool: Wort + ex)
     - große Wort-Inventare (topik1/goethe) — Wort-Ideen der
       Schreibwerkstatt u. ä.

   Aufruf: node scripts/baue-tts.mjs [--dry] [--profil ko|de|beide]
   Läuft in GitHub Actions (tts.yml); braucht die Secrets
   SUPABASE_SERVICE_KEY und OPENAI_API_KEY.
   ============================================================ */
import { readFileSync } from 'node:fs'

const SUPABASE_URL = 'https://gkrubhwwzgekmbiltslt.supabase.co'
const DB_KEY = process.env.SUPABASE_SERVICE_KEY
const OPENAI_KEY = process.env.OPENAI_API_KEY
const TROCKEN = process.argv.includes('--dry')
if (!DB_KEY || !OPENAI_KEY) {
  console.error('SUPABASE_SERVICE_KEY oder OPENAI_API_KEY fehlt.')
  process.exit(1)
}

const argWert = (name) => {
  const i = process.argv.indexOf(name)
  return i === -1 ? null : process.argv[i + 1]
}
const PROFIL_WAHL = argWert('--profil') ?? 'beide'

/* ---- muss zu tts.jsx / speech-Function passen ---- */
const CACHE_VERSION = 'v1'
const TTS_MODEL = 'gpt-4o-mini-tts'
const VOICES = { ko: 'nova', de: 'echo' }
const INSTRUCTIONS = {
  ko: 'Speak this Korean text clearly and naturally, at a comfortable pace for a language learner. Standard Seoul pronunciation.',
  de: 'Speak this German text clearly and naturally, at a comfortable pace for a language learner. Standard High German pronunciation.',
}
const GLEICHZEITIG = 4 /* parallele Erzeugungen — schonend fürs OpenAI-Limit */

const dbKopf = { apikey: DB_KEY, Authorization: `Bearer ${DB_KEY}` }

async function sha256Hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/* Pool-Dateien sind ES-Module mit einem export const — für das
   Skript reicht es, die Objekt-Literale herauszuschneiden */
function lesePool(pfad, exportName) {
  const quelle = readFileSync(pfad, 'utf8')
  const start = quelle.indexOf(`export const ${exportName}`)
  const klammerAuf = quelle.indexOf('[', start)
  let tiefe = 0
  for (let i = klammerAuf; i < quelle.length; i++) {
    if (quelle[i] === '[') tiefe++
    if (quelle[i] === ']') tiefe--
    if (tiefe === 0) {
      /* eval statt JSON.parse: die Datei nutzt JS-Literale
         (unquoted keys). Eigene Repo-Datei, kein Fremd-Input. */
      return (0, eval)(quelle.slice(klammerAuf, i + 1))
    }
  }
  throw new Error(`Pool ${exportName} nicht lesbar`)
}

/* ---------- Texte je Sprache einsammeln ---------- */
async function sammleTexte(profil) {
  const lang = profil /* ko-Profil lernt Koreanisch, de Deutsch */
  const texte = new Set()
  const nimm = (t) => {
    const s = (t ?? '').trim()
    if (s && s.length <= 300) texte.add(s)
  }

  /* eigener Stapel: Wort + Beispielsatz */
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/words?profile=eq.${profil}&select=ko,ex`,
    { headers: dbKopf }
  )
  if (!r.ok) throw new Error(`DB ${r.status}`)
  for (const w of await r.json()) {
    nimm(w.ko)
    nimm(w.ex)
  }

  /* Nachziehstapel */
  const pool =
    profil === 'ko'
      ? lesePool('src/core/koreanPool.js', 'koreanPool')
      : lesePool('src/core/germanPool.js', 'germanPool')
  for (const e of pool) {
    nimm(e.ko)
    nimm(e.ex)
  }

  /* Redemittel-Bank (Formel + Beispielsatz) — nur de-Seite */
  if (profil !== 'ko') {
    const pakete = lesePool('src/features/a2/redemittel.js', 'REDEMITTEL_PAKETE')
    for (const p of pakete) {
      for (const f of p.formeln ?? []) {
        nimm(f.de)
        nimm(f.beispiel)
      }
    }
    /* Zahlen-Diktat: feste Sätze, einmal vertont = für immer da */
    for (const z of lesePool('src/features/a2/zahlen.js', 'ZAHLEN_SAETZE')) {
      nimm(z.satz)
    }
  }

  /* große Inventare (Wort-Ideen der Schreibwerkstatt) */
  if (profil === 'ko') {
    const inv = JSON.parse(readFileSync('src/core/inventare/topik1-woerter.json', 'utf8'))
    for (const e of inv) nimm(e.ko)
  } else {
    const inv = JSON.parse(readFileSync('src/core/inventare/goethe-woerter.json', 'utf8'))
    for (const e of inv) nimm(e.artikel ? `${e.artikel} ${e.de}` : e.de)
  }

  return { lang, texte: [...texte] }
}

/* ---------- ein Text -> Cache ---------- */
let erzeugt = 0
let uebersprungen = 0
let fehler = 0
let zeichen = 0

async function baueEinen(text, lang) {
  const voice = VOICES[lang]
  const pfad = `${CACHE_VERSION}/${lang}/${voice}/${await sha256Hex(text)}.mp3`
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/tts-cache/${pfad}`

  const kopf = await fetch(publicUrl, { method: 'HEAD' })
  if (kopf.ok) {
    uebersprungen++
    return
  }
  if (TROCKEN) {
    erzeugt++
    zeichen += text.length
    return
  }

  const r = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: TTS_MODEL,
      voice,
      input: text,
      response_format: 'mp3',
      instructions: INSTRUCTIONS[lang],
    }),
  })
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 120)}`)
  const mp3 = new Uint8Array(await r.arrayBuffer())

  const up = await fetch(`${SUPABASE_URL}/storage/v1/object/tts-cache/${pfad}`, {
    method: 'POST',
    headers: { ...dbKopf, 'Content-Type': 'audio/mpeg', 'x-upsert': 'true' },
    body: mp3,
  })
  if (!up.ok) throw new Error(`Storage ${up.status}`)
  erzeugt++
  zeichen += text.length
}

/* ---------- Hauptlauf ---------- */
const profile = PROFIL_WAHL === 'beide' ? ['ko', 'de'] : [PROFIL_WAHL]
for (const profil of profile) {
  const { lang, texte } = await sammleTexte(profil)
  console.log(`\n=== Profil ${profil}: ${texte.length} Texte (${lang}, Stimme ${VOICES[lang]}) ===`)
  for (let von = 0; von < texte.length; von += GLEICHZEITIG) {
    await Promise.all(
      texte.slice(von, von + GLEICHZEITIG).map((t) =>
        baueEinen(t, lang).catch((e) => {
          fehler++
          if (fehler <= 10) console.warn(`Fehler bei "${t.slice(0, 30)}": ${e.message}`)
        })
      )
    )
    if ((von / GLEICHZEITIG) % 25 === 0 && von > 0) {
      console.log(`  … ${von}/${texte.length} (neu: ${erzeugt}, im Cache: ${uebersprungen})`)
    }
  }
}

/* Grobe Kosten: gpt-4o-mini-tts ≈ 12 $ pro 1M Audio-Token,
   ein Zeichen erzeugt größenordnungsmäßig ~1-2 Audio-Token */
const kosten = ((zeichen * 1.5) / 1_000_000) * 12
console.log(
  `\nFertig: ${erzeugt} neu erzeugt, ${uebersprungen} lagen schon im Cache, ${fehler} Fehler.` +
    `\n~${zeichen} Zeichen -> grob ${kosten.toFixed(2)} $ OpenAI-Kosten${TROCKEN ? ' (Trockenlauf, nichts erzeugt)' : ''}.`
)
if (fehler > 0 && erzeugt === 0 && !TROCKEN) {
  console.error('ABBRUCH: nur Fehler, nichts erzeugt.')
  process.exit(1)
}
console.log('ok')
