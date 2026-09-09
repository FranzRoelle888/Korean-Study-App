/* ============================================================
   DEUTSCH ANREICHERN — Kartenqualität auf 해인s Seite
   (Gegenstück zu vokabeln-anreichern.mjs; Konzept §12)

   WARUM EIN EIGENES SKRIPT: Ihre Seite unterscheidet sich an zwei
   Stellen grundlegend von Franz' Seite.
     1. Ihr Nachziehstapel liegt in einer DATEI
        (src/core/inventare/goethe-woerter.json), nicht in einer
        Tabelle. Die Goethe-Liste ist für jeden Lerner dieselbe,
        funktioniert offline und kostet keine Abfrage — sie bleibt
        deshalb eine Datei. Der Lauf schreibt die Datei, Franz
        committet das Ergebnis.
     2. Statt Hanja braucht Deutsch andere Angaben: Artikel und
        Plural, trennbare und unregelmäßige Verben, und vor allem
        den KASUS („jdm. helfen (D)", „etw. sehen (A)").

   Diagnose, die dazu geführt hat (Messung 09.09.):
     - 1064 von 1258 Vorratswörtern hatten nur EIN automatisch
       gezogenes koreanisches Wort als Bedeutung. Oft die falsche:
       nehmen = 고르다 (auswählen), gehören = 속하다 (zu einer
       Gruppe gehören, obwohl der Beispielsatz Besitz zeigt),
       fehlen = 결석하다 (in der Schule fehlen).
     - 321 Wörter ohne Wortart, 131 Nomen ohne Plural.
     - 68 Verben mit abgeschnittener Konjugation: gefallen stand
       als „hat gefalle", gratulieren als „gratuliert, hat g".
     - 8 Einträge trugen einen englischen Beispielsatz als
       Bedeutung („der Herr" = „Good day, Mr. Sommer!").

   Verfahren (wie bei Franz, Vier-Augen-Prinzip):
     Sonnet schreibt vom DEUTSCHEN Wort aus — der mitgelieferte
     Beispielsatz zeigt, welche Bedeutung gemeint ist. Opus prüft
     nur die Bedeutungen, getrennt nach Englisch und Koreanisch.
     Bei Widerspruch eine Nachbesserung, dann Prüfliste.

   Ihre Bedeutungszeile bleibt „English (한국어)" (Entscheidung
   Franz 09.09.) — Englisch als Brücke, Koreanisch als Anker.

   Was dieses Skript NICHT anfasst: plural und conj in ihrer
   BIBLIOTHEK. Die füllt der Nachtlauf fill-extras.mjs; doppelte
   Zuständigkeit gäbe nur Streit. In der DATEI werden Plural und
   Konjugation dagegen ergänzt und repariert, weil sie dort im
   Einführungsritual sichtbar sind.

   Aufruf: node scripts/deutsch-anreichern.mjs
             [--dry] [--probe] [--anzahl 300]
             [--nur-datei] [--nur-bestand] [--nuancen]
   Secrets: ANTHROPIC_API_KEY, SUPABASE_SERVICE_KEY (nur in Actions).
   ============================================================ */
import { readFileSync, writeFileSync } from 'node:fs'
import { germanPool } from '../src/core/germanPool.js'

const SUPABASE_URL = 'https://gkrubhwwzgekmbiltslt.supabase.co'
const DB_KEY = process.env.SUPABASE_SERVICE_KEY
const API_KEY = process.env.ANTHROPIC_API_KEY
const MODELL_SCHREIBT = 'claude-sonnet-5'
const MODELL_PRUEFT = 'claude-opus-5'
const METHODE = 2
const PROFIL = 'de'

const DATEI = 'src/core/inventare/goethe-woerter.json'
const RANG_DATEI = 'src/core/inventare/goethe-rang.json'

const argWert = (name) => {
  const i = process.argv.indexOf(name)
  return i === -1 ? null : process.argv[i + 1]
}
const PROBE = process.argv.includes('--probe')
const TROCKEN = process.argv.includes('--dry') || PROBE
const NUR_DATEI = process.argv.includes('--nur-datei')
const NUR_BESTAND = process.argv.includes('--nur-bestand')
const NUR_NUANCEN = process.argv.includes('--nuancen')
const ANZAHL = Number(argWert('--anzahl') ?? 300)

if (!DB_KEY && !NUR_DATEI) {
  console.error('SUPABASE_SERVICE_KEY fehlt.')
  process.exit(1)
}
if (!API_KEY) {
  console.error('ANTHROPIC_API_KEY fehlt.')
  process.exit(1)
}

/* Antworten sind lang (Infotext + Kasus), deshalb kleine Stapel */
const BATCH = 12

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
  if (daten.stop_reason === 'max_tokens') console.warn('  Antwort abgeschnitten (max_tokens)')
  const text = (daten.content ?? []).map((c) => c.text ?? '').join('')
  const roh = text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim()
  return JSON.parse(roh)
}

/* ---------- Hilfen ---------- */
const norm = (s) => String(s ?? '').normalize('NFC').trim().replace(/\s+/g, ' ')
const handFelder = (w) => (Array.isArray(w?.hand) ? w.hand.map(String) : [])
const pruefliste = []
const eigenePruefliste = []

