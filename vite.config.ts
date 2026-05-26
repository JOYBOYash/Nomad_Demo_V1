import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

// Automatically inject firebase config into import.meta.env if the file exists (like in AI Studio dev environment).
// In Vercel, this file will be gitignored, so you will set standard VITE_FIREBASE_* env vars.
const firebaseConfigPath = path.resolve(__dirname, 'firebase-applet-config.json');
let firebaseEnv: Record<string, string> = {};
if (fs.existsSync(firebaseConfigPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    // Only set if not already defined via process.env
    if (!process.env.VITE_FIREBASE_API_KEY) {
      firebaseEnv = {
        'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(config.apiKey),
        'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(config.authDomain),
        'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(config.projectId),
        'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(config.storageBucket),
        'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(config.messagingSenderId),
        'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(config.appId),
        'import.meta.env.VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify(config.measurementId || '')
      };
    }
  } catch (e) {
    console.warn("Failed to parse firebase-applet-config.json");
  }
}

export default defineConfig(() => {
  return {
    define: {
      ...firebaseEnv
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
