/* ============================================================
   SCHREIBWERKSTATT — Auftrags-Komponist (ohne KI, kostenlos)

   Baut die Schreibaufgabe deterministisch aus dem Lernstand
   (Konzept: "dumme Maschine, kluger Vorrat"), überarbeitet nach
   Franz' Test-Feedback vom 31.08.:

   1. Thema aus der Bank unten (per Tages-Seed — der Auftrag
      bleibt den ganzen Tag derselbe)
   2. Pflicht-Muster aus der "Front" der BEKANNTEN Grammatik-
      punkte — plus jeden dritten Tag EIN neues Muster als
      Streck-Ziel (mit Beispiel, in der App erklärt)
   3. Wort-Ideen: 4 NEUE Wörter (nicht im eigenen Stapel, nicht
      als sicher markiert) — bevorzugt thematisch passend zur
      Aufgabe, aufgefüllt aus der Frequenz-Reihenfolge der
      TOPIK-/Goethe-Liste. Der Text entsteht um Neues herum;
      Bekanntes braucht keine Empfehlung.
   ============================================================ */
import { supabase } from '../../core/supabaseClient'
import { ladeGrammatikInventar } from '../../core/kalibrierung'

/* Themen-Bank: konkret und persönlich — "schreib irgendwas"
   erzeugt nur Vermeidungs-Sätze. Zu jedem Thema eine Handvoll
   TOPIK-Wörter, die dazu passen (kuratiert; was nicht in der
   Liste steht, fällt beim Abgleich einfach raus). Für die
   deutsche Seite folgt die Kuration, wenn sie drankommt —
   bis dahin greift der Frequenz-Notbehelf. */
