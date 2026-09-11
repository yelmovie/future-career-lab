import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { classroomRelease } from './scripts/classroom-release.mjs';

export default defineConfig({
  plugins: [react(), classroomRelease()],
  base: '/',
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
