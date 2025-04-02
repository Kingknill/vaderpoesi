import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  root: 'public',
  base: '/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      includeAssets: ['icons/pwa-192x192.png', 'icons/pwa-512x512.png'],
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ url }) => !url.pathname.startsWith('/api/'), // Exkludera alla /api/*-anrop
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60, // 1 timme
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Väderpoesi',
        short_name: 'Väderpoesi',
        description: 'Upplev vädret med poesi på svenska och engelska',
        start_url: "https://vaderpoesi.onrender.com/",
        scope: "https://vaderpoesi.onrender.com/",
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#3B82F6',
        lang: 'sv',
        orientation: 'portrait',
        icons: [
          { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '/src': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  publicDir: 'public',
});