function pruefeText(s, min, max, muster) {
  if (typeof s !== 'string') return null
  const t = norm(s)
  if (t.length < min || t.length > max) return null
  if (muster && !muster.test(t)) return null
  return t
}
const GLOSSE_EN = /^[A-Za-z][A-Za-z' ,./()-]*$/
/* Koreanische Bedeutung: nur koreanische Zeichen, Satzzeichen und
   die Tilde (die Goethe-Liste schreibt ~부터, ~의 것이다), und
   mindestens EIN Hangul — in der alten Liste standen dort teils
   englische Sätze („Good day, Mr. Sommer!") */
const GLOSSE_KO = /^[가-힣ㄱ-ㅎㅏ-ㅣ~][가-힣ㄱ-ㅎㅏ-ㅣ\s,./()~-]*$/
const hatHangul = (s) => /[가-힣]/.test(String(s ?? ''))

/* Infotext: 2-5 Zeilen, jede mit fettem Stichwort. Für sie sind die
   Stichwörter koreanisch (사용, 주의, 비슷, 격 …). */
function pruefeInfo(s) {
  const roh = Array.isArray(s) ? s : typeof s === 'string' ? s.split(/\r?\n/) : null
  if (!roh) return null
  const zeilen = roh.map((z) => String(z ?? '').trim()).filter(Boolean)
  if (zeilen.length < 2 || zeilen.length > 5) return null
  if (!zeilen.every((z) => /^\*\*[^*]{1,16}\*\*:?\s*\S/.test(z) && z.length <= 220)) return null
  return zeilen.map((z) => z.replace(/^\*\*([^*]+?):?\*\*:?/, '**$1:**')).join('\n')
}

/* Kasus: kurzes, lesbares Muster. Muss (D), (A) oder eine
   Präposition mit Fall nennen, sonst ist es keine Hilfe. */
function pruefeKasus(s) {
  const t = pruefeText(s, 3, 44)
  if (!t) return null
  if (!/\((D|A|D \+ A|A \+ D)\)|\+\s?(A|D)\b/.test(t)) return null
  return t
}

/* Plural: entweder ausgeschrieben („die Einladungen") oder als
   Kurzmuster der Goethe-Liste („-e", „¨-er", „-") */
function pruefePlural(s) {
  const t = pruefeText(s, 1, 40)
  if (!t) return null
  if (/^die\s\S/.test(t)) return t
  if (/^[-¨]/.test(t)) return t
  return null
}

/* Konjugation: er-Form + Perfekt. Das Partizip MUSS auf -t oder -en
   enden — genau daran erkennt man die abgeschnittenen Altbestände
   („hat gefalle", „hat gewonne", „hat g"). */
function pruefeKonj(erForm, perfekt) {
  const er = pruefeText(erForm, 2, 28)
  const pf = pruefeText(perfekt, 5, 34)
  if (!er) return null
  if (!pf || !/^(hat|ist)\s+[a-zäöüß(). -]*[a-zäöüß]+(t|en)$/i.test(pf)) return er
  return `${er}, ${pf}`
}
/* Ist der vorhandene Eintrag abgeschnitten? */
function konjKaputt(konj) {
  const t = String(konj ?? '').trim()
  if (!t) return false
  /* „fliegt (ab)" — die Vorsilbe gehoert ans Wort, nicht in Klammern */
  if (/[()]/.test(t)) return true
  const m = t.match(/(hat|ist)\s+(\S+)$/i)
  if (!m) return false
  return !/(t|en)$/i.test(m[2])
}

/* ---------- Stichwort aufräumen (Fund 09.09.) ----------
   Die Goethe-Liste trägt grammatische Vermerke IM Stichwort:
   „Wasser (Sg.)", „Eltern (pl.)", „(sich) freuen", „gern(e)",
   „(E-)Mail", „(ab)fahren". Bisher standen die mit auf ihrer Karte —
   sie hätte „das Wasser (Sg.)" abtippen müssen. Wir werfen solche
   Einträge NICHT weg (das wären 118 Wörter, darunter Wasser, Geld,
   Milch, Musik), sondern räumen das Stichwort auf und merken uns,
   was der Vermerk aussagte.

   Rückgabe: { wort, numerus, reflexiv } oder null, wenn der Eintrag
   wirklich unbrauchbar ist (unbalancierte Klammer, Schrägstrich-
   Variante, Wortstamm mit Bindestrich am Ende). */
function raeumeStichwort(roh) {
  let t = String(roh ?? '').trim()
  if (!t) return null
  let numerus = null
  let reflexiv = false

  /* „Wasser (Sg.)" / „Eltern (pl.)" -> Vermerk merken, Wort behalten */
  t = t.replace(/\s*\((Sg\.?|Sing\.?)\)\s*$/i, () => ((numerus = 'sg'), ''))
  t = t.replace(/\s*\(Pl\.?\)\s*$/i, () => ((numerus = 'pl'), ''))

  /* „(sich) freuen" und „freuen (sich)" -> „sich freuen" */
  if (/\(sich\)/.test(t)) {
    reflexiv = true
    t = t.replace(/\(sich\)/g, '').trim()
    t = `sich ${t}`.replace(/\s+/g, ' ')
  }

  /* „gern(e)" -> „gern", „vorn(e)" -> „vorn" */
  t = t.replace(/\(e\)\s*$/i, '')

  /* „(E-)Mail" -> „E-Mail", „(Fahr)Rad" -> „Fahrrad",
     „(ab)fahren" -> „abfahren", „(Kredit)-Karte" -> „Kredit-Karte" */
  t = t.replace(/^\(([^()]+)\)(\S.*)$/, (_, vorn, rest) => {
    if (/-$/.test(vorn) || /^[^A-Za-zÄÖÜäöüß]/.test(rest)) return vorn + rest
    /* Fahr + Rad -> Fahrrad; ab + fahren bleibt abfahren */
    return /^[A-ZÄÖÜ]/.test(vorn) ? vorn + rest[0].toLowerCase() + rest.slice(1) : vorn + rest
  })

  /* „fährt (ab)" ist keine Vokabel, sondern eine Konjugationsform
     mit abgetrennter Vorsilbe — anders als „Grad (Celsius)" */
  const VORSILBEN = /^(ab|an|auf|aus|bei|ein|los|mit|nach|vor|weg|zu|zurück|her|hin)$/i
  const klammerEnde = t.match(/\(([^()]*)\)\s*$/)
  if (klammerEnde && VORSILBEN.test(klammerEnde[1].trim())) return null
  /* „Grad (Celsius)" -> „Grad": erklärender Zusatz am Ende */
  t = t.replace(/\s*\([^()]*\)\s*$/, '')

  t = t.trim()
  /* Was jetzt noch eine Klammer, einen Schrägstrich oder einen
     Bindestrich am Ende trägt, ist ein Rest der Quellenliste */
  if (!t || /[()/]/.test(t) || t.endsWith('-')) return null
  return { wort: t, numerus, reflexiv }
}


/* ---------- Prompts ---------- */
const SYSTEM = [
  'You enrich German vocabulary entries for 해인, a Korean adult learning German at A1/A2 level. Her cards show the German word (nouns WITH article) and a meaning line in the form "English (한국어)". Notes and explanations are in KOREAN, because that is her language.',
  'Input, one entry per line: id | german headword (nouns with article) | pos (may be empty) | grammar note from the source list (may be empty: "singular only", "plural only", "reflexive" — trust it) | example sentence from the Goethe list (this shows WHICH SENSE is meant — the strongest signal you have) | current Korean gloss (UNRELIABLE: auto-extracted, often the wrong sense — e.g. nehmen listed as 고르다, gehören as 속하다) | fixedMeaning (yes = the learner wrote this meaning herself: keep it) | current plural (may be empty or a short pattern) | current conjugation (may be empty or CUT OFF, e.g. "hat gefalle") | reviewer note (empty, or an objection from a second model to your previous attempt: take it seriously).',
  '',
  'Work from the GERMAN word, and let the example sentence decide which sense to give. Ignore the current Korean gloss whenever it does not match that sense.',
  'Return ONLY a JSON array, one object per id, with exactly these keys:',
  '  "id": copy',
  '  "en": English gloss, the 1-2 senses a beginner meets most, each 1-3 words, senses separated by " / " (e.g. "to take"; "to belong to"; "to be missing / to be absent"). Verbs as "to ...". Nouns without article.',
  '  "ko": Korean gloss with the SAME senses in the SAME order, written directly from the German word (not translated from your English), each 1-3 everyday Korean words, separated by " / " (e.g. "가지다, 잡다"; "~의 것이다"). Plain dictionary style, no sentence.',
  '  "pos": one of noun, verb, adj, adv, phrase, other. Nouns carry an article, verbs are infinitives.',
  '  "plural": ONLY for nouns: the plural written out with die, e.g. "die Einladungen". If the grammar note says "singular only", or the noun has no usual plural (die Butter, der Durst), null. If it says "plural only" (die Eltern, die Leute), null as well and say so in info.',
  '  "er": ONLY for verbs: the 3rd person singular present, e.g. "hilft", "fährt ab", "ruft an". Else null.',
  '  "perfekt": ONLY for verbs: the perfect with its auxiliary, e.g. "hat geholfen", "ist gefahren". Write it COMPLETE — never cut off. Else null.',
  '  "kasus": ONLY for verbs, else null. The case pattern in a short readable form the learner can copy: "jdm. helfen (D)", "etw. sehen (A)", "jdm. etw. geben (D + A)", "warten auf + A", "sich freuen über + A". Use jdm. for a dative person, jdn. for an accusative person, etw. for a thing. If the verb takes no object at all (schlafen, regnen), null.',
  '  "nuance": null in most cases. Only when the learner NEEDS it: a usage restriction, register (du/Sie), or a classic confusion with a similar German word. Max 60 characters, written in KOREAN.',
  '  "info": a short "good to know" text in KOREAN, or null. An ARRAY of 2-5 strings, one per line — never one string with line breaks. EVERY line starts with a bold Korean keyword in the exact form **사용:** (choose from 사용, 주의, 비슷, 격, 존댓말, 분리, 참고). German examples inline with a Korean translation in parentheses, e.g. Ich helfe dir (제가 도와줄게요). Cover what actually matters: typical patterns and collocations, the case the verb takes and why it is easy to get wrong, contrast to a similar German word, separable verbs (Ich rufe dich an), perfect with sein or haben, du versus Sie. Be GENEROUS: write info for almost every word; only trivially concrete nouns (der Baum, der Apfel, der Stuhl) get null. Max 200 characters per line.',
  'If unsure about plural, er, perfekt, kasus or nuance, use null — never guess a form. For en and ko always give your best everyday rendering; a wrong sense is the one thing that must not happen.',
].join('\n')

const SYSTEM_PRUEF = [
  'You are the second pair of eyes for a German vocabulary deck of a Korean beginner (A1-A2). For each line "id | german word | pos | example sentence | english gloss | korean gloss" judge ONLY the two glosses: are they correct, natural, everyday renderings of the sense the EXAMPLE SENTENCE shows, and do both express the same senses?',
  'Be strict about wrong or rare senses (nehmen as 고르다 "choose" is wrong — 가지다/잡다 is right; gehören with the example "Wem gehört das?" is possession ~의 것이다, not 속하다 "belong to a group"; fehlen with "er fehlt seit drei Tagen" is 결석하다, which is fine). Accept stylistic variants and fair simplifications — do not nitpick.',
  'Judge the two glosses SEPARATELY — a meaning the learner wrote herself is kept even when it is off, and the other one still has to be right.',
  'Return ONLY a JSON array: [{"id":"...","en_ok":true|false,"ko_ok":true|false,"grund":"<short German reason when something is not ok, else null>","en":"<better English gloss when en_ok is false, else null>","ko":"<better Korean gloss when ko_ok is false, else null>"}]. One object per id, never leave one out.',
].join('\n')

const zeile = (e, notiz = '') =>
  [e.id, e.wort, e.pos || '', e.vermerk || '', e.satz || '', e.koAlt || '', e.fest ? 'yes' : 'no', e.plural || '', e.konj || '', notiz].join(' | ')

/* ---------- Ein Stapel anreichern (Sonnet schreibt, Opus prüft) ---------- */
async function reichereAn(eintraege) {
  const ergebnis = new Map()
  const notizen = new Map()

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
        const POS_OK = ['noun', 'verb', 'adj', 'adv', 'phrase', 'other']
        const pos = POS_OK.includes(a.pos) ? a.pos : POS_OK.includes(e.pos) ? e.pos : null
        ergebnis.set(e.id, {
          en: pruefeText(a.en, 1, 60, GLOSSE_EN),
          ko: e.fest ? e.koAlt : (hatHangul(a.ko) ? pruefeText(a.ko, 1, 60, GLOSSE_KO) : null),
          pos,
          plural: pos === 'noun' ? pruefePlural(a.plural) : null,
          konj: pos === 'verb' ? pruefeKonj(a.er, a.perfekt) : null,
          kasus: pos === 'verb' ? pruefeKasus(a.kasus) : null,
          nuance: a.nuance == null ? null : pruefeText(a.nuance, 3, 80),
          info: pruefeInfo(a.info),
          enOk: false,
          koOk: false,
        })
      }
      console.log(`  … ${Math.min(von + BATCH, liste.length)}/${liste.length}`)
    }
  }

  async function pruefRunde(liste) {
    const durchgefallen = []
    const zuPruefen = liste.filter((e) => {
      const f = ergebnis.get(e.id)
      return f?.en && f?.ko && !(f.enOk && f.koOk)
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
              return [e.id, e.wort, f.pos || e.pos || '', e.satz || '', f.en, f.ko].join(' | ')
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
        f.koOk = u.ko_ok !== false
        if (f.enOk && f.koOk) continue
        const grund = pruefeText(u.grund, 2, 200) || 'Bedeutung passt nicht'
        const besser = [u.en ? `en: ${u.en}` : '', u.ko ? `ko: ${u.ko}` : ''].filter(Boolean).join(', ')
        const notiz = `${grund}${besser ? ` (Vorschlag ${besser})` : ''}`
        /* Eine von ihr selbst geschriebene Bedeutung wird nie
           überschrieben — sie kommt nur auf die Liste */
        if (!f.koOk && e.fest) {
          eigenePruefliste.push(`${e.wort}: ihre Bedeutung „${e.koAlt}" — ${notiz}`)
          f.koOk = true
        }
        if (!f.enOk || !f.koOk) {
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
      pruefliste.push(`Bedeutung ${e.wort}: Sonnet "${f?.en} (${f?.ko})" — Opus: ${notizen.get(e.id)}`)
    }
  }
  return ergebnis
}

/* ---------- Datei laden ---------- */
const datei = JSON.parse(readFileSync(DATEI, 'utf8'))
const rangDaten = JSON.parse(readFileSync(RANG_DATEI, 'utf8'))
const RANG = rangDaten.rang || {}
const FUNKTIONSWORT = new Set(rangDaten.funktionswort || [])
const dateiNachId = new Map(datei.map((e) => [e.id, e]))
const wortVon = (e) => (e.artikel ? `${e.artikel} ${e.de}` : e.de)
const dateiNachWort = () => new Map(datei.map((e) => [norm(wortVon(e)), e]))
/* Die kuratierte Liste — dieselbe Quelle, aus der ihr Vorrat die
   Bedeutungszeile nimmt (src/core/deutschVorrat.js) */
const kuratiert = new Map(germanPool.map((e) => [norm(e.ko), e]))
/* Welche Bedeutungen hätte der Vorrat für dieses Wort geliefert?
   Steht bei ihr GENAU eine davon, kam sie aus dem Vorrat und darf
   ersetzt werden. Steht etwas anderes da, hat SIE es geschrieben —
   dann bleibt es (Sorge Franz 09.09.: sie hat Wörter hochgeladen). */
function ausDemVorrat(inv, ihreBedeutung) {
  if (!inv) return false
  const kur = kuratiert.get(norm(wortVon(inv)))
  const moeglich = [kur?.en, inv.ko, inv.bsp_en, inv.en && inv.ko ? `${inv.en} (${inv.ko})` : null]
    .filter(Boolean)
    .map((s) => norm(s))
  return moeglich.includes(norm(ihreBedeutung))
}

function dateiSchreiben() {
  if (TROCKEN) return
  writeFileSync(DATEI, JSON.stringify(datei, null, 1) + '\n')
}

/* Stichwörter der Liste aufräumen. Läuft VOR allem anderen, denn
   auch der Bibliotheks-Schritt vergleicht gegen diese Wörter. */
function stichwoerterRaeumen() {
  let ausgeblendet = 0
  let geraeumt = 0
  for (const e of datei) {
    const r = e.bsp ? raeumeStichwort(e.de) : null
    if (!r) {
      if (!e.aus) {
        e.aus = true
        ausgeblendet++
      }
      continue
    }
    if (e.aus) delete e.aus
    if (r.wort !== e.de) {
      console.log(`  aufgeräumt: „${e.de}" -> „${r.wort}"`)
      e.de = r.wort
      geraeumt++
    }
    if (r.numerus && !e.numerus) e.numerus = r.numerus
    if (r.reflexiv && !e.reflexiv) e.reflexiv = true
  }

  /* Doppelgänger: Das Aufräumen führt Einträge zusammen, die vorher
     verschieden hießen. Wir behalten EINEN je Stichwort — bevorzugt
     den, der als Funktionswort markiert ist (der wird ohnehin nicht
     angeboten), sonst den mit den meisten Angaben. */
  const nachWort = new Map()
  for (const e of datei) {
    if (e.aus) continue
    const k = norm(wortVon(e))
    if (!nachWort.has(k)) nachWort.set(k, [])
    nachWort.get(k).push(e)
  }
  let doppelt = 0
  for (const [k, gruppe] of nachWort) {
    if (gruppe.length < 2) continue
    const punkte = (e) => (FUNKTIONSWORT.has(e.id) ? 100 : 0) + (e.konj ? 2 : 0) + (e.plural ? 2 : 0) + (e.ko ? 1 : 0)
    const behalten = gruppe.reduce((a, b) => (punkte(b) > punkte(a) ? b : a))
    for (const e of gruppe) {
      if (e === behalten) continue
      e.aus = true
      doppelt++
    }
    console.log(`  doppelt: „${k}" — behalten ${behalten.id}, ausgeblendet ${gruppe.filter((e) => e !== behalten).map((e) => e.id).join(', ')}`)
  }

  if (geraeumt || ausgeblendet || doppelt)
    console.log(
      `Stichwörter aufgeräumt: ${geraeumt} · doppelt zusammengelegt: ${doppelt} · endgültig ausgeblendet: ${ausgeblendet}`
    )
  if (geraeumt || doppelt) dateiSchreiben()
  return { geraeumt, ausgeblendet, doppelt }
}

/* ---------- Schritt 1: Die Goethe-Datei ---------- */
async function dateiAnreichern() {
  console.log(`\n=== Schritt 1: Goethe-Datei (Ziel ${ANZAHL} angereicherte Wörter) ===`)


  const kandidaten = datei
    .filter((e) => !e.aus && !FUNKTIONSWORT.has(e.id))
    /* Auch abgehakte Wörter ohne Bedeutung kommen wieder dran —
       so heilt sich ein abgebrochener Lauf von selbst */
    .filter((e) => (e.anr ?? 0) < METHODE || !e.en)
    .sort((a, b) => (RANG[a.id] ?? 99999) - (RANG[b.id] ?? 99999))
    .slice(0, PROBE ? 5 : ANZAHL)
  const fertig = datei.filter((e) => (e.anr ?? 0) >= METHODE && e.en).length
  console.log(`Schon angereichert: ${fertig} · jetzt dran: ${kandidaten.length}`)
  if (!kandidaten.length) return

  const eintraege = kandidaten.map((e) => ({
    id: e.id,
    wort: wortVon(e),
    pos: e.artikel ? 'noun' : e.konj ? 'verb' : '',
    /* Vermerk aus dem aufgeräumten Stichwort: nur Singular, nur
       Plural, reflexiv — das Modell soll es wissen, nicht raten */
    vermerk: [e.numerus === 'sg' ? 'singular only' : '', e.numerus === 'pl' ? 'plural only' : '', e.reflexiv ? 'reflexive' : '']
      .filter(Boolean)
      .join(', '),
    satz: e.bsp || '',
    koAlt: e.ko || '',
    fest: false /* die Listen-Bedeutung ist nicht ihre — darf ersetzt werden */,
    plural: e.plural || '',
    konj: e.konj || '',
  }))
  const erg = await reichereAn(eintraege)

  let gesetzt = 0
  let konjRepariert = 0
  for (const e of eintraege) {
    const f = erg.get(e.id)
    if (!f) continue
    const ziel = dateiNachId.get(e.id)
    if (!ziel) continue
    const alt = { ko: ziel.ko, konj: ziel.konj }
    if (f.enOk && f.en) ziel.en = f.en
    if (f.koOk && f.ko) ziel.ko = f.ko
    if (f.pos) ziel.pos = f.pos
    if (f.plural) ziel.plural = f.plural
    /* Konjugation nur ersetzen, wenn die alte fehlt oder abgeschnitten
       ist — sonst bleibt die geprüfte Fassung der Liste stehen */
    if (f.konj && (!ziel.konj || konjKaputt(ziel.konj))) {
      if (konjKaputt(ziel.konj)) konjRepariert++
      ziel.konj = f.konj
    }
    if (f.kasus) ziel.kasus = f.kasus
    if (f.nuance) ziel.nuance = f.nuance
    if (f.info) ziel.info = f.info
    /* Als erledigt gilt ein Wort NUR mit geprüfter Bedeutung. Sonst
       bliebe es mit einer ungeprüften Bedeutung liegen und käme nie
       wieder dran (Fund 09.09.: der Lauf lief ins Monatslimit, die
       Prüfung fiel aus, 144 Wörter waren fälschlich abgehakt). */
    if (ziel.en && ziel.ko) ziel.anr = METHODE
    gesetzt++
    if (PROBE) console.log(`  [probe] ${JSON.stringify(ziel)}`)
    else {
      const bedAlt = alt.ko !== ziel.ko ? ` [Bedeutung: „${alt.ko}" -> „${ziel.ko}"]` : ''
      const konjAlt = alt.konj !== ziel.konj ? ` [Konjugation: „${alt.konj}" -> „${ziel.konj}"]` : ''
      console.log(`  ${TROCKEN ? '[trocken] ' : ''}${e.wort}: ${ziel.en} (${ziel.ko})${ziel.kasus ? ` · ${ziel.kasus}` : ''}${bedAlt}${konjAlt}`)
    }
  }
  dateiSchreiben()
  console.log(`Datei: ${gesetzt} Wörter angereichert, ${konjRepariert} abgeschnittene Konjugationen repariert${TROCKEN ? ' (Trockenlauf — NICHTS geschrieben)' : ''}.`)
}

/* ---------- Schritt 2: Ihre Bibliothek ---------- */
async function bestandAnreichern() {
  console.log('\n=== Schritt 2: Ihre Bibliothek ===')
  let woerter
  try {
    woerter = await hole(
      `words?profile=eq.${PROFIL}&select=id,ko,en,pos,ex,nuance,info,familie,hand,anreicherung,kasus&order=created_at.asc`
    )
  } catch (e) {
    if (/kasus|info|familie|hand|anreicherung/.test(e.message)) {
      console.error('Spalten fehlen — bitte zuerst die Migrationen 016 und 017 ausführen.')
      process.exit(1)
    }
    throw e
  }
  console.log(`Wörter: ${woerter.length}`)

  /* Zahlwörter gehören nicht in die Vokabeln (해인 kann sie, wie
     Franz seine). Die Goethe-Liste enthält keine — sie kann aber
     selbst welche eingetragen haben. Nur melden, nie löschen. */
  const ZAHLWORT =
    /^(null|eins?|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|dreizehn|vierzehn|fünfzehn|sechzehn|siebzehn|achtzehn|neunzehn|zwanzig|dreißig|vierzig|fünfzig|sechzig|siebzig|achtzig|neunzig|hundert|tausend|million(en)?|milliarde(n)?)$|^\d+$|^(einund|zweiund|dreiund|vierund|fünfund|sechsund|siebenund|achtund|neunund)\w+zig$/i
  const zahlen = woerter.filter((w) => ZAHLWORT.test(String(w.ko).replace(/^(der|die|das)\s+/i, '').trim()))
  if (zahlen.length) {
    console.log(`\n  Zahlwörter in ihrer Bibliothek (${zahlen.length}) — nur gemeldet, nichts gelöscht:`)
    for (const w of zahlen) console.log(`    ${w.ko} (${w.en})`)
    console.log('    Wenn sie raus sollen: sag Bescheid, dann bekommt der Lauf einen Schalter dafür.')
  }

  const nachWort = dateiNachWort()
  const offen = []
  let geraeumt = 0
  for (const w of woerter) {
    /* Trägt ihr Wort selbst noch einen Listen-Vermerk („das Wasser
       (Sg.)"), wird er entfernt — sonst müsste sie ihn abtippen und
       die Dublettensperre gegen den Vorrat greift nicht mehr */
    const geraeumtesWort = raeumeStichwort(w.ko.replace(/^(der|die|das)\s+/i, ''))
    if (geraeumtesWort) {
      const artikel = (w.ko.match(/^(der|die|das)\s+/i) || [''])[0]
      const neuesWort = norm(artikel + geraeumtesWort.wort)
      if (neuesWort !== norm(w.ko)) {
        console.log(`  ${TROCKEN ? '[trocken] ' : ''}Wort aufgeräumt: „${w.ko}" -> „${neuesWort}"`)
        await patche('words', `id=eq.${w.id}`, { ko: neuesWort })
        w.ko = neuesWort
        geraeumt++
      }
    }
    const inv = nachWort.get(norm(w.ko))
    const hand = handFelder(w)
    const neu = (w.anreicherung ?? 0) < METHODE
    if (!neu && w.info && w.pos) continue
    offen.push({
      id: w.id,
      wort: w.ko,
      pos: w.pos || (inv?.artikel ? 'noun' : inv?.konj ? 'verb' : ''),
      satz: w.ex || inv?.bsp || '',
      koAlt: w.en || '',
      /* Ihre Bedeutung bleibt, wenn das Wort gar nicht in der Liste
         steht, wenn sie das Feld von Hand geändert hat, oder wenn
         ihre Bedeutung nicht die des Vorrats ist (dann hat sie sie
         selbst geschrieben) */
      fest: !inv || hand.includes('en') || !ausDemVorrat(inv, w.en),
      plural: '',
      konj: '',
      vorhanden: w,
      hand,
      neu,
      inv,
    })
  }
  if (geraeumt) console.log(`Wörter mit Listen-Vermerk aufgeräumt: ${geraeumt}`)
  const eigene = offen.filter((e) => e.fest).length
  console.log(`Wörter, die das Modell braucht: ${offen.length} · davon mit EIGENER Bedeutung (bleibt unangetastet): ${eigene}`)
  if (PROBE) offen.splice(5)
  if (!offen.length) return

  const erg = await reichereAn(offen)
  let gesetzt = 0
  for (const e of offen) {
    const f = erg.get(e.id)
    if (!f) continue
    const v = e.vorhanden
    const patch = {}
    const darf = (feld) => !e.hand.includes(feld)
    /* Ihre Bedeutungszeile ist „English (한국어)" (Franz 09.09.) */
    if (!e.fest && f.enOk && f.koOk && f.en && f.ko && darf('en')) {
      const zeile = `${f.en} (${f.ko})`
      if (zeile !== v.en) patch.en = zeile
    }
    if (!v.pos && f.pos) patch.pos = f.pos
    if (f.nuance && (e.neu || !v.nuance) && darf('nuance')) patch.nuance = f.nuance
    if (f.info && (e.neu || !v.info) && darf('info')) patch.info = f.info
    if (f.kasus && !v.kasus) patch.kasus = f.kasus
    if (e.neu) patch.anreicherung = METHODE
    if (!Object.keys(patch).length) continue
    try {
      await patche('words', `id=eq.${e.id}`, patch)
      gesetzt++
      const alt = patch.en ? ` [„${v.en}" -> „${patch.en}"]` : ''
      console.log(`  ${TROCKEN ? '[trocken] ' : ''}${e.wort}: ${Object.keys(patch).join(', ')}${alt}`)
    } catch (err) {
      console.error(`  Schreiben fehlgeschlagen (${e.wort}): ${err.message}`)
    }
  }
  console.log(`Bibliothek: ${gesetzt} Wörter ergänzt${TROCKEN ? ' (Trockenlauf — NICHTS gespeichert)' : ''}.`)
}

/* ---------- Schritt 3: Bedeutungsfamilien ----------
   Wie bei Franz: Wörter mit gleicher Bedeutung stünden in der
   Vorschlagsliste identisch. Bei ihr trifft das besonders oft zu
   (sprechen/reden/sagen/erzählen, machen/tun, bekommen/erhalten). */
const bedeutungsSinne = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .split(/[/,;]/)
    .map((t) => t.replace(/^\s*to /, '').replace(/[^a-zäöüß ]/g, '').trim())
    .filter((t) => t.length >= 2)
/* Zusätzlich über die koreanische Seite gruppieren */
const koSinne = (s) => {
  const m = String(s ?? '').match(/\(([^)]*)\)/)
  const roh = m ? m[1] : String(s ?? '')
  return roh
    .split(/[/,;]/)
    .map((t) => t.replace(/[^가-힣~]/g, '').trim())
    .filter((t) => t.length >= 1)
}

