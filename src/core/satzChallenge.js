/* ============================================================
   TAGES-CHALLENGE — fünf Sätze aus dem eigenen Wortschatz (Franz 07.09.)

   Ablauf:
   1. Heute schon eine Challenge? -> lokaler Puffer (cacheKey).
   2. Sonst die älteste unerledigte aus der Aufgaben-Bank nehmen
      (exercise_bank, typ 'satzchallenge'). Die Bank hält immer einen
      Satz auf Vorrat, damit auch ein Tag ohne Netz einen bekommt.
   3. Ist die Bank leer: beim Trainer erzeugen lassen (ein Aufruf) —
      seit 14.09. der Ausnahmefall: der Nachtlauf
      (scripts/baue-satzchallenge.mjs) haelt drei Stueck auf Vorrat —
      mit ALLEN Bibliothekswörtern, den abgehakten Grammatikpunkten
      und der Rotationsliste (Wörter/Muster der letzten 14 Tage).
   4. Nach dem Adoptieren im Hintergrund den Vorrat auffüllen.

   Der Streak hängt nie am Trainer: gibt es keine Sätze, zählt die
   Zahl allein (der Aufrufer behandelt null).
   ============================================================ */
import { supabase } from './supabaseClient'
import { getActiveProfile, todayStr } from './storage'
import { TOPIK1_GRAMMATIK } from './inventare/topik1-grammatik'
import { GER_GRAMMATIK } from './inventare/ger-grammatik'
import { trainerSatzChallengeErzeugen, trainerSatzBaukasten } from '../features/trainer/trainerApi'
import { RINGE, baueBaukasten, waehleMuster, baueAnfrage, pruefeSaetze, leseVerlauf } from './baukasten'
import { mischeListe, zufallsSzenen } from './szenen'

/* Schauplaetze liegen seit 14.09. in szenen.js, damit der Nachtlauf
   dieselbe Liste nutzen kann; hier nur durchgereicht */
export { zufallsSzenen }

const KEY = () => `satzchallenge:${getActiveProfile()}`
const TYP = 'satzchallenge'
const ROTATION_TAGE = 14

function lesePuffer() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY()))
    if (d && d.date === todayStr()) return d
  } catch {
    /* egal */
  }
  return null
}
export function schreibePuffer(d) {
  try {
    localStorage.setItem(KEY(), JSON.stringify(d))
  } catch {
    /* egal */
  }
}

/* Abgehakte Grammatik aus der Checkliste (inventory_status) */
const KANON = {
  ko: { liste: TOPIK1_GRAMMATIK, praefix: 'tg', satz: (g) => g.beispiel.ko },
  de: { liste: GER_GRAMMATIK, praefix: 'gg', satz: (g) => g.beispiel.de },
}

/* Grammatik, aus der die Saetze gebaut werden duerfen.
   Zuerst das, was in der Checkliste bzw. der Einstufung abgehakt ist.
   Sind das WENIGER als `mindestens`, wird mit dem Anfang des Kanons
   aufgefuellt (Fund Franz 08.09.: mit nur vier Partikeln als Grundlage
   kamen immer dieselben simplen Saetze, und „schwer" war unmoeglich).
   Fehler sind hier ausdruecklich erlaubt — es ist eine Uebung. */
export async function nutzbareGrammatik(profileId, mindestens = 12) {
  const k = KANON[profileId === 'ko' ? 'ko' : 'de']
  let sicher = new Set()
  try {
    const { data } = await supabase
      .from('inventory_status')
      .select('item_id,status')
      .eq('profile', profileId)
      .eq('kind', 'grammatik')
      .eq('status', 'sicher')
    if (data) sicher = new Set(data.map((r) => r.item_id))
  } catch {
    try {
      sicher = new Set(JSON.parse(localStorage.getItem(`grammatik-liste-${k.praefix}`)) || [])
    } catch {
      /* egal */
    }
  }
  const abgehakt = k.liste.filter((g) => sicher.has(`${k.praefix}-${g.id}`))
  const rest = k.liste.filter((g) => !sicher.has(`${k.praefix}-${g.id}`))
  const liste =
    abgehakt.length >= mindestens ? abgehakt : [...abgehakt, ...rest.slice(0, mindestens - abgehakt.length)]
  return liste.map((g) => ({ muster: g.muster, name: g.name, beispiel: k.satz(g) }))
}

/* ---------- Abwechslung (Franz 08.09.) ----------
   Das Modell greift von sich aus immer zu denselben Szenen („im
   Restaurant"). Deshalb wuerfelt die APP je Runde die Schauplaetze und
   eine Handvoll Fokus-Woerter aus — beides geht als Vorgabe mit. */
const mische = mischeListe

