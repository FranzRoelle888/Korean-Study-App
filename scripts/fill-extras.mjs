/* ============================================================
   ZUSATZINFOS NACHTRAGEN (läuft in GitHub Actions, nicht im Browser)

   Holt Wörter aus 해인s Bibliothek, denen noch Angaben fehlen,
   fragt das Modell, prüft die Antwort streng und schreibt sie
   zurück.

   WARUM NICHT IN DER APP:
   Die App liegt öffentlich auf GitHub Pages. Ein API-Schlüssel im
   Frontend wäre für jeden lesbar. Deshalb läuft das hier — der
   Schlüssel liegt als GitHub-Secret und taucht nie im Code auf.

   Der Supabase-Schlüssel unten ist der ÖFFENTLICHE. Er steht
   ohnehin in der App, und die Schreibrechte hängen an den
   RLS-Regeln, nicht am Schlüssel. Es braucht also nur EIN echtes
   Geheimnis: den Anthropic-Schlüssel.

   Aufruf:  node scripts/fill-extras.mjs [--dry]
   --dry    nur anzeigen, nichts schreiben
   ============================================================ */

const SUPABASE_URL = 'https://gkrubhwwzgekmbiltslt.supabase.co'
const SUPABASE_KEY = 'sb_publishable_V2Gk_hicg121JPtU3e6Quw_224_v0_Q'
const MODEL = 'claude-sonnet-5'

/* Wie viele Wörter pro Modellanfrage — klein genug, dass die
   Antwort nicht abgeschnitten wird. */
const BATCH = 20

/* Deckel pro Lauf, damit ein Fehler nicht die halbe Bibliothek
   mit Unsinn füllt, bevor es jemand merkt. */
const MAX_PRO_LAUF = 120

const TROCKEN = process.argv.includes('--dry')
const API_KEY = process.env.ANTHROPIC_API_KEY

if (!API_KEY) {
  console.error('ANTHROPIC_API_KEY fehlt.')
  process.exit(1)
}

/* ---------- Supabase ---------- */
const kopf = {
  apikey: SUPABASE_KEY,
  Authorization: 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json',
}

async function holen(pfad) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + pfad, { headers: kopf })
  if (!r.ok) throw new Error('Supabase ' + r.status + ': ' + (await r.text()))
  return r.json()
}

async function schreiben(id, felder) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/words?id=eq.' + id, {
    method: 'PATCH',
    headers: { ...kopf, Prefer: 'return=minimal' },
    body: JSON.stringify(felder),
  })
  if (!r.ok) throw new Error('Schreiben ' + id + ': ' + r.status + ' ' + (await r.text()))
}

/* ---------- Modell ---------- */
async function fragen(prompt) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!r.ok) throw new Error('Anthropic ' + r.status + ': ' + (await r.text()))
  const daten = await r.json()
  const text = (daten.content || []).map((c) => c.text || '').join('')
  /* Das Modell packt JSON gern in einen Codeblock */
  const roh = text
    .replace(/^```(?:json)?/m, '')
    .replace(/```\s*$/m, '')
    .trim()
  return JSON.parse(roh)
}

const liste = (ws) => ws.map((w) => w.id + ' | ' + w.ko).join('\n')

/* ---------- Substantive: Pluralform ---------- */
const PROMPT_NOMEN = (ws) =>
  [
    'Du bist Linguist für deutsche Grammatik. Bestimme zu jedem Substantiv die Pluralform.',
    '',
    'Regeln, die du strikt einhalten musst:',
    '- Die Pluralform beginnt IMMER mit dem Artikel "die". Im Plural gibt es keinen anderen.',
    '- Hat das Wort keinen üblichen Plural (z. B. "das Obst", "der Durst"), setze plural auf null und schreibe in note "kein Plural" auf Koreanisch.',
    '- Gibt es zwei gültige Formen mit unterschiedlicher Bedeutung (z. B. die Worte / die Wörter), nimm für plural die gebräuchlichere und erkläre den Unterschied kurz in note. Die Erklärung ist auf KOREANISCH.',
    '- Bist du dir unsicher, setze plural auf null. Rate nicht.',
    '- Ist der Eintrag gar kein Substantiv, setze plural auf null.',
    '- Sonst ist note null.',
    '',
    'Antworte AUSSCHLIESSLICH mit einem JSON-Array, ohne Fließtext:',
    '[{"id":"...","plural":"die Häuser","note":null}]',
    '',
    'Wörter:',
    liste(ws),
  ].join('\n')

