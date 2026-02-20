
import React from 'react';
import { UserProfile } from '../types';

interface WelcomeUpgradeProps {
  user: UserProfile;
  onContinue: () => void;
  onUpgrade: () => void;
}

export const WelcomeUpgrade: React.FC<WelcomeUpgradeProps> = ({ user, onContinue, onUpgrade }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="p-10 text-center space-y-8">
          <div className="space-y-4">
            <div className="mx-auto w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
              </svg>
            </div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Bem-vindo, {user.name.split(' ')[0]}!</h2>
            <p className="text-slate-500 font-medium leading-relaxed">
              Você está no <span className="text-blue-600 font-bold">Plano Gratuito</span>. 
              Para aproveitar o Transmito sem limites, considere o Plano Premium.
            </p>
          </div>

          <div className="p-6 bg-blue-50 rounded-3xl text-left space-y-4 border border-blue-100">
            <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest">Vantagens do Premium:</h4>
            <ul className="text-sm text-blue-800 space-y-3 font-bold">
              <li className="flex items-center gap-3">
                <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px]">✓</span>
                Envios Ilimitados (sem limite de 10/dia)
              </li>
              <li className="flex items-center gap-3">
                <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px]">✓</span>
                Otimização com IA Sem Limites
              </li>
              <li className="flex items-center gap-3">
                <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px]">✓</span>
                Suporte Prioritário
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <button 
              onClick={onUpgrade}
              className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 text-lg"
            >
              Quero ser Premium
            </button>
            <button 
              onClick={onContinue}
              className="w-full py-4 text-slate-400 font-black uppercase tracking-widest text-[11px] hover:text-slate-600 transition-colors"
            >
              Continuar com Plano Free (10 envios/dia)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
