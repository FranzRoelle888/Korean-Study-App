import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
//
// "base" ist der Unterpfad, unter dem die App liegt.
// - Lokal (npm run dev): ganz normal unter "/".
// - Veröffentlicht auf GitHub Pages: unter "/Korean-Study-App/",
//   weil Projektseiten dort unter username.github.io/REPO/ laufen.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Korean-Study-App/' : '/',
  plugins: [react()],
}))
