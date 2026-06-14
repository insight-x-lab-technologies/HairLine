import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json';

// Build/dev config. A simulação de jogo é determinística e independente do
// render (ver docs/02). Aqui só tratamos bundling, dev server e PWA.
export default defineConfig({
  base: './',
  // Fonte ÚNICA de versão (P6-06-03): injeta a versão do package.json no bundle
  // (consumida por src/config/about.ts). Espelhado em vitest.config.ts.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    // Escuta em todas as interfaces (acesso via LAN/Tailscale). A porta é
    // definida pelo scripts/run.sh (--port 8080 --strictPort).
    host: true,
    // Aceita requisições de qualquer Host (nomes/IPs Tailscale, LAN). Sem isso,
    // o Vite bloqueia o acesso por hostnames que não sejam localhost. Servidor
    // de desenvolvimento em rede privada — risco aceitável.
    allowedHosts: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'HAIRLINE',
        short_name: 'HAIRLINE',
        description: 'Bullet hell vertical mobile-first — graze para carregar Foco.',
        lang: 'pt-BR',
        theme_color: '#05060a',
        background_color: '#05060a',
        display: 'fullscreen',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
});