async function familienBilden() {
  console.log('\n=== Schritt 3: Bedeutungsfamilien + Nuancen ===')
  const woerter = await hole(`words?profile=eq.${PROFIL}&select=id,ko,en,pos,ex,nuance,familie,hand`)
  /* Wörter, die schon bei ihr liegen, kommen aus der Bibliothek —
     sonst stünde dasselbe Wort zweimal in einer Gruppe und bildete
     eine „Familie" mit sich selbst (Fund im Probelauf 09.09.) */
  const inBibliothek = new Set(woerter.map((w) => norm(w.ko)))
  const ausDatei = datei
    .filter((e) => !e.aus && (e.anr ?? 0) >= METHODE && e.en && !inBibliothek.has(norm(wortVon(e))))
    .map((e) => ({
      key: e.id,
      quelle: 'datei',
      ko: wortVon(e),
      en: e.en && e.ko ? `${e.en} (${e.ko})` : e.ko || '',
      pos: e.pos || null,
      ex: e.bsp || '',
      nuance: e.nuance || null,
      familie: e.familie || null,
    }))
  const alle = [
    ...woerter.map((w) => ({ ...w, quelle: 'words', key: w.id })),
    ...ausDatei,
  ]

  const eltern = new Map(alle.map((w) => [w.key, w.key]))
  const finde = (k) => (eltern.get(k) === k ? k : (eltern.set(k, finde(eltern.get(k))), eltern.get(k)))
  const vereine = (a, b) => eltern.set(finde(a), finde(b))
  const gruppiere = (sinneVon) => {
    const nachSinn = new Map()
    for (const w of alle) {
      for (const sinn of sinneVon(w.en)) {
        if (!nachSinn.has(sinn)) nachSinn.set(sinn, [])
        nachSinn.get(sinn).push(w)
      }
    }
    for (const mitglieder of nachSinn.values()) {
      for (let i = 1; i < mitglieder.length; i++) vereine(mitglieder[0].key, mitglieder[i].key)
    }
  }
  gruppiere(bedeutungsSinne)
  gruppiere(koSinne)

  const gruppen = new Map()
  for (const w of alle) {
    const wurzel = finde(w.key)
    if (!gruppen.has(wurzel)) gruppen.set(wurzel, [])
    gruppen.get(wurzel).push(w)
  }
  const liste = [...gruppen.values()].filter((g) => g.length >= 2 && g.length <= 6)
  console.log(`Gruppen mit gleicher Bedeutung: ${liste.length}`)
  if (PROBE) {
    liste.splice(8)
    console.log('  [probe] nur die ersten 8 Gruppen')
  }
  if (!liste.length) return

  const SYSTEM_FAMILIE = [
    'Several German words in a Korean learner\'s deck share a gloss, so they look identical in her app. Input: groups, each line "groupId | german | meaning | example sentence".',
    'For EACH group decide: is this a real MEANING FAMILY — words a beginner reasonably treats as the same meaning (sprechen/reden "to talk", bekommen/erhalten "to receive", machen/tun "to do")? Then "familie": true. If they merely share a word in the gloss but mean different things (die Bank "bench" vs "bank"), "familie": false.',
    'Answer false as well whenever the words differ in something the learner MUST get right and would stop noticing if the app accepted either one: pointing words that differ by distance or speaker (hier/da/dort, dieser/jener), direction (hingehen vs herkommen, bringen vs holen), opposites of any kind, and pairs where one asks a question and the other states an amount. Word class alone (verb vs its noun, arbeiten/die Arbeit) does NOT make them different — those stay a family.',
    'Male/female pairs of the SAME role (der Arzt / die Ärztin, der Schüler / die Schülerin, der Sänger / die Sängerin) ARE always a family — she recognised the meaning, and the -in form is practised on the typing card. Be consistent: treat every such pair the same way.',
    'And for EACH word write a short DISTINGUISHING note in KOREAN (max 60 characters) that says what makes THIS word different from the others in its group — usage, register, nuance, typical context. Example: sprechen -> "격식 있는 말하기, 언어를 구사할 때"; reden -> "일상 대화, 수다에 가까움".',
    'Return ONLY a JSON array: [{"groupId":"...","familie":true|false,"woerter":[{"wort":"...","nuance":"..."}]}] — one object per group, every word included, notes within a group must differ.',
  ].join('\n')

  const neueFamilie = new Map()
  let nuancenGesetzt = 0
  for (let von = 0; von < liste.length; von += 8) {
    const teil = liste.slice(von, von + 8)
    const text = teil
      .map((g, i) => g.map((m) => `g${von + i} | ${m.ko} | ${m.en || ''} | ${m.ex || ''}`).join('\n'))
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
        const m = g.find((x) => norm(x.ko) === norm(w.wort))
        if (!m) continue
        if (famId) neueFamilie.set(m.key, famId)
        const nuance = pruefeText(w.nuance, 3, 80)
        if (!nuance || handFelder(m).includes('nuance')) continue
        try {
          if (m.quelle === 'words') await patche('words', `id=eq.${m.key}`, { nuance })
          else dateiNachId.get(m.key).nuance = nuance
          nuancenGesetzt++
          console.log(`  ${TROCKEN ? '[trocken] ' : ''}${m.ko}${famId ? ' [Familie]' : ''}: ${nuance}`)
        } catch (err) {
          console.error(`  Schreiben fehlgeschlagen (${m.ko}): ${err.message}`)
        }
      }
    }
  }
  let famGesetzt = 0
  for (const w of alle) {
    const soll = neueFamilie.get(w.key) ?? null
    if ((w.familie ?? null) === soll) continue
    try {
      if (w.quelle === 'words') await patche('words', `id=eq.${w.key}`, { familie: soll })
      else {
        const z = dateiNachId.get(w.key)
        if (soll) z.familie = soll
        else delete z.familie
      }
      famGesetzt++
    } catch (err) {
      console.error(`  Familie nicht gespeichert (${w.ko}): ${err.message}`)
    }
  }
  dateiSchreiben()
  console.log(`Nuancen gesetzt: ${nuancenGesetzt} · Familien geändert: ${famGesetzt}${TROCKEN ? ' (Trockenlauf — NICHTS gespeichert)' : ''}`)
}