/* ---------- Verben: Präsens ---------- */
const PROMPT_VERBEN = (ws) =>
  [
    'Du bist Linguist für deutsche Grammatik. Konjugiere jedes Verb im PRÄSENS.',
    '',
    'Regeln, die du strikt einhalten musst:',
    '- Genau sechs Formen: ich, du, er, wir, ihr, sie. "er" steht für er/sie/es, "sie" für die 3. Person Plural.',
    '- Gib NUR die Verbform an, ohne Personalpronomen. Also "gehe", nicht "ich gehe".',
    '- Starke Verben ändern den Stamm: fahren -> du fährst, er fährt. nehmen -> du nimmst, er nimmt. lesen -> du liest, er liest. Achte darauf.',
    '- TRENNBARE Verben werden geteilt, die Vorsilbe steht hinten: aufstehen -> "stehe auf", "stehst auf", "steht auf", "stehen auf", "steht auf", "stehen auf".',
    '- Ist der Eintrag kein Verb oder ein ganzer Satz, setze conj auf null.',
    '- Bist du dir unsicher, setze conj auf null. Rate nicht.',
    '',
    'Antworte AUSSCHLIESSLICH mit einem JSON-Array, ohne Fließtext:',
    '[{"id":"...","conj":{"ich":"gehe","du":"gehst","er":"geht","wir":"gehen","ihr":"geht","sie":"gehen"}}]',
    '',
    'Verben:',
    liste(ws),
  ].join('\n')

/* ---------- Prüfung der Antworten ----------
   Lieber eine Zeile auslassen als etwas Falsches speichern. Was
   durchfällt, wird beim nächsten Lauf erneut versucht. */
const PERSONEN = ['ich', 'du', 'er', 'wir', 'ihr', 'sie']

function pruefeNomen(eintrag, bekannt) {
  if (!eintrag || !bekannt.has(eintrag.id)) return null
  const { plural, note } = eintrag
  if (plural === null || plural === undefined) {
    /* Ohne Form ist nur ein Hinweis sinnvoll ("kein Plural") */
    return note ? { plural: null, plural_note: String(note).slice(0, 300) } : null
  }
  if (typeof plural !== 'string') return null
  const sauber = plural.trim()
  /* Der stärkste Test: ein deutscher Plural trägt immer "die". */
  if (!/^die\s+\S/.test(sauber)) return null
  if (sauber.length > 60) return null
  return { plural: sauber, plural_note: note ? String(note).slice(0, 300) : null }
}

function pruefeVerb(eintrag, bekannt) {
  if (!eintrag || !bekannt.has(eintrag.id)) return null
  const c = eintrag.conj
  if (!c || typeof c !== 'object') return null
  const raus = {}
  for (const p of PERSONEN) {
    const f = c[p]
    if (typeof f !== 'string' || !f.trim()) return null
    const sauber = f.trim()
    /* Kein Pronomen mit hineingerutscht, keine ganzen Sätze */
    if (/^(ich|du|er|sie|es|wir|ihr)\s/i.test(sauber)) return null
    if (sauber.length > 40) return null
    raus[p] = sauber
  }
  return { conj: raus }
}

/* ---------- Ablauf ---------- */
async function abarbeiten(art) {
  const istNomen = art === 'noun'
  const filter = istNomen
    ? 'words?profile=eq.de&pos=eq.noun&plural=is.null&select=id,ko&limit=' + MAX_PRO_LAUF
    : 'words?profile=eq.de&pos=eq.verb&conj=is.null&select=id,ko&limit=' + MAX_PRO_LAUF

  const offen = await holen(filter)
  console.log((istNomen ? 'Substantive' : 'Verben') + ' ohne Angabe: ' + offen.length)
  if (offen.length === 0) return { gesetzt: 0, uebersprungen: 0 }

  let gesetzt = 0
  let uebersprungen = 0

  for (let i = 0; i < offen.length; i += BATCH) {
    const teil = offen.slice(i, i + BATCH)
    const bekannt = new Set(teil.map((w) => w.id))
    let antwort
    try {
      antwort = await fragen(istNomen ? PROMPT_NOMEN(teil) : PROMPT_VERBEN(teil))
    } catch (e) {
      console.error('Modellanfrage fehlgeschlagen: ' + e.message)
      uebersprungen += teil.length
      continue
    }
    if (!Array.isArray(antwort)) {
      console.error('Antwort war kein Array — Teil übersprungen')
      uebersprungen += teil.length
      continue
    }

    for (const eintrag of antwort) {
      const wort = teil.find((w) => w.id === (eintrag && eintrag.id))
      const felder = istNomen ? pruefeNomen(eintrag, bekannt) : pruefeVerb(eintrag, bekannt)
      if (!felder) {
        uebersprungen++
        if (wort) console.log('  übersprungen: ' + wort.ko)
        continue
      }
      if (TROCKEN) {
        console.log('  [trocken] ' + wort.ko + ' -> ' + JSON.stringify(felder))
        gesetzt++
        continue
      }
      try {
        await schreiben(eintrag.id, { ...felder, extras_auto: true })
        gesetzt++
        console.log('  gesetzt: ' + wort.ko)
      } catch (e) {
        console.error('  Schreiben fehlgeschlagen (' + (wort && wort.ko) + '): ' + e.message)
        uebersprungen++
      }
    }
  }
  return { gesetzt, uebersprungen }
}

const n = await abarbeiten('noun')
const v = await abarbeiten('verb')
console.log(
  '\nFertig. Substantive: ' +
    n.gesetzt +
    ' gesetzt / ' +
    n.uebersprungen +
    ' offen. Verben: ' +
    v.gesetzt +
    ' gesetzt / ' +
    v.uebersprungen +
    ' offen.'
)
