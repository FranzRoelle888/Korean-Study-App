/* ============================================================
   VOKABELN ANREICHERN — Inhalte für den Vokabel-Motor V2
   (Konzept docs/VOKABEL-KONZEPT.md §6; läuft in GitHub Actions)

   Was der Lauf tut (Profil ko):
     1. BESTAND: Franz' vorhandene Wörter bekommen die fehlenden
        Felder — deutsche Bedeutung (de), Nuance, Hanja-Bausteine,
        Wortart (pos), Inventar-Bezug (inv_id, rang), Beispielsatz
        nur dort, wo noch keiner steht. Es wird NUR in leere Felder
        geschrieben, en und ko nie angefasst.
     2. VORRAT: die nächsten N Inventarwörter (Häufigkeitsrang,
        ohne Zahlwörter, ohne alles, was schon in der Bibliothek
        steht) landen angereichert in der Tabelle vorrat. Nur
        Wörter mit bereit=true darf die App später einführen.
     3. AUDIO-CHECK (--audio): prüft, ob Wort- und Satz-Audio im
        TTS-Cache liegen (das erzeugt baue-tts.mjs), und setzt
        audio_ok. Läuft im Workflow NACH baue-tts.
     4. BERICHT (--bericht): Wortart-Verteilung der nächsten 300
        Vorratswörter — Grundlage für Franz' Tagesrotation.

   Hanja-Sicherheit (Konzept §6.2): Das Modell WÄHLT keine Zeichen.
   Es bekommt die Hanja aus dem Inventar vorgegeben (688 Wörter)
   und liefert je Zeichen nur Lesung + deutsche Bedeutung. Das
   Skript prüft: Zeichen stimmen mit der Vorgabe überein, jede
   Lesung ist eine Silbe des Wortes, in der richtigen Reihenfolge.
   Fällt das durch -> hanja bleibt leer, Wort steht in der
   Prüfliste im Protokoll. Wörter ohne Inventar-Hanja bekommen
   NIE eine Hanja-Zeile.

   Aufruf: node scripts/vokabeln-anreichern.mjs
             [--dry] [--anzahl 300] [--profil ko] [--audio] [--bericht]
   Secrets: ANTHROPIC_API_KEY, SUPABASE_SERVICE_KEY (nur in Actions).
   ============================================================ */
import { readFileSync } from 'node:fs'

const SUPABASE_URL = 'https://gkrubhwwzgekmbiltslt.supabase.co'
const DB_KEY = process.env.SUPABASE_SERVICE_KEY
const API_KEY = process.env.ANTHROPIC_API_KEY
const MODEL = 'claude-sonnet-5'

const argWert = (name) => {
  const i = process.argv.indexOf(name)
  return i === -1 ? null : process.argv[i + 1]
}
/* --probe: Qualitäts-Stichprobe für ein paar Cent — nur 5 Bestands-
   und 5 Vorratswörter, nichts wird geschrieben */
const PROBE = process.argv.includes('--probe')
const TROCKEN = process.argv.includes('--dry') || PROBE
const NUR_AUDIO = process.argv.includes('--audio')
const NUR_BERICHT = process.argv.includes('--bericht')
const NUR_NUANCEN = process.argv.includes('--nuancen')
const ANZAHL = Number(argWert('--anzahl') ?? 300)
const PROFIL = argWert('--profil') ?? 'ko'
/* Der Motor gilt nur für Franz' Seite. Ein Tippfehler im Workflow
   darf nie in 해인s Daten schreiben. */
if (PROFIL !== 'ko') {
  console.error(`Profil "${PROFIL}" ist für den Vokabel-Motor nicht vorgesehen — nur ko.`)
  process.exit(1)
}
if (!DB_KEY) {
  console.error('SUPABASE_SERVICE_KEY fehlt.')
  process.exit(1)
}
if (!API_KEY && !NUR_AUDIO && !NUR_BERICHT) {
  console.error('ANTHROPIC_API_KEY fehlt.')
  process.exit(1)
}

