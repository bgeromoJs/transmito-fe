
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, 'env', '');

  return {
    plugins: [react()],
    envDir: 'env',
    define: {
      'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID),
      'process.env.GOOGLE_PICKER_API_KEY': JSON.stringify(env.GOOGLE_PICKER_API_KEY),
      'process.env.EVOLUTION_API_URL': JSON.stringify(env.EVOLUTION_API_URL || 'https://evolution.transmito.com'),
      'process.env.EVOLUTION_GLOBAL_API_KEY': JSON.stringify(env.EVOLUTION_GLOBAL_API_KEY || '422A978A1131-44F7-A92D-C1E1C38214C2'),
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.STRIPE_PUBLIC_KEY': JSON.stringify(env.STRIPE_PUBLIC_KEY),
      'process.env.FIREBASE_API_KEY': JSON.stringify(env.FIREBASE_API_KEY),
      'process.env.FIREBASE_AUTH_DOMAIN': JSON.stringify(env.FIREBASE_AUTH_DOMAIN),
      'process.env.FIREBASE_PROJECT_ID': JSON.stringify(env.FIREBASE_PROJECT_ID),
      'process.env.FIREBASE_STORAGE_BUCKET': JSON.stringify(env.FIREBASE_STORAGE_BUCKET),
      'process.env.FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.FIREBASE_MESSAGING_SENDER_ID),
      'process.env.FIREBASE_APP_ID': JSON.stringify(env.FIREBASE_APP_ID),
      'process.env.WHATSAPP_ACCESS_TOKEN': JSON.stringify(env.WHATSAPP_ACCESS_TOKEN),
    }
  };
});