/* Fokus-Woerter: eine Zufallsauswahl aus der Bibliothek, damit nicht
   immer dieselben paar Woerter benutzt werden. Sehr neue Woerter
   (heute eingetragen) bleiben draussen — die kommen im Stapel oft genug. */
export function zufallsWoerter(words, n = 24) {
  const gestern = Date.now() - 86400000
  const brauchbar = words.filter((w) => (w.createdAt || 0) < gestern)
  return mische(brauchbar.length >= n ? brauchbar : words)
    .slice(0, n)
    .map((w) => w.ko)
}

/* Rotation: was in den letzten 14 Tagen dran war */
async function zuletztBenutzt(profile) {
  const seit = new Date(Date.now() - ROTATION_TAGE * 86400000).toISOString()
  const { data } = await supabase
    .from('exercise_bank')
    .select('payload')
    .eq('profile', profile)
    .eq('typ', TYP)
    .gte('created_at', seit)
  const woerter = new Set()
  const grammatik = new Set()
  for (const r of data || []) {
    for (const s of r.payload?.saetze || []) {
      for (const w of s.woerter || []) woerter.add(w)
      for (const g of s.grammatik || []) grammatik.add(g)
    }
  }
  return { woerter: [...woerter], grammatik: [...grammatik] }
}

/* ============================================================
   SATZ-BAUKASTEN (Franz 09.10.) — vorerst nur Franz' Seite
   Die Auswahl-Logik selbst steht in baukasten.js (die teilt sich die
   App mit dem Nachtlauf). Hier nur, was Datenbank und Browser braucht:
   Lernstand holen, Function rufen, Runde merken.
   ============================================================ */
/* seit der vierten Fassung (09.10.) auf beiden Seiten und der Sandbox */
export const hatBaukasten = (profileId) => profileId === 'ko' || profileId === 'de' || profileId === 'sb'
/* welche Sprache gelernt wird — danach richten sich Muster-Gruppen,
   Wort-Filter und die Prüfung am Satz */
const spracheVon = (profileId) => (profileId === 'ko' ? 'ko' : 'de')

/* Der ganze Kanon mit Haken (sicher ja/nein) — baukasten.js entscheidet,
   was erlaubt ist und was Pflicht wird */
async function grammatikMitStand(profileId) {
  const k = KANON[spracheVon(profileId)]
  let sicher = new Set()
  try {
    const { data } = await supabase
      .from('inventory_status')
      .select('item_id')
      .eq('profile', profileId)
      .eq('kind', 'grammatik')
      .eq('status', 'sicher')
    if (data) sicher = new Set(data.map((r) => r.item_id))
  } catch {
    /* ohne Netz gibt es ohnehin keine Runde */
  }
  return k.liste.map((g) => ({
    id: g.id,
    stufe: g.stufe,
    muster: g.muster,
    /* der deutsche Kanon trägt den Namen auf Koreanisch (für 해인s
       Anzeige) — das Modell bekommt die englische Fassung */
    name: g.name_en || g.name,
    beispiel: k.satz(g),
    sicher: sicher.has(`${k.praefix}-${g.id}`),
  }))
}

/* Lernstand der Karten (Stabilität, Aussetzer) — eine kleine Abfrage,
   damit Spiel und Challenge keine Karten durchgereicht bekommen müssen */
async function ladeKartenStand(profile) {
  const { data, error } = await supabase.from('cards').select('word_id,stab,lapses,reps').eq('profile', profile)
  if (error) throw error
  return (data || []).map((c) => ({ wordId: c.word_id, stab: c.stab, lapses: c.lapses, reps: c.reps }))
}

/* Spielrunden landen nicht in der Bank — für die Rotation merkt sich
   das Gerät die letzten 14 Tage selbst (gleiche Form wie Bank-Zeilen) */
const SPIEL_KEY = (profile) => `baukasten-spiel:${profile}`
function leseSpielRunden(profile) {
  try {
    const seit = Date.now() - RINGE.rotationTage * 86400000
    return (JSON.parse(localStorage.getItem(SPIEL_KEY(profile))) || []).filter((r) => new Date(r.created_at).getTime() > seit)
  } catch {
    return []
  }
}
function merkeSpielRunde(profile, saetze) {
  try {
    const zeile = { created_at: new Date().toISOString(), payload: { saetze: saetze.map((s) => ({ woerter: s.woerter, grammatik: s.grammatik })) } }
    localStorage.setItem(SPIEL_KEY(profile), JSON.stringify([zeile, ...leseSpielRunden(profile)].slice(0, 40)))
  } catch {
    /* egal */
  }
}

async function ladeVerlauf(profile) {
  const seit = new Date(Date.now() - RINGE.rotationTage * 86400000).toISOString()
  const { data } = await supabase
    .from('exercise_bank')
    .select('payload,created_at')
    .eq('profile', profile)
    .eq('typ', TYP)
    .gte('created_at', seit)
  const zeilen = [...(data || []), ...leseSpielRunden(profile)].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  return leseVerlauf(zeilen)
}

