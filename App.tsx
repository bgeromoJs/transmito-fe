
import React, { useState, useEffect } from 'react';
import { GoogleLogin } from './components/GoogleLogin';
import { TransmitoDashboard } from './components/TransmitoDashboard';
import { UserProfile, Contact } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [message, setMessage] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('transmito_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsInitializing(false);
  }, []);

  const handleLogin = (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem('transmito_user', JSON.stringify(profile));
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
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
