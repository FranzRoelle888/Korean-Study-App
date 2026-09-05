import { useEffect, useRef } from 'react'

/* ============================================================
   TASTATUR ZUGEKLAPPT? (iOS-Eigenheit)

   Klappt man auf dem iPhone die Tastatur über den Tastatur-Knopf
   ein, bleibt das Eingabefeld fokussiert — es gibt KEIN blur-
   Ereignis. Die Fokus-Regel des Vokabel-Motors (beim Tippen alles
   verstecken) würde dann nie wieder aufheben (Fund Franz 06.09.:
   „sonst vergesse ich die Schreibweise und komme nicht weiter").

   Was sich verlässlich ändert, ist die Höhe des sichtbaren
   Bereichs (visualViewport): Tastatur auf = kleiner, zu = wieder
   größer. Springt die Höhe deutlich nach oben, rufen wir zurück.
   ============================================================ */
export function useTastaturZu(callback) {
  const cb = useRef(callback)
  cb.current = callback
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!vv) return
    let letzte = vv.height
    const beiResize = () => {
      if (vv.height > letzte + 80) cb.current()
      letzte = vv.height
    }
    vv.addEventListener('resize', beiResize)
    return () => vv.removeEventListener('resize', beiResize)
  }, [])
}
