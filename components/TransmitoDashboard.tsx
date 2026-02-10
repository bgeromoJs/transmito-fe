
import React, { useState } from 'react';
import { UserProfile, Contact } from '../types';
import { ContactTable } from './ContactTable';
import { FileUpload } from './FileUpload';

interface DashboardProps {
  user: UserProfile;
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  message: string;
  setMessage: (msg: string) => void;
  onLogout: () => void;
}

export const TransmitoDashboard: React.FC<DashboardProps> = ({ 
  user, 
  contacts, 
  setContacts, 
  message, 
  setMessage,
  onLogout 
}) => {
  const [isSending, setIsSending] = useState(false);

  const handleTransmit = () => {
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
      {/* Header Fixo/Sticky mais compacto no mobile */}
      <header className="sticky top-2 z-30 bg-white/90 backdrop-blur-md rounded-2xl shadow-md border border-slate-200 p-3 sm:p-4 flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-inner">
            T
          </div>
          <div className="hidden sm:block">
            <h2 className="font-bold text-slate-800 leading-none">Transmito</h2>
            <p className="text-[10px] text-slate-500">Broadcast v2.0</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-1 sm:flex-none justify-end">
          <button
            onClick={handleTransmit}
            disabled={isSending || contacts.length === 0}
            className={`flex-1 sm:flex-none px-4 sm:px-8 py-2.5 rounded-xl font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 text-sm sm:text-base ${
              isSending || contacts.length === 0 
              ? 'bg-slate-300 cursor-not-allowed' 
              : 'bg-green-500 hover:bg-green-600 active:scale-95 shadow-green-200'
            }`}
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span className="whitespace-nowrap">Transmitir ({contacts.length})</span>
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
        {/* Left Column: Controles */}
        <div className="lg:col-span-5 space-y-4 sm:space-y-6 order-1 lg:order-1">
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

        {/* Right Column: Listagem */}
        <div className="lg:col-span-7 order-2 lg:order-2">
          <section className="bg-white rounded-3xl shadow-sm border border-slate-100 h-full min-h-[400px] overflow-hidden flex flex-col">
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
                  Limpar lista
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-auto bg-slate-50/30">
              {contacts.length > 0 ? (
                <ContactTable contacts={contacts} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <p className="font-bold text-slate-400 text-sm">Lista vazia</p>
                  <p className="text-xs text-slate-400 max-w-[200px] mt-1">Importe um arquivo CSV ou do Drive para começar.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="py-8 text-center">
        <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">
          Transmitindo com segurança &bull; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
};
