/* ============================================================
   WIEDERHERSTELLUNG aus einer Sicherung (Notfall-Werkzeug)

   Spielt die JSON-Dateien einer Sicherung in ein Supabase-Projekt
   zurück — gedacht für ein FRISCHES Projekt (nach Totalverlust)
   oder gezielt nach einem Missgeschick. Vorher müssen dort die
   Migrationen aus supabase/migrations/ gelaufen sein.

   Bewusst umständlich aufrufbar, damit es nie versehentlich
   passiert:

     RESTORE_ZIEL_URL=https://<projekt>.supabase.co \
     RESTORE_SERVICE_KEY=<service-key des ZIELS> \
     RESTORE_BESTAETIGUNG=JA \
     node scripts/wiederherstellen.mjs <ordner-mit-json-dateien>

   Upsert auf die id: mehrfaches Ausführen ist ungefährlich,
   vorhandene Zeilen werden aktualisiert statt doppelt angelegt.
   Es wird NIE etwas gelöscht.
   ============================================================ */
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const URL_ZIEL = process.env.RESTORE_ZIEL_URL
const KEY = process.env.RESTORE_SERVICE_KEY
const ORDNER = process.argv[2]

if (process.env.RESTORE_BESTAETIGUNG !== 'JA' || !URL_ZIEL || !KEY || !ORDNER) {
  console.error(
    'Fehlende Angaben. Nötig: RESTORE_ZIEL_URL, RESTORE_SERVICE_KEY,\n' +
      'RESTORE_BESTAETIGUNG=JA und der Sicherungs-Ordner als Argument.\n' +
      'Anleitung: docs/DATENSICHERUNG.md'
  )
  process.exit(1)
}

const TABELLEN = [
  'words',
  'cards',
  'daily_log',
  'skills',
  'sessions',
  'inventory_status',
  'trainer_usage',
  'speech_usage',
]

/* daily_log hat einen zusammengesetzten Schlüssel statt id */
const KONFLIKT = { daily_log: 'profile,day', inventory_status: 'profile,item_id' }

for (const tabelle of TABELLEN) {
  const datei = path.join(ORDNER, `${tabelle}.json`)
  if (!existsSync(datei)) {
    console.log(`${tabelle}: keine Datei — übersprungen`)
    continue
  }
  const zeilen = JSON.parse(readFileSync(datei, 'utf8'))
  const SCHUB = 500
  let ok = 0
  for (let i = 0; i < zeilen.length; i += SCHUB) {
    const teil = zeilen.slice(i, i + SCHUB)
    const konflikt = KONFLIKT[tabelle] ?? 'id'
    const r = await fetch(
      `${URL_ZIEL}/rest/v1/${tabelle}?on_conflict=${encodeURIComponent(konflikt)}`,
      {
        method: 'POST',
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(teil),
      }
    )
    if (!r.ok) {
      console.error(`${tabelle} (ab Zeile ${i}): HTTP ${r.status} ${(await r.text()).slice(0, 200)}`)
      process.exit(1)
    }
    ok += teil.length
  }
  console.log(`${tabelle}: ${ok} Zeilen eingespielt`)
}
console.log('Fertig. Bitte in der App gegenprüfen (Wortanzahl, Kalender, Skills).')
