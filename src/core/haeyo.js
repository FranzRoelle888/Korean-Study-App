/* ============================================================
   해요-FORM AUSRECHNEN — ohne Modell, ohne Netz (Franz 08.10.)

   WARUM: Die 해요-Form auf der Karte kam bisher nur aus der Spalte
   words.haeyo, und die füllt allein der Nachtrag-Lauf (von Hand
   gestartet, kostet Modell-Guthaben). Alles, was danach dazukam
   oder im Lauf durchfiel, stand ohne Form da — bei Adjektiven fiel
   das am meisten auf. Dabei ist die Form fast immer reine Rechnung:
   Hangul-Silben sind Zahlen (siehe hangul.js), und die Regeln sind
   endlich.

   WAS HIER GILT:
   - Steht in der Datenbank schon eine Form, gewinnt IMMER die
     (haeyoVon unten) — die ist vom Modell geschrieben und geprüft.
   - Gerechnet wird nur für Verben und Adjektive auf -다.
   - „Eine falsche 해요-Form ist schlimmer als keine": Wo die Regel
     ohne Wortwissen nicht eindeutig ist, kommt null zurück und die
     Karte zeigt schlicht nichts.

   DAS HEIKLE sind vier Endkonsonanten, bei denen es regelmäßige UND
   unregelmäßige Wörter gibt (덥다 -> 더워요, aber 입다 -> 입어요):
     ㅂ  Adjektive sind fast alle unregelmäßig (Ausnahmen-Liste),
         Verben fast alle regelmäßig (Liste der unregelmäßigen)
     ㄷ ㅅ  nur die Wörter der Liste sind unregelmäßig
     ㅎ  Adjektive unregelmäßig außer 좋다; Verben regelmäßig
   ============================================================ */

const BASIS = 0xac00
/* Vokal-Nummern (Reihenfolge wie in hangul.js) */
const A = 0, AE = 1, YA = 2, YAE = 3, EO = 4, E = 5, YEO = 6, O = 8, WA = 9, WAE = 10, OE = 11, U = 13, WO = 14, WI = 16, EU = 18, UI = 19, I = 20
/* Endkonsonanten-Nummern */
const T_D = 7, T_L = 8, T_B = 17, T_S = 19, T_H = 27
const L_R = 5 /* Anlaut ㄹ */

function zerlege(c) {
  const x = String(c ?? '').codePointAt(0) - BASIS
  if (!(x >= 0 && x <= 11171)) return null
  return { l: Math.floor(x / 588), v: Math.floor((x % 588) / 28), t: x % 28 }
}
const baue = (l, v, t = 0) => String.fromCodePoint(BASIS + l * 588 + v * 28 + t)
/* „helle" Vokale ziehen 아 nach sich, alle anderen 어 */
const hell = (v) => v === A || v === YA || v === O

/* Wörter, die keiner Regel folgen. null = bewusst keine Form
   (이다 hat zwei: 이에요 / 예요; 푸르다 und 이르다 sind mehrdeutig). */
const SONDERFALL = {
  아니다: '아니에요',
  이다: null,
  갖다: '가져요',
  푸다: '퍼요',
  뵙다: null,
  푸르다: null,
  이르다: null,
  /* Einsilbige ㅣ-Stämme, die NICHT verschmelzen (벼요 gibt es nicht,
     펴요 gehört zu 펴다) */
  비다: '비어요',
  피다: '피어요',
  기다: '기어요',
  /* Im Alltag nur in der Vergangenheitsform gebraucht */
  잘생기다: '잘생겼어요',
  못생기다: '못생겼어요',
  /* 어-Unregelmäßige */
  그러다: '그래요',
  이러다: '이래요',
  저러다: '저래요',
  어쩌다: '어째요',
  /* Ehrenformen mit -시-: höflich heißt es 드세요, nicht 드셔요 */
  드시다: '드세요',
  계시다: '계세요',
  주무시다: '주무세요',
  잡수시다: '잡수세요',
  돌아가시다: '돌아가세요',
}

