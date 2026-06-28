import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  base: '/damagecalc/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main:      resolve(__dirname, 'index.html'),
        demo:      resolve(__dirname, 'demo/index.html'),
        pokebench: resolve(__dirname, 'pokebench/index.html'),
        history:   resolve(__dirname, 'history.html'),
        compare:   resolve(__dirname, 'compare.html'),
        moveset:   resolve(__dirname, 'moveset.html'),
        hub:         resolve(__dirname, 'hub.html'),
        teambuilder: resolve(__dirname, 'teambuilder.html'),
      },
    },
  },
  server: {
    proxy: {
      '/smogon-stats': {
        target: 'https://www.smogon.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/smogon-stats/, '/stats'),
      },
    },
  },
});
