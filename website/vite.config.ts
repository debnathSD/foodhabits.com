import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// The 3D scenes and their timing are shared with the app (../src/three, ../src/lib). Dedupe makes sure they
// use this site's single copy of React and three.js.
export default defineConfig({
  // GitHub Pages serves the site from /<repository>/; SITE_BASE sets that path at build time.
  base: process.env.SITE_BASE ?? '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@three': fileURLToPath(new URL('../src/three', import.meta.url)),
      '@lib': fileURLToPath(new URL('../src/lib', import.meta.url)),
    },
    dedupe: ['react', 'react-dom', 'three', '@react-three/fiber'],
  },
  server: { fs: { allow: ['..'] } },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('index.html', import.meta.url)),
        privacy: fileURLToPath(new URL('privacy.html', import.meta.url)),
      },
    },
  },
});
