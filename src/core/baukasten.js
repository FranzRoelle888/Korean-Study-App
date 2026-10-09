/* ============================================================
   SATZ-BAUKASTEN (Franz 09.10.) — die App wählt aus, die KI schreibt

   WARUM: Bisher bekam das Modell die ganze Bibliothek (bis 600
   Wörter) und sollte selbst sicherstellen, dass jeder Satz nur daraus
   besteht. Das ist eine Suchaufgabe: 20–40 Sekunden Nachdenken,
   Reserve-Sätze, nachträgliches Verwerfen, im Nachtlauf bis zu drei
   Versuche. Im Übersetzungsspiel lief das regelmäßig in Safaris
   60-Sekunden-Grenze.

   JETZT stellt die App je Runde einen kleinen Baukasten zusammen —
   kostenlos, sofort, aus dem Lernstand — und das Modell schreibt nur
   noch. Drei Wort-Ringe:
     Pflicht     wenige Wörter, die gerade Übung brauchen (neu,
                 wackelig, lange nicht dran). Jedes MUSS vorkommen.
     Auswahl     gemischt nach Wortart, ohne die letzten 14 Tage.
                 Darf benutzt werden.
     Grundstock  die häufigsten Wörter, die sicher sitzen — der Kitt.
   Dazu je Satz ein eigenes Pflicht-Muster (das am längsten nicht
   geübte zuerst). Die Rotation steckt damit in der AUSWAHL; es gibt
   nichts mehr nachträglich zu verwerfen und keine Wiederholversuche.

   Reines Modul ohne Browser- oder Datenbankzugriff: Die App
   (satzChallenge.js) und der Nachtlauf (scripts/baue-satzchallenge.mjs)
   benutzen dieselbe Logik. Vorerst nur Franz' Seite (Koreanisch).
   ============================================================ */
import { rechneHaeyo, rechneAttributiv } from './haeyo.js'

/* ---------- Die Stellschrauben ----------
   Startwerte vom 09.10. — nach der Probe hier drehen, nirgends sonst. */
export const RINGE = {
  /* Pflicht-Wörter je Satz, nach Schwierigkeit (Übersetzungsspiel):
     bei 5 Sätzen 5 / 8 / 10, bei 3 Sätzen 3 / 5 / 6. Die Tages-Challenge
     läuft immer auf „mittel". */
  pflichtJeSatz: { leicht: 1, mittel: 1.6, schwer: 2 },
  /* „leicht" zieht die Auswahl aus den häufigeren 60 % der Bibliothek,
     „schwer" aus den selteneren 60 % */
  auswahlAnteil: 0.6,
  auswahlJeSatz: 6 /* 5 Sätze -> 30 Auswahl-Wörter */,
  grundstock: 100,
  grundstockFest: 60 /* die häufigsten bleiben immer drin … */,
  grundstockTeich: 150 /* … der Rest wechselt, gezogen aus den nächsten 150 */,
  allesBis: 150 /* kleinere Bibliothek: einfach alles mitgeben */,
  rotationTage: 14,
  musterSperre: 3 /* Pflicht-Muster der letzten 3 Challenges ruhen */,
}
/* Wortarten-Mischung im Auswahl-Ring — damit sich Sätze bilden lassen */
const QUOTE = { noun: 0.4, verb: 0.27, adj: 0.17 } /* Rest: alles andere */

/* Muster, ohne die kein Satz auskommt: immer erlaubt, nie „Pflicht" */
const FUNDAMENT = new Set([
  'ident', 'topic-eun-neun', 'subj-i-ga', 'obj-eul-reul', 'praes-haeyo', 'exist-itda',
  'ort-e', 'ort-eseo', 'neg-an', 'auch-do', 'fragew',
])
/* Passen nicht zur 해요-Ebene der Sätze — nie als Pflicht */
const NIE_PFLICHT = new Set(['formal-mnida', 'lasst-uns-psida'])
/* Verbinden zwei Satzteile — „schwer" verlangt mindestens zwei davon */
const VERBINDER = new Set([
  'verb-und-go', 'aber-jiman', 'wenn-myeon', 'weil-eoseo', 'weil-nikka', 'waehrend-myeonseo',
  'weil-gi-ttaemune', 'kontext-nunde', 'bevor-gi-jeone', 'nachdem-n-hue',
])

