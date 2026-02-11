
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
  failedContacts: Contact[];
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
  const [aiStatus, setAiStatus] = useState<string>("✨ Otimizar com IA");
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

  const callAiWithRetry = async (prompt: string, retries = 3, delay = 1000): Promise<string | undefined> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    for (let i = 0; i < retries; i++) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Mensagem original: "${prompt}"`,
          config: { 
            systemInstruction: "Você é um especialista em comunicação empresarial. Sua tarefa é reescrever mensagens de WhatsApp para torná-las profissionais, cordiais e envolventes. Mantenha o marcador {name} inalterado. Retorne APENAS o texto reescrito, sem aspas ou comentários.",
            temperature: 0.7 
          }
        });
        return response.text?.trim();
      } catch (error: any) {
        const isUnavailable = error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE');
        
        if (isUnavailable && i < retries - 1) {
          setAiStatus(`Servidor ocupado... tentando novamente (${i + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i))); 
          continue;
        }
        throw error;
      }
    }
  };

  const improveMessageWithAI = async () => {
    if (!message.trim()) {
      alert("Escreva algo primeiro!");
      return;
    }
    setIsImproving(true);
    setAiStatus("Melhorando...");
    
    try {
      const newText = await callAiWithRetry(message);
      if (newText) setMessage(newText);
    } catch (error: any) {
      console.error("Erro na IA:", error);
      if (error?.message?.includes('503')) {
        alert("A Google está com muita demanda no momento. Por favor, tente novamente em alguns instantes.");
      } else {
        alert("Erro ao conectar com a IA. Verifique sua chave de API.");
      }
    } finally {
      setIsImproving(false);
      setAiStatus("✨ Otimizar com IA");
    }
  };

  const sendDirectMessage = async (phone: string, text: string): Promise<boolean> => {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!token || token.includes('EAAB') || token.includes('TOKEN')) {
      console.warn("⚠️ Token WASender não configurado. Simulando envio...");
      await new Promise(resolve => setTimeout(resolve, 300));
      return Math.random() > 0.05; 
    }

    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      const response = await fetch(`https://wasenderapi.com/api/send-message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: formattedPhone,
          text: text
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Erro na API WASender:", errorData);
        return false;
      }

      return true;
    } catch (error) {
      console.error("❌ Falha na requisição WASender:", error);
      return false;
    }
  };

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
      currentName: 'Preparando envio...',
      isCompleted: false,
      failedContacts: []
    });

    const CHUNK_SIZE = 5; 
    
    for (let i = 0; i < contacts.length; i += CHUNK_SIZE) {
      const chunk = contacts.slice(i, i + CHUNK_SIZE);
      
      await Promise.all(chunk.map(async (contact) => {
        const personalizedMsg = message.replace(/{name}/gi, contact.name);
        const success = await sendDirectMessage(contact.phone, personalizedMsg);

        setTransmission(prev => {
          if (!prev) return null;
          return {
            ...prev,
            sent: success ? prev.sent + 1 : prev.sent,
            errors: success ? prev.errors : prev.errors + 1,
            failedContacts: success ? prev.failedContacts : [...prev.failedContacts, contact],
            currentName: contact.name
          };
        });
      }));

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

      {transmission && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-8 sm:p-10 text-center space-y-6 border border-white/20 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="absolute top-0 left-0 w-full h-2 bg-slate-100">
              <div 
                className="h-full bg-blue-600 transition-all duration-500 ease-out" 
                style={{ width: `${((transmission.sent + transmission.errors) / transmission.total) * 100}%` }}
              ></div>
            </div>

            {!transmission.isCompleted && (
              <div className="relative w-24 h-24 mx-auto">
                <svg className="w-full h-full rotate-[-90deg]">
                  <circle cx="48" cy="48" r="42" fill="transparent" stroke="#f1f5f9" strokeWidth="8" />
                  <circle 
                    cx="48" cy="48" r="42" fill="transparent" stroke="#2563eb" strokeWidth="8" 
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - (transmission.sent + transmission.errors) / transmission.total)}`}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-slate-900 leading-none">{Math.round(((transmission.sent + transmission.errors) / transmission.total) * 100)}%</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900">
                {transmission.isCompleted ? "Transmissão Finalizada" : "Enviando Mensagens"}
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{transmission.currentName}</p>
            </div>

            <div className="flex justify-center gap-8 py-4 bg-slate-50 rounded-3xl">
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                <p className="text-2xl font-black text-slate-900">{transmission.total}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enviado</p>
                <p className="text-2xl font-black text-green-600">{transmission.sent}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Falha</p>
                <p className="text-2xl font-black text-red-500">{transmission.errors}</p>
              </div>
            </div>

            {transmission.isCompleted && transmission.failedContacts.length > 0 && (
              <div className="flex flex-col text-left space-y-3 flex-1 overflow-hidden">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Lista de Falhas:</h4>
                <div className="bg-red-50/50 border border-red-100 rounded-2xl overflow-y-auto p-4 space-y-2">
                  {transmission.failedContacts.map((contact, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs font-bold bg-white p-3 rounded-xl border border-red-100 shadow-sm">
                      <span className="text-slate-700">{contact.name}</span>
                      <span className="text-red-500 font-mono">{contact.phone}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {transmission.isCompleted && (
              <button 
                onClick={() => setTransmission(null)} 
                className="w-full py-5 bg-slate-900 hover:bg-black text-white font-black rounded-[1.5rem] shadow-xl transition-all mt-4"
              >
                FECHAR RELATÓRIO
              </button>
            )}
          </div>
        </div>
      )}

      <header className="sticky top-2 z-40 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 p-3 sm:p-4 flex flex-row items-center justify-between">
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`flex items-center gap-3 p-1 pr-4 rounded-xl transition-all ${showProfileMenu ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
          >
            <div className={`w-10 h-10 rounded-lg overflow-hidden border-2 ${user.isSubscribed ? 'border-yellow-400 shadow-md' : 'border-slate-200 bg-slate-50'}`}>
              {user.picture ? <img src={user.picture} className="w-full h-full object-cover" /> : <span className="font-black text-slate-400">{user.name.charAt(0)}</span>}
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <span className="font-bold text-slate-800 text-sm leading-none">{user.name.split(' ')[0]}</span>
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
                  Assinatura
                </button>
                <button onClick={onLogout} className="w-full flex items-center gap-3 p-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all">
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
            isSending ? 'bg-slate-300' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
          }`}
        >
          {isSending ? "Enviando..." : `Transmitir Agora (${contacts.length})`}
        </button>
      </header>

      <main>
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-6">
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Mensagem</h3>
                <button
                  onClick={improveMessageWithAI}
                  disabled={isImproving || !message}
                  className="px-4 py-2 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase hover:scale-105 transition-all disabled:opacity-50 min-w-[140px]"
                >
                  {aiStatus}
                </button>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Olá {name}, tudo bem?"
                className="w-full h-56 p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-blue-500 outline-none transition-all resize-none text-slate-700 font-medium leading-relaxed"
              ></textarea>
              <p className="text-[10px] font-black text-slate-400 mt-3 uppercase tracking-widest">Use {`{name}`} para personalizar</p>
            </section>
            
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h3 className="text-lg font-black text-slate-800 mb-4 tracking-tight">Importar Contatos</h3>
              <FileUpload onDataExtracted={setContacts} />
            </section>
          </div>

          <div className="lg:col-span-7">
            <section className="bg-white rounded-[2rem] shadow-sm border border-slate-100 h-full overflow-hidden flex flex-col min-h-[500px]">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-20">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Lista de Transmissão ({contacts.length})</h3>
                {contacts.length > 0 && (
                  <button 
                    onClick={() => setContacts([])}
                    className="text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors"
                  >
                    Limpar Lista
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-auto bg-slate-50/30">
                {contacts.length > 0 ? <ContactTable contacts={contacts} /> : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-300 p-12 text-center">
                    <p className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Aguardando Importação</p>
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
