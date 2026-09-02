/* ============================================================
   SANDBOX BEFÜLLEN — Kopie der de-Seite ins sb-Profil
   (Wunsch Franz 03.09.: folgenfrei testen, bevor 해인 etwas sieht)

   Sicherheits-Konstruktion:
   - GELESEN wird nur von 'de' (읽기 — verändert nichts).
   - GESCHRIEBEN und GELÖSCHT wird ausschließlich in 'sb' —
     jede Lösch-/Schreib-Query trägt profile=eq.sb fest im Pfad.
     해인s Daten können von diesem Skript nicht angefasst werden.
   - Wörter/Karten bekommen NEUE IDs (die Tabellen teilen sich
     den Platz; gleiche IDs würden kollidieren). word_id-Verweise
     der Karten werden dabei sauber umgehängt.

   Kopiert: words, cards, inventory_status, daily_log.
   Bewusst NICHT kopiert: sessions/skills (Trainer-Gedächtnis),
   a2_belege (Radar soll im Test bei null anfangen), Logs.

   Aufruf: node scripts/fuelle-sandbox.mjs
   Läuft in GitHub Actions (sandbox.yml).
   ============================================================ */

const SUPABASE_URL = 'https://gkrubhwwzgekmbiltslt.supabase.co'
const DB_KEY = process.env.SUPABASE_SERVICE_KEY
if (!DB_KEY) {
  console.error('SUPABASE_SERVICE_KEY fehlt.')
  process.exit(1)
}

const kopf = {
  apikey: DB_KEY,
  Authorization: `Bearer ${DB_KEY}`,
  'Content-Type': 'application/json',
}

async function hole(pfad) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${pfad}`, { headers: kopf })
  if (!r.ok) throw new Error(`GET ${pfad}: ${r.status}`)
  return r.json()
}

async function loescheSb(tabelle) {
  /* profile=eq.sb steht FEST im Pfad — mehr kann nicht weg */
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${tabelle}?profile=eq.sb`, {
    method: 'DELETE',
    headers: kopf,
  })
  if (!r.ok) throw new Error(`DELETE sb ${tabelle}: ${r.status}`)
}

async function schreibe(tabelle, zeilen) {
  for (let von = 0; von < zeilen.length; von += 200) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${tabelle}`, {
      method: 'POST',
      headers: { ...kopf, Prefer: 'return=minimal' },
      body: JSON.stringify(zeilen.slice(von, von + 200)),
    })
    if (!r.ok) throw new Error(`INSERT ${tabelle}: ${r.status} ${(await r.text()).slice(0, 120)}`)
  }
}

const alsSb = ({ id: _id, created_at: _c, ...rest }) => ({ ...rest, profile: 'sb' })

/* ---------- Wörter (neue IDs, Verweis-Karte fürs Umhängen) ---------- */
const woerter = await hole('words?profile=eq.de&select=*')
const idNeu = new Map(woerter.map((w) => [w.id, crypto.randomUUID()]))
await loescheSb('cards')
await loescheSb('words')
await schreibe(
  'words',
  woerter.map((w) => ({ ...alsSb(w), id: idNeu.get(w.id), created_at: w.created_at }))
)
console.log(`words: ${woerter.length} kopiert`)

/* ---------- Karten (neue IDs + word_id umgehängt) ---------- */
const karten = await hole('cards?profile=eq.de&select=*')
const kartenSb = karten
  .filter((c) => idNeu.has(c.word_id))
  .map((c) => ({ ...alsSb(c), id: crypto.randomUUID(), word_id: idNeu.get(c.word_id) }))
await schreibe('cards', kartenSb)
console.log(`cards: ${kartenSb.length} kopiert`)

/* ---------- Lernstand + Streak-Kalender ---------- */
for (const tabelle of ['inventory_status', 'daily_log']) {
  const zeilen = await hole(`${tabelle}?profile=eq.de&select=*`)
  await loescheSb(tabelle)
  await schreibe(tabelle, zeilen.map(alsSb))
  console.log(`${tabelle}: ${zeilen.length} kopiert`)
}

console.log('\nSandbox frisch befüllt — Test unter ?lang=sb')
console.log('ok')
