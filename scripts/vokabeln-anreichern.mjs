/* ============================================================
   VOKABELN ANREICHERN — Inhalte für den Vokabel-Motor V2
   (Konzept docs/VOKABEL-KONZEPT.md §6; läuft in GitHub Actions)

   Verfahren 2 (Franz 09.09.) — warum es das gibt: Die deutschen
   Bedeutungen entstanden bisher mit Blick auf die englische
   Inventar-Glosse, und die ist teils schlampig (정도 = „degree" ->
   „Grad"). Jetzt gilt:
     • Das Modell übersetzt aus dem KOREANISCHEN. Es bekommt Wort,
       Wortart und den Inventar-Hinweis (Kollokation wie „어느 정도");
       die alte englische Glosse steht nur als unzuverlässiger
       Wörterbuch-Hinweis dabei. Englisch und Deutsch entstehen
       getrennt vom Koreanischen, nicht voneinander.
     • Vier-Augen-Prinzip: Sonnet schreibt, Opus prüft nur die
       Bedeutungen. Bei Widerspruch schreibt Sonnet einmal nach,
       Opus prüft erneut. Bleibt der Widerspruch, landet das Wort in
       der Prüfliste (Vorrat: bereit=false; Bestand: alte Bedeutung
       bleibt) — lieber leer als falsch.
     • Infotext „Gut zu wissen" (2-5 Zeilen, Deutsch, koreanische
       Beispiele inline) für alles, was nicht trivial ist.
     • Zählwörter werden markiert (mit Zahlensystem); Zahlwörter und
       abgeleitete Formen (다른 <- 다르다) kommen nie in den Vorrat.
     • Bedeutungsfamilien: Wörter mit gleicher Bedeutung (때/시간,
       진짜/정말) bekommen unterscheidende Nuancen UND eine gemeinsame
       Familie — auf der Erkennen-Karte zählt jedes Mitglied.
     • Hand-Schutz: Felder in words.hand (z. B. ["de"]) hat Franz von
       Hand geändert — die fasst der Lauf nie an. Die englische
       Bedeutung von Wörtern, die schon vor dem Motor da waren
       (words_backup_v2), gilt ebenfalls als seine.
     • words.anreicherung / vorrat.anreicherung tragen die Verfahrens-
       nummer; alles unter METHODE wird beim nächsten Lauf neu
       erzeugt (einmalige Nachbesserung des Bestands).

   Schritte: 1 Bestand · 2 Vorrat · 2b Familien+Nuancen ·
             3 Audio-Check (--audio) · 4 Bericht (--bericht)
   Zahlen in der Bibliothek werden nur GELISTET; gelöscht werden sie
   ausschließlich mit --zahlen-loeschen (Franz löst das selbst aus).

   Hanja-Sicherheit (Konzept §6.2) unverändert: Zeichen kommen aus
   dem Inventar, das Modell liefert nur Lesung + Bedeutung, geprüft
   Silbe für Silbe.

   Aufruf: node scripts/vokabeln-anreichern.mjs
             [--dry] [--probe] [--anzahl 300] [--profil ko] [--audio]
             [--bericht] [--nuancen] [--zahlen-loeschen] [--nachtrag]
   Secrets: ANTHROPIC_API_KEY, SUPABASE_SERVICE_KEY (nur in Actions).
   ============================================================ */
import { readFileSync } from 'node:fs'

const SUPABASE_URL = 'https://gkrubhwwzgekmbiltslt.supabase.co'
const DB_KEY = process.env.SUPABASE_SERVICE_KEY
const API_KEY = process.env.ANTHROPIC_API_KEY
/* Sonnet schreibt (günstig, gut), Opus prüft (nur kurze Urteile) */
const MODELL_SCHREIBT = 'claude-sonnet-5'
const MODELL_PRUEFT = 'claude-opus-5'
/* Verfahrensnummer — hochzählen, wenn sich das Verfahren so ändert,
   dass alte Inhalte neu erzeugt werden sollen */
const METHODE = 2

const argWert = (name) => {
  const i = process.argv.indexOf(name)
  return i === -1 ? null : process.argv[i + 1]
}
const PROBE = process.argv.includes('--probe')
const TROCKEN = process.argv.includes('--dry') || PROBE
const NUR_AUDIO = process.argv.includes('--audio')
const NUR_BERICHT = process.argv.includes('--bericht')
const NUR_NUANCEN = process.argv.includes('--nuancen')
const ZAHLEN_LOESCHEN = process.argv.includes('--zahlen-loeschen')
/* Schmaler Zusatz-Durchgang: nur Formalität, Partikel, 해요-Form */
const NACHTRAG = process.argv.includes('--nachtrag')
const ANZAHL = Number(argWert('--anzahl') ?? 300)
const PROFIL = argWert('--profil') ?? 'ko'
if (PROFIL !== 'ko') {
  console.error(`Profil "${PROFIL}" ist für den Vokabel-Motor nicht vorgesehen — nur ko.`)
  process.exit(1)
}
if (!DB_KEY) {
  console.error('SUPABASE_SERVICE_KEY fehlt.')
  process.exit(1)
}
if (!API_KEY && !NUR_AUDIO && !NUR_BERICHT && !ZAHLEN_LOESCHEN) {
  console.error('ANTHROPIC_API_KEY fehlt.')
  process.exit(1)
}

/* Wörter je Modellanfrage: mit Infotext werden die Antworten länger,
   deshalb kleiner als früher */
const BATCH = 12

const CACHE_VERSION = 'v1'
const STIMME_KO = 'nova'

/* ---------- Supabase ---------- */
const kopf = {
  apikey: DB_KEY,
  Authorization: `Bearer ${DB_KEY}`,
  'Content-Type': 'application/json',
}
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
async function loesche(tabelle, filter) {
  if (TROCKEN) return
  await mitWiederholung(`DELETE ${tabelle}`, () =>
    fetch(`${SUPABASE_URL}/rest/v1/${tabelle}?${filter}`, {
      method: 'DELETE',
      headers: { ...kopf, Prefer: 'return=minimal' },
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

/* Ein hartes Limit („You have reached your specified API usage
   limits") wird durch Wiederholen nie besser. Der Lauf bricht dann
   sofort ab, statt jeden Stapel zweimal gegen die Wand zu fahren
   (Fund 09.09.). */
class LimitErreicht extends Error {}
const istLimit = (text) => /usage limits|credit balance|billing/i.test(String(text))

/* ---------- Modell ---------- */
let tokensRein = 0
let tokensRaus = 0
let kostenUsd = 0
/* Listenpreise je Million Tokens (rein / raus) */
const PREIS = { [MODELL_SCHREIBT]: [2, 10], [MODELL_PRUEFT]: [5, 25] }
async function frage(system, nutzer, { maxTokens = 16000, modell = MODELL_SCHREIBT, effort = 'high' } = {}) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: modell,
      output_config: { effort },
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: nutzer }],
    }),
  })
  if (!r.ok) {
    const text = await r.text()
    if (r.status === 400 && istLimit(text)) throw new LimitErreicht(text.slice(0, 200))
    throw new Error(`Anthropic ${r.status}: ${text.slice(0, 200)}`)
  }
  const daten = await r.json()
  const rein = daten.usage?.input_tokens ?? 0
  const raus = daten.usage?.output_tokens ?? 0
  tokensRein += rein
  tokensRaus += raus
  const [pRein, pRaus] = PREIS[modell] ?? [5, 25]
  kostenUsd += (rein * pRein + raus * pRaus) / 1_000_000
  if (daten.stop_reason === 'max_tokens') console.warn('  Antwort abgeschnitten (max_tokens) — Teil wird verworfen')
  const text = (daten.content ?? []).map((c) => c.text ?? '').join('')
  const roh = text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim()
  return JSON.parse(roh)
}

/* ---------- Hilfen ---------- */
const norm = (s) => String(s ?? '').normalize('NFC').trim().replace(/\s+/g, ' ')
/* Nur zum VERGLEICHEN Bibliothek <-> Vorrat: Satzzeichen am Wortende
   weg (Fund 09.09.: Franz hat 어디?, 뭐?, 누구? eingetragen — sonst
   bietet der Vorrat 어디, 뭐, 누구 als "neu" noch einmal an). Die
   gespeicherten Woerter bleiben unangetastet. */
