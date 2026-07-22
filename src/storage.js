/* ============================================================
   SPEICHERLOGIK ("Datenschicht")

   Das ist die einzige Datei, die weiß, WO die Vokabeln liegen.
   Aktuell: im "localStorage" des Browsers (bleibt auf DIESEM Gerät
   erhalten, auch nach dem Schließen). Später tauschen wir hier
   drin auf eine Cloud-Datenbank (Supabase) um – der Rest der App
   muss dafür nicht angefasst werden.
   ============================================================ */

const KEY = 'korean-app:vocab' // Name der "Schublade" im Browser-Speicher

// Ein paar Start-Vokabeln, damit die Bibliothek nicht leer ist.
const SEED = [
  { id: 's1', en: 'hello (formal)', ko: '안녕하세요' },
  { id: 's2', en: 'thank you', ko: '감사합니다' },
  { id: 's3', en: 'water', ko: '물' },
  { id: 's4', en: 'book', ko: '책' },
  { id: 's5', en: 'friend', ko: '친구' },
].map((v) => ({ ...v, createdAt: Date.now() }))

// Alle Vokabeln laden. Beim allerersten Start werden die SEED-Daten
// hineingelegt.
export function loadVocab() {
  const raw = localStorage.getItem(KEY)
  if (!raw) {
    saveVocab(SEED)
    return SEED
  }
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

// Die komplette Liste speichern.
export function saveVocab(list) {
  localStorage.setItem(KEY, JSON.stringify(list))
}

// Prüfen, ob eine koreanische Vokabel schon existiert.
// (Leerzeichen am Rand werden ignoriert -> "물 " zählt wie "물".)
export function isDuplicate(list, ko) {
  const needle = ko.trim()
  return list.some((v) => v.ko.trim() === needle)
}

// Eine neue Vokabel hinzufügen. Gibt entweder { error } zurück
// (dann stimmt etwas nicht) oder { list, entry } (Erfolg).
export function addWord(list, en, ko) {
  const cleanEn = en.trim()
  const cleanKo = ko.trim()

  if (!cleanEn || !cleanKo) {
    return { error: 'Bitte beide Felder ausfüllen.' }
  }
  if (isDuplicate(list, cleanKo)) {
    return { error: `„${cleanKo}" ist schon in deiner Bibliothek.` }
  }

  const entry = {
    id: crypto.randomUUID(), // eindeutige Kennung
    en: cleanEn,
    ko: cleanKo,
    createdAt: Date.now(),
  }
  const next = [entry, ...list] // neue Vokabel oben anfügen
  saveVocab(next)
  return { list: next, entry }
}