/* Wörter je Modellanfrage — klein genug, dass die Antwort nie
   abgeschnitten wird, groß genug, dass der Lauf nicht ewig dauert */
const BATCH = 20

/* muss zu baue-tts.mjs / tts.jsx passen (Cache-Pfad) */
const CACHE_VERSION = 'v1'
const STIMME_KO = 'nova'

/* ---------- Supabase ---------- */
const kopf = {
  apikey: DB_KEY,
  Authorization: `Bearer ${DB_KEY}`,
  'Content-Type': 'application/json',
}
/* Vorübergehende Abweisungen abfangen (Fund Franz 06.09.: 401
   „JWT issued at future" — die Server-Uhr hing kurz hinter dem
   Schlüssel; Minuten später ging es wieder). Bis zu 4 Versuche mit
   wachsender Pause, danach erst der echte Fehler. */
const pause = (ms) => new Promise((r) => setTimeout(r, ms))
async function mitWiederholung(name, aufruf) {
  let letzter
  for (let versuch = 1; versuch <= 4; versuch++) {
    const r = await aufruf()
    if (r.ok) return r
    const text = await r.text()
    letzter = new Error(`${name}: ${r.status} ${text.slice(0, 200)}`)
    const voruebergehend = (r.status === 401 && text.includes('JWT')) || r.status >= 500 || r.status === 429
    if (!voruebergehend || versuch === 4) break
    const warte = versuch * 20_000
    console.warn(`  ${name}: ${r.status} — neuer Versuch in ${warte / 1000} s`)
    await pause(warte)
  }
  throw letzter
}
async function hole(pfad) {
  const r = await mitWiederholung(`GET ${pfad.slice(0, 60)}`, () =>
    fetch(`${SUPABASE_URL}/rest/v1/${pfad}`, { headers: kopf })
  )
  return r.json()
}
async function patche(tabelle, filter, felder) {
  if (TROCKEN) return
  await mitWiederholung(`PATCH ${tabelle}`, () =>
    fetch(`${SUPABASE_URL}/rest/v1/${tabelle}?${filter}`, {
      method: 'PATCH',
      headers: { ...kopf, Prefer: 'return=minimal' },
      body: JSON.stringify(felder),
    })
  )
}
async function upserteVorrat(zeilen) {
  if (TROCKEN || !zeilen.length) return
  const r = await fetch(`${SUPABASE_URL}/rest/v1/vorrat?on_conflict=profile,inv_id`, {
    method: 'POST',
    headers: { ...kopf, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(zeilen),
  })
  if (!r.ok) throw new Error(`UPSERT vorrat: ${r.status} ${await r.text()}`)
}

/* ---------- Modell ---------- */
async function frage(system, nutzer, maxTokens = 6000) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      /* kein tiefes Grübeln nötig — und Denk-Tokens zählen gegen
         max_tokens (Lehre aus dem Übersetzungs-Vorschlag) */
      output_config: { effort: 'medium' },
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: nutzer }],
    }),
  })
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 200)}`)
  const daten = await r.json()
  tokensRein += daten.usage?.input_tokens ?? 0
  tokensRaus += daten.usage?.output_tokens ?? 0
  const text = (daten.content ?? []).map((c) => c.text ?? '').join('')
  const roh = text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim()
  return JSON.parse(roh)
}
let tokensRein = 0
let tokensRaus = 0

/* ---------- Hilfen ---------- */
const norm = (s) => String(s ?? '').normalize('NFC').trim().replace(/\s+/g, ' ')
const silben = (s) => [...norm(s)].filter((c) => /[가-힣]/.test(c))
const istHangul = (c) => /^[가-힣]$/.test(c)
/* Inventar-Hanja nach NFKC: Kompatibilitätszeichen (z. B. 女 als
   U+F981) werden zu den normalen Zeichen; '-' markiert native
   Silben (강하다 = "强-") */
const hanjaZeichen = (vorgabe) =>
  [...String(vorgabe ?? '').normalize('NFKC')].filter((c) => /[㐀-鿿]/.test(c))

const POS_ERLAUBT = ['noun', 'verb', 'adj', 'adv', 'pronoun', 'determiner', 'interjection', 'phrase']

/* ---------- Prüfung der Modellantwort ----------
   Grundsatz wie in fill-extras: lieber ein Feld auslassen als
   etwas Falsches speichern. Was durchfällt, wird beim nächsten
   Lauf erneut versucht (Feld bleibt leer / bereit=false). */
const pruefliste = []

function pruefeText(s, min, max, muster) {
  if (typeof s !== 'string') return null
  const t = norm(s)
  if (t.length < min || t.length > max) return null
  if (muster && !muster.test(t)) return null
  return t
}

/* Beispielsatz: enthält den Wortstamm, 해요체, 3–12 Wörter */
function pruefeSatz(ex, ko, pos) {
  const t = pruefeText(ex, 4, 90)
  if (!t) return null
  const woerter = t.split(' ').length
  if (woerter < 3 || woerter > 12) return null
  /* Höfliche -요-Form (oder Frage -까): feste Sprechebene */
  if (!/(요|죠|까)[.!?…]*$/.test(t)) return null
  /* Stamm: 먹다 -> 먹, 공부하다 -> 공부 (해요 verändert 하) */
  let stamm = norm(ko)
  if ((pos === 'verb' || pos === 'adj') && stamm.endsWith('다')) {
    stamm = stamm.slice(0, -1)
    if (stamm.endsWith('하') && stamm.length > 1) stamm = stamm.slice(0, -1)
    if (!enthaeltStamm(t, stamm)) return null
    return t
  }
  if (!stamm || !t.includes(stamm)) return null
  return t
}

/* Silbe ohne Endkonsonanten: 덥 -> 더, 들 -> 드 (Hangul-Rechnung:
   28 Endkonsonanten je Vokal-Block) */
function ohneEnd(c) {
  const code = c.codePointAt(0) - 0xac00
  if (code < 0 || code > 11171) return c
  return String.fromCodePoint(0xac00 + code - (code % 28))
}
/* Unregelmäßige Verben verändern die letzte Stammsilbe:
   덥다 -> 더워요, 듣다 -> 들어요, 모르다 -> 몰라요, 돕다 -> 도와요.
   Deshalb: erst genau, dann letzte Silbe nur bis zum Vokal
   vergleichen, dann dasselbe eine Silbe kürzer (르-Verben). */
function enthaeltStamm(satz, stamm) {
  if (!stamm) return false
  if (satz.includes(stamm)) return true
  const pruefe = (s) => {
    const vorne = s.slice(0, -1)
    const basis = ohneEnd(s.at(-1))
    for (let i = 0; i + s.length <= satz.length; i++) {
      if (satz.startsWith(vorne, i) && ohneEnd(satz[i + vorne.length]) === basis) return true
    }
    return false
  }
  if (pruefe(stamm)) return true
  return stamm.length >= 2 && pruefe(stamm.slice(0, -1))
}

function pruefeHanja(antwort, vorgabe, ko) {
  const zeichen = hanjaZeichen(vorgabe)
  if (!zeichen.length) return null /* kein Inventar-Hanja -> nie eine Zeile */
  if (!Array.isArray(antwort) || antwort.length !== zeichen.length) return 'fehler'
  const sil = silben(ko)
  const raus = []
  let ab = 0
  for (let k = 0; k < zeichen.length; k++) {
    const e = antwort[k] ?? {}
    const z = String(e.z ?? '').normalize('NFKC')
    const les = norm(e.les)
    const de = pruefeText(e.de, 1, 30)
    if (z !== zeichen[k] || !istHangul(les) || !de) return 'fehler'
    /* Lesung muss als Silbe des Wortes vorkommen — in Reihenfolge */
    const i = sil.indexOf(les, ab)
    if (i === -1) return 'fehler'
    ab = i + 1
    raus.push({ z, les, de, i })
  }
  return raus
}

/* ---------- Prompt ---------- */
const SYSTEM = [
  'You enrich Korean vocabulary entries for a German learner (native German, fluent English) who studies Korean with English as primary gloss.',
  'For each entry you receive: id | korean | english gloss (may be long, may be empty) | pos (may be empty) | hanja (given characters, or "-") | needsExample (yes/no).',
  'Return ONLY a JSON array, one object per id, with exactly these keys:',
  '  "id": copy',
  '  "en": short dictionary gloss, 1-3 English words ("thing", "to eat", "spicy"). If the given gloss is already short, keep it.',
  '  "de": short German gloss, 1-3 words, everyday German, nouns WITHOUT article ("Ding", "essen", "scharf").',
  '  "pos": one of noun, verb, adj, adv, pronoun, determiner, interjection, phrase. If pos was given, copy it.',
  '  "nuance": null in most cases. Only when a learner NEEDS it: a usage restriction, politeness level, or a classic confusion — max 60 characters, in German, no full sentence needed ("nur Trinkwasser, nicht Gewässer"). Otherwise null.',
  '  "ex": ONLY when needsExample is yes, else null. ONE natural Korean sentence in polite 해요체 (ends with 요/죠/까), 4-9 words, beginner grammar only (present tense, simple past, basic connectors), everyday situation, contains the word (conjugated is fine). No commas needed.',
  '  "ex_tr": English translation of ex, or null.',
  '  "hanja": ONLY when hanja characters were given: an array with one object PER GIVEN CHARACTER, in the same order: {"z": the character exactly as given, "les": its Korean reading as ONE Hangul syllable as it appears in this word, "de": the character meaning in 1-2 German words}. When hanja was "-", return null. Never add characters that were not given.',
  'Be conservative: if unsure about a field, use null. Never invent readings.',
].join('\n')

const zeile = (e) =>
  [e.id, e.ko, e.en || '', e.pos || '', e.hanjaVorgabe || '-', e.brauchtSatz ? 'yes' : 'no'].join(' | ')

/* ---------- Ein Stapel Wörter anreichern ---------- */
async function reichereAn(eintraege) {
  const ergebnis = new Map()
  for (let von = 0; von < eintraege.length; von += BATCH) {
    const teil = eintraege.slice(von, von + BATCH)
    let antwort
    try {
      antwort = await frage(SYSTEM, teil.map(zeile).join('\n'))
    } catch (e) {
      console.error(`  Modellanfrage fehlgeschlagen: ${e.message}`)
      continue
    }
    if (!Array.isArray(antwort)) {
      console.error('  Antwort war kein Array — Teil übersprungen')
      continue
    }
    for (const a of antwort) {
      const e = teil.find((x) => x.id === a?.id)
      if (!e) continue
      const pos = POS_ERLAUBT.includes(a.pos) ? a.pos : e.pos && POS_ERLAUBT.includes(e.pos) ? e.pos : null
      const felder = {
        en: pruefeText(a.en, 1, 40, /^[A-Za-z][A-Za-z' ,./()-]*$/),
        de: pruefeText(a.de, 1, 40, /^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß' ,./()-]*$/),
        pos,
        nuance: a.nuance == null ? null : pruefeText(a.nuance, 3, 80),
        ex: e.brauchtSatz ? pruefeSatz(a.ex, e.ko, pos) : null,
        ex_tr: e.brauchtSatz ? pruefeText(a.ex_tr, 3, 140) : null,
        hanja: null,
      }
      if (e.brauchtSatz && !(felder.ex && felder.ex_tr)) {
        felder.ex = null
        felder.ex_tr = null
      }
      if (e.hanjaVorgabe) {
        const h = pruefeHanja(a.hanja, e.hanjaVorgabe, e.ko)
        if (h === 'fehler') pruefliste.push(`${e.ko} (${e.hanjaVorgabe}) -> ${JSON.stringify(a.hanja).slice(0, 80)}`)
        else felder.hanja = h
      }
      ergebnis.set(e.id, felder)
    }
    console.log(`  … ${Math.min(von + BATCH, eintraege.length)}/${eintraege.length}`)
  }
  return ergebnis
}

/* ---------- Inventar laden ---------- */
const inventar = JSON.parse(readFileSync('src/core/inventare/topik1-woerter.json', 'utf8'))
const invNachKo = new Map(inventar.map((e) => [norm(e.ko), e]))

/* ---------- Schritt 1: Bestand ---------- */
async function bestandAnreichern() {
  let woerter
  try {
    woerter = await hole(
      `words?profile=eq.${PROFIL}&select=id,ko,en,pos,ex,ex_tr,de,nuance,hanja,inv_id,rang&order=created_at.asc`
    )
  } catch (e) {
    if (/de|nuance|hanja|inv_id|rang/.test(e.message)) {
      console.error('Spalten fehlen — bitte zuerst Migration 015 ausführen.')
      process.exit(1)
    }
    throw e
  }
  console.log(`\n=== Schritt 1: Bestand (${woerter.length} Wörter) ===`)

  /* Inventar-Bezug ohne Modell: gleiches Wort -> id, rang, pos, hanja */
  const offen = []
  for (const w of woerter) {
    const inv = invNachKo.get(norm(w.ko))
    const patch = {}
    if (inv) {
      if (!w.inv_id) patch.inv_id = inv.id
      if (w.rang == null && inv.rang != null && inv.rang < 99999) patch.rang = inv.rang
      if (!w.pos && inv.pos && POS_ERLAUBT.includes(inv.pos)) patch.pos = inv.pos
    }
    const brauchtModell = !w.de || !w.ex || (!w.pos && !patch.pos) || (!w.hanja && inv?.hanja)
    if (brauchtModell) {
      offen.push({
        id: w.id,
        ko: w.ko,
        en: w.en,
        pos: w.pos || patch.pos || inv?.pos || '',
        hanjaVorgabe: w.hanja ? '' : inv?.hanja || '',
        brauchtSatz: !w.ex,
        vorhanden: w,
        patch,
      })
    } else if (Object.keys(patch).length) {
      await patche('words', `id=eq.${w.id}`, patch)
      console.log(`  Inventar-Bezug: ${w.ko}`)
    }
  }
  console.log(`Wörter mit Lücken: ${offen.length}`)
  if (PROBE) offen.splice(5)
  if (!offen.length) return

  const erg = await reichereAn(offen)
  let gesetzt = 0
  for (const e of offen) {
    const f = erg.get(e.id)
    const patch = { ...e.patch }
    if (f) {
      /* NUR leere Felder füllen — Franz' eigene Einträge bleiben */
      if (!e.vorhanden.de && f.de) patch.de = f.de
      if (!e.vorhanden.pos && !patch.pos && f.pos) patch.pos = f.pos
      if (!e.vorhanden.nuance && f.nuance) patch.nuance = f.nuance
      if (!e.vorhanden.ex && f.ex) {
        patch.ex = f.ex
        patch.ex_tr = f.ex_tr
      }
      if (!e.vorhanden.hanja && f.hanja) patch.hanja = f.hanja
    }
    if (!Object.keys(patch).length) continue
    try {
      await patche('words', `id=eq.${e.id}`, patch)
      gesetzt++
      console.log(
        `  ${TROCKEN ? '[trocken] ' : ''}${e.ko}: ${PROBE ? JSON.stringify(patch) : Object.keys(patch).join(', ')}`
      )
    } catch (err) {
      console.error(`  Schreiben fehlgeschlagen (${e.ko}): ${err.message}`)
    }
  }
  console.log(`Bestand: ${gesetzt} Wörter ergänzt.`)
}

/* ---------- Schritt 2: Vorrat ---------- */
async function vorratFuellen() {
  console.log(`\n=== Schritt 2: Vorrat (Ziel ${ANZAHL} bereite Wörter) ===`)
  const [woerter, vorrat] = await Promise.all([
    hole(`words?profile=eq.${PROFIL}&select=ko,inv_id`),
    hole(`vorrat?profile=eq.${PROFIL}&select=inv_id,ko,bereit,uebersprungen`),
  ])
  const bibliothekKo = new Set(woerter.map((w) => norm(w.ko)))
  const bibliothekInv = new Set(woerter.map((w) => w.inv_id).filter(Boolean))
  const imVorrat = new Map(vorrat.map((v) => [v.inv_id, v]))

  /* Vorratswörter, die inzwischen in der Bibliothek stehen (Franz
     hat sie von Hand eingetragen) -> markieren, nie anbieten */
  for (const v of vorrat) {
    if (!v.uebersprungen && (bibliothekKo.has(norm(v.ko)) || bibliothekInv.has(v.inv_id))) {
      await patche('vorrat', `profile=eq.${PROFIL}&inv_id=eq.${v.inv_id}`, { uebersprungen: true })
      console.log(`  schon in Bibliothek -> übersprungen: ${v.ko}`)
    }
  }

  /* Kandidaten: Rang aufsteigend, keine Zahlwörter, nichts aus der
     Bibliothek. Unbewertete (rang 99999) kommen ganz zuletzt. */
  const bereitsBereit = vorrat.filter((v) => v.bereit && !v.uebersprungen).length
  const fehlen = Math.max(0, ANZAHL - bereitsBereit)
  const kandidaten = inventar
    .filter((e) => e.pos !== 'number')
    .filter((e) => !bibliothekKo.has(norm(e.ko)) && !bibliothekInv.has(e.id))
    .filter((e) => !imVorrat.get(e.id)?.bereit && !imVorrat.get(e.id)?.uebersprungen)
    .sort((a, b) => (a.rang ?? 99999) - (b.rang ?? 99999))
    .slice(0, PROBE ? 5 : fehlen)
  console.log(`Schon bereit: ${bereitsBereit} · neu anzureichern: ${kandidaten.length}`)
  if (!kandidaten.length) return

  const eintraege = kandidaten.map((e) => ({
    id: e.id,
    ko: e.ko,
    en: e.en,
    pos: e.pos || '',
    hanjaVorgabe: e.hanja || '',
    brauchtSatz: true,
    inv: e,
  }))
  const erg = await reichereAn(eintraege)

  const zeilen = []
  let bereit = 0
  for (const e of eintraege) {
    const f = erg.get(e.id) ?? {}
    const komplett = !!(f.en && f.de && f.pos && f.ex && f.ex_tr)
    if (komplett) bereit++
    zeilen.push({
      inv_id: e.id,
      profile: PROFIL,
      ko: e.ko,
      en: f.en || e.en,
      de: f.de ?? null,
      pos: f.pos ?? e.inv.pos ?? null,
      rang: e.inv.rang == null || e.inv.rang >= 99999 ? null : e.inv.rang,
      ex: f.ex ?? null,
      ex_tr: f.ex_tr ?? null,
      nuance: f.nuance ?? null,
      hanja: f.hanja ?? null,
      bereit: komplett,
    })
    if (!komplett) console.log(`  unvollständig (bleibt bereit=false): ${e.ko}`)
    if (PROBE) console.log(`  [probe] ${JSON.stringify(zeilen.at(-1))}`)
  }
  /* in Häppchen schreiben, damit ein Fehler nicht alles verwirft */
  for (let von = 0; von < zeilen.length; von += 50) await upserteVorrat(zeilen.slice(von, von + 50))
  console.log(`Vorrat: ${bereit} von ${zeilen.length} Wörtern komplett${TROCKEN ? ' (Trockenlauf)' : ''}.`)
}

/* ---------- Schritt 3: Audio-Check ---------- */
async function sha256Hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
async function imCache(text) {
  const pfad = `${CACHE_VERSION}/ko/${STIMME_KO}/${await sha256Hex(text.trim())}.mp3`
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/public/tts-cache/${pfad}`, { method: 'HEAD' })
  return r.ok
}
async function audioPruefen() {
  console.log('\n=== Schritt 3: Audio-Check ===')
  const offen = await hole(`vorrat?profile=eq.${PROFIL}&bereit=is.true&audio_ok=is.false&select=inv_id,ko,ex`)
  let ok = 0
  for (const v of offen) {
    const [w, s] = await Promise.all([imCache(v.ko), v.ex ? imCache(v.ex) : Promise.resolve(false)])
    if (w && s) {
      await patche('vorrat', `profile=eq.${PROFIL}&inv_id=eq.${v.inv_id}`, { audio_ok: true })
      ok++
    }
  }
  console.log(`Audio komplett: ${ok} von ${offen.length} offenen Vorratswörtern.`)
}