const vergleichKo = (s) => norm(s).replace(/[?!.…~]+$/, '')
const silben = (s) => [...norm(s)].filter((c) => /[가-힣]/.test(c))
const istHangul = (c) => /^[가-힣]$/.test(c)
const hanjaZeichen = (vorgabe) =>
  [...String(vorgabe ?? '').normalize('NFKC')].filter((c) => /[㐀-鿿]/.test(c))

const POS_ERLAUBT = ['noun', 'verb', 'adj', 'adv', 'pronoun', 'determiner', 'interjection', 'phrase']
const ZAHLSYSTEME = ['native', 'sino', 'beide']
const handFelder = (w) => (Array.isArray(w?.hand) ? w.hand.map(String) : [])

/* ---------- Prüfung der Modellantwort ---------- */
const pruefliste = []
/* Eigene englische Bedeutungen, an denen der Prüfer zweifelt — nur
   gemeldet, nie geändert (Franz 09.09.) */
const eigenePruefliste = []

function pruefeText(s, min, max, muster) {
  if (typeof s !== 'string') return null
  const t = norm(s)
  if (t.length < min || t.length > max) return null
  if (muster && !muster.test(t)) return null
  return t
}
/* Glossen: Buchstaben, Kommas, Schrägstrich für zwei Bedeutungen,
   Klammern für eine kurze Einschränkung */
const GLOSSE_EN = /^[A-Za-z][A-Za-z' ,./()-]*$/
const GLOSSE_DE = /^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß' ,./()-]*$/

/* Infotext: 2-5 Zeilen, jede mit fettem Stichwort **Wort:** */
function pruefeInfo(s) {
  /* Liste bevorzugt; ein einzelner String mit Umbrüchen geht auch */
  const roh = Array.isArray(s) ? s : typeof s === 'string' ? s.split(/\r?\n/) : null
  if (!roh) return null
  const zeilen = roh.map((z) => String(z ?? '').trim()).filter(Boolean)
  if (zeilen.length < 2 || zeilen.length > 5) return null
  /* Doppelpunkt innerhalb oder außerhalb der Sterne zulassen — sonst
     fielen brauchbare Texte durch (Fund 09.09.) */
  const gut = zeilen.every((z) => /^\*\*[^*]{2,24}\*\*:?\s*\S/.test(z) && z.length <= 220)
  if (!gut) return null
  /* einheitlich als **Stichwort:** speichern */
  return zeilen.map((z) => z.replace(/^\*\*([^*]+?):?\*\*:?/, '**$1:**')).join('\n')
}

function pruefeSatz(ex, ko, pos) {
  const t = pruefeText(ex, 4, 90)
  if (!t) return null
  const woerter = t.split(' ').length
  if (woerter < 3 || woerter > 12) return null
  if (!/(요|죠|까)[.!?…]*$/.test(t)) return null
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
function ohneEnd(c) {
  const code = c.codePointAt(0) - 0xac00
  if (code < 0 || code > 11171) return c
  return String.fromCodePoint(0xac00 + code - (code % 28))
}
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
  if (!zeichen.length) return null
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
    const i = sil.indexOf(les, ab)
    if (i === -1) return 'fehler'
    ab = i + 1
    raus.push({ z, les, de, i })
  }
  return raus
}

/* ---------- Prompts ---------- */
const SYSTEM = [
  'You enrich Korean vocabulary entries for a German adult beginner (A1-A2) who is a native German speaker and fluent in English. His cards show English as the main gloss and German in parentheses.',
  'Input, one entry per line: id | korean | pos (may be empty) | usage hint from the TOPIK list (a collocation showing the intended sense; may be empty) | dictionary gloss (UNRELIABLE: auto-extracted, often a rare or plain wrong sense — e.g. 정도 listed as "degree") | fixedEnglish (yes = the learner wrote this English gloss himself: copy it unchanged into "en") | hanja (given characters, or "-") | needsExample (yes/no) | reviewer note (empty, or an objection from a second model to your previous attempt: take it seriously).',
  '',
  'Work from the KOREAN word. Use the usage hint as the strongest signal for the intended sense. Ignore the dictionary gloss whenever it does not match how the word is used in everyday Korean.',
  'Return ONLY a JSON array, one object per id, with exactly these keys:',
  '  "id": copy',
  '  "en": English gloss written directly from the Korean word: the 1-2 senses a beginner meets most, each 1-3 words, senses separated by " / " (e.g. "about, roughly / extent"; "to eat"; "counter for animals"). Nouns without article. If fixedEnglish is yes, copy the given gloss exactly.',
  '  "de": German gloss with the SAME senses in the SAME order, written directly from the Korean word (not translated from "en"), each 1-3 everyday words, nouns WITHOUT article, senses separated by " / " (e.g. "ungefähr, etwa / Ausmaß").',
  '  "pos": one of noun, verb, adj, adv, pronoun, determiner, interjection, phrase. If pos was given, copy it.',
  '  "nuance": null in most cases. Only when a learner NEEDS it: a usage restriction, politeness level, or a classic confusion — max 60 characters, German, no full sentence needed ("nur Trinkwasser, nicht Gewässer"). For counters: which number system, e.g. "mit koreanischen Zahlen: 한, 두, 세 마리". Otherwise null.',
  '  "info": a short "good to know" text in GERMAN, or null. An ARRAY of 2-5 strings, one per line — never one string with line breaks in it. EVERY line starts with a bold keyword in the exact form **Stichwort:** (choose from Gebrauch, Typisch, Achtung, Ähnlich, Register, Zählen, Merke). Korean examples inline with a German translation in parentheses, e.g. 어느 정도 (wie sehr, in welchem Maß). Cover what actually matters for this word: typical patterns and collocations, contrast to a similar word a beginner confuses it with, register/politeness, for counters the number system and the pattern 한/두/세 + counter, classic beginner mistakes. Be GENEROUS: write info for almost every word; only trivially concrete nouns (나무, 사과, 의자) get null. Max 200 characters per line.',
  '  "zaehlwort": true if the word is a counter/measure word (개, 명, 마리, 잔, 살, 번 …), else false.',
  '  "zahlsystem": for counters: "native" (하나/한, 둘/두, 셋/세 …), "sino" (일, 이, 삼 …) or "beide"; else null.',
  '  "ex": ONLY when needsExample is yes, else null. ONE natural Korean sentence in polite 해요체 (ends with 요/죠/까), 4-9 words, beginner grammar only (present tense, simple past, basic connectors), everyday situation, contains the word (conjugated is fine) in its MAIN sense.',
  '  "ex_tr": English translation of ex, or null.',
  '  "hanja": ONLY when hanja characters were given: an array with one object PER GIVEN CHARACTER, in the same order: {"z": the character exactly as given, "les": its Korean reading as ONE Hangul syllable as it appears in this word, "de": the character meaning in 1-2 German words}. When hanja was "-", return null. Never add characters that were not given.',
  'If unsure about hanja, ex or nuance, use null. Never invent readings. For en and de, always give your best everyday rendering — a wrong sense is the one thing that must not happen.',
].join('\n')

/* Prüfer: sieht NUR Koreanisch + Hinweis + die fertigen Glossen.
   Kurze Urteile, damit es günstig bleibt. */
const SYSTEM_PRUEF = [
  'You are the second pair of eyes for a Korean vocabulary deck of a German beginner (A1-A2). For each line "id | korean | pos | usage hint | english gloss | german gloss" judge ONLY this: are the English and the German gloss correct, natural, everyday renderings of the MAIN sense(s) of this Korean word for a beginner, and do both glosses express the same senses?',
  'Be strict about wrong or rare senses (정도 as "degree/Grad" is wrong — "about, roughly / extent" is right; 병 as "sickness" is fine; 천 as "cloth" for the number 1000 is wrong). Accept stylistic variants and fair simplifications — do not nitpick.',
  'Judge the two glosses SEPARATELY — an English gloss written by the learner himself is often kept even when it is off, and the German one still has to be right.',
  'Return ONLY a JSON array: [{"id":"...","en_ok":true|false,"de_ok":true|false,"grund":"<short German reason when something is not ok, else null>","en":"<better English gloss when en_ok is false, else null>","de":"<better German gloss when de_ok is false, else null>"}]. One object per id, never leave one out.',
].join('\n')

