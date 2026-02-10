
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente localizadas no diretório './env'
  const env = loadEnv(mode, 'env', '');

  return {
    plugins: [react()],
    envDir: 'env',
    define: {
      'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID),
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.STRIPE_PUBLIC_KEY': JSON.stringify(env.STRIPE_PUBLIC_KEY),
    },
    server: {
      historyApiFallback: true,
    }
  };
});
