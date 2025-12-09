import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', 
  define: {
    // This prevents "Uncaught ReferenceError: process is not defined" in the browser
    'process.env': {} 
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});