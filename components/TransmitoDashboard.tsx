
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

      {/* Header */}
      <header className="sticky top-2 z-40 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 p-3 sm:p-4 flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Avatar com Borda Amarela/Dourada se Premium */}
          <div className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden flex items-center justify-center border-2 transition-all duration-500 ${
            user.isSubscribed 
              ? 'border-yellow-400 ring-4 ring-yellow-400/20 shadow-[0_0_15px_rgba(250,204,21,0.4)]' 
              : 'border-slate-200 bg-slate-50'
          }`}>
            {user.picture ? (
              <img 
                src={user.picture} 
                alt={user.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className={`font-bold text-lg sm:text-xl ${user.isSubscribed ? 'text-yellow-600' : 'text-slate-400'}`}>
                {user.name.charAt(0).toUpperCase()}
              </span>
            )}
            {user.isSubscribed && (
              <div className="absolute top-0 right-0 w-3 h-3 bg-yellow-400 border-2 border-white rounded-full"></div>
            )}
          </div>
          
          <div className="hidden sm:block">
            <h2 className="font-bold text-slate-800 leading-none flex items-center gap-1.5">
              {user.name.split(' ')[0]}
              {user.isSubscribed && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full border border-yellow-200 font-black">PRO</span>}
            </h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 font-bold">
              {user.isSubscribed ? 'Membro Premium' : 'Conta Gratuita'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-1 sm:flex-none justify-end">
          <button
            onClick={handleTransmit}
            disabled={isSending}
            className={`flex-1 sm:flex-none px-4 sm:px-8 py-2.5 rounded-xl font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 text-sm sm:text-base ${
              isSending 
              ? 'bg-slate-300 cursor-not-allowed' 
              : user.isSubscribed 
                ? 'bg-green-500 hover:bg-green-600 active:scale-95 shadow-green-100'
                : 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:scale-[1.02] shadow-orange-100'
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
                    <span className="whitespace-nowrap">Desbloquear Pro</span>
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
            className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            title="Sair"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content Area com Bloqueio se não for Premium */}
      <main className="relative">
        {!user.isSubscribed && (
          <div className="absolute inset-0 z-30 flex items-center justify-center">
            {/* Overlay Bloqueador de Clique */}
            <div className="absolute inset-0 bg-slate-50/10 cursor-not-allowed"></div>
            
            {/* Mensagem de Paywall Centralizada */}
            <div className="relative z-40 bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-2xl border border-yellow-100 text-center space-y-6 max-w-sm mx-4 animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-yellow-100/50 rotate-3">
                 <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                 </svg>
              </div>
              <div className="space-y-2">
                <h4 className="text-2xl font-black text-slate-800 tracking-tight">Recurso Exclusivo</h4>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                  Para enviar mensagens e gerenciar contatos, você precisa de uma assinatura ativa.
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(true)} 
                className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-white font-black rounded-2xl text-base shadow-xl shadow-yellow-200 transition-all hover:scale-[1.02] active:scale-95"
              >
                ASSINAR AGORA
              </button>
            </div>
          </div>
        )}

        <div className={`flex flex-col lg:grid lg:grid-cols-12 gap-4 sm:gap-6 transition-all duration-700 ${!user.isSubscribed ? 'blur-md grayscale-[0.2] pointer-events-none select-none opacity-60' : ''}`}>
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
            <section className="bg-white rounded-3xl shadow-sm border border-slate-100 h-full min-h-[400px] overflow-hidden flex flex-col">
              <div className="p-5 sm:p-6 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800">Lista de Transmissão</h3>
                  <p className="text-xs text-slate-400">Total: {contacts.length} contatos carregados</p>
                </div>
                {contacts.length > 0 && user.isSubscribed && (
                  <button 
                    onClick={() => setContacts([])}
                    className="text-xs font-semibold text-red-400 hover:text-red-600 transition-colors"
                  >
                    Limpar Tudo
                  </button>
                )}
              </div>
              
              <div className="flex-1 overflow-auto bg-slate-50/30">
                {contacts.length > 0 ? (
                  <ContactTable contacts={contacts} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <p className="font-bold text-slate-400 text-sm">Sua lista está pronta para receber contatos</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      <footer className="py-8 text-center">
        <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase flex items-center justify-center gap-2">
           <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
           Conexão Segura WhatsApp &bull; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
};
