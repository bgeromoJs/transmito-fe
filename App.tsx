
import React, { useState, useEffect } from 'react';
import { GoogleLogin } from './components/GoogleLogin';
import { TransmitoDashboard } from './components/TransmitoDashboard';
import { UserProfile, Contact } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [message, setMessage] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isVerifyingSubscription, setIsVerifyingSubscription] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('transmito_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      // Aqui você poderia disparar uma re-verificação silenciosa
    }
    setIsInitializing(false);
  }, []);

  const handleLogin = async (profile: UserProfile) => {
    setIsVerifyingSubscription(true);
    
    // SIMULAÇÃO: Consultando API do Stripe/Firebase para ver se este e-mail já é Pro
    // Em produção, você faria: const isPro = await checkSubscriptionOnServer(profile.email);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Para fins de teste, mantemos o status que vier ou o que estiver no localStorage
    const savedStatus = localStorage.getItem(`sub_status_${profile.email}`);
    const updatedProfile = { 
      ...profile, 
      isSubscribed: savedStatus === 'true' 
    };

    setUser(updatedProfile);
    localStorage.setItem('transmito_user', JSON.stringify(updatedProfile));
    setIsVerifyingSubscription(false);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('transmito_user');
  };

  const updateSubscription = (status: boolean) => {
    if (user) {
      const updatedUser = { ...user, isSubscribed: status };
      setUser(updatedUser);
      localStorage.setItem('transmito_user', JSON.stringify(updatedUser));
      localStorage.setItem(`sub_status_${user.email}`, status.toString());
    }
  };

  if (isInitializing || isVerifyingSubscription) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-100 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <div className="text-center">
          <p className="font-black text-slate-800 tracking-tight">
            {isVerifyingSubscription ? "Verificando assinatura..." : "Carregando Transmito..."}
          </p>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Sua segurança em primeiro lugar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-300">
      {!user ? (
        <GoogleLogin onLogin={handleLogin} />
      ) : (
        <TransmitoDashboard 
          user={user} 
          contacts={contacts} 
          setContacts={setContacts}
          message={message}
          setMessage={setMessage}
          onLogout={handleLogout}
          onSubscribe={() => updateSubscription(true)}
          onCancelSubscription={() => updateSubscription(false)}
        />
      )}
    </div>
  );
};

export default App;