const norm = (s) => String(s ?? '').normalize('NFC').trim().replace(/\s+/g, ' ')
export function mische(liste) {
  const a = [...liste]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* ---------- Die drei Wort-Ringe ----------
   words:   [{ id, ko, en, pos, rang, createdAt (ms) }]
   cards:   [{ wordId, stab, lapses, reps }]
   zuletzt: Set der Wörter aus den letzten 14 Tagen
   schwierigkeit: leicht | mittel | schwer — mehr Pflicht-Wörter und
            seltenere Auswahl, je schwerer
   -> { pflicht, auswahl, grundstock } je [{ ko, en, pos }] */
export function baueBaukasten({ words, cards, zuletzt = new Set(), anzahl = 5, schwierigkeit = 'mittel', auswahlFaktor = 1 }) {
  /* Lernstand je Wort aus seinen Karten */
  const stand = new Map()
  for (const c of cards) {
    const e = stand.get(c.wordId) ?? { lapses: 0, reps: 0, stabMin: null, stabMax: 0 }
    e.lapses = Math.max(e.lapses, c.lapses ?? 0)
    e.reps = Math.max(e.reps, c.reps ?? 0)
    if (c.stab != null) {
      e.stabMin = e.stabMin == null ? c.stab : Math.min(e.stabMin, c.stab)
      e.stabMax = Math.max(e.stabMax, c.stab)
    }
    stand.set(c.wordId, e)
  }

  /* Brauchbar als Baustein: schon einmal gelernt, kein Zahlwort, keine
     ganze Wendung. Gleiche Schreibweise nur einmal (Homonyme). */
  const gesehen = new Set()
  const brauchbar = []
  for (const w of words) {
    const ko = norm(w.ko)
    const s = stand.get(w.id)
    if (!ko || !s || (s.reps === 0 && s.lapses === 0)) continue
    if (w.pos === 'number' || w.pos === 'phrase' || [...ko].length > 10 || /[?!.,]/.test(ko)) continue
    if (gesehen.has(ko)) continue
    gesehen.add(ko)
    brauchbar.push({ ko, en: String(w.en ?? '').slice(0, 60), pos: w.pos || null, rang: w.rang ?? 99999, neu: Date.now() - (w.createdAt || 0) < 7 * 86400000, ...s })
  }
  const schlank = (w) => ({ ko: w.ko, en: w.en, pos: w.pos })
  const pflichtZahl = Math.max(2, Math.round(anzahl * (RINGE.pflichtJeSatz[schwierigkeit] ?? RINGE.pflichtJeSatz.mittel)))

  /* Kleine Bibliothek: kein Sieben, alles ist erlaubt */
  const klein = brauchbar.length <= RINGE.allesBis

  /* --- Grundstock: häufig UND sicher. Reicht „sicher" nicht für 100,
         wird schrittweise gelockert (Stabilität 21 -> 7 -> egal). --- */
  let stock
  {
    const nachRang = [...brauchbar].sort((a, b) => a.rang - b.rang)
    const sicher = nachRang.filter((w) => w.stabMax >= 21 && !w.neu)
    const halb = nachRang.filter((w) => w.stabMax >= 7 && w.stabMax < 21 && !w.neu)
    const rest = nachRang.filter((w) => !sicher.includes(w) && !halb.includes(w))
    const reihe = [...sicher, ...(sicher.length < RINGE.grundstock ? halb : []), ...(sicher.length + halb.length < RINGE.grundstock ? rest : [])]
    const fest = reihe.slice(0, RINGE.grundstockFest)
    const teich = reihe.slice(RINGE.grundstockFest, RINGE.grundstockFest + RINGE.grundstockTeich)
    stock = klein
      ? [] /* wird unten mit allem Übrigen gefüllt */
      : [...fest, ...mische(teich).slice(0, RINGE.grundstock - fest.length)].map(schlank)
  }
  const imStock = new Set(stock.map((w) => w.ko))

  /* --- Pflicht: neu / wackelig / reif-aber-lange-nicht-dran --- */
  const frei = brauchbar.filter((w) => !imStock.has(w.ko))
  const pflicht = []
  const nimm = (topf, n) => {
    /* erst, was in den letzten 14 Tagen NICHT dran war */
    for (const w of [...mische(topf.filter((x) => !zuletzt.has(x.ko))), ...mische(topf.filter((x) => zuletzt.has(x.ko)))]) {
      if (n <= 0 || pflicht.length >= pflichtZahl) break
      if (pflicht.includes(w)) continue
      pflicht.push(w)
      n--
    }
  }
  const neu = frei.filter((w) => w.neu)
  const wackelig = frei.filter((w) => !w.neu && (w.lapses >= 1 || (w.stabMin != null && w.stabMin < 7)))
  const reif = frei.filter((w) => !w.neu && w.stabMax >= 21)
  const drittel = Math.round(pflichtZahl * 0.375)
  nimm(neu, drittel)
  nimm(wackelig, drittel)
  nimm(reif, pflichtZahl - pflicht.length)
  /* Ein Topf war zu klein: aus den anderen auffüllen, zuletzt aus allem */
  nimm([...wackelig, ...neu, ...reif], pflichtZahl - pflicht.length)
  nimm(frei, pflichtZahl - pflicht.length)

  /* --- Auswahl: nach Wortart gemischt, ohne die letzten 14 Tage --- */
  const uebrig = frei.filter((w) => !pflicht.includes(w))
  if (klein) {
    return { pflicht: pflicht.map(schlank), auswahl: [], grundstock: stock.length ? stock : uebrig.map(schlank) }
  }
  const auswahlZahl = Math.round(anzahl * RINGE.auswahlJeSatz * auswahlFaktor)
  let frischAlle = uebrig.filter((w) => !zuletzt.has(w.ko))
  /* Schwierigkeit: „leicht" nimmt die geläufigeren Wörter, „schwer" die
     selteneren — aber nur, wenn danach noch genug Auswahl bleibt */
  if (schwierigkeit !== 'mittel') {
    const nachRang = [...frischAlle].sort((a, b) => a.rang - b.rang)
    const n = Math.ceil(nachRang.length * RINGE.auswahlAnteil)
    const teil = schwierigkeit === 'leicht' ? nachRang.slice(0, n) : nachRang.slice(-n)
    if (teil.length >= auswahlZahl) frischAlle = teil
  }
  const frisch = mische(frischAlle)
  const schonDran = mische(uebrig.filter((w) => zuletzt.has(w.ko)))
  const auswahl = []
  for (const [pos, anteil] of Object.entries(QUOTE)) {
    auswahl.push(...frisch.filter((w) => w.pos === pos).slice(0, Math.round(auswahlZahl * anteil)))
  }
  for (const w of [...frisch, ...schonDran]) {
    if (auswahl.length >= auswahlZahl) break
    if (!auswahl.includes(w)) auswahl.push(w)
  }
  return { pflicht: pflicht.map(schlank), auswahl: mische(auswahl).map(schlank), grundstock: stock }
}

/* ---------- Grammatik: je Satz ein eigenes Pflicht-Muster ----------
   grammatik: der Kanon [{ id, stufe, muster, name, beispiel, sicher }]
   musterZuletzt: Map muster -> Zeitpunkt (ms) der letzten Challenge
   letztePflicht: Set der Pflicht-Muster der letzten 3 Challenges
   -> { erlaubt: [{ muster, name, beispiel }], plan: [[muster, …], …] } */
export function waehleMuster({ grammatik, saetze = 6, schwierigkeit = 'mittel', musterZuletzt = new Map(), letztePflicht = new Set() }) {
  /* Erlaubt ist, was abgehakt ist — bei weniger als 12 wird mit dem
     Anfang des Kanons aufgefüllt (Regel vom 08.09.) — plus Fundament */
  const sicher = grammatik.filter((g) => g.sicher)
  const dazu = sicher.length >= 12 ? [] : grammatik.filter((g) => !g.sicher).slice(0, 12 - sicher.length)
  const erlaubtSet = new Set([...sicher, ...dazu, ...grammatik.filter((g) => FUNDAMENT.has(g.id))])
  const erlaubt = grammatik.filter((g) => erlaubtSet.has(g))

  /* Reihenfolge der Kandidaten: gesperrte nach hinten, dann das am
     längsten nicht Geübte zuerst (nie geübt = ganz vorn) */
  const ordne = (liste) =>
    mische(liste).sort(
      (a, b) =>
        (letztePflicht.has(a.muster) ? 1 : 0) - (letztePflicht.has(b.muster) ? 1 : 0) ||
        (musterZuletzt.get(a.muster) ?? 0) - (musterZuletzt.get(b.muster) ?? 0)
    )
  let kandidaten = erlaubt.filter((g) => !FUNDAMENT.has(g.id) && !NIE_PFLICHT.has(g.id))
  if (schwierigkeit === 'leicht' && kandidaten.filter((g) => g.stufe === 1).length >= saetze) {
    kandidaten = kandidaten.filter((g) => g.stufe === 1)
  }
  const jeSatz = schwierigkeit === 'schwer' ? 2 : 1
  let reihe = ordne(kandidaten)
  /* Zu wenige abgehakte Muster: das Fundament füllt auf */
  if (reihe.length < saetze * jeSatz) reihe = [...reihe, ...ordne(erlaubt.filter((g) => FUNDAMENT.has(g.id)))]

  const plan = Array.from({ length: saetze }, () => [])
  const benutzt = new Set()
  const naechstes = (filter = () => true) => {
    const g = reihe.find((x) => !benutzt.has(x) && filter(x)) ?? reihe.find((x) => filter(x))
    if (g) benutzt.add(g)
    return g
  }
  if (schwierigkeit === 'schwer') {
    /* mindestens zwei Sätze mit Verbindung (weil, wenn, aber …) */
    for (let i = 0; i < Math.min(2, saetze); i++) {
      const v = naechstes((g) => VERBINDER.has(g.id) && !benutzt.has(g))
      if (v) plan[i].push(v.muster)
    }
  }
  for (let i = 0; i < saetze; i++) {
    while (plan[i].length < jeSatz) {
      const g = naechstes((x) => !plan[i].includes(x.muster))
      if (!g) break
      plan[i].push(g.muster)
    }
  }
  return { erlaubt: erlaubt.map((g) => ({ muster: g.muster, name: g.name, beispiel: g.beispiel })), plan }
}

/* ---------- Die Anfrage an die Trainer-Function ---------- */
export function baueAnfrage({ profile, kit, musterWahl, szenen, anzahl, schwierigkeit, wunsch = '' }) {
  return {
    action: 'satzBaukasten',
    profile,
    anzahl,
    schwierigkeit,
    wunsch,
    grundstock: kit.grundstock.map(({ ko, en }) => ({ ko, en })),
    pflicht: kit.pflicht.map(({ ko, en }) => ({ ko, en })),
    auswahl: kit.auswahl.map(({ ko, en }) => ({ ko, en })),
    erlaubt: musterWahl.erlaubt,
    /* ein Satz mehr als gebraucht — die eine Reserve */
    plan: musterWahl.plan.slice(0, anzahl + 1).map((muster, i) => ({ muster, szene: szenen[i] ?? '' })),
  }
}

/* ============================================================
   PRÜFUNG AM SATZ SELBST
   Früher wurde die Wortliste geprüft, die das Modell MELDETE — ein
   verschwiegenes Fremdwort ging durch, eine gemeldete gebeugte Form
   warf einen guten Satz raus. Jetzt wird der koreanische Satz Wort
   für Wort gegen den Baukasten gehalten, mit den Formen, die
   haeyo.js ausrechnen kann (덥다 -> 덥 / 더워 / 더운).
   Bewusst nachsichtig: gefangen werden soll das klare Fremdwort,
   nicht jede seltene Beugung.
   ============================================================ */
/* Freie Wörter, die immer erlaubt sind (Grammatik, keine Vokabel) */
const FREI = [
  '저', '나', '우리', '너', '제', '내', '이거', '그거', '저거', '이것', '그것', '저것', '여기', '거기', '저기',
  '이', '그', '저', '뭐', '무엇', '누구', '누가', '어디', '언제', '왜', '어떻게', '얼마', '얼마나', '몇', '무슨', '어떤', '어느',
  '네', '아니요', '그리고', '그래서', '하지만', '그런데', '그러면', '그럼', '아주', '너무', '정말', '많이', '조금', '좀', '잘', '안', '못', '더', '제일', '가장', '다', '또', '같이', '지금',
  '것', '거', '수', '때', '중', '후', '전', '적', '동안', '때문',
  '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉', '열', '스물', '서른', '마흔', '쉰',
  '한', '두', '세', '네', '스무', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구', '십', '백', '천', '만',
  '시', '분', '살', '원', '년', '월', '개', '명', '번',
]
/* Hilfsverben und Endungs-Stämme, die als eigenes Wort im Satz stehen */
const HILFS = ['있', '없', '싶', '않', '되', '돼', '주', '하', '해', '보', '봐', '말', '같', '이에요', '예요', '아니']
const PARTIKEL = /^(은|는|이|가|을|를|도|의|에|에서|에게|한테|한테서|께|께서|와|과|하고|로|으로|만|부터|까지|보다|처럼|요|예요|이에요|입니다)*$/

const ohneEnd = (c) => {
  const x = String(c ?? '').codePointAt(0) - 0xac00
  return x >= 0 && x <= 11171 ? String.fromCodePoint(0xac00 + x - (x % 28)) : c
}
/* Alle Formen, an denen ein Baukasten-Wort im Satz erkennbar ist */
function varianten(kitWoerter) {
  const v = new Set()
  for (const w of kitWoerter) {
    const teile = norm(w.ko).split(' ')
    const letzter = teile.pop()
    for (const t of teile) v.add(t)
    const beugbar = letzter.endsWith('다') && [...letzter].length >= 2 && (w.pos === 'verb' || w.pos === 'adj' || !w.pos)
    if (!beugbar) {
      v.add(letzter)
      continue
    }
    const stamm = letzter.slice(0, -1)
    v.add(stamm)
    if (stamm.endsWith('하') && stamm.length > 1) v.add(stamm.slice(0, -1)) /* 공부하다 -> 공부를 해요 */
    const pos = w.pos || 'verb'
    const h = rechneHaeyo(letzter, pos)?.haeyo
    if (h) {
      const ohneYo = h.replace(/요$/, '')
      v.add(ohneYo)
      /* der veränderte Stamm allein: 들어 -> 들 (들으면), 몰라 -> 몰 */
      if ([...ohneYo].length > 1) v.add([...ohneYo].slice(0, -1).join(''))
    }
    const a = rechneAttributiv(letzter, pos)
    if (a) v.add(a)
  }
  return [...v].filter(Boolean).map((s) => [...s])
}
/* Beginnt das Satz-Wort mit dieser Form? Endet die Form auf Vokal,
   darf im Satz ein Endkonsonant dazukommen (가 -> 갔어요, 더워 ->
   더웠어요). Endet sie auf ㄹ, darf der im Satz fehlen oder ersetzt sein
   (살다 -> 사는, 삽니다). Jeder andere Endkonsonant muss stehen — sonst
   passte 없 auf 어제 (Fund im Test 09.10.). */
function beginntMit(silben, form) {
  const n = form.length
  if (silben.length < n) return false
  for (let i = 0; i < n - 1; i++) if (silben[i] !== form[i]) return false
  const s = silben[n - 1]
  const f = form[n - 1]
  if (s === f) return true
  const endF = (f.codePointAt(0) - 0xac00) % 28
  return (endF === 0 || endF === 8) && ohneEnd(s) === ohneEnd(f)
}

/* saetze: Antwort der Function [{ nr, de, ko, woerter }]
   -> { saetze: die besten `anzahl`, verworfen: [Text] }
   Sauber = kein fremdes Wort. „Knapp" (genau eines) füllt nur auf,
   wenn sonst zu wenige da wären — lieber ein grenzwertiges Wort als
   gar keine Aufgabe (Regel vom 08.09.). */
export function pruefeSaetze({ saetze, kit, plan = [], anzahl }) {
  const formen = varianten([...kit.pflicht, ...kit.auswahl, ...kit.grundstock])
  const hilfs = HILFS.map((s) => [...s])
  const frei = new Set(FREI)
  const fremdIn = (ko) => {
    const fremd = []
    for (const roh of norm(ko).split(' ')) {
      const wort = roh.replace(/[.,!?~…"'“”‘’()\-:;]/g, '')
      if (!wort || /^[0-9]/.test(wort) || !/[가-힣]/.test(wort)) continue
      if (frei.has(wort) || FREI.some((f) => wort.startsWith(f) && PARTIKEL.test(wort.slice(f.length)))) continue
      const silben = [...wort]
      if (formen.some((f) => beginntMit(silben, f)) || hilfs.some((f) => beginntMit(silben, f))) continue
      fremd.push(wort)
    }
    return fremd
  }
  const sauber = []
  const knapp = []
  const verworfen = []
  for (const s of saetze || []) {
    if (!s?.de || !s?.ko) continue
    const fremd = fremdIn(s.ko)
    const satz = {
      de: s.de,
      ko: s.ko,
      woerter: Array.isArray(s.woerter) ? s.woerter : [],
      /* Die Muster kennt die App selbst — sie hat sie dem Satz zugeteilt */
      grammatik: plan[(Number(s.nr) || 0) - 1] ?? [],
    }
    if (fremd.length === 0) sauber.push(satz)
    else if (fremd.length === 1) knapp.push(satz)
    if (fremd.length) verworfen.push(`${s.ko} (${fremd.join(', ')})`)
  }
  return { saetze: [...sauber, ...knapp].slice(0, anzahl), verworfen }
}

/* Aus den Bank-Zeilen der letzten 14 Tage (neueste zuerst) das
   Rotations-Wissen ziehen: [{ payload, created_at }]
   -> { woerter:Set, musterZuletzt:Map, letztePflicht:Set } */
export function leseVerlauf(zeilen) {
  const woerter = new Set()
  const musterZuletzt = new Map()
  const letztePflicht = new Set()
  ;(zeilen || []).forEach((r, i) => {
    const wann = new Date(r.created_at).getTime() || 0
    for (const s of r.payload?.saetze || []) {
      for (const w of s.woerter || []) woerter.add(norm(w))
      for (const g of s.grammatik || []) {
        const m = norm(g)
        if ((musterZuletzt.get(m) ?? 0) < wann) musterZuletzt.set(m, wann)
        if (i < RINGE.musterSperre) letztePflicht.add(m)
      }
    }
  })
  return { woerter, musterZuletzt, letztePflicht }
}
