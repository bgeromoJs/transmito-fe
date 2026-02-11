
import React, { useState, useEffect } from 'react';
import { GoogleLogin } from './components/GoogleLogin';
import { TransmitoDashboard } from './components/TransmitoDashboard';
import { UserProfile, Contact } from './types';
// Fix: Import Firebase functions and types correctly for modular SDK
import { initializeApp, getApps, getApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getFirestore, doc, getDoc, Timestamp } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

// Configuração segura do Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Inicializa o Firebase apenas uma vez e exporta para uso global
const initFirebase = (): FirebaseApp | null => {
  try {
    const apps = getApps();
    if (apps.length > 0) return getApp();
    
    // Verifica se as chaves reais foram preenchidas
    const isConfigured = firebaseConfig.apiKey && 
                         !firebaseConfig.apiKey.includes('SUA_FIREBASE') && 
                         firebaseConfig.projectId && 
                         !firebaseConfig.projectId.includes('SEU_PROJETO');

    if (!isConfigured) {
      console.warn("⚠️ Firebase NÃO configurado com chaves reais. Usando modo MOCK (LocalStorage).");
      return null;
    }

    console.log("✅ Firebase inicializado com sucesso.");
    return initializeApp(firebaseConfig);
  } catch (e) {
    console.error("❌ Falha crítica ao inicializar Firebase:", e);
    return null;
  }
};

export const app = initFirebase();
// Fix: Use modular getFirestore
export const db = app ? getFirestore(app) : null;

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [message, setMessage] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isVerifyingSubscription, setIsVerifyingSubscription] = useState(false);

  // Função para verificar assinatura (Firestore ou Mock)
  const checkFirebaseSubscription = async (email: string): Promise<boolean> => {
    console.log(`🔍 Verificando assinatura para: ${email}`);

    // Modo Mock: Verifica no LocalStorage se não houver DB real conectado
    if (!db) {
      const mockSub = localStorage.getItem(`mock_sub_${email}`);
      if (mockSub) {
        const data = JSON.parse(mockSub);
        const isExpired = new Date(data.expiryDate) < new Date();
        console.log("ℹ️ Usando dados MOCK do LocalStorage. Assinatura válida:", data.isSubscribed && !isExpired);
        return data.isSubscribed && !isExpired;
      }
      return false;
    }

    try {
      // Fix: cast db to Firestore to resolve type mismatch or missing member errors
      const subRef = doc(db as Firestore, 'subscriptions', email);
      const subSnap = await getDoc(subRef);
      
      if (subSnap.exists()) {
        const data = subSnap.data();
        // Garante que expiryDate é um Timestamp válido do Firebase
        const expiryDate = data.expiryDate instanceof Timestamp 
          ? data.expiryDate 
          : Timestamp.fromDate(new Date(data.expiryDate));
          
        const now = Timestamp.now();
        const isValid = data.isSubscribed === true && expiryDate.seconds > now.seconds;
        
        console.log("✅ Dados recuperados do FIRESTORE:", { 
          email, 
          isSubscribed: data.isSubscribed, 
          isValid 
        });
        
        return isValid;
      } else {
        console.log("ℹ️ Nenhum registro de assinatura encontrado no Firestore para este e-mail.");
      }
    } catch (error) {
      console.error("❌ Erro ao consultar Firestore:", error);
    }
    return false;
  };

  useEffect(() => {
    const init = async () => {
      const savedUser = localStorage.getItem('transmito_user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        const isPro = await checkFirebaseSubscription(parsedUser.email);
        const updatedUser = { ...parsedUser, isSubscribed: isPro };
        setUser(updatedUser);
      }
      setIsInitializing(false);
    };
    init();
  }, []);

  const handleLogin = async (profile: UserProfile) => {
    setIsVerifyingSubscription(true);
    const isPro = await checkFirebaseSubscription(profile.email);
    const updatedProfile = { ...profile, isSubscribed: isPro };

    setUser(updatedProfile);
    localStorage.setItem('transmito_user', JSON.stringify(updatedProfile));
    setIsVerifyingSubscription(false);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('transmito_user');
    console.log("👋 Usuário desconectado.");
  };

  const updateSubscription = (status: boolean) => {
    if (user) {
      const updatedUser = { ...user, isSubscribed: status };
      setUser(updatedUser);
      localStorage.setItem('transmito_user', JSON.stringify(updatedUser));
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
            {isVerifyingSubscription ? "Sincronizando com Firestore..." : "Carregando Transmito..."}
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
