
import React, { useState } from 'react';
import { UserProfile, Contact } from '../types';
import { ContactTable } from './ContactTable';
import { FileUpload } from './FileUpload';
import { SubscriptionModal } from './SubscriptionModal';

interface DashboardProps {
  user: UserProfile;
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  message: string;
  setMessage: (msg: string) => void;
  onLogout: () => void;
  onSubscribe: () => void;
}

export const TransmitoDashboard: React.FC<DashboardProps> = ({ 
  user, 
  contacts, 
  setContacts, 
  message, 
  setMessage,
  onLogout,
  onSubscribe
}) => {
  const [isSending, setIsSending] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleTransmit = () => {
    if (!user.isSubscribed) {
      setIsModalOpen(true);
      return;
    }

    if (contacts.length === 0) {
      alert('Por favor, adicione pelo menos um contato.');
      return;
    }
    if (!message.trim()) {
      alert('Por favor, escreva uma mensagem.');
      return;
    }

    setIsSending(true);
    
    contacts.forEach((contact, index) => {
      setTimeout(() => {
        const encodedMsg = encodeURIComponent(message.replace('{nome}', contact.name));
        const url = `https://wa.me/${contact.phone}?text=${encodedMsg}`;
        window.open(url, '_blank');
        
        if (index === contacts.length - 1) {
          setIsSending(false);
        }
      }, index * 1000);
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <SubscriptionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onConfirm={onSubscribe} 
      />

      {/* Header Fixo/Sticky */}
      <header className="sticky top-2 z-30 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 p-3 sm:p-4 flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-inner transition-colors ${user.isSubscribed ? 'bg-gradient-to-br from-yellow-400 to-orange-600' : 'bg-blue-600'}`}>
            {user.isSubscribed ? '★' : 'T'}
          </div>
          <div className="hidden sm:block">
            <h2 className="font-bold text-slate-800 leading-none flex items-center gap-1.5">
              Transmito
              {user.isSubscribed && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full border border-yellow-200">PRO</span>}
            </h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">{user.isSubscribed ? 'Plano Ativo' : 'Versão Gratuita'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-1 sm:flex-none justify-end">
          <button
            onClick={handleTransmit}
            disabled={isSending || (user.isSubscribed && contacts.length === 0)}
            className={`flex-1 sm:flex-none px-4 sm:px-8 py-2.5 rounded-xl font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 text-sm sm:text-base ${
              isSending 
              ? 'bg-slate-300 cursor-not-allowed' 
              : !user.isSubscribed 
                ? 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:scale-[1.02] shadow-orange-100'
                : contacts.length === 0
                  ? 'bg-slate-200 cursor-not-allowed shadow-none'
                  : 'bg-green-500 hover:bg-green-600 active:scale-95 shadow-green-100'
            }`}
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                {!user.isSubscribed ? (
                  <>
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="whitespace-nowrap">Assinar Pro</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span className="whitespace-nowrap">Transmitir ({contacts.length})</span>
                  </>
                )}
              </>
            )}
          </button>

          <button 
            onClick={onLogout}
            className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
            title="Sair"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex flex-col lg:grid lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Column */}
        <div className="lg:col-span-5 space-y-4 sm:space-y-6 order-1">
          <section className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100">
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              Conteúdo
            </h3>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Olá {nome}, tudo bem?..."
              className="w-full h-32 sm:h-48 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-none text-slate-700 text-sm sm:text-base"
            ></textarea>
            <div className="mt-3 flex items-center gap-2 p-2 bg-blue-50/50 rounded-xl border border-blue-100/50">
               <span className="text-[10px] sm:text-xs text-blue-600 leading-tight italic">
                Dica: Onde escrever <span className="font-bold">{'{nome}'}</span> o app trocará pelo nome do contato.
               </span>
            </div>
          </section>

          <section className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100">
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              Importar
            </h3>
            <FileUpload onDataExtracted={setContacts} />
          </section>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-7 order-2">
          <section className="bg-white rounded-3xl shadow-sm border border-slate-100 h-full min-h-[400px] overflow-hidden flex flex-col relative">
            {!user.isSubscribed && contacts.length > 5 && (
              <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[2px] flex items-center justify-center p-6">
                <div className="bg-white p-6 rounded-3xl shadow-2xl border border-yellow-100 text-center space-y-4 max-w-xs animate-in slide-in-from-bottom-4 duration-300">
                  <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto text-xl">★</div>
                  <h4 className="font-bold text-slate-800">Assine para Ver Tudo</h4>
                  <p className="text-xs text-slate-500">A versão gratuita limita a visualização e envio de contatos. Atualize para o Pro agora!</p>
                  <button onClick={() => setIsModalOpen(true)} className="w-full py-2.5 bg-yellow-500 text-white font-bold rounded-xl text-sm">Atualizar Agora</button>
                </div>
              </div>
            )}
            
            <div className="p-5 sm:p-6 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800">Seus Contatos</h3>
                <p className="text-xs text-slate-400">Total: {contacts.length}</p>
              </div>
              {contacts.length > 0 && (
                <button 
                  onClick={() => setContacts([])}
                  className="text-xs font-semibold text-red-400 hover:text-red-600 transition-colors"
                >
                  Limpar
                </button>
              )}
            </div>
            
            <div className={`flex-1 overflow-auto bg-slate-50/30 ${!user.isSubscribed && contacts.length > 5 ? 'overflow-hidden' : ''}`}>
              {contacts.length > 0 ? (
                <ContactTable contacts={user.isSubscribed ? contacts : contacts.slice(0, 5)} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <p className="font-bold text-slate-400 text-sm">Lista vazia</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="py-8 text-center">
        <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase flex items-center justify-center gap-2">
           <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
           Sistemas Seguros &bull; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
};
