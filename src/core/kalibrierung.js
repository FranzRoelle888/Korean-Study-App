/* ============================================================
   KALIBRIERUNG — Kernlogik (Konzept: docs/WISSENSMODELL.md)

   Lädt die Inventare (erst bei Bedarf, damit sie nicht im
   Start-Paket der App landen), steuert die Band-Stichproben
   beim Wischen und speichert Ergebnisse nach inventory_status.

   Leitplanken (Franz): konservativ einstufen, Startwert statt
   Urteil — das SM-2-Verhalten korrigiert später von selbst.
   ============================================================ */
import { supabase } from './supabaseClient'

export const BAND_GROESSE = 40
export const PROBE_JE_BAND = 10
export const MAX_BAENDER = 12

/* ---------- Inventare laden (dynamisch) ---------- */
export async function ladeWortInventar(profileId) {
  if (profileId === 'ko') {
    const { default: liste } = await import('./inventare/topik1-woerter.json')
    return liste.map((e) => ({
      id: e.id,
      wort: e.ko,
      lang: 'ko',
      label: e.en ? `${e.ko} (${e.en})` : e.ko,
    }))
  }
  const { default: liste } = await import('./inventare/goethe-woerter.json')
  return liste.map((e) => ({
    id: e.id,
    wort: e.artikel ? `${e.artikel} ${e.de}` : e.de,
    lang: 'de',
    label: `${e.artikel ? e.artikel + ' ' : ''}${e.de}${e.ko ? ` (${e.ko})` : ''}`,
  }))
}

export async function ladeGrammatikInventar(profileId) {
  if (profileId === 'ko') {
    const { TOPIK1_GRAMMATIK } = await import('./inventare/topik1-grammatik')
    return TOPIK1_GRAMMATIK.map((g) => ({
      id: `tg-${g.id}`,
      muster: g.muster,
      name: g.name,
      satz: g.beispiel.ko,
      satzTr: g.beispiel.tr,
      lang: 'ko',
      label: `${g.muster} (${g.name})`,
    }))
  }
  const { GER_GRAMMATIK } = await import('./inventare/ger-grammatik')
  return GER_GRAMMATIK.map((g) => ({
    id: `gg-${g.id}`,
    muster: g.muster,
    name: g.name,
    satz: g.beispiel.de,
    satzTr: g.beispiel.tr,
    lang: 'de',
    label: `${g.muster} (${g.name_en})`,
  }))
}

/* ---------- Band-Stichproben ----------
   Aus Band n eine Zufallsstichprobe ziehen. Der Zufall ist über
   den Band-Index gesät, damit ein Neustart dieselben Wörter
   zeigt (Wiederaufnehmbarkeit). */
export function bandProbe(inventar, bandIndex) {
  const start = bandIndex * BAND_GROESSE
  const band = inventar.slice(start, start + BAND_GROESSE)
  if (band.length === 0) return []
  /* einfacher gesäter Pseudo-Zufall (mulberry32) */
  let s = 1000003 * (bandIndex + 1)
  const zufall = () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const kopie = [...band]
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(zufall() * (i + 1))
    ;[kopie[i], kopie[j]] = [kopie[j], kopie[i]]
  }
  return kopie.slice(0, PROBE_JE_BAND)
}

/* Nach einem Band entscheiden, wie es weitergeht.
   >= 80 % gekannt: 2 Bänder vorspringen (Zeit sparen)
   <= 30 % gekannt: Grenze gefunden — aufhören
   sonst: nächstes Band */
export function naechsterSchritt(bekanntQuote, bandIndex, inventarLaenge, gewischteBaender) {
  const anzahlBaender = Math.ceil(inventarLaenge / BAND_GROESSE)
  if (gewischteBaender >= MAX_BAENDER) return { fertig: true }
  if (bekanntQuote <= 0.3) return { fertig: true }
  const sprung = bekanntQuote >= 0.8 ? 3 : 1
  const naechstes = bandIndex + sprung
  if (naechstes >= anzahlBaender) return { fertig: true }
  return { fertig: false, band: naechstes }
}

/* ---------- Start-Band aus den Can-do-Antworten ---------- */
export function startBand(candoPunkte /* 0..8 */) {
  if (candoPunkte >= 7) return 6
  if (candoPunkte >= 5) return 4
  if (candoPunkte >= 3) return 2
  return 0
}

/* ---------- Speichern ---------- */
/* rows: [{ item_id, kind, status, label }] — profile kommt hier dazu.
   Upsert: Wiederholen der Kalibrierung überschreibt alte Urteile. */
export async function speichereStatus(profileId, rows) {
  if (!rows.length) return
  const { error } = await supabase.from('inventory_status').upsert(
    rows.map((r) => ({ ...r, profile: profileId, source: 'kalibrierung' })),
    { onConflict: 'profile,item_id' }
  )
  if (error) throw error
}

/* ---------- Abschluss-Merker ---------- */
export function kalibrierungErledigt(profileId) {
  try {
    return localStorage.getItem(`korean-app:${profileId}:kalibrierung`) === 'done'
  } catch {
    return false
  }
}

export function merkeKalibrierungErledigt(profileId) {
  try {
    localStorage.setItem(`korean-app:${profileId}:kalibrierung`, 'done')
  } catch {
    /* egal */
  }
}
