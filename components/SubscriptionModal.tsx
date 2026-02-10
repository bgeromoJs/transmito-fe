
import React, { useState, useEffect } from 'react';

type CheckoutStep = 'SELECTION' | 'REVIEW' | 'METHOD' | 'GPAY_API' | 'SUCCESS';

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  tag?: string;
}

const PLANS: Plan[] = [
  { id: 'monthly', name: 'Plano Mensal', price: '49,90', period: '/mês', description: 'Flexibilidade total mês a mês.' },
  { id: 'quarterly', name: 'Plano Trimestral', price: '119,70', period: '/3 meses', description: 'Economize 20% no trimestre.', tag: 'Popular' },
  { id: 'annual', name: 'Plano Anual', price: '399,00', period: '/ano', description: 'O melhor custo-benefício.', tag: 'Melhor Preço' }
];

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [step, setStep] = useState<CheckoutStep>('SELECTION');
  const [selectedPlan, setSelectedPlan] = useState<Plan>(PLANS[1]);

  useEffect(() => {
    if (!isOpen) {
      setStep('SELECTION');
      setSelectedPlan(PLANS[1]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step === 'SELECTION') setStep('REVIEW');
    else if (step === 'REVIEW') setStep('METHOD');
    else if (step === 'METHOD') setStep('GPAY_API');
  };

  const handleBack = () => {
    if (step === 'REVIEW') setStep('SELECTION');
    else if (step === 'METHOD') setStep('REVIEW');
  };

  const executeGooglePay = () => {
    setStep('GPAY_API');
    // Simulando a chamada da API do Google Pay
    setTimeout(() => {
      setStep('SUCCESS');
      setTimeout(() => {
        onConfirm();
        onClose();
      }, 2000);
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md transition-all duration-500">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Progress Bar (Visible in first steps) */}
        {['SELECTION', 'REVIEW', 'METHOD'].includes(step) && (
          <div className="flex h-1.5 bg-slate-100">
            <div className={`h-full bg-blue-600 transition-all duration-500 ${step === 'SELECTION' ? 'w-1/3' : step === 'REVIEW' ? 'w-2/3' : 'w-full'}`}></div>
          </div>
        )}

        <div className="p-8 sm:p-10">
          {/* STEP 1: ITEM SELECTION */}
          {step === 'SELECTION' && (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">Escolha seu plano</h3>
                  <p className="text-slate-500 font-medium">Libere envios ilimitados e IA hoje.</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>

              <div className="space-y-3">
                {PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${selectedPlan.id === plan.id ? 'border-blue-600 bg-blue-50/50 shadow-md ring-4 ring-blue-600/5' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-black text-slate-800">{plan.name}</span>
                      {plan.tag && <span className="text-[9px] font-black uppercase tracking-widest bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full">{plan.tag}</span>}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">R$ {plan.price}</span>
                      <span className="text-slate-400 text-sm font-bold">{plan.period}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 font-medium">{plan.description}</p>
                  </button>
                ))}
              </div>

              <button 
                onClick={handleNext}
                className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-200 text-lg hover:scale-[1.02] active:scale-[0.98]"
              >
                Continuar
              </button>
            </div>
          )}

          {/* STEP 2: PRE-PURCHASE (REVIEW) */}
          {step === 'REVIEW' && (
            <div className="space-y-6">
              <button onClick={handleBack} className="flex items-center gap-2 text-blue-600 font-bold text-sm mb-2 group">
                <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                Voltar
              </button>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">Resumo do Pedido</h3>
              
              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-600">Plano Selecionado:</span>
                  <span className="font-black text-slate-900">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-600">Ciclo de Cobrança:</span>
                  <span className="font-bold text-slate-500">Recorrente {selectedPlan.period.replace('/', '')}</span>
                </div>
                <div className="h-px bg-slate-200"></div>
                <div className="flex justify-between items-center text-xl">
                  <span className="font-black text-slate-900">Total Hoje:</span>
                  <span className="font-black text-blue-600">R$ {selectedPlan.price}</span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Benefícios inclusos:</h4>
                <div className="grid grid-cols-2 gap-3">
                  {['Envios ∞', 'IA Gemini', 'Drive Sync', 'Suporte VIP'].map((b, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      {b}
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleNext}
                className="w-full py-5 bg-slate-900 hover:bg-black text-white font-black rounded-2xl transition-all shadow-xl text-lg hover:scale-[1.02] active:scale-[0.98]"
              >
                Confirmar e Pagar
              </button>
            </div>
          )}

          {/* STEP 3: PAYMENT METHOD */}
          {step === 'METHOD' && (
            <div className="space-y-6">
              <button onClick={handleBack} className="flex items-center gap-2 text-blue-600 font-bold text-sm mb-2 group">
                <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                Voltar
              </button>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">Método de Pagamento</h3>
              <p className="text-slate-500 font-medium">Selecione sua forma de pagamento preferida.</p>

              <div className="space-y-3">
                {/* Google Pay - Featured Option */}
                <button 
                  onClick={executeGooglePay}
                  className="w-full py-5 bg-black hover:bg-slate-900 text-white font-bold rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  <img src="https://www.gstatic.com/instantbuy/svg/dark_gpay.svg" alt="Google Pay" className="h-7" />
                  <span className="text-lg">Pagar com Google Pay</span>
                </button>

                <div className="flex items-center gap-3 py-2">
                  <div className="h-px bg-slate-100 flex-1"></div>
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Outros métodos</span>
                  <div className="h-px bg-slate-100 flex-1"></div>
                </div>

                <button className="w-full py-4 border-2 border-slate-100 hover:border-slate-200 rounded-2xl font-bold text-slate-600 flex items-center justify-center gap-3 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                  Cartão de Crédito
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: GOOGLE PAY API SCREEN (SIMULATION) */}
          {step === 'GPAY_API' && (
            <div className="py-12 text-center space-y-8 animate-in fade-in duration-500">
              <div className="relative mx-auto w-36 h-36 flex items-center justify-center">
                <div className="absolute inset-0 border-[6px] border-slate-50 rounded-full"></div>
                <div className="absolute inset-0 border-[6px] border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                <img src="https://www.gstatic.com/instantbuy/svg/dark_gpay.svg" alt="Google Pay" className="w-20 relative z-10" />
              </div>
              <div className="space-y-3">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Processando no Google</h3>
                <p className="text-slate-500 font-medium text-lg px-6">Confirme a transação na janela do Google Pay que se abriu.</p>
              </div>
              <div className="flex justify-center gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className={`w-2 h-2 rounded-full bg-blue-600/30 animate-bounce`} style={{ animationDelay: `${i * 0.2}s` }}></div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: SUCCESS SCREEN */}
          {step === 'SUCCESS' && (
            <div className="py-10 text-center space-y-8 animate-in zoom-in-95 duration-500">
              <div className="mx-auto w-32 h-32 bg-green-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-green-200 animate-bounce">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-4xl font-black text-slate-900 tracking-tight">Tudo pronto!</h3>
                <p className="text-slate-500 font-medium text-lg">Sua assinatura Pro foi ativada com sucesso.</p>
              </div>
              <div className="pt-4">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Pagamento Recebido</p>
                <p className="font-bold text-slate-800">Transação Google: #TX-{Math.floor(Math.random() * 1000000)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Policies */}
        {['SELECTION', 'REVIEW', 'METHOD'].includes(step) && (
          <div className="px-10 py-6 bg-slate-50 border-t border-slate-100">
            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-[0.15em] leading-relaxed">
              Ao continuar, você concorda com nossos <a href="#" className="text-blue-600 underline">Termos de Uso</a> e <a href="#" className="text-blue-600 underline">Política de Privacidade</a>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
