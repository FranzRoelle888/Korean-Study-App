/* ============================================================
   HANGUL-RECHNUNG — Silben in ihre Bausteine (Jamo) zerlegen
   (Vokabel-Motor V2, Konzept §3.2: Fehleingabe neben dem richtigen
   Wort, Abweichungen auf Jamo-Ebene markiert)

   Jede koreanische Silbe ist eine Zahl: ab U+AC00 laufen alle
   11 172 Kombinationen aus Anlaut (19) × Vokal (21) × Auslaut (28)
   in fester Reihenfolge. Zerlegen ist deshalb reine Arithmetik,
   keine Tabelle nötig. Rein, offline, ohne Abhängigkeiten.
   ============================================================ */

const BASIS = 0xac00
const ANLAUTE = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
const VOKALE = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ']
const AUSLAUTE = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']

export const istSilbe = (c) => typeof c === 'string' && c.length === 1 && /[가-힣]/.test(c)

/* 학 -> ['ㅎ', 'ㅏ', 'ㄱ'] · 가 -> ['ㄱ', 'ㅏ', ''] · sonst null */
export function zerlege(silbe) {
  if (!istSilbe(silbe)) return null
  const n = silbe.codePointAt(0) - BASIS
  return [ANLAUTE[Math.floor(n / 588)], VOKALE[Math.floor((n % 588) / 28)], AUSLAUTE[n % 28]]
}

/* Vergleichsform: NFC, Ränder getrimmt, innen ein Leerzeichen —
   genau das, was die Antwort-Prüfung als "gleich" gelten lässt */
export function normKo(s) {
  return String(s ?? '').normalize('NFC').trim().replace(/\s+/g, ' ')
}

export const istGleich = (a, b) => normKo(a) === normKo(b)

/* ---------- Eingabe gegen Lösung, Silbe für Silbe ----------
   Liefert je Position: was getippt wurde, was hingehört, ob es
   passt — und bei Abweichung die drei Bausteine mit Einzelurteil.
   Beispiel 항교 vs. 학교:
     [{ ist:'항', soll:'학', ok:false, jamo:[{ist:'ㅎ',soll:'ㅎ',ok:true},
        {ist:'ㅏ',soll:'ㅏ',ok:true}, {ist:'ㅇ',soll:'ㄱ',ok:false}] },
      { ist:'교', soll:'교', ok:true }]
   Fehlende oder überzählige Silben stehen mit '' auf der leeren
   Seite. Bewusst positionsweise (kein Levenshtein): für ein
   einzelnes Wort ist das verständlicher als eine verschobene
   Ausrichtung. */
export function jamoDiff(eingabe, richtig) {
  const a = [...normKo(eingabe)]
  const b = [...normKo(richtig)]
  const n = Math.max(a.length, b.length)
  const silben = []
  for (let i = 0; i < n; i++) {
    const ist = a[i] ?? ''
    const soll = b[i] ?? ''
    if (ist === soll) {
      silben.push({ ist, soll, ok: true })
      continue
    }
    const zi = zerlege(ist)
    const zs = zerlege(soll)
    const jamo =
      zi && zs
        ? zi.map((teil, k) => ({ ist: teil, soll: zs[k], ok: teil === zs[k] }))
        : null
    silben.push({ ist, soll, ok: false, jamo })
  }
  return silben
}
