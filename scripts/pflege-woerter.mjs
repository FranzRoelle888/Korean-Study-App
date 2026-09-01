/* ============================================================
   WÖRTER-PFLEGE — nächtliche Daten-Hygiene für die Bibliothek
   (Konzept mit Franz, 01.09.: zwei Verteidigungslinien gegen
   Tippfehler wie "Toillette" — Linie 1 ist der Live-Chip beim
   Eintragen, Linie 2 ist dieser Lauf.)

   Prüft die seit dem LETZTEN Lauf neu eingetragenen Wörter
   (Merker-Zeile in inventory_status; --alle prüft den ganzen
   Bestand — so ersetzt der Lauf auch die einmalige
   Nomen-Bereinigung):
     de-Seite: Rechtschreibung + Artikel + falsche Plurale
     ko-Seite: nur offensichtliche Hangul-Tippfehler

   DIE STELLSCHRAUBE (Entscheidung Franz): Korrigiert wird NUR
   Eindeutiges — Standardwörter mit klarem Fehler. Slang,
   Umgangssprache, Namen, Abkürzungen und alles, was gewollt sein
   könnte, bleibt unangetastet. Lieber einen Fehler eine Nacht
   später erwischen als ein absichtliches Wort verschlimmbessern.

   Stufen (weil hier echte Lerndaten angefasst werden):
     --vorschau   nur auflisten, nichts schreiben, Merker bleibt
     (ohne)       eindeutige Korrekturen anwenden, Merker rücken
   Jede Änderung steht im Protokoll; das Nacht-Backup läuft
   ohnehin vorher (02:30).

   Aufruf: node scripts/pflege-woerter.mjs [--vorschau] [--alle]
           [--profil ko|de|beide]
   Läuft in GitHub Actions (pflege.yml), nachts 03:40.
   ============================================================ */

const SUPABASE_URL = 'https://gkrubhwwzgekmbiltslt.supabase.co'
const DB_KEY = process.env.SUPABASE_SERVICE_KEY
const KI_KEY = process.env.ANTHROPIC_API_KEY
const VORSCHAU = process.argv.includes('--vorschau')
const ALLE = process.argv.includes('--alle')
if (!DB_KEY || !KI_KEY) {
  console.error('SUPABASE_SERVICE_KEY oder ANTHROPIC_API_KEY fehlt.')
  process.exit(1)
}

const argWert = (name) => {
  const i = process.argv.indexOf(name)
  return i === -1 ? null : process.argv[i + 1]
}
const PROFIL_WAHL = argWert('--profil') ?? 'beide'
const MERKER_ID = 'meta-wortpflege-stand'

const dbKopf = {
  apikey: DB_KEY,
  Authorization: `Bearer ${DB_KEY}`,
  'Content-Type': 'application/json',
}

async function dbGet(pfad) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${pfad}`, { headers: dbKopf })
  if (!r.ok) throw new Error(`DB ${r.status}: ${(await r.text()).slice(0, 150)}`)
  return r.json()
}

async function frage(system, nutzer) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': KI_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 4000,
      /* Denk-Token-Bremse — Pflicht bei kleinen Budgets */
      output_config: { effort: 'medium' },
      system: [{ type: 'text', text: system }],
      messages: [{ role: 'user', content: nutzer }],
    }),
  })
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 150)}`)
  const data = await r.json()
  const text = (data.content ?? []).map((c) => c.text ?? '').join('')
  if (!text.trim()) throw new Error(`leere Antwort (stop_reason: ${data.stop_reason})`)
  return JSON.parse(text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim())
}

const SYSTEM_DE = [
  'You are a German lexicon expert cleaning a learner vocabulary list. You get German entries, one per line.',
  'Return ONLY the entries that contain an UNAMBIGUOUS error, with the corrected dictionary form:',
  '- obvious misspelling of a standard word: "Toillette" -> "die Toilette"',
  '- plural of a countable noun entered as the card: "die Lebensmittel" -> "das Lebensmittel"',
  '- noun missing its article or with the wrong article: "Tisch" -> "der Tisch"',
  'For nouns the corrected form is article + singular; for verbs/adjectives the corrected word alone.',
  'BE CONSERVATIVE. Do NOT touch: slang, colloquial words, names, abbreviations, plural-only nouns (die Leute, die Eltern, die Ferien), regional variants, or anything plausibly intentional. When in doubt: leave it out.',
  'Reply with ONLY a JSON array: [{"alt":"<entry exactly as given>","neu":"<corrected>"}] — empty array if nothing is clearly wrong. Never invent entries.',
].join('\n')

