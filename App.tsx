
import React, { useState, useEffect } from 'react';
import { GoogleLogin } from './components/GoogleLogin';
import { TransmitoDashboard } from './components/TransmitoDashboard';
import { UserProfile, Contact } from './types';
// Fix: Separating value and type imports to resolve potential resolution issues in mixed environments
import { initializeApp, getApps, getApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const initFirebase = (): FirebaseApp | null => {
  try {
    const apps = getApps();
    if (apps.length > 0) return getApp();
    const isConfigured = firebaseConfig.apiKey && 
                         !firebaseConfig.apiKey.includes('SUA_FIREBASE') && 
                         firebaseConfig.projectId && 
                         !firebaseConfig.projectId.includes('SEU_PROJETO');
    if (!isConfigured) return null;
    return initializeApp(firebaseConfig);
  } catch (e) {
    console.error("Erro Firebase:", e);
    return null;
  }
};

export const app = initFirebase();
export const db = app ? getFirestore(app) : null;

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [message, setMessage] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isVerifyingSubscription, setIsVerifyingSubscription] = useState(false);

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
      const subRef = doc(db as Firestore, 'subscriptions', email);
      const subSnap = await getDoc(subRef);
      
      if (subSnap.exists()) {
        const data = subSnap.data();
        if (!data) return { isValid: false };

        const expiryDateTs = data.expiryDate instanceof Timestamp 
          ? data.expiryDate 
          : Timestamp.fromDate(new Date(data.expiryDate || Date.now()));
          
        const now = Timestamp.now();
        const hasExpired = expiryDateTs.seconds <= now.seconds;
        
        if (data.isSubscribed && hasExpired) {
          console.log("⏰ Assinatura expirada detectada. Atualizando...");
          await updateDoc(subRef, { isSubscribed: false });
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

  useEffect(() => {
    if (!user || !user.isSubscribed || !user.expiryDate) return;

    const interval = setInterval(() => {
      const now = new Date();
      const expiry = new Date(user.expiryDate!);
      
      if (now >= expiry) {
        setUser(prev => prev ? { ...prev, isSubscribed: false } : null);
        if (db && user.email) {
          const subRef = doc(db as Firestore, 'subscriptions', user.email);
          updateDoc(subRef, { isSubscribed: false }).catch(console.error);
        }
      }
    }, 30000);

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
        <div className="w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
        <p className="font-black text-slate-800">Iniciando Transmito...</p>
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
