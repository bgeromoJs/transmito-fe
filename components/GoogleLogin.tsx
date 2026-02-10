
import React, { useEffect, useRef, useState } from 'react';
import { UserProfile } from '../types';

interface GoogleLoginProps {
  onLogin: (user: UserProfile) => void;
}

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
    } catch (e) {
      console.error("Erro ao decodificar JWT", e);
      return null;
    }
  };

  const handleMockLogin = () => {
    onLogin({
      name: "Usuário de Teste",
      email: "teste@transmito.com",
      picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
      isSubscribed: false
    });
  };

  useEffect(() => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    
    if (!clientId || clientId.includes("SEU_ID_DO_CLIENTE_AQUI")) {
      console.warn("Google Client ID não configurado. Use o modo de teste.");
      return;
    }

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
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: false,
            error_callback: (err: any) => {
               if (err.type === 'invalid_client') {
                 setError({
                   title: "Erro 401: Cliente Inválido",
                   msg: "O ID do Cliente não foi reconhecido ou esta URL não está autorizada."
                 });
               }
            }
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
        } catch (e) {
          console.error("Erro ao inicializar Google Login:", e);
        }
      } else {
        setTimeout(initializeGoogleLogin, 100);
      }
    };

    initializeGoogleLogin();
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
          <div ref={buttonRef} className="w-full flex justify-center min-h-[40px]"></div>
          
          <div className="flex items-center gap-3">
            <div className="h-px bg-slate-100 flex-1"></div>
            <span className="text-[10px] font-black text-slate-300 uppercase">ou</span>
            <div className="h-px bg-slate-100 flex-1"></div>
          </div>

          <button 
            onClick={handleMockLogin}
            className="w-full py-3.5 bg-slate-50 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Entrar em Modo de Teste
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-left">
            <p className="text-[10px] text-red-600 leading-relaxed font-medium">{error.msg}</p>
          </div>
        )}

        <div className="pt-6 border-t border-slate-100">
          <p className="text-xs text-slate-400 leading-relaxed">
            Desenvolvido para facilitar sua comunicação profissional.
          </p>
        </div>
      </div>
    </div>
  );
};
