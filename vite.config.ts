import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Проект публикуется на GitHub Pages по адресу /telegram-interface/,
// поэтому в сборке нужен относительный базовый путь. Локально он не мешает.
export default defineConfig({
  base: '/telegram-interface/',
  plugins: [react()],
  server: { port: 5173 }
})
