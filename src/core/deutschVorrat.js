/* ============================================================
   DEUTSCHER VORRAT — Haeins Nachziehquelle für den Vokabel-Motor
   (Entscheidung Franz 06.09.: nach Häufigkeit, A1 vor A2, keine
   Wortart-Blöcke, keine Funktionswörter)

   Anders als bei Franz liegt ihr Vorrat nicht in der Datenbank,
   sondern komplett in Dateien: Die Goethe-A2-Liste bringt Wort,
   Artikel, Plural, koreanische Bedeutung und Beispielsatz mit, der
   kuratierte germanPool die 'English (한국어)'-Bedeutungszeile. Die
   Reihenfolge kommt aus goethe-rang.json (echte Untertitel-
   Häufigkeit, siehe scripts/baue-goethe-rang.mjs).

   Ergebnis: dieselbe Form wie eine Vorrat-Zeile bei Franz, damit
   Auswahl, Ritual und Karten denselben Code benutzen.
   ============================================================ */
import { germanPool } from './germanPool'
import goethe from './inventare/goethe-woerter.json'
import rangDaten from './inventare/goethe-rang.json'

const norm = (s) => String(s ?? '').normalize('NFC').trim()
const FUNKTIONSWOERTER = new Set(rangDaten.funktionswort || [])
const RANG = rangDaten.rang || {}

/* Pluralform ausschreiben: "-e" -> Tische, "¨-e" -> Bäume, "-" ->
   unverändert, "die Häuser" -> Häuser; immer mit "die" davor */
export function pluralAusgeschrieben(de, plural) {
  if (!plural) return null
  let p = String(plural).trim()
  if (/^die\s/i.test(p)) return p
  if (/^-?¨/.test(p)) {
    const rest = p.replace(/^-?¨-?/, '')
    const um = { a: 'ä', o: 'ö', u: 'ü', A: 'Ä', O: 'Ö', U: 'Ü' }
    let i = -1
    for (let k = de.length - 1; k >= 0; k--) {
      if (um[de[k]]) {
        i = k
        break
      }
    }
    const stamm = i === -1 ? de : de.slice(0, i) + um[de[i]] + de.slice(i + 1)
    return `die ${stamm}${rest}`
  }
  if (p === '-') return `die ${de}`
  if (p.startsWith('-')) return `die ${de}${p.slice(1)}`
  return `die ${p}`
}

/* Nur das Wort ohne Artikel: "der Tisch" -> "Tisch" */
export function ohneArtikel(wort) {
  return norm(wort).replace(/^(der|die|das)\s+/i, '')
}

let vorrat = null

function baue() {
  const kuratiert = new Map(germanPool.map((e) => [norm(e.ko), e]))
  const liste = []
  const gesehen = new Set()
  for (const e of goethe) {
    /* aus = unbrauchbarer Rest der Quellenliste („Feier-",
       „(an-)/(aus)ziehen"); der Anreicherungslauf markiert sie */
    if (!e.de || e.aus || FUNKTIONSWOERTER.has(e.id)) continue
    const wort = e.artikel ? `${e.artikel} ${e.de}` : e.de
    const k = norm(wort)
    if (gesehen.has(k)) continue
    gesehen.add(k)
    const kur = kuratiert.get(k)
    const satz = kur?.ex || e.bsp || null
    if (!satz) continue /* ohne Satz kein Ritual — Regel wie bei Franz */
    liste.push({
      invId: e.id,
      ko: wort,
      /* Bedeutung: die angereicherte Zeile gewinnt (vom deutschen
         Wort aus geschrieben und von einem zweiten Modell geprüft,
         siehe scripts/deutsch-anreichern.mjs), danach die kuratierte
         Liste, zuletzt der Rohbestand */
      en: (e.en && e.ko ? `${e.en} (${e.ko})` : null) || kur?.en || e.ko || e.bsp_en || '',
      de: null,
      pos: e.pos || (e.artikel ? 'noun' : e.konj ? 'verb' : kur?.pos || null),
      rang: RANG[e.id] ?? 99999,
      ex: satz,
      exTr: kur?.exEn || e.bsp_en || null,
      nuance: e.nuance || null,
      hanja: null,
      /* Vokabel-Qualität (09.09.): Infotext auf Koreanisch,
         Bedeutungsfamilie, Kasus des Verbs */
      info: e.info || null,
      familie: e.familie || null,
      kasus: e.kasus || null,
      plural: e.artikel ? pluralAusgeschrieben(e.de, e.plural) : null,
      konj: e.konj || null,
      bereit: true,
      audioOk: true,
      uebersprungen: false,
    })
  }
  liste.sort((a, b) => a.rang - b.rang)
  return liste
}

export function deutscherVorrat() {
  if (!vorrat) vorrat = baue()
  return vorrat
}
