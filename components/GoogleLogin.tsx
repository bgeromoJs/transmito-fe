
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

  useEffect(() => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    
    // Verifica se o ID é o placeholder ou está vazio
    if (!clientId || clientId.includes("SEU_ID_DO_CLIENTE_AQUI")) {
      setError({
        title: "Configuração Necessária",
        msg: "Você ainda não configurou um Client ID válido no arquivo env/.env.local."
      });
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
            // Log de erro aprimorado
            error_callback: (err: any) => {
               console.error("Google Auth Error:", err);
               if (err.type === 'invalid_client') {
                 setError({
                   title: "Erro 401: Cliente Inválido",
                   msg: "O ID do Cliente não foi reconhecido ou esta URL não está autorizada no Google Cloud Console."
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

        {error ? (
          <div className="p-6 bg-red-50 border border-red-100 rounded-2xl text-left space-y-3">
            <h2 className="text-red-700 font-bold text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error.title}
            </h2>
            <p className="text-xs text-red-600 leading-relaxed">{error.msg}</p>
            <div className="pt-2 space-y-2">
              <p className="text-[10px] font-bold text-red-400 uppercase">Como resolver:</p>
              <ol className="text-[10px] text-red-500 space-y-1 list-decimal ml-4">
                <li>Vá ao <b>Google Cloud Console</b>.</li>
                <li>Em <b>Credenciais</b>, edite seu ID de Cliente OAuth 2.0.</li>
                <li>Adicione <code>{window.location.origin}</code> às <b>Origens JavaScript autorizadas</b>.</li>
                <li>Certifique-se que o ID no arquivo <code>env/.env.local</code> está correto.</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div ref={buttonRef} className="w-full flex justify-center min-h-[40px]"></div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Autenticação Segura Google</p>
          </div>
        )}

        <div className="pt-6 border-t border-slate-100">
          <p className="text-xs text-slate-400 leading-relaxed">
            Ao entrar, você terá acesso ao painel de transmissão e gerenciamento de contatos.
          </p>
        </div>
      </div>
    </div>
  );
};