const THEMEN = [
  { en: 'your last weekend', ko: '지난 주말',
    passend: ['주말', '영화', '시장', '공원', '산책', '놀다', '쉬다', '음악', '극장'] },
  { en: 'your last vacation or trip', ko: '지난 휴가나 여행',
    passend: ['여행', '바다', '비행기', '호텔', '사진', '기차', '산', '외국', '수영'] },
  { en: 'your favorite food and why you like it', ko: '제일 좋아하는 음식과 그 이유',
    passend: ['음식', '맛', '맛있다', '요리', '고기', '과일', '식당', '김치', '맵다'] },
  { en: 'your typical morning', ko: '나의 아침 일과',
    passend: ['아침', '일어나다', '씻다', '커피', '빵', '운동', '버스', '지하철', '준비하다'] },
  { en: 'your plans for tomorrow', ko: '내일 할 일',
    passend: ['내일', '계획', '약속', '만나다', '공부하다', '시험', '시간', '쇼핑'] },
  { en: 'a person you like', ko: '좋아하는 사람',
    passend: ['사람', '친구', '가족', '성격', '친절하다', '얼굴', '마음', '웃다', '예쁘다'] },
  { en: 'your day at work or school', ko: '직장이나 학교에서의 하루',
    passend: ['회사', '학교', '일하다', '수업', '회의', '점심', '선생님', '바쁘다', '끝나다'] },
  { en: 'something you bought recently', ko: '최근에 산 물건',
    passend: ['사다', '가게', '백화점', '가격', '돈', '옷', '신발', '가방', '싸다', '비싸다'] },
  { en: 'a place you want to visit', ko: '가 보고 싶은 곳',
    passend: ['나라', '도시', '유명하다', '구경하다', '박물관', '바다', '산', '외국'] },
  { en: 'what you did today', ko: '오늘 한 일',
    passend: ['오늘', '하루', '저녁', '숙제', '청소', '빨래', '요리하다', '만나다'] },
  { en: 'your favorite café or restaurant', ko: '제일 좋아하는 카페나 식당',
    passend: ['카페', '식당', '커피', '차', '메뉴', '주문하다', '자주', '앉다', '달다'] },
  { en: 'the weather and your mood today', ko: '오늘 날씨와 내 기분',
    passend: ['날씨', '기분', '비', '눈', '바람', '춥다', '덥다', '맑다', '흐리다'] },
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

/* Wort-Inventar mit Bedeutungen, in Frequenz-Reihenfolge */
async function ladeWoerterMitBedeutung(profileId) {
  if (profileId === 'ko') {
    const { default: liste } = await import('../../core/inventare/topik1-woerter.json')
    return liste.map((e) => ({ id: e.id, wort: e.ko, bedeutung: e.en ?? '' }))
  }
  const { default: liste } = await import('../../core/inventare/goethe-woerter.json')
  return liste.map((e) => ({
    id: e.id,
    wort: e.artikel ? `${e.artikel} ${e.de}` : e.de,
    bedeutung: e.ko ?? '',
  }))
}

export async function baueSchreibauftrag(profileId) {
  const [inventar, wortInventar, gramRes, wortRes, eigeneRes] = await Promise.all([
    ladeGrammatikInventar(profileId),
    ladeWoerterMitBedeutung(profileId),
    supabase
      .from('inventory_status')
      .select('item_id,status')
      .eq('profile', profileId)
      .eq('kind', 'grammatik'),
    supabase
      .from('inventory_status')
      .select('item_id')
      .eq('profile', profileId)
      .eq('kind', 'wort')
      .eq('status', 'sicher'),
    supabase.from('words').select('ko').eq('profile', profileId),
  ])
  const stand = new Map((gramRes.data ?? []).map((z) => [z.item_id, z.status]))
  const seed = tagesSeed(profileId)
  const thema = THEMEN[seed % THEMEN.length]

  /* ---------- Neue Wörter finden ----------
     "Bekannt" heißt: liegt schon im eigenen Stapel ODER wurde in
     der Kalibrierung als sicher markiert. Alles andere ist neu. */
  const sichereIds = new Set((wortRes.data ?? []).map((z) => z.item_id))
  const eigene = new Set((eigeneRes.data ?? []).map((w) => String(w.ko).trim()))
  const istNeu = (e) => !sichereIds.has(e.id) && !eigene.has(e.wort.trim())

  /* Erst die thematisch passenden (kuratierte Kandidaten mit dem
     Inventar abgleichen), dann aus der Frequenz-Reihenfolge
     auffüllen — die Liste ist nach Häufigkeit sortiert, vorne
     stehen also die nützlichsten */
  const imInventar = new Map(wortInventar.map((e) => [e.wort, e]))
  const passendNeu = (thema.passend ?? [])
    .map((w) => imInventar.get(w))
    .filter((e) => e && istNeu(e))
  const auffueller = wortInventar.filter((e) => istNeu(e) && !passendNeu.includes(e))
  const woerter = [...passendNeu, ...auffueller].slice(0, 4)

  /* ---------- Pflicht-Muster ----------
     Front-Auswahl wie im Lückentext-Generator: bekannte Punkte am
     mittleren Kanon-Rang teilen, obere Hälfte wackelig-zuerst. */
  const mitRang = inventar.map((g, rang) => ({ ...g, rang }))
  const bekannt = mitRang.filter(
    (g) => stand.get(g.id) === 'wackelig' || stand.get(g.id) === 'sicher'
  )
  const schnitt = Math.floor(bekannt.length / 2)
  const front = bekannt
    .slice(schnitt)
    .sort(
      (a, b) =>
        (stand.get(b.id) === 'wackelig') - (stand.get(a.id) === 'wackelig') || b.rang - a.rang
    )
  const pool = front.length >= 2 ? front : mitRang.slice(0, 8)

  const alsMuster = (g, min, neu) => ({
    id: g.id,
    muster: g.muster,
    name: g.name,
    min,
    neu: !!neu,
    beispiel: g.satz,
    beispielTr: g.satzTr,
  })

  const muster = [alsMuster(pool[seed % pool.length], 2, false)]

  /* Jeden dritten Tag ein NEUES Muster als Streck-Ziel: der erste
     offene Kanon-Punkt ab der Front-Grenze (Entscheidung Franz:
     gelegentlich Neues, mit Erklärung dabei) */
  const grenzRang = bekannt.length ? bekannt[schnitt].rang : 0
  const offen = mitRang.filter(
    (g) => stand.get(g.id) !== 'sicher' && stand.get(g.id) !== 'wackelig'
  )
  const streckZiel = offen.find((g) => g.rang >= grenzRang) ?? offen[0]
  if (seed % 3 === 0 && streckZiel) {
    muster.push(alsMuster(streckZiel, 1, true))
  } else {
    muster.push(alsMuster(pool[(seed + 1) % pool.length], 1, false))
  }
  const einzig = [...new Map(muster.map((m) => [m.id, m])).values()]

  /* Ersatzbank für den "Kenn ich noch nicht"-Knopf: die nächsten
     bekannten Kandidaten aus der Front */
  const belegt = new Set(einzig.map((m) => m.id))
  const ersatz = pool
    .filter((g) => !belegt.has(g.id))
    .slice(0, 3)
    .map((g) => alsMuster(g, 1, false))

  return {
    thema: profileId === 'ko' ? thema.en : thema.ko,
    /* fürs Bewerten braucht die KI das Thema auf Englisch */
    themaIntern: thema.en,
    muster: einzig,
    ersatz,
    woerter: woerter.map((w) => ({ wort: w.wort, bedeutung: w.bedeutung })),
  }
}
