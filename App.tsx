
import React, { useState, useEffect } from 'react';
import { GoogleLogin } from './components/GoogleLogin';
import { TransmitoDashboard } from './components/TransmitoDashboard';
import { UserProfile, Contact } from './types';
// Fixed: Using Firebase v8 compatible imports to resolve "no exported member" errors
import firebase from 'firebase/app';
import 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const initFirebase = (): firebase.app.App | null => {
  try {
    const apps = firebase.apps;
    if (apps.length > 0) return firebase.app();
    const isConfigured = firebaseConfig.apiKey && 
                         !firebaseConfig.apiKey.includes('SUA_FIREBASE') && 
                         firebaseConfig.projectId && 
                         !firebaseConfig.projectId.includes('SEU_PROJETO');
    if (!isConfigured) return null;
    return firebase.initializeApp(firebaseConfig);
  } catch (e) {
    console.error("Erro Firebase:", e);
    return null;
  }
};

export const app = initFirebase();
export const db = app ? app.firestore() : null;

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [message, setMessage] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isVerifyingSubscription, setIsVerifyingSubscription] = useState(false);

  // Verifica a assinatura e limpa o banco se estiver expirada
  const checkFirebaseSubscription = async (email: string): Promise<{isValid: boolean, expiryDate?: string}> => {
    if (!db) {
      const mockSub = localStorage.getItem(`mock_sub_${email}`);
      if (mockSub) {
        const data = JSON.parse(mockSub);
        const expired = new Date(data.expiryDate) < new Date();
        return { isValid: data.isSubscribed && !expired, expiryDate: data.expiryDate };
      }
      return { isValid: false };
    }

    try {
      // Fixed: Using v8 collection/doc syntax
      const subRef = db.collection('subscriptions').doc(email);
      const subSnap = await subRef.get();
      
      if (subSnap.exists) {
        const data = subSnap.data();
        if (!data) return { isValid: false };

        const expiryDateTs = data.expiryDate instanceof firebase.firestore.Timestamp 
          ? data.expiryDate 
          : firebase.firestore.Timestamp.fromDate(new Date(data.expiryDate || Date.now()));
          
        const now = firebase.firestore.Timestamp.now();
        const hasExpired = expiryDateTs.seconds <= now.seconds;
        
        // Ação Corretiva: Se o banco diz que é Pro mas o tempo acabou, atualizamos o banco
        if (data.isSubscribed && hasExpired) {
          console.log("⏰ Assinatura expirada detectada. Atualizando banco de dados...");
          await subRef.update({ isSubscribed: false });
          return { isValid: false, expiryDate: expiryDateTs.toDate().toISOString() };
        }
        
        return { 
          isValid: data.isSubscribed === true && !hasExpired, 
          expiryDate: expiryDateTs.toDate().toISOString() 
        };
      }
    } catch (error) {
      console.error("Erro ao verificar assinatura:", error);
    }
    return { isValid: false };
  };

  // Monitoramento em tempo real (Efeito Heartbeat)
  useEffect(() => {
    if (!user || !user.isSubscribed || !user.expiryDate) return;

    const interval = setInterval(() => {
      const now = new Date();
      const expiry = new Date(user.expiryDate!);
      
      if (now >= expiry) {
        console.log("🚫 Assinatura expirou durante a sessão!");
        setUser(prev => prev ? { ...prev, isSubscribed: false } : null);
        // Tenta limpar no banco também de forma silenciosa
        if (db && user.email) {
          // Fixed: Using v8 collection/doc/update syntax
          const subRef = db.collection('subscriptions').doc(user.email);
          subRef.update({ isSubscribed: false }).catch(console.error);
        }
      }
    }, 30000); // Checa a cada 30 segundos

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const init = async () => {
      const savedUser = localStorage.getItem('transmito_user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        const subData = await checkFirebaseSubscription(parsedUser.email);
        const updatedUser = { 
          ...parsedUser, 
          isSubscribed: subData.isValid,
          expiryDate: subData.expiryDate 
        };
        setUser(updatedUser);
      }
      setIsInitializing(false);
    };
    init();
  }, []);

  const handleLogin = async (profile: UserProfile) => {
    setIsVerifyingSubscription(true);
    const subData = await checkFirebaseSubscription(profile.email);
    const updatedProfile = { 
      ...profile, 
      isSubscribed: subData.isValid,
      expiryDate: subData.expiryDate 
    };

    setUser(updatedProfile);
    localStorage.setItem('transmito_user', JSON.stringify(updatedProfile));
    setIsVerifyingSubscription(false);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('transmito_user');
  };

  const updateSubscription = (status: boolean, expiry?: string) => {
    if (user) {
      const updatedUser = { ...user, isSubscribed: status, expiryDate: expiry || user.expiryDate };
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
        <p className="font-black text-slate-800">Sincronizando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
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
          onSubscribe={(expiry) => updateSubscription(true, expiry)}
          onCancelSubscription={() => updateSubscription(false)}
        />
      )}
    </div>
  );
};

export default App;