/* ---------- Bericht ---------- */
function bericht() {
  const fertig = datei.filter((e) => (e.anr ?? 0) >= METHODE && e.en)
  console.log(`\n=== Stand der Goethe-Datei ===`)
  console.log(`  angereichert: ${fertig.length} von ${datei.filter((e) => !e.aus).length} brauchbaren Einträgen`)
  console.log(`  mit Infotext: ${fertig.filter((e) => e.info).length}`)
  console.log(`  mit Kasus:    ${fertig.filter((e) => e.kasus).length} (Verben: ${fertig.filter((e) => e.pos === 'verb').length})`)
  console.log(`  mit Plural:   ${fertig.filter((e) => e.plural).length} (Nomen: ${fertig.filter((e) => e.pos === 'noun').length})`)
  console.log(`  ohne Wortart: ${fertig.filter((e) => !e.pos).length}`)
}

/* ---------- Hauptlauf ---------- */
/* Immer zuerst: die Stichwörter der Liste aufräumen */
stichwoerterRaeumen()

let limitErreicht = false
try {
  if (NUR_NUANCEN) {
    await familienBilden()
  } else if (NUR_DATEI) {
    await dateiAnreichern()
    bericht()
  } else if (NUR_BESTAND) {
    await bestandAnreichern()
  } else {
    await dateiAnreichern()
    await bestandAnreichern()
    await familienBilden()
    bericht()
  }
} catch (e) {
  if (!(e instanceof LimitErreicht)) throw e
  limitErreicht = true
  console.error(`\n=== ABBRUCH: Guthaben-/Nutzungslimit erreicht ===`)
  console.error(`  ${e.message}`)
  console.error('  Alles bis hierher ist gespeichert. Der nächste Lauf macht genau dort weiter.')
  dateiSchreiben()
  bericht()
}
if (pruefliste.length) {
  console.log(`\n=== PRÜFLISTE (${pruefliste.length}) — bitte von Hand ansehen ===`)
  for (const p of pruefliste) console.log('  ' + p)
}
if (eigenePruefliste.length) {
  console.log(`\n=== IHRE EIGENEN BEDEUTUNGEN (${eigenePruefliste.length}) — unverändert, nur ein Hinweis ===`)
  for (const p of eigenePruefliste) console.log('  ' + p)
}
console.log(`\nModell: ${tokensRein} Tokens rein, ${tokensRaus} raus -> grob ${kostenUsd.toFixed(2)} $.`)
console.log(limitErreicht ? 'abgebrochen (Limit) — Rest beim nächsten Lauf' : 'ok')
