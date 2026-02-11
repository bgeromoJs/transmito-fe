
import React, { useEffect, useRef, useState } from 'react';
import { UserProfile } from '../types';

// Declare google on window for TypeScript compatibility with Google Identity Services
declare global {
  interface Window {
    google: any;
  }
}

interface GoogleLoginProps {
  onLogin: (user: UserProfile) => void;
}

const LogoIcon = () => (
  <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

export const GoogleLogin: React.FC<GoogleLoginProps> = ({ onLogin }) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<{title: string, msg: string} | null>(null);

  const decodeJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) { return null; }
  };

  const handleMockLogin = () => {
    // Definimos isSubscribed como true no modo demo para permitir o teste da transmissão
    onLogin({
      name: "Usuário de Teste",
      email: "teste@transmito.com",
      picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
      isSubscribed: true,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
  };

  useEffect(() => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId || clientId.includes("SEU_ID_DO_CLIENTE_AQUI")) return;

    const handleCredentialResponse = (response: any) => {
      const payload = decodeJwt(response.credential);
      if (payload) {
        onLogin({
          name: payload.name,
          email: payload.email,
          picture: payload.picture,
          isSubscribed: false
        });
      }
    };

    const initializeGoogleLogin = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
        });
        if (buttonRef.current) {
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'signin_with',
            shape: 'pill',
          });
        }
      } else {
        setTimeout(initializeGoogleLogin, 100);
      }
    };
    initializeGoogleLogin();
  }, [onLogin]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 p-4">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)] p-10 sm:p-14 text-center space-y-10 animate-in fade-in zoom-in duration-700">
        <div className="space-y-6">
          <div className="mx-auto w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center border-4 border-white shadow-xl shadow-blue-500/10 rotate-3">
            <LogoIcon />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Transmito</h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">Broadcast Profissional</p>
          </div>
        </div>

        <div className="space-y-6">
          <div ref={buttonRef} className="w-full flex justify-center min-h-[50px]"></div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest"><span className="bg-white px-4 text-slate-300">Conexão Segura</span></div>
          </div>

          <button 
            onClick={handleMockLogin}
            className="w-full py-4 bg-slate-50 border border-slate-100 text-slate-500 font-bold text-xs uppercase tracking-widest rounded-full hover:bg-slate-100 transition-all active:scale-95"
          >
            Modo de Demonstração
          </button>
        </div>
      </div>
    </div>
  );
};
