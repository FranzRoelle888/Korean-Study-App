/* ============================================================
   INVENTAR-BEZUG — ein koreanisches Wort im TOPIK-I-Inventar finden
   (Vokabel-Motor V2, Konzept §5/§6)

   Das Inventar ist die einzige erlaubte Quelle für Hanja-ZEICHEN:
   Das Modell darf Zeichen nie selbst wählen, nur Lesung und
   Bedeutung der vorgegebenen liefern. Ohne Inventar-Eintrag gibt es
   keine Hanja-Zeile — lieber fehlend als falsch.

   Die Datei (1791 Wörter) wird erst beim ersten Aufruf geladen,
   nicht beim App-Start — so wie es Kalibrierung und Schreibauftrag
   auch tun. Sonst läge sie im Hauptbundle beider Seiten.
   ============================================================ */

const norm = (s) => String(s ?? '').normalize('NFC').trim()
let nachKo = null

async function lade() {
  if (nachKo) return nachKo
  const { default: inventar } = await import('./inventare/topik1-woerter.json')
  nachKo = new Map(inventar.map((e) => [norm(e.ko), e]))
  return nachKo
}

/* -> Promise<{ id, ko, en, pos, hanja, hinweis, rang } | null> */
export async function inventarEintrag(ko) {
  const karte = await lade()
  return karte.get(norm(ko)) || null
}