/* ---------- Schritt 4: Wortart-Bericht ---------- */
async function bericht() {
  const vorrat = await hole(
    `vorrat?profile=eq.${PROFIL}&uebersprungen=is.false&select=pos,rang,bereit&order=rang.asc.nullslast&limit=300`
  )
  const zaehl = {}
  for (const v of vorrat) zaehl[v.pos ?? '?'] = (zaehl[v.pos ?? '?'] ?? 0) + 1
  console.log(`\n=== Wortarten der nächsten ${vorrat.length} Vorratswörter ===`)
  for (const [pos, n] of Object.entries(zaehl).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${pos.padEnd(13)} ${String(n).padStart(4)}  ${((n / vorrat.length) * 100).toFixed(1)} %`)
  }
  console.log(`  bereit: ${vorrat.filter((v) => v.bereit).length}`)
}

/* ---------- Schritt 2b: Nuancen bei gleicher Bedeutung ----------
   (Franz 06.09.) Zwei Wörter mit identischer Bedeutung — 묻다 und
   물어보다 „to ask", 때 und 시간 „time" — stehen in der Vorschlags-
   liste als gleicher Eintrag. Das darf nie passieren. Hier werden
   alle Wörter (Bibliothek + Vorrat) nach Bedeutung gruppiert; jede
   Gruppe ab zwei Mitgliedern bekommt vom Modell je Mitglied eine
   UNTERSCHEIDENDE Nuance, die vorhandene wird dabei ersetzt. */
const schluessel = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/^to /, '')
    .replace(/[^a-zäöüß ]/g, '')
    .trim()

async function nuancenAbgleichen() {
  console.log('\n=== Schritt 2b: Nuancen bei gleicher Bedeutung ===')
  const [woerter, vorrat] = await Promise.all([
    hole(`words?profile=eq.${PROFIL}&select=id,ko,en,de,pos,ex,nuance`),
    hole(`vorrat?profile=eq.${PROFIL}&uebersprungen=is.false&select=inv_id,ko,en,de,pos,ex,nuance`),
  ])
  const alle = [
    ...woerter.map((w) => ({ ...w, quelle: 'words', key: w.id })),
    ...vorrat.map((v) => ({ ...v, quelle: 'vorrat', key: v.inv_id })),
  ]
  /* Gruppen über Englisch UND über Deutsch; ein Wort kann in beiden
     stecken — dann wird es zusammengelegt */
  const gruppen = new Map()
  for (const feld of ['en', 'de']) {
    const nachKey = new Map()
    for (const w of alle) {
      const k = schluessel(w[feld])
      if (!k) continue
      if (!nachKey.has(k)) nachKey.set(k, [])
      nachKey.get(k).push(w)
    }
    for (const [k, mitglieder] of nachKey) {
      if (mitglieder.length < 2) continue
      const kos = mitglieder.map((m) => m.ko).sort().join('|')
      if (!gruppen.has(kos)) gruppen.set(kos, { grund: `${feld}: ${k}`, mitglieder })
    }
  }
  const liste = [...gruppen.values()]
  console.log(`Gruppen mit gleicher Bedeutung: ${liste.length}`)
  if (!liste.length) return

  const SYSTEM_NUANCE = [
    'Several Korean words in a learner\'s deck share the SAME English/German gloss. In the app they appear as identical entries, so the learner cannot tell them apart. Your job: for EACH word in a group write a short DISTINGUISHING note in German (max 60 characters, no full sentence needed) that says what makes THIS word different from the others in its group — usage, register, nuance, typical context. Examples: 때 -> "Zeitpunkt/Moment (als, wenn) – nicht Dauer"; 시간 -> "Zeit als Dauer oder Uhrzeit, messbar"; 물어보다 -> "höflicher/alltäglicher: mal nachfragen"; 묻다 -> "neutral fragen, auch schriftlich".',
    'Input: groups, each line "groupId | korean | english | german | example sentence".',
    'Return ONLY a JSON array: [{"groupId":"...","ko":"...","nuance":"..."}] with one object per word. Notes within a group must differ from each other. Never leave a word out.',
  ].join('\n')

  let gesetzt = 0
  for (let von = 0; von < liste.length; von += 8) {
    const teil = liste.slice(von, von + 8)
    const text = teil
      .map((g, i) => g.mitglieder.map((m) => `g${von + i} | ${m.ko} | ${m.en || ''} | ${m.de || ''} | ${m.ex || ''}`).join('\n'))
      .join('\n')
    let antwort
    try {
      antwort = await frage(SYSTEM_NUANCE, text, 4000)
    } catch (e) {
      console.error(`  Modellanfrage fehlgeschlagen: ${e.message}`)
      continue
    }
    if (!Array.isArray(antwort)) continue
    for (const a of antwort) {
      const gi = Number(String(a.groupId ?? '').replace('g', ''))
      const g = liste[gi]
      if (!g) continue
      const m = g.mitglieder.find((x) => norm(x.ko) === norm(a.ko))
      const nuance = pruefeText(a.nuance, 3, 80)
      if (!m || !nuance) continue
      try {
        if (m.quelle === 'words') await patche('words', `id=eq.${m.key}`, { nuance })
        else await patche('vorrat', `profile=eq.${PROFIL}&inv_id=eq.${m.key}`, { nuance })
        gesetzt++
        console.log(`  ${TROCKEN ? '[trocken] ' : ''}${m.ko} (${g.grund}): ${nuance}`)
      } catch (err) {
        console.error(`  Schreiben fehlgeschlagen (${m.ko}): ${err.message}`)
      }
    }
  }
  console.log(`Nuancen gesetzt: ${gesetzt}`)
}

/* ---------- Hauptlauf ---------- */
if (NUR_AUDIO) {
  await audioPruefen()
} else if (NUR_BERICHT) {
  await bericht()
} else if (NUR_NUANCEN) {
  await nuancenAbgleichen()
} else {
  await bestandAnreichern()
  await vorratFuellen()
  await nuancenAbgleichen()
  await bericht()
  if (pruefliste.length) {
    console.log(`\n=== HANJA-PRÜFLISTE (${pruefliste.length}) — Zeile blieb leer ===`)
    for (const p of pruefliste) console.log('  ' + p)
  }
  /* grobe Kosten Sonnet: 3 $/M rein, 15 $/M raus */
  const kosten = (tokensRein * 3 + tokensRaus * 15) / 1_000_000
  console.log(`\nModell: ${tokensRein} Tokens rein, ${tokensRaus} raus -> grob ${kosten.toFixed(2)} $.`)
}
console.log('ok')
