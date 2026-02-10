
import React, { useState, useEffect, useRef } from 'react';

type CheckoutStep = 'SELECTION' | 'REVIEW' | 'METHOD' | 'STRIPE_GATEWAY' | 'PROCESSING' | 'SUCCESS';

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  tag?: string;
}

const PLANS: Plan[] = [
  { id: 'monthly', name: 'Plano Mensal', price: '1,00', period: '/mês', description: 'Flexibilidade total mês a mês.' },
  { id: 'quarterly', name: 'Plano Trimestral', price: '10,00', period: '/3 meses', description: 'Economize significativamente no trimestre.', tag: 'Popular' },
  { id: 'annual', name: 'Plano Anual', price: '15,00', period: '/ano', description: 'O melhor custo-benefício absoluto.', tag: 'Melhor Preço' }
];

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [step, setStep] = useState<CheckoutStep>('SELECTION');
  const [selectedPlan, setSelectedPlan] = useState<Plan>(PLANS[1]);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [isStripeLoading, setIsStripeLoading] = useState(false);
  
  const stripeRef = useRef<any>(null);
  const elementsRef = useRef<any>(null);
  const cardElementRef = useRef<any>(null);
  const cardMountRef = useRef<HTMLDivElement>(null);

  // Inicializa o Stripe quando o passo do gateway é aberto
  useEffect(() => {
    if (step === 'STRIPE_GATEWAY' && isOpen && !stripeRef.current) {
      const publicKey = process.env.STRIPE_PUBLIC_KEY;
      if (!publicKey || publicKey.includes('SUA_CHAVE')) {
        setStripeError("Chave pública do Stripe não configurada no .env.local");
        return;
      }

      // @ts-ignore
      stripeRef.current = window.Stripe(publicKey);
      elementsRef.current = stripeRef.current.elements();
      
      cardElementRef.current = elementsRef.current.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#1e293b',
            fontFamily: 'Inter, sans-serif',
            '::placeholder': { color: '#94a3b8' },
          },
        },
      });

      if (cardMountRef.current) {
        cardElementRef.current.mount(cardMountRef.current);
        cardElementRef.current.on('change', (event: any) => {
          setStripeError(event.error ? event.error.message : null);
        });
      }
    }

    return () => {
      if (cardElementRef.current) {
        cardElementRef.current.unmount();
        cardElementRef.current = null;
        stripeRef.current = null;
      }
    };
  }, [step, isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step === 'SELECTION') setStep('REVIEW');
    else if (step === 'REVIEW') setStep('METHOD');
  };

  const handleBack = () => {
    if (step === 'REVIEW') setStep('SELECTION');
    else if (step === 'METHOD') setStep('REVIEW');
    else if (step === 'STRIPE_GATEWAY') setStep('METHOD');
  };

  const handlePayment = async () => {
    if (!stripeRef.current || !cardElementRef.current) return;

    setIsStripeLoading(true);
    setStripeError(null);

    const { paymentMethod, error } = await stripeRef.current.createPaymentMethod({
      type: 'card',
      card: cardElementRef.current,
    });

    if (error) {
      setStripeError(error.message);
      setIsStripeLoading(false);
    } else {
      console.log('PaymentMethod criado com sucesso:', paymentMethod.id);
      setStep('PROCESSING');
      
      // Simulação final: Como não há backend, assumimos sucesso após gerar o ID do Stripe
      setTimeout(() => {
        setStep('SUCCESS');
        setTimeout(() => {
          onConfirm();
          onClose();
        }, 2000);
      }, 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md transition-all duration-500">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header Visual */}
        <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Assinatura Transmito</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedPlan.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-8 sm:p-10">
          {step === 'SELECTION' && (
            <div className="space-y-6">
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
              <button onClick={handleNext} className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-200 text-lg">Continuar</button>
            </div>
          )}

          {step === 'REVIEW' && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Você selecionou</p>
                <div className="flex justify-between items-end">
                   <div>
                     <h4 className="text-2xl font-black text-slate-800">{selectedPlan.name}</h4>
                     <p className="text-sm text-slate-500 font-medium">{selectedPlan.description}</p>
                   </div>
                   <div className="text-right">
                     <span className="text-3xl font-black text-blue-600">R${selectedPlan.price}</span>
                   </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleBack} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl">Voltar</button>
                <button onClick={handleNext} className="flex-[2] py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl">Confirmar</button>
              </div>
            </div>
          )}

          {step === 'METHOD' && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold text-slate-800">Selecione o Método</h4>
                <button onClick={handleBack} className="text-blue-600 font-black text-xs uppercase tracking-widest hover:underline flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
                  Alterar Plano
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <button onClick={() => setStep('STRIPE_GATEWAY')} className="p-6 border-2 border-slate-100 hover:border-[#635BFF] hover:bg-[#635BFF]/5 rounded-2xl transition-all flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#635BFF] rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                      <svg className="w-7 h-7" viewBox="0 0 40 40" fill="currentColor"><path d="M18.1 19.3c0-2.3 1.9-3 4.2-3 1.9 0 4 .5 5.6 1.4V13c-1.8-.7-3.9-1-5.9-1-5.4 0-9.4 2.8-9.4 7.6 0 7.4 10.2 6.2 10.2 11.2 0 2.5-2.1 3.2-4.6 3.2-2.3 0-4.8-.8-6.6-1.8V38c2.1 1 4.7 1.4 7.1 1.4 5.7 0 9.8-2.8 9.8-8 0-7.8-10.4-6.4-10.4-11.3z"/></svg>
                    </div>
                    <div>
                      <p className="font-black text-slate-800">Cartão de Crédito</p>
                      <p className="text-xs text-slate-400 font-medium">Via Stripe Secure</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-slate-300 group-hover:text-[#635BFF] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
                </button>
                <div className="relative">
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 rounded-2xl flex items-center justify-center">
                    <span className="bg-slate-800 text-white text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest">Em breve</span>
                  </div>
                  <button className="w-full p-6 border-2 border-slate-100 rounded-2xl flex items-center gap-4 opacity-50">
                    <img src="https://www.gstatic.com/instantbuy/svg/dark_gpay.svg" className="h-6" />
                    <p className="font-black text-slate-800">Google Pay</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'STRIPE_GATEWAY' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between">
                <button onClick={handleBack} className="text-[#635BFF] font-black text-xs uppercase tracking-widest hover:underline flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
                  Alterar Método
                </button>
                <div className="flex gap-2">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-4 opacity-50" />
                  <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-4 opacity-50" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-inner-sm focus-within:ring-4 focus-within:ring-[#635BFF]/10 focus-within:border-[#635BFF] transition-all">
                  <div ref={cardMountRef} className="w-full min-h-[24px]"></div>
                </div>

                {stripeError && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 animate-shake">
                    <svg className="w-5 h-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                    <p className="text-xs font-bold text-red-600">{stripeError}</p>
                  </div>
                )}

                <button
                  onClick={handlePayment}
                  disabled={isStripeLoading}
                  className="w-full py-5 bg-[#635BFF] hover:bg-[#5851e0] disabled:bg-slate-200 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 text-lg transition-all flex items-center justify-center gap-3"
                >
                  {isStripeLoading ? (
                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <span>Pagar R$ {selectedPlan.price}</span>
                  )}
                </button>
                
                <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  🔒 Pagamento 100% Seguro via Stripe
                </p>
              </div>
            </div>
          )}

          {step === 'PROCESSING' && (
            <div className="py-12 text-center space-y-8 animate-in fade-in">
              <div className="relative mx-auto w-36 h-36 flex items-center justify-center">
                <div className="absolute inset-0 border-[6px] border-slate-50 rounded-full"></div>
                <div className="absolute inset-0 border-[6px] border-green-500 rounded-full border-t-transparent animate-spin"></div>
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                   <svg className="w-10 h-10 text-[#635BFF]" viewBox="0 0 40 40" fill="currentColor"><path d="M18.1 19.3c0-2.3 1.9-3 4.2-3 1.9 0 4 .5 5.6 1.4V13c-1.8-.7-3.9-1-5.9-1-5.4 0-9.4 2.8-9.4 7.6 0 7.4 10.2 6.2 10.2 11.2 0 2.5-2.1 3.2-4.6 3.2-2.3 0-4.8-.8-6.6-1.8V38c2.1 1 4.7 1.4 7.1 1.4 5.7 0 9.8-2.8 9.8-8 0-7.8-10.4-6.4-10.4-11.3z"/></svg>
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">Processando Pagamento</h3>
                <p className="text-slate-400 font-bold text-sm mt-2">Comunicando com o Gateway do Stripe...</p>
              </div>
            </div>
          )}

          {step === 'SUCCESS' && (
            <div className="py-10 text-center space-y-8 animate-in zoom-in">
              <div className="mx-auto w-32 h-32 bg-green-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-green-200">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-4xl font-black text-slate-900">Sucesso!</h3>
                <p className="text-slate-500 font-medium text-lg">Sua conta Pro foi ativada instantaneamente.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
