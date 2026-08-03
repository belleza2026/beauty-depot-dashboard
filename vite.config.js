import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Base relativa: los assets se cargan bien tanto en la raíz como en subrutas
  // (p.ej. https://usuario.github.io/beauty-depot-dashboard/).
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
})
