
import React, { useState, useEffect, useRef } from 'react';
import { doc, setDoc, Timestamp, Firestore } from 'firebase/firestore';
import { db } from '../App';

type CheckoutStep = 'SELECTION' | 'REVIEW' | 'METHOD' | 'STRIPE_GATEWAY' | 'PROCESSING' | 'SUCCESS';

interface Plan {
  id: string;
  name: string;
  price: string;
  priceId: string; 
  productId: string;
  period: string;
  description: string;
  tag?: string;
  durationDays: number;
}

const PLANS: Plan[] = [
  { 
    id: 'monthly', 
    name: 'Plano Mensal', 
    price: '14,90', 
    priceId: 'price_1SzQaqE5GnqfcrPP9IKVwC4G', 
    productId: 'prod_TxLHXz2H4j8gKx',
    period: '/mês', 
    description: 'Flexibilidade total mês a mês.',
    durationDays: 30
  },
  { 
    id: 'quarterly', 
    name: 'Plano Trimestral', 
    price: '39,90', 
    priceId: 'price_1SzQfPE5GnqfcrPPxlWPQejR', 
    productId: 'prod_TxLHXz2H4j8gKx',
    period: '/3 meses', 
    description: 'Melhor custo-benefício para envios recorrentes.', 
    tag: 'Mais Popular',
    durationDays: 90
  }
];

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (expiryDate: string) => void;
  userEmail?: string;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, onConfirm, userEmail }) => {
  const [step, setStep] = useState<CheckoutStep>('SELECTION');
  const [selectedPlan, setSelectedPlan] = useState<Plan>(PLANS[0]);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [isStripeLoading, setIsStripeLoading] = useState(false);
  
  const stripeRef = useRef<any>(null);
  const elementsRef = useRef<any>(null);
  const cardElementRef = useRef<any>(null);
  const cardMountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep('SELECTION');
      setStripeError(null);
      setIsStripeLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === 'STRIPE_GATEWAY' && isOpen && !stripeRef.current) {
      const publicKey = process.env.STRIPE_PUBLIC_KEY;
      if (!publicKey || publicKey.includes('SUA_CHAVE')) {
        setStripeError("Gateway indisponível no momento.");
        return;
      }
      try {
        // @ts-ignore
        stripeRef.current = window.Stripe(publicKey);
        elementsRef.current = stripeRef.current.elements();
        cardElementRef.current = elementsRef.current.create('card');
        if (cardMountRef.current) cardElementRef.current.mount(cardMountRef.current);
      } catch (e) {
        setStripeError("Erro ao carregar o Stripe.");
      }
    }
  }, [step, isOpen]);

  const saveSubscription = async (): Promise<string> => {
    if (!userEmail) return '';
    const now = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(now.getDate() + selectedPlan.durationDays);
    const expiryIso = expiryDate.toISOString();

    if (db) {
      try {
        const subRef = doc(db as Firestore, 'subscriptions', userEmail);
        await setDoc(subRef, {
          isSubscribed: true,
          planId: selectedPlan.id,
          expiryDate: Timestamp.fromDate(expiryDate),
          updatedAt: Timestamp.now()
        }, { merge: true });
      } catch (error) {
        console.error("Erro Firestore:", error);
      }
    } else {
      localStorage.setItem(`mock_sub_${userEmail}`, JSON.stringify({
        isSubscribed: true,
        expiryDate: expiryIso
      }));
    }
    return expiryIso;
  };

  const handlePayment = async () => {
    setIsStripeLoading(true);
    const expiry = await saveSubscription();
    
    setStep('PROCESSING');
    setTimeout(() => {
      setStep('SUCCESS');
      setTimeout(() => {
        onConfirm(expiry);
        onClose();
      }, 2000);
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-slate-800">Assinatura Transmito</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedPlan.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
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
                    className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${selectedPlan.id === plan.id ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 bg-white'}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-black text-slate-800">{plan.name}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">R$ {plan.price}</span>
                      <span className="text-slate-400 text-sm font-bold">{plan.period}</span>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep('METHOD')} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl text-lg">Continuar</button>
            </div>
          )}

          {step === 'METHOD' && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <h4 className="text-lg font-bold text-slate-800">Método de Pagamento</h4>
              <button onClick={handlePayment} className="w-full p-6 border-2 border-slate-100 hover:border-blue-600 hover:bg-blue-50 rounded-2xl transition-all flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                    <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
                  </div>
                  <div className="text-left">
                    <p className="font-black text-slate-800">Pagamento Simulado</p>
                    <p className="text-xs text-slate-400 font-medium">Ambiente de Produção</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
          )}

          {(step === 'PROCESSING') && (
            <div className="py-12 text-center space-y-8 animate-in fade-in">
              <div className="w-24 h-24 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <h3 className="text-2xl font-black text-slate-900">Processando...</h3>
            </div>
          )}

          {step === 'SUCCESS' && (
            <div className="py-10 text-center space-y-8 animate-in zoom-in">
              <div className="mx-auto w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-3xl font-black text-slate-900">Ativado!</h3>
              <p className="text-slate-500 font-medium">Sua conta Pro está pronta.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