/* Eine Runde aus dem Baukasten: EIN Aufruf für 3 oder 5 Sätze (plus
   ein Reserve-Satz). Die Schwierigkeit wirkt an drei Stellen — in der
   Wortauswahl (mehr Pflicht-Wörter, seltenere Auswahl), in den Mustern
   (leicht: eines aus Stufe 1, schwer: zwei je Satz mit Verbindungen)
   und in der Satzlänge, die die Function vorgibt.
   Läuft der Aufruf in die 25-Sekunden-Grenze oder reißt das Netz, gibt
   es genau EINEN zweiten Versuch — nie wegen der Satzqualität.
   -> { saetze: [{ de, ko, woerter, grammatik }], verworfen } */
/* gruendlich = mit Vor-Denken (bessere Sätze, aber ein Vielfaches der
   Zeit): nur für Runden, auf die niemand wartet. Der schnelle Gang
   bricht nach 25 s ab und versucht es einmal neu; der gründliche
   bekommt 55 s und keinen zweiten Versuch. */
export async function baukastenRunde({ profile, words, anzahl = 5, schwierigkeit = 'mittel', wunsch = '', merken = false, gruendlich = false }) {
  const sprache = spracheVon(profile)
  const [karten, grammatik, verlauf] = await Promise.all([ladeKartenStand(profile), grammatikMitStand(profile), ladeVerlauf(profile)])
  const musterWahl = waehleMuster({
    grammatik,
    saetze: anzahl + 1,
    schwierigkeit,
    musterZuletzt: verlauf.musterZuletzt,
    letztePflicht: verlauf.letztePflicht,
    sprache,
  })
  const kit = baueBaukasten({
    sprache,
    words,
    cards: karten,
    zuletzt: verlauf.woerter,
    anzahl,
    schwierigkeit,
    /* mit freiem Wunsch etwas mehr Auswahl, damit er erfüllbar ist */
    auswahlFaktor: wunsch ? 1.5 : 1,
  })
  if (kit.pflicht.length + kit.auswahl.length + kit.grundstock.length < 15) throw new Error('zu-wenig-woerter')

  const anfrage = baueAnfrage({ profile, kit, musterWahl, anzahl, schwierigkeit, wunsch, gruendlich })
  const warte = gruendlich ? 55000 : 25000
  let res
  try {
    res = await trainerSatzBaukasten(anfrage, warte)
  } catch (e) {
    const technisch = e?.message === 'zeit' || e?.message === 'netz' || /Failed to fetch|Load failed|trainer 5\d\d/.test(e?.message || '')
    if (!technisch || gruendlich) throw e
    res = await trainerSatzBaukasten(anfrage, warte)
  }
  const { saetze, verworfen } = pruefeSaetze({ saetze: res?.saetze, kit, bibliothek: words, plan: musterWahl.plan, anzahl, sprache })
  if (!saetze.length) throw new Error(`leer:${res?.grund || '?'}`)
  if (verworfen.length) console.warn('Baukasten: fremde Wörter in', verworfen.slice(0, 4))
  if (merken) merkeSpielRunde(profile, saetze)
  return { saetze, verworfen }
}

/* ---------- Vorladen fürs Übersetzungsspiel ----------
   Nach einer Runde holt die App im Hintergrund die nächste mit
   denselben Einstellungen (ohne Wunsch). Der Knopf antwortet dann
   sofort. Liegt auf dem Gerät, hält 7 Tage, wird beim Benutzen
   verbraucht. */
const VOR_KEY = (profile) => `baukasten-vor:${profile}`
export function nimmVorgeladen(profile, anzahl, stufe) {
  try {
    const d = JSON.parse(localStorage.getItem(VOR_KEY(profile)))
    if (!d || d.anzahl !== anzahl || d.stufe !== stufe || Date.now() - d.t > 7 * 86400000) return null
    localStorage.removeItem(VOR_KEY(profile))
    return d.saetze
  } catch {
    return null
  }
}
let laedtVor = false
export function ladeVor({ profile, words, anzahl, stufe }) {
  if (laedtVor) return
  try {
    const d = JSON.parse(localStorage.getItem(VOR_KEY(profile)))
    if (d && d.anzahl === anzahl && d.stufe === stufe && Date.now() - d.t < 7 * 86400000) return
  } catch {
    /* egal */
  }
  laedtVor = true
  /* Das Spiel läuft im SCHNELLEN Gang (Entscheidung Franz 09.10.) —
     der gründliche bleibt der Tages-Challenge aus dem Nachtlauf
     vorbehalten. Vorgeladen wird trotzdem: dann steht die nächste
     Runde beim Tipp auf den Knopf schon da. */
  baukastenRunde({ profile, words, anzahl, schwierigkeit: stufe, merken: true })
    .then((r) => {
      if (r.saetze.length >= Math.min(3, anzahl)) {
        localStorage.setItem(VOR_KEY(profile), JSON.stringify({ t: Date.now(), anzahl, stufe, saetze: r.saetze }))
      }
    })
    .catch(() => {})
    .finally(() => {
      laedtVor = false
    })
}

