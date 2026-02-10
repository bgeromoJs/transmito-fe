
import React, { useState, useEffect } from 'react';

type CheckoutStep = 'SELECTION' | 'REVIEW' | 'METHOD' | 'GPAY_API' | 'STRIPE_API' | 'SUCCESS';

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
  };

  const handleBack = () => {
    if (step === 'REVIEW') setStep('SELECTION');
    else if (step === 'METHOD') setStep('REVIEW');
  };

  const executeGooglePay = () => {
    setStep('GPAY_API');
    setTimeout(() => {
      setStep('SUCCESS');
      setTimeout(() => {
        onConfirm();
        onClose();
      }, 2000);
    }, 3000);
  };

  const executeStripe = () => {
    // Em uma integração real, aqui você chamaria o Stripe Checkout
    // const stripe = await loadStripe(process.env.STRIPE_PUBLIC_KEY);
    // await stripe.redirectToCheckout({ lineItems: [{ price: 'ID_DO_PRECO', quantity: 1 }], mode: 'subscription' });
    
    setStep('STRIPE_API');
    setTimeout(() => {
      setStep('SUCCESS');
      setTimeout(() => {
        onConfirm();
        onClose();
      }, 2000);
    }, 3500);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md transition-all duration-500">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Progress Bar */}
        {['SELECTION', 'REVIEW', 'METHOD'].includes(step) && (
          <div className="flex h-1.5 bg-slate-100">
            <div className={`h-full bg-blue-600 transition-all duration-500 ${step === 'SELECTION' ? 'w-1/3' : step === 'REVIEW' ? 'w-2/3' : 'w-full'}`}></div>
          </div>
        )}

        <div className="p-8 sm:p-10">
          {step === 'SELECTION' && (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">Escolha seu plano</h3>
                  <p className="text-slate-500 font-medium">Libere envios ilimitados e IA hoje.</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
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
                  </button>
                ))}
              </div>

              <button onClick={handleNext} className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-200 text-lg active:scale-[0.98]">
                Continuar
              </button>
            </div>
          )}

          {step === 'REVIEW' && (
            <div className="space-y-6">
              <button onClick={handleBack} className="flex items-center gap-2 text-blue-600 font-bold text-sm mb-2 group">
                <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                Voltar
              </button>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">Resumo</h3>
              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-600">Plano:</span>
                  <span className="font-black text-slate-900">{selectedPlan.name}</span>
                </div>
                <div className="h-px bg-slate-200"></div>
                <div className="flex justify-between items-center text-xl">
                  <span className="font-black text-slate-900">Total:</span>
                  <span className="font-black text-blue-600">R$ {selectedPlan.price}</span>
                </div>
              </div>
              <button onClick={handleNext} className="w-full py-5 bg-slate-900 hover:bg-black text-white font-black rounded-2xl shadow-xl text-lg active:scale-[0.98]">
                Ir para Pagamento
              </button>
            </div>
          )}

          {step === 'METHOD' && (
            <div className="space-y-6">
              <button onClick={handleBack} className="flex items-center gap-2 text-blue-600 font-bold text-sm mb-2 group">
                <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                Voltar
              </button>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">Pagamento</h3>
              <div className="space-y-4">
                <button onClick={executeGooglePay} className="w-full py-5 bg-black text-white font-bold rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-[0.98]">
                  <img src="https://www.gstatic.com/instantbuy/svg/dark_gpay.svg" alt="Google Pay" className="h-7" />
                </button>
                <button onClick={executeStripe} className="w-full py-5 bg-[#635BFF] text-white font-bold rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-[0.98]">
                  <span className="text-lg">Pagar com Stripe</span>
                </button>
              </div>
            </div>
          )}

          {(step === 'GPAY_API' || step === 'STRIPE_API') && (
            <div className="py-12 text-center space-y-8">
              <div className="relative mx-auto w-36 h-36 flex items-center justify-center">
                <div className="absolute inset-0 border-[6px] border-slate-50 rounded-full"></div>
                <div className={`absolute inset-0 border-[6px] ${step === 'GPAY_API' ? 'border-blue-600' : 'border-[#635BFF]'} rounded-full border-t-transparent animate-spin`}></div>
                <span className="font-black text-slate-400">{step === 'GPAY_API' ? 'GPay' : 'Stripe'}</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900">Processando...</h3>
            </div>
          )}

          {step === 'SUCCESS' && (
            <div className="py-10 text-center space-y-8">
              <div className="mx-auto w-32 h-32 bg-green-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-green-200 animate-bounce">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-4xl font-black text-slate-900">Ativado!</h3>
              <p className="text-slate-500 font-medium">Sua conta Pro está pronta para uso.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
