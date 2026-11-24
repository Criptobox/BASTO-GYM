import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig(({ mode }) => ({
  // La demo publicada vive en una ruta cualquiera y no admite service workers.
  base: mode === 'artifact' ? './' : (process.env.BASE_PATH ?? '/'),
  resolve: {
    alias: {
      // La demo (un solo archivo) reúne recepción y administración; la app real solo lleva la recepción.
      '@entry': new URL(mode === 'artifact' ? './src/DemoApp.tsx' : './src/WorkerApp.tsx', import.meta.url).pathname,
      ...(mode === 'artifact' ? { '@jsquash/webp': new URL('./src/lib/webp-stub.ts', import.meta.url).pathname } : {}),
    },
  },
  // Dos páginas: index.html (recepción) y admin.html (administración), cada una con su propio JS.
  build: mode === 'artifact' ? {} : { rollupOptions: { input: { main: new URL('./index.html', import.meta.url).pathname, admin: new URL('./admin.html', import.meta.url).pathname } } },
  plugins: [
    react(),
    tailwindcss(),
    ...(mode === 'artifact' ? [viteSingleFile()] : [VitePWA({
      registerType: 'autoUpdate',
      workbox: { navigateFallbackDenylist: [/admin\.html$/] },
      manifest: {
        name: 'BASTO GYM',
        short_name: 'BASTO GYM',
        lang: 'es',
        display: 'standalone',
        background_color: '#0A0A0A',
        theme_color: '#0A0A0A',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    })]),
  ],
}))