/* Beim Trainer erzeugen und in die Bank legen -> Bankzeile oder null */
async function erzeugeInBank(profile, words) {
  if (hatBaukasten(profile)) {
    try {
      const runde = await baukastenRunde({ profile, words, anzahl: 5, schwierigkeit: 'mittel' })
      if (runde.saetze.length < 3) return null
      const { data, error } = await supabase
        .from('exercise_bank')
        .insert({ profile, typ: TYP, payload: { saetze: runde.saetze, verworfen: runde.verworfen, quelle: 'baukasten' }, status: 'neu' })
        .select('id,payload')
        .single()
      if (error) throw error
      return data
    } catch (e) {
      /* 400 = die Function kennt die neue Aktion noch nicht (noch nicht
         neu deployt) -> der alte Weg darunter springt ein */
      /* … und 500 = die Function ist an der Anfrage gescheitert (z. B. von
         der API abgelehnt). Auch dann lieber der alte Weg als kein Satz. */
      if (!/^trainer (400|500)/.test(e?.message || '')) {
        console.warn('Baukasten-Runde gescheitert:', e?.message || e)
        return null
      }
    }
  }
  const [grammatik, vermeiden] = await Promise.all([nutzbareGrammatik(profile), zuletztBenutzt(profile)])
  const woerter = words.map((w) => ({ ko: w.ko, en: w.en }))
  const res = await trainerSatzChallengeErzeugen({
    profile,
    woerter,
    grammatik,
    vermeiden,
    szenen: zufallsSzenen(7),
    fokus: zufallsWoerter(words),
  })
  const saetze = Array.isArray(res?.saetze) ? res.saetze : []
  if (saetze.length < 3) {
    /* Sichtbar machen, WARUM nichts kam — sonst steht in der App nur
       „keine Sätze" und man raet (Franz 08.09.) */
    console.warn('Satz-Challenge leer:', res?.grund || 'unbekannt', (res?.verworfen || []).slice(0, 3))
    return null
  }
  const { data, error } = await supabase
    .from('exercise_bank')
    .insert({ profile, typ: TYP, payload: { saetze, verworfen: res.verworfen || [] }, status: 'neu' })
    .select('id,payload')
    .single()
  if (error) throw error
  return data
}

/* -> { date, bankId, saetze, antworten, bewertung, fertig } | null */
export async function ladeTagesChallenge(words) {
  const puffer = lesePuffer()
  if (puffer) return puffer
  const profile = getActiveProfile()
  let zeile = null
  try {
    const { data } = await supabase
      .from('exercise_bank')
      .select('id,payload')
      .eq('profile', profile)
      .eq('typ', TYP)
      .eq('status', 'neu')
      .order('created_at', { ascending: true })
      .limit(2)
    const offen = data || []
    zeile = offen[0] || null
    if (!zeile) zeile = await erzeugeInBank(profile, words)
    /* Vorrat fuer morgen im Hintergrund auffuellen */
    if (zeile && offen.length < 2) erzeugeInBank(profile, words).catch(() => {})
  } catch (e) {
    console.warn('Tages-Challenge nicht ladbar:', e?.message || e)
    return null
  }
  if (!zeile) return null
  const d = {
    date: todayStr(),
    bankId: zeile.id,
    saetze: (zeile.payload?.saetze || []).slice(0, 5).map((s, i) => ({ nr: i + 1, ...s })),
    antworten: [],
    bewertung: null,
    fertig: false,
  }
  schreibePuffer(d)
  return d
}

/* Antworten (und spaeter die Bewertung) in Bank + Puffer sichern */
export async function sichereTagesChallenge(d) {
  schreibePuffer(d)
  if (!d.bankId) return
  const alleGruen = d.bewertung?.ergebnisse?.length
    ? d.bewertung.ergebnisse.every((e) => e.urteil === 'gruen')
    : null
  const { error } = await supabase
    .from('exercise_bank')
    .update({
      status: d.fertig ? 'erledigt' : 'neu',
      korrekt: alleGruen,
      erledigt_am: d.fertig ? new Date().toISOString() : null,
      payload: { saetze: d.saetze, antworten: d.antworten, bewertung: d.bewertung },
    })
    .eq('id', d.bankId)
    .eq('profile', getActiveProfile())
  if (error) console.warn('Tages-Challenge nicht gesichert:', error.message)
}