/* Unregelmäßig trotz „harmlosem" Aussehen — Wort für Wort bekannt */
const UNREGEL_VERB = {
  /* ㅂ */ 돕다: 'ㅂ', 눕다: 'ㅂ', 굽다: 'ㅂ', 줍다: 'ㅂ', 깁다: 'ㅂ', 여쭙다: 'ㅂ',
  /* ㄷ */ 듣다: 'ㄷ', 걷다: 'ㄷ', 묻다: 'ㄷ', 싣다: 'ㄷ', 깨닫다: 'ㄷ', 붇다: 'ㄷ', 긷다: 'ㄷ', 일컫다: 'ㄷ',
  /* ㅅ */ 짓다: 'ㅅ', 낫다: 'ㅅ', 잇다: 'ㅅ', 붓다: 'ㅅ', 젓다: 'ㅅ', 긋다: 'ㅅ',
}
/* ㅂ-Adjektive, die REGELMÄSSIG sind (좁아요, nicht 조워요) */
const REGEL_ADJ_B = new Set(['좁다', '수줍다'])
/* ㅎ-Adjektive mit ㅓ im Stamm: 그렇다 -> 그래요 ist sicher, bei
   Farbwörtern wie 누렇다 (-> 누레요) wäre ㅐ falsch — deshalb nur
   diese bekannten */
const H_ADJ_EO = new Set(['그렇다', '이렇다', '저렇다', '어떻다', '아무렇다'])

/* Der letzte Wortteil wird gebeugt, der Rest bleibt stehen
   (마음에 들다 -> 마음에 들어요) */
function trenne(ko) {
  const t = String(ko ?? '').normalize('NFC').trim().replace(/\s+/g, ' ')
  const i = t.lastIndexOf(' ')
  return i === -1 ? { vorn: '', wort: t } : { vorn: t.slice(0, i + 1), wort: t.slice(i + 1) }
}

/* -> { haeyo, unregel } oder null. unregel ist die Klasse für den
   Chip (ㅂ ㄷ ㅅ ㅎ 르 으) oder null bei regelmäßigen Wörtern. */
export function rechneHaeyo(ko, pos) {
  if (pos !== 'verb' && pos !== 'adj') return null
  const { vorn, wort } = trenne(ko)
  if (wort.length < 2 || !wort.endsWith('다')) return null
  if (wort in SONDERFALL) {
    return SONDERFALL[wort] ? { haeyo: vorn + SONDERFALL[wort], unregel: null } : null
  }
  const stamm = wort.slice(0, -1)
  const fertig = (form, unregel = null) => ({ haeyo: vorn + form, unregel })

  /* 하다 -> 해요 (공부하다 -> 공부해요) */
  if (stamm.endsWith('하')) return fertig(stamm.slice(0, -1) + '해요')

  const d = zerlege(stamm.at(-1))
  if (!d) return null
  const kopf = stamm.slice(0, -1)
  const davor = kopf ? zerlege(kopf.at(-1)) : null

  /* ---------- Stamm endet auf Vokal ---------- */
  if (d.t === 0) {
    if (d.v === EU) {
      /* 르-Unregelmäßige: 모르다 -> 몰라요. Die Silbe davor bekommt
         ein ㄹ unten. Geht nur, wenn sie noch keinen Endkonsonanten
         hat — 들르다 fällt deshalb in die 으-Regel darunter (들러요),
         und genau das ist dort auch richtig. 따르다 und 치르다 sind
         die bekannten Ausnahmen (따라요, 치러요). */
      const ruRegel = wort === '따르다' || wort === '치르다'
      if (d.l === L_R && davor && davor.t === 0 && !ruRegel) {
        const mitL = baue(davor.l, davor.v, T_L)
        return fertig(kopf.slice(0, -1) + mitL + (hell(davor.v) ? '라요' : '러요'), '르')
      }
      /* 으-Regel: das ㅡ fällt weg (바쁘다 -> 바빠요, 쓰다 -> 써요).
         Welcher Vokal kommt, bestimmt die Silbe DAVOR — außer bei
         Zusammensetzungen mit 쓰다, die sich wie 쓰다 allein beugen
         (받아쓰다 -> 받아써요, nicht 받아싸요). */
      const v = davor && hell(davor.v) && !wort.endsWith('쓰다') ? A : EO
      return fertig(kopf + baue(d.l, v) + '요', '으')
    }
    /* Endung verschmilzt mit dem Vokal */
    if ([A, AE, YA, YAE, EO, E, YEO].includes(d.v)) return fertig(stamm + '요') /* 가요, 보내요, 서요 */
    if (d.v === O) return fertig(kopf + baue(d.l, WA) + '요') /* 오다 -> 와요 */
    if (d.v === U) return fertig(kopf + baue(d.l, WO) + '요') /* 주다 -> 줘요 */
    if (d.v === I) return fertig(kopf + baue(d.l, YEO) + '요') /* 마시다 -> 마셔요 */
    if (d.v === OE) return fertig(kopf + baue(d.l, WAE) + '요') /* 되다 -> 돼요 */
    if (d.v === WI || d.v === UI) return fertig(stamm + '어요') /* 쉬다 -> 쉬어요 */
    return null
  }

  /* ---------- Stamm endet auf Konsonant ---------- */
  const regel = () => fertig(stamm + (hell(d.v) ? '아요' : '어요'))
  const ohneEnd = baue(d.l, d.v)

  if (d.t === T_B) {
    const unregel = pos === 'adj' ? !REGEL_ADJ_B.has(wort) : UNREGEL_VERB[wort] === 'ㅂ'
    if (!unregel) return regel()
    /* ㅂ wird zu 우 (+어 = 워); nur 돕다 und 곱다 nehmen 와 */
    const mitWa = wort === '돕다' || wort === '곱다'
    return fertig(kopf + ohneEnd + (mitWa ? '와요' : '워요'), 'ㅂ')
  }
  if (d.t === T_D) {
    if (UNREGEL_VERB[wort] !== 'ㄷ') return regel()
    /* ㄷ wird zu ㄹ: 듣다 -> 들어요 */
    return fertig(kopf + baue(d.l, d.v, T_L) + (hell(d.v) ? '아요' : '어요'), 'ㄷ')
  }
  if (d.t === T_S) {
    if (UNREGEL_VERB[wort] !== 'ㅅ') return regel()
    /* ㅅ fällt weg, verschmilzt aber NICHT: 짓다 -> 지어요 */
    return fertig(kopf + ohneEnd + (hell(d.v) ? '아요' : '어요'), 'ㅅ')
  }
  if (d.t === T_H) {
    if (pos !== 'adj' || wort === '좋다') return regel() /* 놓아요, 좋아요 */
    /* ㅎ fällt weg, der Vokal wird zu ㅐ: 빨갛다 -> 빨개요 */
    if (d.v === A || (d.v === EO && H_ADJ_EO.has(wort))) return fertig(kopf + baue(d.l, AE) + '요', 'ㅎ')
    if (d.v === YA) return fertig(kopf + baue(d.l, YAE) + '요', 'ㅎ') /* 하얗다 -> 하얘요 */
    return null
  }
  return regel()
}

