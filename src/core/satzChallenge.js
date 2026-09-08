/* ============================================================
   TAGES-CHALLENGE — fünf Sätze aus dem eigenen Wortschatz (Franz 07.09.)

   Ablauf:
   1. Heute schon eine Challenge? -> lokaler Puffer (cacheKey).
   2. Sonst die älteste unerledigte aus der Aufgaben-Bank nehmen
      (exercise_bank, typ 'satzchallenge'). Die Bank hält immer einen
      Satz auf Vorrat, damit auch ein Tag ohne Netz einen bekommt.
   3. Ist die Bank leer: beim Trainer erzeugen lassen (ein Aufruf) —
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
import { trainerSatzChallengeErzeugen } from '../features/trainer/trainerApi'

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
      sicher = new Set(JSON.parse(localStorage.getItem('grammatik-liste-ko')) || [])
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
const SZENEN = [
  'at home', 'in the kitchen', 'at a café', 'on the bus or subway', 'at work', 'talking about the weather',
  'weekend plans', 'family', 'grocery shopping', "at the doctor's", 'on the phone', 'studying',
  'sport and exercise', 'a trip', 'clothes and shopping', 'a hobby', 'meeting a friend', 'the morning routine',
  'in the evening', 'money and paying', 'the post office', 'the library', 'cinema or TV', 'in a park',
  'a birthday', 'the neighbours', 'a pet', 'cooking dinner', 'something got lost', 'making an appointment',
  'being late', 'a small argument', 'the new flat', 'music', 'a photo', 'the weather got cold',
]

function mische(liste) {
  const a = [...liste]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function zufallsSzenen(n) {
  return mische(SZENEN).slice(0, Math.max(1, n))
}

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

/* Beim Trainer erzeugen und in die Bank legen -> Bankzeile oder null */
async function erzeugeInBank(profile, words) {
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
  if (saetze.length < 3) return null
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
