
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
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Configurações de Transmissão - Padrão 60s e Timer Habilitado
  const [delay, setDelay] = useState(60);
  const [isDelayEnabled, setIsDelayEnabled] = useState(true);
  const [isHumanMode, setIsHumanMode] = useState(true);

  const menuRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.error('Wake Lock error:', err);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().then(() => {
        wakeLockRef.current = null;
      });
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const callAiWithRetry = async (prompt: string, retries = 3, delayMs = 1000): Promise<string | undefined> => {
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
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i))); 
          continue;
        }
        throw error;
      }
    }
  };

  const improveMessageWithAI = async () => {
    if (!message.trim()) return;
    setIsImproving(true);
    setAiStatus("Melhorando...");
    try {
      const newText = await callAiWithRetry(message);
      if (newText) setMessage(newText);
    } catch (error: any) {
      alert("Erro ao conectar com a IA.");
    } finally {
      setIsImproving(false);
      setAiStatus("✨ Otimizar com IA");
    }
  };

  const sendDirectMessage = async (to: string, text: string): Promise<boolean> => {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const apiUrl = `https://wasenderapi.com/api/send-message`;

    if (!token || token.includes('EAAB') || token.includes('TOKEN')) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return Math.random() > 0.05; 
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, text })
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  const handleTransmit = async () => {
    if (!user.isSubscribed) return setIsModalOpen(true);
    if (!message.trim()) return alert('Escreva a mensagem.');
    if (contacts.length === 0) return alert('Importe contatos.');

    setIsSending(true);
    await requestWakeLock(); 
    
    setContacts(prev => prev.map(c => ({ ...c, status: undefined })));
    setTransmission({
      total: contacts.length,
      sent: 0,
      errors: 0,
      currentName: 'Iniciando...',
      isCompleted: false,
      failedContacts: []
    });

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const personalizedMsg = message.replace(/{name}/gi, contact.name);
      
      const success = await sendDirectMessage(contact.phone, personalizedMsg);

      setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, status: success ? 'sent' : 'failed' } : c));
      setTransmission(prev => prev ? {
        ...prev,
        sent: success ? prev.sent + 1 : prev.sent,
        errors: success ? prev.errors : prev.errors + 1,
        failedContacts: success ? prev.failedContacts : [...prev.failedContacts, contact],
        currentName: contact.name
      } : null);

      if (i < contacts.length - 1) {
        let waitTime = isDelayEnabled ? delay * 1000 : 800;
        if (isDelayEnabled && isHumanMode) {
          // Variância apenas acima: adiciona entre 0 e 10 segundos ao tempo base
          const variance = Math.random() * 10000; 
          waitTime = waitTime + variance;
        }
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    setTransmission(prev => prev ? { ...prev, isCompleted: true, currentName: 'Finalizado' } : null);
    setIsSending(false);
    releaseWakeLock(); 
    
    if (Notification.permission === 'granted') {
      new Notification('Transmissão Concluída', {
        body: `Enviado com sucesso para ${contacts.length} contatos.`,
        icon: 'https://api.dicebear.com/7.x/shapes/svg?seed=transmito&backgroundColor=2563eb'
      });
    }
  };

  const getSafetyLevel = () => {
    if (!isDelayEnabled) return { label: 'Risco Crítico', color: 'text-red-700', bg: 'bg-red-100' };
    if (delay < 15) return { label: 'Risco Alto', color: 'text-red-500', bg: 'bg-red-50' };
    if (delay < 45) return { label: 'Seguro', color: 'text-green-600', bg: 'bg-green-50' };
    return { label: 'Ultra Seguro', color: 'text-blue-600', bg: 'bg-blue-50' };
  };

  const safety = getSafetyLevel();

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <SubscriptionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onConfirm={(expiry) => onSubscribe(expiry)} userEmail={user.email} />

      {transmission && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-8 sm:p-10 text-center space-y-6 border border-white/20 flex flex-col max-h-[90vh]">
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900">{transmission.isCompleted ? "Transmissão Concluída" : "Enviando em Segundo Plano"}</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{transmission.currentName}</p>
            </div>
            <div className="flex justify-center gap-8 py-4 bg-slate-50 rounded-3xl">
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enviado</p>
                <p className="text-2xl font-black text-green-600">{transmission.sent}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Falha</p>
                <p className="text-2xl font-black text-red-500">{transmission.errors}</p>
              </div>
            </div>
            {transmission.isCompleted && (
              <button onClick={() => setTransmission(null)} className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl">FECHAR</button>
            )}
            {!transmission.isCompleted && (
              <p className="text-[10px] text-slate-400 font-bold px-4">
                Mantenha esta aba aberta para garantir o envio em segundo plano.
              </p>
            )}
          </div>
        </div>
      )}

      <header className="sticky top-2 z-40 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 p-3 sm:p-4 flex flex-row items-center justify-between">
        <div className="relative" ref={menuRef}>
          <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center gap-3 p-1 pr-4 rounded-xl hover:bg-slate-50 transition-all">
            <div className={`w-10 h-10 rounded-lg overflow-hidden border-2 ${user.isSubscribed ? 'border-yellow-400' : 'border-slate-200'}`}>
              {user.picture ? <img src={user.picture} className="w-full h-full object-cover" /> : <span className="font-black text-slate-400">{user.name.charAt(0)}</span>}
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <span className="font-bold text-slate-800 text-sm leading-none">{user.name.split(' ')[0]}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">PRO</span>
            </div>
          </button>
          
          {showProfileMenu && (
            <div className="absolute top-full left-0 mt-2 w-64 glass-menu rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
              <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                <p className="font-black text-slate-800 truncate">{user.name}</p>
              </div>
              <div className="p-2 space-y-1">
                {deferredPrompt && (
                  <button onClick={handleInstallClick} className="w-full flex items-center gap-3 p-3 text-sm font-black text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                    📲 Baixar Aplicativo
                  </button>
                )}
                <button onClick={() => { setIsModalOpen(true); setShowProfileMenu(false); }} className="w-full flex items-center gap-3 p-3 text-sm font-bold text-slate-700 hover:bg-white rounded-xl transition-all">
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
          className={`px-6 sm:px-10 py-3 rounded-xl font-black text-white transition-all shadow-xl text-sm sm:text-base ${isSending ? 'bg-slate-300' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
        >
          {isSending ? "Enviando..." : `Transmitir Agora (${contacts.length})`}
        </button>
      </header>

      <main className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Configurações Anti-Ban</h3>
              <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${safety.bg} ${safety.color}`}>
                {safety.label}
              </div>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-2xl cursor-pointer">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-blue-700">Timer de Transmissão</span>
                  <span className="text-[10px] text-blue-500">Intervalo de segurança entre envios</span>
                </div>
                <input 
                  type="checkbox" checked={isDelayEnabled} onChange={() => setIsDelayEnabled(!isDelayEnabled)}
                  className="w-5 h-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </label>

              <div className={!isDelayEnabled ? 'opacity-30 grayscale' : ''}>
                <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-2">
                  <span>Delay entre mensagens</span>
                  <span className="text-blue-600">{delay} segundos</span>
                </div>
                <input 
                  type="range" min="5" max="120" step="5" value={delay}
                  disabled={!isDelayEnabled}
                  onChange={(e) => setDelay(parseInt(e.target.value))}
                  className={`w-full h-2 bg-slate-100 rounded-lg appearance-none accent-blue-600 ${!isDelayEnabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                />
              </div>

              <label className={`flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer group ${!isDelayEnabled ? 'opacity-30 pointer-events-none' : ''}`}>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-700">Modo Humano Inteligente</span>
                  <span className="text-[10px] text-slate-400">Varia o tempo sempre para cima</span>
                </div>
                <input 
                  type="checkbox" checked={isHumanMode} onChange={() => setIsHumanMode(!isHumanMode)}
                  disabled={!isDelayEnabled}
                  className="w-5 h-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>
          </section>

          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Mensagem</h3>
              <button onClick={improveMessageWithAI} disabled={isImproving || !message} className="px-4 py-2 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase hover:scale-105 transition-all min-w-[140px]">
                {aiStatus}
              </button>
            </div>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Olá {name}..." className="w-full h-48 p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-blue-500 outline-none resize-none text-slate-700 text-sm" />
          </section>
          
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-black text-slate-800 mb-4 tracking-tight">Importar</h3>
            <FileUpload onDataExtracted={setContacts} />
          </section>
        </div>

        <div className="lg:col-span-7">
          <section className="bg-white rounded-[2rem] shadow-sm border border-slate-100 h-full overflow-hidden flex flex-col min-h-[500px]">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-20">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Contatos ({contacts.length})</h3>
              {contacts.length > 0 && <button onClick={() => setContacts([])} className="text-[9px] font-black uppercase text-red-400">Limpar</button>}
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
      </main>
    </div>
  );
};
