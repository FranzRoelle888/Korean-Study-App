/* ============================================================
   APP-ICONS aus der 1024er Vorlage erzeugen (Franz 07.09.)

   Quelle: public/icons/hase-icon-1024-lavendel.png (Haeins Hase mit
   Flagge auf Notizbuch-Lavendel). Ziel: die Groessen, die iPhone-
   Homescreen (180) und das Web-Manifest (192, 512) brauchen.
   Bilinear verkleinert, reines JS (pngjs, devDependency).

   Aufruf: node scripts/baue-icons.mjs [quelle.png] [praefix]
   Standard: public/icons/hase-icon-1024-lavendel.png -> public/icons/hase-<n>.png
   ============================================================ */
import { readFileSync, writeFileSync } from 'node:fs'
import { PNG } from 'pngjs'

const quelle = process.argv[2] ?? 'public/icons/hase-icon-1024-lavendel.png'
const praefix = process.argv[3] ?? 'public/icons/hase'
const GROESSEN = [180, 192, 512]

const src = PNG.sync.read(readFileSync(quelle))
const { width: W, height: H, data } = src
const q = (x, y, k) => data[(y * W + x) * 4 + k]

for (const N of GROESSEN) {
  const out = new PNG({ width: N, height: N })
  const skal = W / N
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      /* Flaechenmittel ueber den Quellblock: bei starker Verkleinerung
         ruhiger als reines Bilinear (kein Flimmern in den Kritzeln) */
      const x0 = Math.floor(x * skal)
      const y0 = Math.floor(y * skal)
      const x1 = Math.min(W, Math.floor((x + 1) * skal))
      const y1 = Math.min(H, Math.floor((y + 1) * skal))
      const summe = [0, 0, 0]
      let n = 0
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          for (let k = 0; k < 3; k++) summe[k] += q(xx, yy, k)
          n++
        }
      }
      const i = (y * N + x) * 4
      for (let k = 0; k < 3; k++) out.data[i + k] = Math.round(summe[k] / Math.max(1, n))
      out.data[i + 3] = 255
    }
  }
  const ziel = `${praefix}-${N}.png`
  writeFileSync(ziel, PNG.sync.write(out))
  console.log(`${ziel} (${N}x${N})`)
}
