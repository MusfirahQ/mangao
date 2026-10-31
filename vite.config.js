import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// React app lives in client/, builds into dist/. In development, /api calls go to the Express server.
export default defineConfig({
  root: 'client',
  plugins: [react()],
  build: { outDir: '../dist', emptyOutDir: true },
  server: { port: 5173, proxy: { '/api': 'http://localhost:5000' } },
});
