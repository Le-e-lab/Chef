import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    base: './', // CRITICAL: Ensures assets load correctly on GitHub Pages
    define: {
      // Safely expose API_KEY if available in build environment, or default to empty string
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      // This prevents "Uncaught ReferenceError: process is not defined" in the browser
      // We define it as an empty object so libraries accessing process.env don't crash
      'process.env': JSON.stringify({})
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false, // Disable sourcemaps for production to save space
    }
  };
});