const zeile = (e, notiz = '') =>
  [
    e.id,
    e.ko,
    e.pos || '',
    e.hinweis || '',
    e.enAlt || '',
    e.enFest ? 'yes' : 'no',
    e.hanjaVorgabe || '-',
    e.brauchtSatz ? 'yes' : 'no',
    notiz,
  ].join(' | ')

/* ---------- Ein Stapel Wörter anreichern (mit Prüfung) ----------
   Rückgabe: Map id -> Felder; Felder.enOk / Felder.deOk sagen, ob
   Opus die englische bzw. die deutsche Bedeutung abgenommen hat. */
async function reichereAn(eintraege) {
  const ergebnis = new Map()
  const notizen = new Map() /* id -> Einwand des Prüfers */

  async function schreibRunde(liste) {
    for (let von = 0; von < liste.length; von += BATCH) {
      const teil = liste.slice(von, von + BATCH)
      let antwort = null
      for (let versuch = 1; versuch <= 2 && !Array.isArray(antwort); versuch++) {
        try {
          antwort = await frage(SYSTEM, teil.map((e) => zeile(e, notizen.get(e.id) || '')).join('\n'))
          if (!Array.isArray(antwort)) console.error('  Antwort war kein Array')
        } catch (e) {
          if (e instanceof LimitErreicht) throw e
          console.error(`  Modellanfrage fehlgeschlagen (Versuch ${versuch}): ${e.message}`)
          antwort = null
        }
      }
      if (!Array.isArray(antwort)) {
        console.error(`  Stapel übersprungen — die ${teil.length} Wörter bleiben für den nächsten Lauf offen`)
        continue
      }
      for (const a of antwort) {
        const e = teil.find((x) => x.id === a?.id)
        if (!e) continue
        const pos = POS_ERLAUBT.includes(a.pos) ? a.pos : e.pos && POS_ERLAUBT.includes(e.pos) ? e.pos : null
        const felder = {
          en: e.enFest ? e.enAlt : pruefeText(a.en, 1, 60, GLOSSE_EN),
          de: pruefeText(a.de, 1, 60, GLOSSE_DE),
          pos,
          nuance: a.nuance == null ? null : pruefeText(a.nuance, 3, 80),
          info: pruefeInfo(a.info),
          zaehlwort: a.zaehlwort === true || !!e.zaehlwortVorgabe,
          zahlsystem: e.zahlsystemVorgabe || (ZAHLSYSTEME.includes(a.zahlsystem) ? a.zahlsystem : null),
          ex: e.brauchtSatz ? pruefeSatz(a.ex, e.ko, pos) : null,
          ex_tr: e.brauchtSatz ? pruefeText(a.ex_tr, 3, 140) : null,
          hanja: null,
          /* getrennte Abnahme: enOk = englische Bedeutung, deOk = deutsche */
          enOk: false,
          deOk: false,
        }
        if (!felder.zaehlwort) felder.zahlsystem = null
        if (e.brauchtSatz && !(felder.ex && felder.ex_tr)) {
          felder.ex = null
          felder.ex_tr = null
        }
        if (e.hanjaVorgabe) {
          const h = pruefeHanja(a.hanja, e.hanjaVorgabe, e.ko)
          if (h === 'fehler') pruefliste.push(`Hanja ${e.ko} (${e.hanjaVorgabe}) -> ${JSON.stringify(a.hanja).slice(0, 80)}`)
          else felder.hanja = h
        }
        ergebnis.set(e.id, felder)
      }
      console.log(`  … ${Math.min(von + BATCH, liste.length)}/${liste.length}`)
    }
  }

  /* Prüfrunde: Opus urteilt über en/de. Liefert die Liste der
     durchgefallenen Einträge (Einwände landen in `notizen`). */
  async function pruefRunde(liste) {
    const durchgefallen = []
    const zuPruefen = liste.filter((e) => {
      const f = ergebnis.get(e.id)
      return f?.en && f?.de && !(f.enOk && f.deOk)
    })
    for (let von = 0; von < zuPruefen.length; von += 25) {
      const teil = zuPruefen.slice(von, von + 25)
      let urteile
      try {
        urteile = await frage(
          SYSTEM_PRUEF,
          teil
            .map((e) => {
              const f = ergebnis.get(e.id)
              return [e.id, e.ko, f.pos || e.pos || '', e.hinweis || '', f.en, f.de].join(' | ')
            })
            .join('\n'),
          { maxTokens: 8000, modell: MODELL_PRUEFT, effort: 'medium' }
        )
      } catch (err) {
        if (err instanceof LimitErreicht) throw err
        console.error(`  Prüfanfrage fehlgeschlagen: ${err.message}`)
        continue
      }
      if (!Array.isArray(urteile)) continue
      for (const u of urteile) {
        const e = teil.find((x) => x.id === u?.id)
        if (!e) continue
        const f = ergebnis.get(e.id)
        f.enOk = u.en_ok !== false
        f.deOk = u.de_ok !== false
        if (f.enOk && f.deOk) continue
        const grund = pruefeText(u.grund, 2, 200) || 'Bedeutung passt nicht'
        const besser = [u.en ? `en: ${u.en}` : '', u.de ? `de: ${u.de}` : ''].filter(Boolean).join(', ')
        const notiz = `${grund}${besser ? ` (Vorschlag ${besser})` : ''}`
        /* Die englische Bedeutung ist SEINE — sie wird nie überschrieben.
           Stimmt sie nicht, kommt sie nur auf die Prüfliste; das Deutsche
           darf trotzdem geschrieben werden (Franz 09.09.). */
        if (!f.enOk && e.enFest) {
          eigenePruefliste.push(`${e.ko}: deine Bedeutung „${e.enAlt}" — ${notiz}`)
          f.enOk = true
        }
        if (!f.enOk || !f.deOk) {
          notizen.set(e.id, notiz)
          durchgefallen.push(e)
        }
      }
    }
    return durchgefallen
  }

  console.log(`  Schreiben (${MODELL_SCHREIBT}) …`)
  await schreibRunde(eintraege)
  console.log(`  Prüfen (${MODELL_PRUEFT}) …`)
  let offen = await pruefRunde(eintraege)
  if (offen.length) {
    console.log(`  ${offen.length} Einwände — Nachbesserung …`)
    await schreibRunde(offen)
    offen = await pruefRunde(offen)
    for (const e of offen) {
      const f = ergebnis.get(e.id)
      pruefliste.push(`Bedeutung ${e.ko}: Sonnet "${f?.en} (${f?.de})" — Opus: ${notizen.get(e.id)}`)
    }
  }
  return ergebnis
}

/* ---------- Inventar ---------- */
const inventar = JSON.parse(readFileSync('src/core/inventare/topik1-woerter.json', 'utf8'))
const invNachKo = new Map(inventar.map((e) => [norm(e.ko), e]))
const invNachId = new Map(inventar.map((e) => [e.id, e]))
/* Zahl oder Ableitung -> gehört nicht in die Vokabeln */
const ausgeschlossen = (inv) => (inv?.zahl ? 'zahl' : inv?.ableitung ? 'ableitung' : null)

function eintragAus(w, inv, { brauchtSatz, enFest }) {
  return {
    id: w.id ?? inv.id,
    ko: w.ko,
    pos: w.pos || inv?.pos || '',
    hinweis: inv?.hinweis || '',
    enAlt: w.en || inv?.en || '',
    enFest,
    hanjaVorgabe: w.hanja ? '' : inv?.hanja || '',
    zaehlwortVorgabe: !!inv?.zaehlwort,
    zahlsystemVorgabe: inv?.zahlsystem || null,
    brauchtSatz,
  }
}

/* ---------- Zahlen in der Bibliothek ---------- */
async function zahlenInBibliothek(woerter) {
  const treffer = woerter.filter((w) => ausgeschlossen(invNachKo.get(norm(w.ko)) ?? invNachId.get(w.inv_id)))
  if (!treffer.length) return
  console.log(`\n=== Zahlen/Ableitungen in der Bibliothek (${treffer.length}) ===`)
  for (const w of treffer) console.log(`  ${w.ko} (${w.en})`)
  if (!ZAHLEN_LOESCHEN) {
    console.log('  Nur gelistet. Löschen: Workflow mit „zahlen_loeschen" starten (Karten gehen mit).')
    return
  }
  for (const w of treffer) {
    await loesche('words', `id=eq.${w.id}&profile=eq.${PROFIL}`)
    console.log(`  ${TROCKEN ? '[trocken] ' : ''}gelöscht: ${w.ko}`)
  }
}

