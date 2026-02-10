
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente localizadas no diretório './env'
  // O prefixo vazio '' permite carregar variáveis sem o padrão 'VITE_'
  const env = loadEnv(mode, 'env', '');

  return {
    plugins: [react()],
    // Define o diretório onde os arquivos .env (como o .env.local) estão localizados
    envDir: 'env',
    define: {
      // Expondo as variáveis como process.env para compatibilidade com o código atual
      'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID),
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    server: {
      // Garante que o servidor de dev lide corretamente com roteamento se necessário
      historyApiFallback: true,
    }
  };
});
