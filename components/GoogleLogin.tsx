
import React, { useEffect, useRef } from 'react';
import { UserProfile } from '../types';

interface GoogleLoginProps {
  onLogin: (user: UserProfile) => void;
}

export const GoogleLogin: React.FC<GoogleLoginProps> = ({ onLogin }) => {
  const buttonRef = useRef<HTMLDivElement>(null);

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
    } catch (e) {
      console.error("Erro ao decodificar JWT", e);
      return null;
    }
  };

  useEffect(() => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      console.error("GOOGLE_CLIENT_ID não configurado nas variáveis de ambiente.");
      return;
    }

    const handleCredentialResponse = (response: any) => {
      const payload = decodeJwt(response.credential);
      if (payload) {
        onLogin({
          name: payload.name,
          email: payload.email,
          picture: payload.picture,
          isSubscribed: false // Padrão inicial
        });
      }
    };

    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
      });

      if (buttonRef.current) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'signin_with',
          shape: 'rectangular',
        });
      }
    }
  }, [onLogin]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-800 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center space-y-8">
        <div className="space-y-3">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Transmito</h1>
          <p className="text-slate-500 text-lg">Envios em massa profissionais via WhatsApp.</p>
        </div>

        <div className="space-y-4">
          <div ref={buttonRef} className="w-full flex justify-center"></div>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Autenticação Segura Google</p>
        </div>

        <div className="pt-6 border-t border-slate-100">
          <p className="text-xs text-slate-400 leading-relaxed">
            Ao entrar, você terá acesso ao painel de transmissão e gerenciamento de contatos.
          </p>
        </div>
      </div>
    </div>
  );
};