/* ---------- Schritt 1: Bestand ---------- */
async function bestandAnreichern() {
  let woerter
  let altbestand = new Set()
  try {
    woerter = await hole(
      `words?profile=eq.${PROFIL}&select=id,ko,en,pos,ex,ex_tr,de,nuance,hanja,inv_id,rang,info,familie,zaehlwort,zahlsystem,hand,anreicherung&order=created_at.asc`
    )
    const alt = await hole('words_backup_v2?select=id')
    altbestand = new Set(alt.map((a) => a.id))
  } catch (e) {
    if (/info|familie|zaehlwort|hand|anreicherung|backup/.test(e.message)) {
      console.error('Spalten fehlen — bitte zuerst Migration 016 ausführen.')
      process.exit(1)
    }
    throw e
  }
  console.log(`\n=== Schritt 1: Bestand (${woerter.length} Wörter, Verfahren ${METHODE}) ===`)
  await zahlenInBibliothek(woerter)

  const offen = []
  for (const w of woerter) {
    const inv = invNachKo.get(norm(w.ko)) ?? invNachId.get(w.inv_id)
    if (ausgeschlossen(inv)) continue
    const patch = {}
    if (inv) {
      if (!w.inv_id) patch.inv_id = inv.id
      if (w.rang == null && inv.rang != null && inv.rang < 99999) patch.rang = inv.rang
      if (!w.pos && inv.pos && POS_ERLAUBT.includes(inv.pos)) patch.pos = inv.pos
      if (inv.zaehlwort && !w.zaehlwort) {
        patch.zaehlwort = true
        patch.zahlsystem = inv.zahlsystem || null
      }
    }
    const hand = handFelder(w)
    const neu = (w.anreicherung ?? 0) < METHODE
    const brauchtModell =
      neu || !w.de || !w.info || !w.ex || (!w.pos && !patch.pos) || (!w.hanja && inv?.hanja)
    if (brauchtModell) {
      offen.push({
        ...eintragAus(w, inv, {
          brauchtSatz: !w.ex,
          /* Englisch ist seins: Wörter von vor dem Motor, alles, was er
             ausdrücklich von Hand geändert hat, und alles, was gar nicht
             im Inventar steht (dann kann es nur ein Hand-Eintrag sein) */
          enFest: altbestand.has(w.id) || hand.includes('en') || !inv,
        }),
        vorhanden: w,
        hand,
        neu,
        patch,
      })
    } else if (Object.keys(patch).length) {
      await patche('words', `id=eq.${w.id}`, patch)
      console.log(`  Inventar-Bezug: ${w.ko}`)
    }
  }
  console.log(`Wörter, die das Modell braucht: ${offen.length}`)
  if (PROBE) offen.splice(5)
  if (!offen.length) return

  const erg = await reichereAn(offen)
  let gesetzt = 0
  for (const e of offen) {
    const f = erg.get(e.id)
    const patch = { ...e.patch }
    const v = e.vorhanden
    if (f) {
      const darf = (feld) => !e.hand.includes(feld)
      /* Jede Bedeutung nur nach ihrer eigenen Abnahme durch den Prüfer */
      if (f.enOk && !e.enFest && f.en && f.en !== v.en && darf('en')) patch.en = f.en
      if (f.deOk && f.de && (e.neu || !v.de) && f.de !== v.de && darf('de')) patch.de = f.de
      if (f.nuance && (e.neu || !v.nuance) && darf('nuance')) patch.nuance = f.nuance
      if (f.info && (e.neu || !v.info) && darf('info')) patch.info = f.info
      if (!v.pos && !patch.pos && f.pos) patch.pos = f.pos
      if (f.zaehlwort && !v.zaehlwort && !patch.zaehlwort) {
        patch.zaehlwort = true
        patch.zahlsystem = f.zahlsystem
      }
      if (!v.ex && f.ex) {
        patch.ex = f.ex
        patch.ex_tr = f.ex_tr
      }
      if (!v.hanja && f.hanja) patch.hanja = f.hanja
      /* Verfahren erledigt — aber nur, wenn der Prüfer die Bedeutungen
         auch wirklich beurteilt hat. Fällt die Prüfung ganz aus (Limit,
         Netz), bliebe das Wort sonst mit alter Bedeutung abgehakt
         liegen (Fund 09.09.). */
      if (e.neu && f.enOk && f.deOk) patch.anreicherung = METHODE
    }
    if (!Object.keys(patch).length) continue
    try {
      await patche('words', `id=eq.${e.id}`, patch)
      gesetzt++
      const alt = patch.de && v.de && patch.de !== v.de ? ` [de: „${v.de}" -> „${patch.de}"]` : ''
      const altEn = patch.en ? ` [en: „${v.en}" -> „${patch.en}"]` : ''
      console.log(
        `  ${TROCKEN ? '[trocken] ' : ''}${e.ko}: ${PROBE ? JSON.stringify(patch) : Object.keys(patch).join(', ')}${alt}${altEn}`
      )
    } catch (err) {
      console.error(`  Schreiben fehlgeschlagen (${e.ko}): ${err.message}`)
    }
  }
  console.log(`Bestand: ${gesetzt} Wörter ergänzt${TROCKEN ? ' (Trockenlauf — NICHTS gespeichert)' : ''}.`)
}

/* ---------- Schritt 2: Vorrat ---------- */
async function vorratFuellen() {
  console.log(`\n=== Schritt 2: Vorrat (Ziel ${ANZAHL} bereite Wörter) ===`)
  const [woerter, vorrat] = await Promise.all([
    hole(`words?profile=eq.${PROFIL}&select=ko,inv_id`),
    hole(`vorrat?profile=eq.${PROFIL}&select=inv_id,ko,en,de,pos,rang,ex,ex_tr,nuance,hanja,info,bereit,uebersprungen,anreicherung`),
  ])
  const bibliothekKo = new Set(woerter.map((w) => vergleichKo(w.ko)))
  const bibliothekInv = new Set(woerter.map((w) => w.inv_id).filter(Boolean))
  const imVorrat = new Map(vorrat.map((v) => [v.inv_id, v]))

  for (const v of vorrat) {
    if (v.uebersprungen) continue
    const grund = bibliothekKo.has(vergleichKo(v.ko)) || bibliothekInv.has(v.inv_id)
      ? 'bibliothek'
      : ausgeschlossen(invNachId.get(v.inv_id))
    if (grund) {
      await patche('vorrat', `profile=eq.${PROFIL}&inv_id=eq.${v.inv_id}`, { uebersprungen: true, grund })
      console.log(`  übersprungen (${grund}): ${v.ko}`)
      v.uebersprungen = true
    }
  }

  /* a) Alte Vorratswörter nach altem Verfahren -> neu erzeugen.
        Beispielsatz bleibt (ist schon vertont). */
  const nachbessern = vorrat
    .filter((v) => !v.uebersprungen && (v.anreicherung ?? 0) < METHODE && invNachId.has(v.inv_id))
    .sort((a, b) => (a.rang ?? 99999) - (b.rang ?? 99999))
  /* b) Neue Kandidaten bis zum Ziel */
  const bereitsBereit = vorrat.filter((v) => v.bereit && !v.uebersprungen).length
  const fehlen = Math.max(0, ANZAHL - bereitsBereit)
  const kandidaten = inventar
    .filter((e) => e.pos !== 'number' && !ausgeschlossen(e))
    .filter((e) => !bibliothekKo.has(vergleichKo(e.ko)) && !bibliothekInv.has(e.id))
    .filter((e) => !imVorrat.has(e.id))
    .sort((a, b) => (a.rang ?? 99999) - (b.rang ?? 99999))
    .slice(0, fehlen)
  console.log(`Schon bereit: ${bereitsBereit} · nachbessern: ${nachbessern.length} · neu: ${kandidaten.length}`)

  const eintraege = [
    ...nachbessern.map((v) => ({
      ...eintragAus({ ...v, id: v.inv_id }, invNachId.get(v.inv_id), { brauchtSatz: !v.ex, enFest: false }),
      inv: invNachId.get(v.inv_id),
      alt: v,
    })),
    ...kandidaten.map((e) => ({
      ...eintragAus({ ko: e.ko }, e, { brauchtSatz: true, enFest: false }),
      inv: e,
      alt: null,
    })),
  ]
  if (PROBE) eintraege.splice(5)
  if (!eintraege.length) return
  const erg = await reichereAn(eintraege)

  const zeilen = []
  let bereit = 0
  for (const e of eintraege) {
    const f = erg.get(e.id) ?? {}
    const alt = e.alt ?? {}
    const ex = alt.ex || f.ex || null
    const exTr = alt.ex ? alt.ex_tr : f.ex_tr || null
    const komplett = !!(f.enOk && f.deOk && f.en && f.de && f.pos && ex && exTr)
    if (komplett) bereit++
    zeilen.push({
      inv_id: e.id,
      profile: PROFIL,
      ko: e.ko,
      en: (f.enOk && f.en) || alt.en || e.inv.en,
      de: (f.deOk && f.de) || null,
      pos: f.pos ?? e.inv.pos ?? null,
      rang: e.inv.rang == null || e.inv.rang >= 99999 ? null : e.inv.rang,
      ex,
      ex_tr: exTr,
      nuance: f.nuance ?? null,
      info: f.info ?? null,
      hanja: f.hanja ?? alt.hanja ?? null,
      zaehlwort: !!f.zaehlwort,
      zahlsystem: f.zahlsystem ?? null,
      bereit: komplett,
      /* Verfahren nur dann als erledigt vermerken, wenn das Modell
         geantwortet hat — sonst beim nächsten Lauf erneut versuchen */
      anreicherung: erg.has(e.id) ? METHODE : (alt.anreicherung ?? 0),
    })
    if (!komplett) console.log(`  unvollständig (bleibt bereit=false): ${e.ko}${f.enOk && f.deOk ? '' : ' [Bedeutung nicht abgenommen]'}`)
    if (PROBE) console.log(`  [probe] ${JSON.stringify(zeilen.at(-1))}`)
  }
  for (let von = 0; von < zeilen.length; von += 50) await upserteVorrat(zeilen.slice(von, von + 50))
  console.log(`Vorrat: ${bereit} von ${zeilen.length} Wörtern komplett${TROCKEN ? ' (Trockenlauf)' : ''}.`)
}

