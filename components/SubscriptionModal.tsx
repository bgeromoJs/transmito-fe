
import React, { useState } from 'react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [step, setStep] = useState<'plan' | 'payment' | 'processing'>('plan');

  if (!isOpen) return null;

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('processing');
    setTimeout(() => {
      onConfirm();
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {step === 'plan' && (
          <div className="p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">Plano Pro</h3>
                <p className="text-slate-500">Envios ilimitados para seu negócio.</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-8">
              {[
                'Mensagens ilimitadas',
                'Importação via Google Drive',
                'Suporte 24/7 via WhatsApp',
                'Relatórios de entrega',
                'Sem anúncios ou taxas extras'
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                  <div className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  {feature}
                </div>
              ))}
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl mb-6 flex items-center justify-between border border-slate-100">
              <span className="text-slate-500 font-medium">Mensal</span>
              <span className="text-2xl font-black text-slate-800">R$ 49,90<span className="text-sm text-slate-400 font-normal">/mês</span></span>
            </div>

            <button 
              onClick={() => setStep('payment')}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-200 active:scale-95"
            >
              Continuar para Pagamento
            </button>
          </div>
        )}

        {step === 'payment' && (
          <form onSubmit={handlePayment} className="p-8">
            <div className="flex items-center gap-2 mb-6 text-blue-600 cursor-pointer" onClick={() => setStep('plan')}>
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-bold">Voltar aos planos</span>
            </div>
            
            <h3 className="text-xl font-bold text-slate-800 mb-6">Informações de Cartão</h3>
            
            <div className="space-y-4 mb-8">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Número do Cartão</label>
                <input required placeholder="0000 0000 0000 0000" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Validade</label>
                  <input required placeholder="MM/AA" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">CVV</label>
                  <input required placeholder="123" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg active:scale-95"
            >
              Finalizar Assinatura
            </button>
          </form>
        )}

        {step === 'processing' && (
          <div className="p-12 text-center space-y-6">
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 border-4 border-blue-50 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Processando Pagamento</h3>
              <p className="text-slate-400">Quase lá! Estamos validando sua assinatura.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
