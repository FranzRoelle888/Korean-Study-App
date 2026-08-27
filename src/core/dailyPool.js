/* ============================================================
   NACHZIEHSTAPEL — Auswahl je nach Lernendem

   Die eigentlichen Listen stehen in eigenen Dateien, weil sie
   lang sind:
     koreanPool.js  Koreanisch fuer Franz
     germanPool.js  Deutsch fuer 해인

   Beide sind nach HAEUFIGKEIT sortiert, haeufigstes zuerst.
   nextFromPool() in storage.js geht die Liste von oben durch und
   ueberspringt jedes Wort, das schon in der Bibliothek steht.
   ============================================================ */
import { koreanPool } from './koreanPool'
import { germanPool } from './germanPool'

export { koreanPool, germanPool }

export function poolFor(profile) {
  return profile === 'de' ? germanPool : koreanPool
}