const SYSTEM_KO = [
  'You are a Korean lexicon expert cleaning a learner vocabulary list. You get Korean entries, one per line.',
  'Return ONLY entries that are an UNAMBIGUOUS misspelling of a standard Korean word, with the correction.',
  'BE CONSERVATIVE. Do NOT touch: slang, colloquial forms, names, short phrases that are fine, or anything plausibly intentional. When in doubt: leave it out.',
  'Reply with ONLY a JSON array: [{"alt":"<entry exactly as given>","neu":"<corrected>"}] — empty array if nothing is clearly wrong. Never invent entries.',
].join('\n')

/* Sieht die Korrektur wie ein plausibler Eintrag aus? */
function plausibel(profil, neu) {
  if (!neu || neu.length > 60) return false
  if (profil === 'de') return /^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß -]*$/.test(neu)
  return /[가-힣]/.test(neu)
}

let geaendertGesamt = 0
let vorschlaegeGesamt = 0
let fehlerGesamt = 0

async function pflegeProfil(profil) {
  console.log(`\n=== Profil ${profil} ===`)

  /* Merker: bis wann wurde schon geprüft? */
  const merkerZeilen = await dbGet(
    `inventory_status?profile=eq.${profil}&item_id=eq.${MERKER_ID}&select=label`
  )
  const stand = merkerZeilen[0]?.label ?? '1970-01-01T00:00:00Z'
  const filter = ALLE ? '' : `&created_at=gt.${encodeURIComponent(stand)}`
  const woerter = await dbGet(
    `words?profile=eq.${profil}&select=id,ko,created_at${filter}&order=created_at.asc`
  )
  console.log(
    ALLE
      ? `${woerter.length} Wörter (kompletter Bestand) werden geprüft.`
      : `${woerter.length} neue Wörter seit ${stand.slice(0, 16)} werden geprüft.`
  )
  if (!woerter.length) return

  /* in Häppchen prüfen */
  const vorschlaege = []
  for (let von = 0; von < woerter.length; von += 50) {
    const gruppe = woerter.slice(von, von + 50)
    const antwort = await frage(
      profil === 'de' ? SYSTEM_DE : SYSTEM_KO,
      gruppe.map((w) => String(w.ko).trim()).join('\n')
    )
    for (const a of Array.isArray(antwort) ? antwort : []) {
      const alt = String(a.alt ?? '').trim()
      const neu = String(a.neu ?? '').trim()
      const zeile = gruppe.find((w) => String(w.ko).trim() === alt)
      if (zeile && neu !== alt && plausibel(profil, neu)) {
        vorschlaege.push({ id: zeile.id, alt, neu })
      }
    }
  }

  vorschlaegeGesamt += vorschlaege.length
  if (!vorschlaege.length) {
    console.log('Alles sauber — nichts zu korrigieren.')
  } else {
    console.log(`${vorschlaege.length} Korrekturen:`)
    for (const v of vorschlaege) console.log(`  ${v.alt}  ->  ${v.neu}`)
  }

  if (VORSCHAU) return

  /* anwenden: Zeile für Zeile per id — nichts Pauschales */
  for (const v of vorschlaege) {
    const up = await fetch(`${SUPABASE_URL}/rest/v1/words?id=eq.${v.id}&profile=eq.${profil}`, {
      method: 'PATCH',
      headers: { ...dbKopf, Prefer: 'return=minimal' },
      body: JSON.stringify({ ko: v.neu }),
    })
    if (up.ok) geaendertGesamt++
    else {
      fehlerGesamt++
      console.warn(`  Fehler bei "${v.alt}": ${up.status}`)
    }
  }

  /* Merker rücken (nur bei anwendenden Läufen — nach einer reinen
     Vorschau sollen dieselben Wörter nachts nochmal geprüft werden) */
  const jetzt = new Date().toISOString()
  await fetch(`${SUPABASE_URL}/rest/v1/inventory_status?on_conflict=profile,item_id`, {
    method: 'POST',
    headers: { ...dbKopf, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([
      { profile: profil, item_id: MERKER_ID, kind: 'meta', status: 'meta', label: jetzt, source: 'pflege' },
    ]),
  })
}

const profile = PROFIL_WAHL === 'beide' ? ['de', 'ko'] : [PROFIL_WAHL]
for (const p of profile) await pflegeProfil(p)

console.log(
  `\nFertig: ${vorschlaegeGesamt} Vorschläge, ${geaendertGesamt} angewendet${VORSCHAU ? ' (Vorschau — nichts geschrieben)' : ''}, ${fehlerGesamt} Fehler.`
)
if (fehlerGesamt > 0) process.exit(1)
console.log('ok')
