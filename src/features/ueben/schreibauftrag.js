/* ============================================================
   SCHREIBWERKSTATT — Auftrags-Komponist (ohne KI, kostenlos)

   Baut die Schreibaufgabe deterministisch aus drei Zutaten des
   Lernstands (Konzept: "dumme Maschine, kluger Vorrat"):
   1. Thema aus der Bank unten (per Tages-Seed — der Auftrag
      bleibt den ganzen Tag derselbe, auch nach App-Neustart)
   2. Pflicht-Muster aus der "Front": die schwereren der
      bekannten Grammatikpunkte, Wackliges zuerst — dieselbe
      Logik wie im Lückentext-Generator
   3. Wort-Inspiration: 2 frisch angelegte Wörter (sofort im
      eigenen Satz benutzen = beste Verankerung) + 2 ältere
   ============================================================ */
import { supabase } from '../../core/supabaseClient'
import { ladeGrammatikInventar } from '../../core/kalibrierung'

/* Themen-Bank: konkret und persönlich — "schreib irgendwas"
   erzeugt nur Vermeidungs-Sätze. Text jeweils in der Sprache,
   in der die App-Oberfläche der Person läuft. */
const THEMEN = [
  { en: 'your last weekend', ko: '지난 주말' },
  { en: 'your last vacation or trip', ko: '지난 휴가나 여행' },
  { en: 'your favorite food and why you like it', ko: '제일 좋아하는 음식과 그 이유' },
  { en: 'your typical morning', ko: '나의 아침 일과' },
  { en: 'your plans for tomorrow', ko: '내일 할 일' },
  { en: 'a person you like', ko: '좋아하는 사람' },
  { en: 'your day at work or school', ko: '직장이나 학교에서의 하루' },
  { en: 'something you bought recently', ko: '최근에 산 물건' },
  { en: 'a place you want to visit', ko: '가 보고 싶은 곳' },
  { en: 'what you did today', ko: '오늘 한 일' },
  { en: 'your favorite café or restaurant', ko: '제일 좋아하는 카페나 식당' },
  { en: 'the weather and your mood today', ko: '오늘 날씨와 내 기분' },
]

/* Kleiner stabiler Zahlenwert aus Datum + Profil: gleicher Tag =
   gleicher Auftrag (bewusst KEIN Zufall — sonst könnte man sich
   die leichteste Aufgabe herbeiladen) */
function tagesSeed(profileId) {
  const s = new Date().toISOString().slice(0, 10) + profileId
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}

export async function baueSchreibauftrag(profileId) {
  const [inventar, statusRes, wortRes] = await Promise.all([
    ladeGrammatikInventar(profileId),
    supabase
      .from('inventory_status')
      .select('item_id,status')
      .eq('profile', profileId)
      .eq('kind', 'grammatik'),
    supabase
      .from('words')
      .select('ko,en,created_at')
      .eq('profile', profileId)
      .order('created_at', { ascending: false })
      .limit(120),
  ])
  const stand = new Map((statusRes.data ?? []).map((z) => [z.item_id, z.status]))
  const woerter = wortRes.data ?? []
  const seed = tagesSeed(profileId)

  /* Front-Auswahl wie im Lückentext-Generator: bekannte Punkte am
     mittleren Kanon-Rang teilen, obere Hälfte wackelig-zuerst */
  const bekannt = inventar
    .map((g, rang) => ({ ...g, rang }))
    .filter((g) => stand.get(g.id) === 'wackelig' || stand.get(g.id) === 'sicher')
  const front = bekannt
    .slice(Math.floor(bekannt.length / 2))
    .sort(
      (a, b) =>
        (stand.get(b.id) === 'wackelig') - (stand.get(a.id) === 'wackelig') || b.rang - a.rang
    )
  /* Ohne Kalibrierung: die ersten Kanon-Punkte als Notbehelf */
  const pool = front.length >= 2 ? front : inventar.map((g, rang) => ({ ...g, rang })).slice(0, 8)

  /* Zwei Pflicht-Muster: das erste (dringendste) 2x, das zweite 1x.
     Der Seed verschiebt die Wahl von Tag zu Tag durch den Pool. */
  const muster = [
    { ...pool[seed % pool.length], min: 2 },
    { ...pool[(seed + 1) % pool.length], min: 1 },
  ].filter((m, i, a) => a.findIndex((x) => x.id === m.id) === i)

  /* Wort-Inspiration: 2 aus den 15 neuesten + 2 ältere. Neue
     Wörter sofort selbst benutzen verankert sie am besten. */
  const neueste = woerter.slice(0, 15)
  const aeltere = woerter.slice(15)
  const inspiration = []
  if (neueste.length) {
    inspiration.push(neueste[seed % neueste.length])
    if (neueste.length > 1) inspiration.push(neueste[(seed + 7) % neueste.length])
  }
  if (aeltere.length) {
    inspiration.push(aeltere[seed % aeltere.length])
    if (aeltere.length > 1) inspiration.push(aeltere[(seed + 13) % aeltere.length])
  }
  const einzig = [...new Map(inspiration.map((w) => [w.ko, w])).values()]

  const thema = THEMEN[seed % THEMEN.length]
  return {
    thema: profileId === 'ko' ? thema.en : thema.ko,
    /* fürs Bewerten braucht die KI das Thema auf Englisch */
    themaIntern: thema.en,
    muster: muster.map((m) => ({ id: m.id, muster: m.muster, name: m.name, min: m.min })),
    woerter: einzig.map((w) => ({ wort: w.ko, bedeutung: w.en })),
  }
}
