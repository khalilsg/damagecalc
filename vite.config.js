import { defineConfig } from 'vite';

export default defineConfig({
  base: '/damagecalc/',
  build: { outDir: 'dist' },
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