/* ---------- Adjektiv VOR einem Nomen (관형형, Franz 09.10.) ----------
   „Das Auto ist rot" heißt 빨개요, „das rote Auto" aber 빨간 차 — die
   Form vor dem Nomen ist eine eigene und bei den unregelmäßigen
   Adjektiven nicht zu erraten (덥다 -> 더운, 길다 -> 긴).
   Nur für Adjektive: bei Verben hängt die Form von der Zeit ab
   (먹는 / 먹은 / 먹을), das gehört in die Grammatik, nicht auf die Karte.
   -> die Form als Text oder null */
const T_N = 4 /* Endkonsonant ㄴ */
export function rechneAttributiv(ko, pos) {
  if (pos !== 'adj') return null
  const { vorn, wort } = trenne(ko)
  if (wort.length < 2 || !wort.endsWith('다')) return null
  if (wort === '아니다') return vorn + '아닌'
  const stamm = wort.slice(0, -1)
  const d = zerlege(stamm.at(-1))
  if (!d) return null
  const kopf = stamm.slice(0, -1)
  const mitN = vorn + kopf + baue(d.l, d.v, T_N)
  /* 있다/없다 und alles, was darauf endet: 맛있는, 재미없는 */
  if (stamm.endsWith('있') || stamm.endsWith('없')) return vorn + stamm + '는'
  /* Vokal am Ende: ㄴ kommt unten dran (크다 -> 큰, 조용하다 -> 조용한).
     ㄹ am Ende fällt dafür weg (길다 -> 긴). */
  if (d.t === 0 || d.t === T_L) return mitN
  /* ㅂ wird zu 우: 덥다 -> 더운 (auch 곱다 -> 고운) */
  if (d.t === T_B && !REGEL_ADJ_B.has(wort)) return vorn + kopf + baue(d.l, d.v) + '운'
  /* ㅎ fällt weg: 빨갛다 -> 빨간, 그렇다 -> 그런 — nur 좋다 bleibt (좋은) */
  if (d.t === T_H && wort !== '좋다') return mitN
  /* ㅅ fällt weg: 낫다 -> 나은 */
  if (d.t === T_S && UNREGEL_VERB[wort] === 'ㅅ') return vorn + kopf + baue(d.l, d.v) + '은'
  return vorn + stamm + '은' /* 작다 -> 작은, 많다 -> 많은 */
}

/* Was die Karte zeigt: die gespeicherte Form, sonst die gerechnete.
   -> { haeyo, unregel } oder null */
export function haeyoVon(word) {
  if (!word) return null
  if (word.haeyo) return { haeyo: word.haeyo, unregel: word.unregel || null }
  return rechneHaeyo(word.ko, word.pos)
}
