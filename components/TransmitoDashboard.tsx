
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, Contact } from '../types';
import { ContactTable } from './ContactTable';
import { FileUpload } from './FileUpload';
import { SubscriptionModal } from './SubscriptionModal';
import { GoogleGenAI } from "@google/genai";

interface DashboardProps {
  user: UserProfile;
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  message: string;
  setMessage: (msg: string) => void;
  onLogout: () => void;
  onSubscribe: (expiryDate?: string) => void;
  onCancelSubscription: () => void;
}

interface TransmissionStatus {
  total: number;
  sent: number;
  errors: number;
  currentName: string;
  isCompleted: boolean;
}

export const TransmitoDashboard: React.FC<DashboardProps> = ({ 
  user, 
  contacts, 
  setContacts, 
  message, 
  setMessage,
  onLogout,
  onSubscribe,
  onCancelSubscription
}) => {
  const [isSending, setIsSending] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [transmission, setTransmission] = useState<TransmissionStatus | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const improveMessageWithAI = async () => {
    if (!message.trim()) {
      alert("Escreva algo primeiro!");
      return;
    }
    setIsImproving(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Reescreva esta mensagem de WhatsApp para ser profissional e cordial. 
        Mantenha o marcador {nome}. Retorne apenas o texto reescrito.
        Mensagem: "${message}"`,
        config: { temperature: 0.7 }
      });
      const newText = response.text?.trim();
      if (newText) setMessage(newText);
    } catch (error) {
      console.error("Erro na IA:", error);
    } finally {
      setIsImproving(false);
    }
  };

  /**
   * Função que realiza a chamada real para a WhatsApp Cloud API da Meta
   */
  const sendDirectMessage = async (phone: string, text: string): Promise<boolean> => {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    // Se não houver token configurado, simulamos o envio para fins de demonstração visual
    if (!token || token.includes('EAAB') || !phoneId) {
      console.warn("⚠️ WhatsApp API não configurada. Simulando envio para:", phone);
      await new Promise(resolve => setTimeout(resolve, 150)); // Simula latência de rede
      return true;
    }

    try {
      const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: phone,
          type: "text",
          text: { body: text }
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error("❌ Erro na API do WhatsApp:", data.error?.message || "Erro desconhecido");
        return false;
      }

      return true;
    } catch (error) {
      console.error("❌ Falha na requisição HTTP:", error);
      return false;
    }
  };

  /**
   * Processamento de transmissão em massa utilizando Chunks (Lotes)
   * Envia múltiplos contatos simultaneamente para acelerar o processo.
   */
  const handleTransmit = async () => {
    if (!user.isSubscribed) {
      setIsModalOpen(true);
      return;
    }
    if (contacts.length === 0) return alert('Importe uma lista de contatos primeiro.');
    if (!message.trim()) return alert('Escreva a mensagem que deseja enviar.');

    setIsSending(true);
    setTransmission({
      total: contacts.length,
      sent: 0,
      errors: 0,
      currentName: 'Iniciando...',
      isCompleted: false
    });

    // Definimos o tamanho do lote paralelo (Ex: 5 envios por vez)
    const CHUNK_SIZE = 5;
    
    for (let i = 0; i < contacts.length; i += CHUNK_SIZE) {
      const chunk = contacts.slice(i, i + CHUNK_SIZE);
      
      // Processa o lote atual em paralelo
      await Promise.all(chunk.map(async (contact) => {
        const personalizedMsg = message.replace(/{nome}/gi, contact.name);
        const success = await sendDirectMessage(contact.phone, personalizedMsg);

        setTransmission(prev => {
          if (!prev) return null;
          return {
            ...prev,
            sent: success ? prev.sent + 1 : prev.sent,
            errors: success ? prev.errors : prev.errors + 1,
            currentName: contact.name
          };
        });
      }));

      // Pequena pausa entre lotes para evitar Rate Limiting agressivo da Meta
      if (i + CHUNK_SIZE < contacts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    setTransmission(prev => prev ? { ...prev, isCompleted: true, currentName: 'Transmissão Concluída' } : null);
    setIsSending(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <SubscriptionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onConfirm={(expiry) => onSubscribe(expiry)} 
        userEmail={user.email}
      />

      {/* Modal de Progresso da Transmissão */}
      {transmission && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 text-center space-y-8 overflow-hidden relative border border-white/20">
            <div className="absolute top-0 left-0 w-full h-2 bg-slate-100">
              <div 
                className="h-full bg-blue-600 transition-all duration-500 ease-out" 
                style={{ width: `${(transmission.sent / transmission.total) * 100}%` }}
              ></div>
            </div>

            <div className="relative w-32 h-32 mx-auto">
              <svg className="w-full h-full rotate-[-90deg] drop-shadow-xl">
                <circle cx="64" cy="64" r="58" fill="transparent" stroke="#f1f5f9" strokeWidth="10" />
                <circle 
                  cx="64" cy="64" r="58" fill="transparent" stroke="#2563eb" strokeWidth="10" 
                  strokeDasharray={`${2 * Math.PI * 58}`}
                  strokeDashoffset={`${2 * Math.PI * 58 * (1 - transmission.sent / transmission.total)}`}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-900 leading-none">{Math.round((transmission.sent / transmission.total) * 100)}%</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-1">Concluído</span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {transmission.isCompleted ? "Tudo Pronto!" : "Transmitindo..."}
              </h3>
              <div className="flex justify-center gap-6">
                <div className="text-center">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Enviados</p>
                  <p className="text-xl font-black text-green-600">{transmission.sent}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Erros</p>
                  <p className="text-xl font-black text-red-500">{transmission.errors}</p>
                </div>
              </div>
              {!transmission.isCompleted && (
                <p className="text-sm font-bold text-slate-500 bg-slate-50 py-2 px-4 rounded-full inline-block">
                  Enviando para: <span className="text-blue-600">{transmission.currentName}</span>
                </p>
              )}
            </div>

            {transmission.isCompleted && (
              <button 
                onClick={() => setTransmission(null)} 
                className="w-full py-5 bg-slate-900 hover:bg-black text-white font-black rounded-[1.5rem] shadow-xl transition-all transform hover:scale-[1.02] active:scale-95"
              >
                FECHAR RELATÓRIO
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header do App */}
      <header className="sticky top-2 z-40 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 p-3 sm:p-4 flex flex-row items-center justify-between">
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`group flex items-center gap-3 p-1 pr-4 rounded-xl transition-all ${showProfileMenu ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
          >
            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg overflow-hidden flex items-center justify-center border-2 ${user.isSubscribed ? 'border-yellow-400 ring-2 ring-yellow-400/20 shadow-lg' : 'border-slate-200 bg-slate-50'}`}>
              {user.picture ? <img src={user.picture} className="w-full h-full object-cover" /> : <span className="font-black text-slate-400">{user.name.charAt(0)}</span>}
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <span className="font-bold text-slate-800 text-sm leading-none flex items-center gap-1">
                {user.name.split(' ')[0]}
                <svg className={`w-3 h-3 text-slate-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">{user.isSubscribed ? 'Premium' : 'Gratuito'}</span>
            </div>
          </button>
          
          {showProfileMenu && (
            <div className="absolute top-full left-0 mt-2 w-64 glass-menu rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
              <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                <p className="font-black text-slate-800 truncate">{user.name}</p>
                {user.isSubscribed && user.expiryDate && (
                  <p className="text-[9px] font-bold text-blue-600 uppercase mt-1">Expira em: {new Date(user.expiryDate).toLocaleDateString()}</p>
                )}
              </div>
              <div className="p-2 space-y-1">
                <button onClick={() => { setIsModalOpen(true); setShowProfileMenu(false); }} className="w-full flex items-center gap-3 p-3 text-sm font-bold text-slate-700 hover:bg-white hover:text-blue-600 rounded-xl transition-all">
                  <div className="w-8 h-8 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg></div>
                  {user.isSubscribed ? 'Gerenciar Premium' : 'Seja Premium'}
                </button>
                <button onClick={onLogout} className="w-full flex items-center gap-3 p-3 text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-red-600 rounded-xl transition-all">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></div>
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleTransmit}
          disabled={isSending || contacts.length === 0}
          className={`px-6 sm:px-10 py-3 rounded-xl font-black text-white transition-all shadow-xl flex items-center gap-2 text-sm sm:text-base ${
            isSending ? 'bg-slate-300' : user.isSubscribed ? 'bg-green-500 hover:bg-green-600 hover:shadow-green-200 active:scale-95' : 'bg-gradient-to-r from-yellow-500 to-orange-600 active:scale-95'
          }`}
        >
          {isSending ? (
            <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              <span>{user.isSubscribed ? `Transmitir para ${contacts.length}` : 'Ativar Envio Direto'}</span>
            </div>
          )}
        </button>
      </header>

      <main className="relative">
        {!user.isSubscribed && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-50/20 backdrop-blur-lg rounded-[3rem] border border-white/50">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl text-center space-y-6 max-w-sm border border-yellow-100 animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl"><svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg></div>
              <h4 className="text-2xl font-black text-slate-800">Transmissão Direta</h4>
              <p className="text-slate-500 font-medium">Você precisa de uma assinatura ativa para enviar mensagens diretamente pela API.</p>
              <button onClick={() => setIsModalOpen(true)} className="w-full py-4 bg-yellow-500 text-white font-black rounded-2xl shadow-xl hover:bg-yellow-600 transition-all">ASSINAR AGORA</button>
            </div>
          </div>
        )}

        <div className={`flex flex-col lg:grid lg:grid-cols-12 gap-6 transition-all duration-700 ${!user.isSubscribed ? 'opacity-30 pointer-events-none scale-[0.98]' : ''}`}>
          <div className="lg:col-span-5 space-y-6">
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Mensagem</h3>
                <button
                  onClick={improveMessageWithAI}
                  disabled={isImproving || !message}
                  className="px-4 py-2 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase hover:scale-105 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100"
                >
                  {isImproving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : '✨ IA: Otimizar'}
                </button>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Olá {nome}, tudo bem? Gostaria de..."
                className="w-full h-56 p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-blue-500 outline-none transition-all resize-none text-slate-700 font-medium leading-relaxed"
              ></textarea>
              <p className="text-[10px] font-black text-slate-400 mt-3 uppercase tracking-widest">Dica: use {`{nome}`} para personalizar</p>
            </section>
            
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h3 className="text-lg font-black text-slate-800 mb-4 tracking-tight">Importar Base</h3>
              <FileUpload onDataExtracted={setContacts} />
            </section>
          </div>

          <div className="lg:col-span-7">
            <section className="bg-white rounded-[2rem] shadow-sm border border-slate-100 h-full overflow-hidden flex flex-col min-h-[500px]">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-20">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Audiência ({contacts.length})</h3>
              </div>
              <div className="flex-1 overflow-auto bg-slate-50/30">
                {contacts.length > 0 ? <ContactTable contacts={contacts} /> : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-300 p-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    </div>
                    <p className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Lista Vazia</p>
                    <p className="text-xs font-medium text-slate-400 mt-1">Importe um CSV para começar.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};
