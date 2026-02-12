
import React, { useState, useEffect } from 'react';
import { GoogleLogin } from './components/GoogleLogin';
import { TransmitoDashboard } from './components/TransmitoDashboard';
import { UserProfile, Contact } from './types';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, Timestamp, Firestore } from 'firebase/firestore';

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
                         firebaseConfig.projectId;
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

  const checkSubscription = async (email: string) => {
    // Regra de ouro: Usuário de teste sempre é assinante
    if (email === 'teste@transmito.com') {
      return { isValid: true, expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() };
    }

    if (!db) {
      const mock = localStorage.getItem(`mock_sub_${email}`);
      return mock ? JSON.parse(mock) : { isValid: false };
    }
    try {
      const subSnap = await getDoc(doc(db as Firestore, 'subscriptions', email));
      if (subSnap.exists()) {
        const data = subSnap.data();
        const expiry = data.expiryDate instanceof Timestamp ? data.expiryDate.toDate() : new Date(data.expiryDate);
        const isValid = data.isSubscribed && expiry > new Date();
        return { isValid, expiryDate: expiry.toISOString() };
      }
    } catch (e) { console.error(e); }
    return { isValid: false };
  };

  useEffect(() => {
    const init = async () => {
      const saved = localStorage.getItem('transmito_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        const sub = await checkSubscription(parsed.email);
        setUser({ ...parsed, isSubscribed: sub.isValid, expiryDate: sub.expiryDate });
      }
      setIsInitializing(false);
    };
    init();
  }, []);

  const handleLogin = async (profile: UserProfile) => {
    setIsVerifyingSubscription(true);
    const sub = await checkSubscription(profile.email);
    const userProfile = { ...profile, isSubscribed: sub.isValid, expiryDate: sub.expiryDate };
    setUser(userProfile);
    localStorage.setItem('transmito_user', JSON.stringify(userProfile));
    setIsVerifyingSubscription(false);
  };

  if (isInitializing || isVerifyingSubscription) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {!user ? (
        <GoogleLogin onLogin={handleLogin} />
      ) : (
        <TransmitoDashboard 
          user={user} 
          contacts={contacts} 
          setContacts={setContacts}
          message={message}
          setMessage={setMessage}
          onLogout={() => { setUser(null); localStorage.removeItem('transmito_user'); }}
          onSubscribe={(expiry) => setUser({ ...user, isSubscribed: true, expiryDate: expiry })}
          onCancelSubscription={() => setUser({ ...user, isSubscribed: false })}
        />
      )}
    </div>
  );
};

export default App;
