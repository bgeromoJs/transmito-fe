
import React, { useState, useEffect } from 'react';

type CheckoutStep = 'SELECTION' | 'REVIEW' | 'METHOD' | 'STRIPE_FORM' | 'GPAY_API' | 'STRIPE_API' | 'SUCCESS';

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
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvc: '' });

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
    else if (step === 'STRIPE_FORM') setStep('METHOD');
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

  const openStripeForm = () => {
    setStep('STRIPE_FORM');
  };

  const processStripePayment = () => {
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
        {['SELECTION', 'REVIEW', 'METHOD', 'STRIPE_FORM'].includes(step) && (
          <div className="flex h-1.5 bg-slate-100">
            <div className={`h-full transition-all duration-500 ${
              step === 'SELECTION' ? 'w-1/4 bg-blue-600' : 
              step === 'REVIEW' ? 'w-2/4 bg-blue-600' : 
              step === 'METHOD' ? 'w-3/4 bg-blue-600' : 
              'w-full bg-[#635BFF]'
            }`}></div>
          </div>
        )}

        <div className="p-8 sm:p-10">
          {step === 'SELECTION' && (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">Escolha seu plano</h3>
                  <p className="text-slate-500 font-medium">Libere envios ilimitados agora.</p>
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
                  </button>
                ))}
              </div>

              <button onClick={handleNext} className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-200 text-lg active:scale-[0.98]">
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
                <div className="flex justify-between items-center text-xl">
                  <span className="font-black text-slate-900">{selectedPlan.name}</span>
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
                <button onClick={executeGooglePay} className="w-full py-5 bg-black text-white font-bold rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] hover:bg-slate-900">
                  <img src="https://www.gstatic.com/instantbuy/svg/dark_gpay.svg" alt="Google Pay" className="h-7" />
                </button>
                <button onClick={openStripeForm} className="w-full py-5 bg-[#635BFF] hover:bg-[#5851e0] text-white font-bold rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-[0.98]">
                  <span className="text-lg">Pagar com Stripe</span>
                </button>
              </div>
            </div>
          )}

          {step === 'STRIPE_FORM' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <button onClick={handleBack} className="flex items-center gap-2 text-[#635BFF] font-bold text-sm mb-2 group">
                <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                Alterar Método
              </button>
              
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Dados do Cartão</h3>
                <div className="flex gap-2">
                   <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-4 opacity-50" />
                   <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-4 opacity-50" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número do Cartão</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="0000 0000 0000 0000"
                      className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#635BFF]/10 focus:border-[#635BFF] outline-none font-medium text-slate-700"
                      value={cardData.number}
                      onChange={(e) => setCardData({...cardData, number: e.target.value.replace(/\D/g, '').substring(0, 16).replace(/(.{4})/g, '$1 ').trim()})}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                       <svg className="w-6 h-6 text-slate-300" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Validade</label>
                    <input 
                      type="text" 
                      placeholder="MM / AA"
                      className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#635BFF]/10 focus:border-[#635BFF] outline-none font-medium text-slate-700 text-center"
                      value={cardData.expiry}
                      onChange={(e) => setCardData({...cardData, expiry: e.target.value.replace(/\D/g, '').substring(0, 4).replace(/(.{2})/, '$1/')})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CVC</label>
                    <input 
                      type="text" 
                      placeholder="123"
                      className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#635BFF]/10 focus:border-[#635BFF] outline-none font-medium text-slate-700 text-center"
                      value={cardData.cvc}
                      onChange={(e) => setCardData({...cardData, cvc: e.target.value.replace(/\D/g, '').substring(0, 3)})}
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-100">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  </div>
                  <p className="text-[11px] font-bold text-slate-500 leading-tight">
                    Seu pagamento é processado pelo Stripe. <br/>
                    Nenhum dado do cartão toca nossos servidores.
                  </p>
                </div>

                <button 
                  onClick={processStripePayment}
                  disabled={cardData.number.length < 16}
                  className="w-full py-5 bg-[#635BFF] hover:bg-[#5851e0] disabled:bg-slate-300 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 text-lg active:scale-[0.98] transition-all"
                >
                  Pagar R$ {selectedPlan.price}
                </button>
              </div>
            </div>
          )}

          {(step === 'GPAY_API' || step === 'STRIPE_API') && (
            <div className="py-12 text-center space-y-8">
              <div className="relative mx-auto w-36 h-36 flex items-center justify-center">
                <div className="absolute inset-0 border-[6px] border-slate-50 rounded-full"></div>
                <div className={`absolute inset-0 border-[6px] ${step === 'GPAY_API' ? 'border-blue-600' : 'border-[#635BFF]'} rounded-full border-t-transparent animate-spin`}></div>
                <div className="relative z-10 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                   {step === 'GPAY_API' ? (
                     <img src="https://www.gstatic.com/instantbuy/svg/dark_gpay.svg" className="w-10" />
                   ) : (
                     <svg className="w-10 h-10 text-[#635BFF]" viewBox="0 0 40 40" fill="currentColor"><path d="M18.1 19.3c0-2.3 1.9-3 4.2-3 1.9 0 4 .5 5.6 1.4V13c-1.8-.7-3.9-1-5.9-1-5.4 0-9.4 2.8-9.4 7.6 0 7.4 10.2 6.2 10.2 11.2 0 2.5-2.1 3.2-4.6 3.2-2.3 0-4.8-.8-6.6-1.8V38c2.1 1 4.7 1.4 7.1 1.4 5.7 0 9.8-2.8 9.8-8 0-7.8-10.4-6.4-10.4-11.3z"/></svg>
                   )}
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900">Validando Transação...</h3>
              <p className="text-slate-400 font-bold text-sm">Não feche esta janela.</p>
            </div>
          )}

          {step === 'SUCCESS' && (
            <div className="py-10 text-center space-y-8">
              <div className="mx-auto w-32 h-32 bg-green-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-green-200 animate-bounce">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-4xl font-black text-slate-900">Sucesso!</h3>
              <p className="text-slate-500 font-medium text-lg px-4">Sua conta Pro foi ativada com sucesso.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
