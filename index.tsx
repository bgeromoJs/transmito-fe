
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

if (!container) {
  console.error("Não foi possível encontrar o elemento root no DOM.");
} else {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  // Registro do Service Worker para PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then(
        (registration) => {
          console.log('SW registrado com sucesso:', registration.scope);
        },
        (err) => {
          console.log('Falha ao registrar SW:', err);
        }
      );
    });
  }
}
