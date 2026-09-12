import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { classroomRelease } from './scripts/classroom-release.mjs';

export default defineConfig({
  plugins: [react(), classroomRelease()],
  base: '/',
  // Playwright traces contain HTML. Watching them causes reload → trace → reload loops.
  server: {
    watch: { ignored: ['**/tmp/**', '**/test-results/**', '**/playwright-report/**', '**/artifacts/**', '**/output/**', '**/_unused/**', '**/coverage/**'] },
  },
  build: {
    copyPublicDir: false,
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
});
