/* ============================================================
   TÄGLICHE DATENSICHERUNG (Konzept: docs/DATENSICHERUNG.md)

   Exportiert alle Lern-Tabellen aus Supabase als JSON-Dateien
   in den Ordner BACKUP_DIR (das ausgecheckte private
   Backup-Repo). Jede Nacht ein Commit = eine Zeitmaschine:
   jeder Stand der letzten Monate bleibt wiederherstellbar.

   Schrumpf-Wächter: Ist eine Tabelle gegenüber der letzten
   Sicherung deutlich kleiner geworden (Hinweis auf versehentliches
   Löschen oder einen Bug), wird TROTZDEM gesichert (Git-Historie
   bewahrt ja den alten Stand), aber eine WARNUNG.txt geschrieben —
   der Workflow schlägt dann rot an und GitHub schickt eine Mail.

   Läuft in GitHub Actions (.github/workflows/backup.yml) mit dem
   Secret SUPABASE_SERVICE_KEY. Nebeneffekt: Der tägliche Zugriff
   hält das Supabase-Projekt aktiv (Gratis-Projekte werden nach
   längerer Inaktivität pausiert).
   ============================================================ */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import path from 'node:path'

const SUPABASE_URL = 'https://gkrubhwwzgekmbiltslt.supabase.co'
const KEY = process.env.SUPABASE_SERVICE_KEY
const ZIEL = process.env.BACKUP_DIR || 'backup-lokal'
if (!KEY) {
  console.error('SUPABASE_SERVICE_KEY fehlt.')
  process.exit(1)
}

/* Alle Tabellen mit echten Lerndaten. Die reinen Nutzungs-Logs
   (trainer_usage, speech_usage) sichern wir mit — sie sind klein
   und für Kosten-Analysen nützlich. */
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

/* Tabellen, bei denen Schrumpfen normal sein KANN (Logs rotieren
   nie, Lerndaten schon mal durch bewusstes Aufräumen) — bei diesen
   Kern-Tabellen schlagen wir trotzdem streng Alarm: */
const STRENG = ['words', 'cards', 'daily_log', 'skills', 'inventory_status']

async function holeAlles(tabelle) {
  const zeilen = []
  const SEITE = 1000
  for (let von = 0; ; von += SEITE) {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/${tabelle}?select=*&order=created_at.asc.nullslast&limit=${SEITE}&offset=${von}`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
    )
    if (!r.ok) throw new Error(`${tabelle}: HTTP ${r.status} ${(await r.text()).slice(0, 120)}`)
    const teil = await r.json()
    zeilen.push(...teil)
    if (teil.length < SEITE) break
  }
  return zeilen
}

mkdirSync(ZIEL, { recursive: true })
const warnungen = []
const zusammenfassung = []

for (const tabelle of TABELLEN) {
  const zeilen = await holeAlles(tabelle)
  const datei = path.join(ZIEL, `${tabelle}.json`)

  /* Schrumpf-Wächter: mit der letzten Sicherung vergleichen */
  let vorher = null
  if (existsSync(datei)) {
    try {
      vorher = JSON.parse(readFileSync(datei, 'utf8')).length
    } catch {
      /* kaputte Alt-Datei — einfach überschreiben */
    }
  }
  if (
    STRENG.includes(tabelle) &&
    vorher !== null &&
    zeilen.length < vorher &&
    vorher - zeilen.length > Math.max(5, vorher * 0.2)
  ) {
    warnungen.push(
      `${tabelle}: ${vorher} -> ${zeilen.length} Zeilen (−${vorher - zeilen.length}!). ` +
        `Der alte Stand liegt in der Git-Historie dieser Datei.`
    )
  }

  writeFileSync(datei, JSON.stringify(zeilen, null, 1), 'utf8')
  zusammenfassung.push(`${tabelle}: ${zeilen.length} Zeilen`)
}

/* Nie eine LEERE Sicherung über eine volle schreiben: Wenn words
   plötzlich 0 Zeilen hat, stimmt fast sicher etwas mit dem Zugriff
   nicht — dann lieber laut scheitern. */
const woerter = JSON.parse(readFileSync(path.join(ZIEL, 'words.json'), 'utf8'))
if (woerter.length === 0) {
  console.error('ABBRUCH-VERDACHT: words ist leer — bitte Zugriff prüfen.')
  warnungen.push('words kam mit 0 Zeilen zurück — Sicherung prüfen!')
}

const warnDatei = path.join(ZIEL, 'WARNUNG.txt')
if (warnungen.length) {
  writeFileSync(
    warnDatei,
    `Sicherung vom ${new Date().toISOString()}\n\n${warnungen.join('\n')}\n`,
    'utf8'
  )
} else if (existsSync(warnDatei)) {
  rmSync(warnDatei)
}

writeFileSync(
  path.join(ZIEL, 'STAND.txt'),
  `Letzte Sicherung: ${new Date().toISOString()}\n${zusammenfassung.join('\n')}\n`,
  'utf8'
)
console.log(zusammenfassung.join('\n'))
console.log(warnungen.length ? 'MIT WARNUNGEN:\n' + warnungen.join('\n') : 'ok — keine Auffälligkeiten')
