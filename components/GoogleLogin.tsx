
import React from 'react';
import { UserProfile } from '../types';

interface GoogleLoginProps {
  onLogin: (user: UserProfile) => void;
}

export const GoogleLogin: React.FC<GoogleLoginProps> = ({ onLogin }) => {
  const handleFakeLogin = () => {
    // In a real environment, we'd use the GIS library properly.
    // For this demo context, we simulate the profile return.
    onLogin({
      name: 'Usuário Transmito',
      email: 'contato@transmito.app',
      picture: 'https://picsum.photos/seed/transmito/200'
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-800 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center space-y-8 transform transition-all hover:scale-[1.01]">
        <div className="space-y-2">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Transmito</h1>
          <p className="text-gray-500 text-lg">Envie mensagens em massa com facilidade e segurança.</p>
        </div>

        <button 
          onClick={handleFakeLogin}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-gray-100 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-200 transition-all shadow-sm"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Entrar com o Google
        </button>

        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Ao entrar, você concorda com nossos Termos de Serviço e Política de Privacidade.
          </p>
        </div>
      </div>
    </div>
  );
};