/* ---------- Schritt 2b: Familien + Nuancen ----------
   Wörter mit gleicher Bedeutung (Bibliothek + Vorrat) stünden in der
   Vorschlagsliste identisch. Jede Gruppe bekommt je Mitglied eine
   UNTERSCHEIDENDE Nuance — und, wenn das Modell die Gruppe als echte
   Bedeutungsfamilie bestätigt, eine gemeinsame `familie`. Auf der
   Erkennen-Karte zählt dann jedes Familienmitglied als richtig
   (Franz 09.09.). Familien werden bei jedem Lauf frisch gerechnet. */
const bedeutungsSinne = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .split(/[/,;]/)
    .map((t) => t.replace(/^\s*to /, '').replace(/[^a-zäöüß ]/g, '').trim())
    .filter((t) => t.length >= 2)

async function familienBilden() {
  console.log('\n=== Schritt 2b: Bedeutungsfamilien + Nuancen ===')
  const [woerter, vorrat] = await Promise.all([
    hole(`words?profile=eq.${PROFIL}&select=id,ko,en,de,pos,ex,nuance,familie,hand`),
    hole(`vorrat?profile=eq.${PROFIL}&uebersprungen=is.false&select=inv_id,ko,en,de,pos,ex,nuance,familie`),
  ])
  const alle = [
    ...woerter.map((w) => ({ ...w, quelle: 'words', key: w.id })),
    ...vorrat.map((v) => ({ ...v, quelle: 'vorrat', key: v.inv_id })),
  ]
  /* Union-Find über gemeinsame Bedeutungs-Sinne (en und de) */
  const eltern = new Map(alle.map((w) => [w.key, w.key]))
  const finde = (k) => (eltern.get(k) === k ? k : (eltern.set(k, finde(eltern.get(k))), eltern.get(k)))
  const vereine = (a, b) => eltern.set(finde(a), finde(b))
  for (const feld of ['en', 'de']) {
    const nachSinn = new Map()
    for (const w of alle) {
      for (const sinn of bedeutungsSinne(w[feld])) {
        if (!nachSinn.has(sinn)) nachSinn.set(sinn, [])
        nachSinn.get(sinn).push(w)
      }
    }
    for (const mitglieder of nachSinn.values()) {
      for (let i = 1; i < mitglieder.length; i++) vereine(mitglieder[0].key, mitglieder[i].key)
    }
  }
  const gruppen = new Map()
  for (const w of alle) {
    const wurzel = finde(w.key)
    if (!gruppen.has(wurzel)) gruppen.set(wurzel, [])
    gruppen.get(wurzel).push(w)
  }
  /* Nur echte Gruppen, und nicht zu groß (Riesengruppen = Sinn zu
     allgemein, z. B. "thing") */
  const liste = [...gruppen.values()].filter((g) => g.length >= 2 && g.length <= 6)
  console.log(`Gruppen mit gleicher Bedeutung: ${liste.length}`)
  if (PROBE) {
    liste.splice(8)
    console.log('  [probe] nur die ersten 8 Gruppen')
  }

  const SYSTEM_FAMILIE = [
    'Several Korean words in a learner\'s deck share a gloss (English or German), so they look identical in the app. Input: groups, each line "groupId | korean | english | german | example sentence".',
    'For EACH group decide: is this a real MEANING FAMILY — words a beginner reasonably treats as the same meaning (진짜/정말 "really", 묻다/물어보다 "to ask", 함께/같이 "together")? Then "familie": true. If they merely share a word in the gloss but mean different things (병 "bottle" vs 병 "illness", 배 "stomach" vs "ship" vs "pear"), "familie": false.',
    'Answer false as well whenever the words differ in something the learner MUST get right and would stop noticing if the app accepted either one: pointing words that differ by distance or speaker (이/그/저 and everything built on them — 이것/그것, 여기/거기, 이날/그날), direction (들어가다 in vs 들어오다 out, 가다 vs 오다), plain negation vs inability (안 vs 못), opposites of any kind, and pairs where one word asks a question and the other states an amount (얼마 vs 적다). Word class alone (verb vs its noun, 공부하다/공부) does NOT make them different — those stay a family.',
    'And for EACH word write a short DISTINGUISHING note in German (max 60 characters, no full sentence needed) that says what makes THIS word different from the others in its group — usage, register, nuance, typical context. Examples: 때 -> "Zeitpunkt/Moment (als, wenn) – nicht Dauer"; 시간 -> "Zeit als Dauer oder Uhrzeit, messbar"; 물어보다 -> "höflicher/alltäglicher: mal nachfragen"; 묻다 -> "neutral fragen, auch schriftlich".',
    'Return ONLY a JSON array: [{"groupId":"...","familie":true|false,"woerter":[{"ko":"...","nuance":"..."}]}] — one object per group, every word included, notes within a group must differ.',
  ].join('\n')

  const neueFamilie = new Map() /* key -> familie-id */
  let nuancenGesetzt = 0
  for (let von = 0; von < liste.length; von += 8) {
    const teil = liste.slice(von, von + 8)
    const text = teil
      .map((g, i) => g.map((m) => `g${von + i} | ${m.ko} | ${m.en || ''} | ${m.de || ''} | ${m.ex || ''}`).join('\n'))
      .join('\n')
    let antwort
    try {
      antwort = await frage(SYSTEM_FAMILIE, text, { maxTokens: 5000, effort: 'medium' })
    } catch (e) {
      if (e instanceof LimitErreicht) throw e
      console.error(`  Modellanfrage fehlgeschlagen: ${e.message}`)
      continue
    }
    if (!Array.isArray(antwort)) continue
    for (const a of antwort) {
      const gi = Number(String(a.groupId ?? '').replace('g', ''))
      const g = liste[gi]
      if (!g) continue
      const famId = a.familie === true ? 'f:' + g.map((m) => m.ko).sort().join('·') : null
      for (const w of Array.isArray(a.woerter) ? a.woerter : []) {
        const m = g.find((x) => norm(x.ko) === norm(w.ko))
        if (!m) continue
        if (famId) neueFamilie.set(m.key, famId)
        const nuance = pruefeText(w.nuance, 3, 80)
        if (!nuance || handFelder(m).includes('nuance')) continue
        try {
          if (m.quelle === 'words') await patche('words', `id=eq.${m.key}`, { nuance })
          else await patche('vorrat', `profile=eq.${PROFIL}&inv_id=eq.${m.key}`, { nuance })
          nuancenGesetzt++
          console.log(`  ${TROCKEN ? '[trocken] ' : ''}${m.ko}${famId ? ' [Familie]' : ''}: ${nuance}`)
        } catch (err) {
          console.error(`  Schreiben fehlgeschlagen (${m.ko}): ${err.message}`)
        }
      }
    }
  }
  /* Familien schreiben — auch das Löschen alter Zuordnungen */
  let famGesetzt = 0
  for (const w of alle) {
    const soll = neueFamilie.get(w.key) ?? null
    if ((w.familie ?? null) === soll) continue
    try {
      if (w.quelle === 'words') await patche('words', `id=eq.${w.key}`, { familie: soll })
      else await patche('vorrat', `profile=eq.${PROFIL}&inv_id=eq.${w.key}`, { familie: soll })
      famGesetzt++
    } catch (err) {
      console.error(`  Familie nicht gespeichert (${w.ko}): ${err.message}`)
    }
  }
  console.log(`Nuancen gesetzt: ${nuancenGesetzt} · Familien geändert: ${famGesetzt}${TROCKEN ? ' (Trockenlauf — NICHTS gespeichert)' : ''}`)
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

/* ---------- NACHTRAG: Formalität, Partikel, 해요-Form ----------
   (Franz 10.09.) Ein schmaler, billiger Durchgang NUR für die vier
   neuen Angaben. Bedeutung und Infotext bleiben unangetastet — die
   stehen schon in geprüfter Qualität da, und sie neu zu erzeugen
   würde das Vierfache kosten.

   register   Die Höflichkeit steckt im Koreanischen meistens in der
              ENDUNG, nicht im Wort. Nur wo sie im Stamm sitzt, ist
              die Angabe eine Hilfe: 드시다, 계시다, 주무시다 (höflich
              über eine Respektsperson), 드리다, 여쭈다 (bescheiden
              über mich selbst), 뭐, 거, 대박 (locker). Alles andere
              ist neutral und bekommt keinen Chip.
   register_partner  Das Gegenstück: auf 먹다 steht 드시다, auf
              드시다 steht 먹다.
   kasus      Die Partikel, die das Verb verlangt — das Gegenstück
              zum Kasus auf 해인s Seite. Gerade dort wertvoll, wo
              Koreanisch anders baut als Deutsch: 친구를 만나다 (를),
              버스를 타다 (를), 커피가 좋다 (가).
   haeyo      Die 해요-Form, das Gegenstück zu Plural/Konjugation bei
              ihr. 덥다 wird zu 더워요, nicht 덥어요.
   unregel    Die Unregelmäßigkeits-Klasse (ㅂ ㄷ ㅅ 르 ㅎ 으 ㄹ).

   Geprüft wird ohne zweites Modell: die 해요-Form rechnet das Skript
   für regelmäßige Verben selbst nach. Weicht die Antwort ab, MUSS
   das Modell eine Klasse nennen — sonst fällt das Feld durch. */

/* 2 seit 10.09.: die erste Runde hatte drei Fehler — 15 richtige
   해요-Formen fielen durch, Gegenteile landeten im Partner-Feld, und
   viele Partikel-Muster kamen ohne Nomen ("을 듣다"). */
const EXTRAS = 2
const REGISTER = ['hoeflich', 'bescheiden', 'neutral', 'locker']
const UNREGEL = ['ㅂ', 'ㄷ', 'ㅅ', '르', 'ㅎ', '으', 'ㄹ']
/* Partikel, die eine Angabe überhaupt erst nützlich machen */
const PARTIKEL = ['을', '를', '이', '가', '에게', '한테', '에서', '에', '와', '과', '하고', '으로', '로', '의', '도', '만', '부터', '까지', '보다']

/* ---- Hangul-Rechnung für die 해요-Form ---- */
const HANGUL_START = 0xac00
function silbe(c) {
  const x = String(c ?? '').codePointAt(0) - HANGUL_START
  if (x < 0 || x > 11171) return null
  return { l: Math.floor(x / 588), v: Math.floor((x % 588) / 28), t: x % 28 }
}
const baueSilbe = (l, v, t) => String.fromCodePoint(HANGUL_START + l * 588 + v * 28 + t)

/* Batchim, bei denen eine Unregelmäßigkeit möglich IST — 덥다 wird zu
   더워요, 입다 aber regelmäßig zu 입어요. Die Liste sagt also nur, ob
   eine Abweichung von der Regelform glaubhaft ist. */
const UNSICHER_BATCHIM = new Map([
  [7, 'ㄷ'],
  [17, 'ㅂ'],
  [19, 'ㅅ'],
  [27, 'ㅎ'],
])
/* Ein paar Wörter folgen gar keiner Regel */
const HAEYO_SONDERFALL = { 아니다: '아니에요', 이다: '이에요' }

/* Die haeufigen unregelmaessigen Verben und Adjektive auf A1/A2-Niveau.
   Warum diese Liste noetig ist: 덥다 und 입다 sehen mechanisch gleich
   aus (Batchim ㅂ), aber 덥다 wird zu 더워요 und 입다 zu 입어요. Ohne
   Wortwissen laesst sich das nicht unterscheiden — die naive Regelform
   덥어요 wuerde sonst als richtig durchgehen. Wer hier steht, MUSS mit
   Klasse gemeldet werden. Woerter ausserhalb der Liste glaubt die
   Pruefung dem Modell. */
const IRREGULAER = {
  /* ㅂ */ 덥다: 'ㅂ', 춥다: 'ㅂ', 쉽다: 'ㅂ', 어렵다: 'ㅂ', 가깝다: 'ㅂ', 무겁다: 'ㅂ',
  가볍다: 'ㅂ', 맵다: 'ㅂ', 아름답다: 'ㅂ', 반갑다: 'ㅂ', 즐겁다: 'ㅂ', 새롭다: 'ㅂ',
  귀엽다: 'ㅂ', 눕다: 'ㅂ', 돕다: 'ㅂ', 굽다: 'ㅂ', 흥미롭다: 'ㅂ', 시끄럽다: 'ㅂ',
  더럽다: 'ㅂ', 무섭다: 'ㅂ', 부럽다: 'ㅂ', 외롭다: 'ㅂ',
  /* ㄷ */ 듣다: 'ㄷ', 걷다: 'ㄷ', 묻다: 'ㄷ', 싣다: 'ㄷ', 깨닫다: 'ㄷ',
  /* ㅅ */ 짓다: 'ㅅ', 낫다: 'ㅅ', 잇다: 'ㅅ', 붓다: 'ㅅ',
  /* ㅎ */ 그렇다: 'ㅎ', 어떻다: 'ㅎ', 이렇다: 'ㅎ', 저렇다: 'ㅎ', 하얗다: 'ㅎ',
  빨갛다: 'ㅎ', 노랗다: 'ㅎ', 파랗다: 'ㅎ', 까맣다: 'ㅎ',
}

/* Die REGELMÄSSIGE 해요-Form. Wird immer gerechnet, auch bei den
   unsicheren Batchim — nur so lässt sich erkennen, ob eine Antwort
   ohne Klasse (입어요) richtig ist. null nur, wenn die Form ohne
   Kenntnis der Klasse gar nicht bestimmbar ist (ㅡ am Stammende). */
function regelHaeyo(ko) {
  let stamm = norm(ko)
  if (HAEYO_SONDERFALL[stamm]) return HAEYO_SONDERFALL[stamm]
  if (!stamm.endsWith('다')) return null
  stamm = stamm.slice(0, -1)
  if (!stamm) return null
  /* 하다 -> 해요 (공부하다 -> 공부해요) */
  if (stamm.endsWith('하')) return stamm.slice(0, -1) + '해요'
  const d = silbe(stamm.at(-1))
  if (!d) return null
  const vorne = stamm.slice(0, -1)
  if (d.t !== 0) {
    /* ㅏ oder ㅗ -> 아요, sonst 어요 */
    return stamm + (d.v === 0 || d.v === 8 ? '아요' : '어요')
  }
  /* Ohne Batchim verschmilzt die Endung mit dem Vokal.
     'zu' = Endung anhängen, sonst der neue Vokal der letzten Silbe. */
  const ENDVOKAL = {
    0: 'zu', /* ㅏ  가 -> 가요 */
    1: 'zu', /* ㅐ  보내 -> 보내요 */
    2: 'zu', /* ㅑ */
    4: 'zu', /* ㅓ  서 -> 서요 */
    5: 'zu', /* ㅔ  세 -> 세요 */
    6: 'zu', /* ㅕ  켜 -> 켜요 */
    8: 9, /* ㅗ -> ㅘ  오 -> 와요 */
    11: 10, /* ㅚ -> ㅙ  되 -> 돼요 */
    13: 14, /* ㅜ -> ㅝ  주 -> 줘요 */
    16: 'lang', /* ㅟ  쉬 -> 쉬어요 */
    19: 'lang', /* ㅢ */
    20: 6, /* ㅣ -> ㅕ  마시 -> 마셔요 */
  }
  const regel = ENDVOKAL[d.v]
  if (regel === undefined) return null /* ㅡ: 으/르-Regel, braucht die Klasse */
  if (regel === 'zu') return stamm + '요'
  if (regel === 'lang') return stamm + '어요'
  return vorne + baueSilbe(d.l, regel, 0) + '요'
}

/* Passt die gemeldete Klasse überhaupt zur Wortform? Ein ㅂ-불규칙
   braucht ein ㅂ am Stammende, ein 르-불규칙 ein 르. */
function klassePasst(klasse, ko) {
  const stamm = norm(ko).replace(/다$/, '')
  if (!stamm) return false
  const d = silbe(stamm.at(-1))
  if (!d) return false
  if (klasse === '르') return stamm.endsWith('르')
  if (klasse === '으') return d.v === 18 && d.t === 0
  if (klasse === 'ㄹ') return d.t === 8
  const batchim = UNSICHER_BATCHIM.get(d.t)
  return batchim === klasse
}

/* Anlaut der ersten Silbe — grober Plausibilitätstest (덥다 -> 더워요
   behält ㄷ, 모르다 -> 몰라요 behält ㅁ) */
const anlaut = (s) => silbe(String(s ?? '')[0])?.l ?? -1

function pruefeHaeyo(form, klasse, ko) {
  const t = pruefeText(form, 2, 20)
  if (!t || !t.endsWith('요')) return null
  const sil = [...t].filter((c) => /[가-힣]/.test(c))
  if (sil.length < 2 || sil.length > 7) return null
  if (anlaut(t) !== anlaut(norm(ko))) return null
  const regel = regelHaeyo(ko)
  /* Stimmt die Antwort mit der Regelform überein, ist sie regelmäßig —
     eine trotzdem gemeldete Klasse wird verworfen (Fund 10.09.: 15
     völlig richtige Formen wie 입어요 und 좋아요 fielen durch, weil das
     Modell korrekt KEINE Klasse nannte). */
  const pflicht = IRREGULAER[norm(ko)]
  if (regel && t === regel && !pflicht) return { haeyo: t, unregel: null }
  /* Bekanntes unregelmaessiges Wort: die passende Klasse ist Pflicht,
     sonst waere 덥어요 „regelmaessig" und damit falsch durchgewinkt */
  if (pflicht) return klasse === pflicht ? { haeyo: t, unregel: pflicht } : null
  /* Weicht sie ab, muss eine Klasse genannt sein, die zur Wortform passt */
  if (!UNREGEL.includes(klasse) || !klassePasst(klasse, ko)) return null
  return { haeyo: t, unregel: klasse }
}

function pruefePartikel(s) {
  const t = pruefeText(s, 4, 44)
  if (!t) return null
  if (!/[가-힣]/.test(t)) return null
  if (!PARTIKEL.some((p) => t.includes(p))) return null
  return t
}

/* ---- Der Durchgang ---- */
async function nachtragLauf() {
  console.log(`\n=== Nachtrag: Formalität, Partikel, 해요-Form (Stand ${EXTRAS}) ===`)
  let woerter
  let vorrat
  try {
    woerter = await hole(
      `words?profile=eq.${PROFIL}&select=id,ko,en,de,pos,register,register_partner,haeyo,unregel,kasus,extras_stand&order=created_at.asc`
    )
    vorrat = await hole(
      `vorrat?profile=eq.${PROFIL}&uebersprungen=is.false&select=inv_id,ko,en,de,pos,register,register_partner,haeyo,unregel,kasus,extras_stand,rang&order=rang.asc.nullslast`
    )
  } catch (e) {
    if (/register|haeyo|unregel|extras_stand|kasus/.test(e.message)) {
      console.error('Spalten fehlen — bitte zuerst Migration 018 ausführen.')
      process.exit(1)
    }
    throw e
  }

  const offen = [
    ...woerter
      .filter((w) => (w.extras_stand ?? 0) < EXTRAS)
      .map((w) => ({ key: w.id, quelle: 'words', ko: w.ko, en: w.en, de: w.de, pos: w.pos })),
    ...vorrat
      .filter((v) => (v.extras_stand ?? 0) < EXTRAS)
      .slice(0, ANZAHL)
      .map((v) => ({ key: v.inv_id, quelle: 'vorrat', ko: v.ko, en: v.en, de: v.de, pos: v.pos })),
  ]
  console.log(
    `Bibliothek: ${woerter.length} (offen ${woerter.filter((w) => (w.extras_stand ?? 0) < EXTRAS).length}) · ` +
      `Vorrat: ${vorrat.length} (offen ${vorrat.filter((v) => (v.extras_stand ?? 0) < EXTRAS).length}, davon jetzt ${Math.min(ANZAHL, vorrat.filter((v) => (v.extras_stand ?? 0) < EXTRAS).length)})`
  )
  if (PROBE) offen.splice(8)
  if (!offen.length) {
    console.log('Nichts zu tun.')
    return
  }
  console.log(`Jetzt dran: ${offen.length}`)

  const SYSTEM_NACHTRAG = [
    'You add four small grammar facts to Korean vocabulary entries of a German adult beginner (A1-A2). The meaning is already settled and is NOT your job — do not comment on it.',
    'Input, one entry per line: id | korean | pos | meaning.',
    'Return ONLY a JSON array, one object per id, with exactly these keys:',
    '  "id": copy',
    '  "register": one of "hoeflich", "bescheiden", "neutral", "locker".',
    '     In Korean the speech level normally sits in the ENDING, not in the word, so almost every word is "neutral" — use it generously.',
    '     "hoeflich" ONLY for words that are honorific in themselves, used ABOUT a person you respect: 드시다, 계시다, 주무시다, 말씀하시다, 돌아가시다, 분, 성함, 연세, 댁, 진지.',
    '     "bescheiden" ONLY for humble words used about MYSELF toward someone above me: 드리다, 여쭈다, 뵙다, 저, 제, 저희.',
    '     "locker" ONLY for words that would sound too casual toward a stranger or an elder: 뭐, 거, 걔, 대박, 짱, 헐, 야.',
    '     Everything else: "neutral".',
    '  "partner": the counterpart of this word on a DIFFERENT politeness level, in Korean, or null. On 먹다 that is 드시다; on 드시다 it is 먹다; on 주다 it is 드리다; on 사람 it is 분; on 이름 it is 성함; on 뭐 it is 무엇. This is NOT the opposite of the word: 사다 and 팔다, 입다 and 벗다 are opposites, not politeness partners — return null there.',
    '  "partner_register": the level of that partner, same four values. It MUST differ from "register" — otherwise the pair is not a politeness pair and you return null for both.',
    '  "partikel": ONLY for verbs and adjectives, else null. The particle pattern, written as a SHORT REAL PHRASE the learner can copy — always with a concrete everyday noun, never a bare particle: "친구를 만나다 (를)", "버스를 타다 (를)", "커피가 좋다 (가)", "음악을 듣다 (을)", "학교에 가다 (에)", "시간이 필요하다 (가)", "~에게 ~을 주다". Never write "을 듣다" or "이/가 있다" — a pattern without a noun teaches nothing. Choose the noun that shows the word in its most typical use, and prefer the pattern where Korean differs from German/English. Null when the word takes no object at all.',
    '  "haeyo": ONLY for verbs and adjectives (dictionary form ending in 다), else null. The polite 해요 form: 먹다 -> "먹어요", 덥다 -> "더워요", 듣다 -> "들어요", 모르다 -> "몰라요", 그렇다 -> "그래요", 쓰다 -> "써요", 공부하다 -> "공부해요". Write it exactly, never guess.',
    '  "unregel": the irregular class when the 해요 form does NOT follow the plain rule: one of "ㅂ", "ㄷ", "ㅅ", "르", "ㅎ", "으", "ㄹ". When the word is regular, null.',
    'If you are unsure about a field, use null. A wrong 해요 form is worse than none.',
  ].join('\n')

  const nachSchluessel = new Map(offen.map((e) => [e.key, e]))
  let gesetzt = 0
  let mitRegister = 0
  let mitPartikel = 0
  let mitHaeyo = 0
  for (let von = 0; von < offen.length; von += 25) {
    const teil = offen.slice(von, von + 25)
    let antwort = null
    for (let versuch = 1; versuch <= 2 && !Array.isArray(antwort); versuch++) {
      try {
        antwort = await frage(
          SYSTEM_NACHTRAG,
          teil.map((e) => [e.key, e.ko, e.pos || '', e.de || e.en || ''].join(' | ')).join('\n'),
          { maxTokens: 8000, effort: 'medium' }
        )
        if (!Array.isArray(antwort)) console.error('  Antwort war kein Array')
      } catch (e) {
        if (e instanceof LimitErreicht) throw e
        console.error(`  Modellanfrage fehlgeschlagen (Versuch ${versuch}): ${e.message}`)
        antwort = null
      }
    }
    if (!Array.isArray(antwort)) {
      console.error(`  Stapel übersprungen — die ${teil.length} Wörter bleiben offen`)
      continue
    }
    for (const a of antwort) {
      const e = nachSchluessel.get(String(a?.id ?? ''))
      if (!e || !teil.includes(e)) continue
      const patch = { extras_stand: EXTRAS }
      const register = REGISTER.includes(a.register) ? a.register : 'neutral'
      if (register !== 'neutral') {
        patch.register = register
        mitRegister++
      }
      /* Nur ein echter Ebenenwechsel zählt. Ohne diese Prüfung schrieb
         das Modell Gegenteile ins Feld: 사다 -> 팔다, 입다 -> 벗다
         (Fund 10.09.). */
      const partner = pruefeText(a.partner, 1, 20, /^[가-힣][가-힣\s]*$/)
      const partnerEbene = REGISTER.includes(a.partner_register) ? a.partner_register : null
      if (partner && partnerEbene && partnerEbene !== register && norm(partner) !== norm(e.ko)) {
        patch.register_partner = partner
      }
      const beugbar = (e.pos === 'verb' || e.pos === 'adj') && norm(e.ko).endsWith('다')
      if (beugbar) {
        const p = pruefePartikel(a.partikel)
        if (p) {
          patch.kasus = p
          mitPartikel++
        }
        const h = pruefeHaeyo(a.haeyo, a.unregel, e.ko)
        if (h) {
          patch.haeyo = h.haeyo
          if (h.unregel) patch.unregel = h.unregel
          mitHaeyo++
        } else if (a.haeyo) {
          pruefliste.push(`해요-Form ${e.ko}: "${a.haeyo}" (Klasse ${a.unregel ?? '—'}) nicht plausibel`)
        }
      }
      try {
        if (e.quelle === 'words') await patche('words', `id=eq.${e.key}`, patch)
        else await patche('vorrat', `profile=eq.${PROFIL}&inv_id=eq.${e.key}`, patch)
        gesetzt++
        const teile = [
          patch.register ? `Ebene ${patch.register}` : '',
          patch.register_partner ? `Gegenstück ${patch.register_partner}` : '',
          patch.kasus ? patch.kasus : '',
          patch.haeyo ? `${patch.haeyo}${patch.unregel ? ` [${patch.unregel}-불규칙]` : ''}` : '',
        ].filter(Boolean)
        if (teile.length) console.log(`  ${TROCKEN ? '[trocken] ' : ''}${e.ko}: ${teile.join(' · ')}`)
      } catch (err) {
        console.error(`  Schreiben fehlgeschlagen (${e.ko}): ${err.message}`)
      }
    }
    console.log(`  … ${Math.min(von + 25, offen.length)}/${offen.length}`)
  }
  console.log(
    `Nachtrag: ${gesetzt} Einträge · Ebene ${mitRegister} · Partikel ${mitPartikel} · 해요-Form ${mitHaeyo}` +
      (TROCKEN ? ' (Trockenlauf — NICHTS gespeichert)' : '')
  )
}

/* ---------- Schritt 4: Wortart-Bericht ---------- */
async function bericht() {
  const vorrat = await hole(
    `vorrat?profile=eq.${PROFIL}&uebersprungen=is.false&select=pos,rang,bereit,zaehlwort,info&order=rang.asc.nullslast&limit=300`
  )
  const zaehl = {}
  for (const v of vorrat) zaehl[v.pos ?? '?'] = (zaehl[v.pos ?? '?'] ?? 0) + 1
  console.log(`\n=== Wortarten der nächsten ${vorrat.length} Vorratswörter ===`)
  for (const [pos, n] of Object.entries(zaehl).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${pos.padEnd(13)} ${String(n).padStart(4)}  ${((n / vorrat.length) * 100).toFixed(1)} %`)
  }
  console.log(`  bereit: ${vorrat.filter((v) => v.bereit).length} · Zählwörter: ${vorrat.filter((v) => v.zaehlwort).length} · mit Infotext: ${vorrat.filter((v) => v.info).length}`)
}

/* ---------- Hauptlauf ---------- */
let limitErreicht = false
try {
if (NUR_AUDIO) {
  await audioPruefen()
} else if (NUR_BERICHT) {
  await bericht()
} else if (NUR_NUANCEN) {
  await familienBilden()
} else if (NACHTRAG) {
  await nachtragLauf()
  if (pruefliste.length) {
    console.log(`
=== PRUEFLISTE (${pruefliste.length}) ===`)
    for (const q of pruefliste) console.log('  ' + q)
  }
  console.log(`
Modell: ${tokensRein} Tokens rein, ${tokensRaus} raus -> grob ${kostenUsd.toFixed(2)} $.`)
} else if (ZAHLEN_LOESCHEN) {
  const woerter = await hole(`words?profile=eq.${PROFIL}&select=id,ko,en,inv_id`)
  await zahlenInBibliothek(woerter)
} else {
  await bestandAnreichern()
  await vorratFuellen()
  await familienBilden()
  await bericht()
  if (pruefliste.length) {
    console.log(`\n=== PRÜFLISTE (${pruefliste.length}) — bitte von Hand ansehen ===`)
    for (const p of pruefliste) console.log('  ' + p)
  }
  if (eigenePruefliste.length) {
    console.log(`\n=== DEINE EIGENEN BEDEUTUNGEN (${eigenePruefliste.length}) — unverändert, nur ein Hinweis ===`)
    for (const p of eigenePruefliste) console.log('  ' + p)
  }
  console.log(`\nModell: ${tokensRein} Tokens rein, ${tokensRaus} raus -> grob ${kostenUsd.toFixed(2)} $.`)
}
} catch (e) {
  if (!(e instanceof LimitErreicht)) throw e
  limitErreicht = true
  console.error('')
  console.error('=== ABBRUCH: Guthaben-/Nutzungslimit erreicht ===')
  console.error(`  ${e.message}`)
  console.error('  Alles bis hierher ist gespeichert. Der naechste Lauf macht genau dort weiter.')
}
console.log(limitErreicht ? 'abgebrochen (Limit) — Rest beim naechsten Lauf' : 'ok')
