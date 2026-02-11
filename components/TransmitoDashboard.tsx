
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
  isStopped?: boolean;
}

const ChatIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

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
  const [nextSendCountdown, setNextSendCountdown] = useState<number>(0);
  const [delay, setDelay] = useState(60);
  const [isDelayEnabled, setIsDelayEnabled] = useState(true);
  const [isHumanMode, setIsHumanMode] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<any>(null);
  const shouldStopRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } else {
      alert("Para instalar:\nAndroid: Menu > Instalar\niOS: Compartilhar > Adicionar à Tela de Início");
    }
  };

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try { wakeLockRef.current = await (navigator as any).wakeLock.request('screen'); } catch (e) {}
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().then(() => { wakeLockRef.current = null; }).catch(() => {});
    }
  };

  const notifyProgress = (sent: number, total: number, isFinished = false, isStopped = false) => {
    if ("Notification" in window && Notification.permission === "granted") {
      const title = isFinished ? 'Concluído ✅' : isStopped ? 'Interrompido ⚠️' : 'Transmito 🚀';
      const body = isFinished ? `Sucesso: ${sent}/${total}` : `Enviando: ${sent}/${total}`;
      new Notification(title, { body, tag: 'transmito', silent: true });
    }
  };

  const sendDirectMessage = async (to: string, text: string): Promise<boolean> => {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!token || token.includes('TOKEN') || user.email === 'teste@transmito.com') {
      await new Promise(r => setTimeout(r, 600));
      return true; 
    }
    try {
      abortControllerRef.current = new AbortController();
      const response = await fetch(`https://wasenderapi.com/api/send-message`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, text }),
        signal: abortControllerRef.current.signal
      });
      return response.ok;
    } catch (e) { return false; }
  };

  const handleStopTransmission = () => {
    shouldStopRef.current = true;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setTransmission(prev => prev ? { ...prev, isStopped: true, currentName: 'Parando...' } : null);
    setNextSendCountdown(0);
  };

  const handleTransmit = async () => {
    if (!user.isSubscribed) return setIsModalOpen(true);
    if (!message.trim() || contacts.length === 0) return alert('Importe contatos e escreva a mensagem.');

    setIsSending(true);
    shouldStopRef.current = false;
    await requestWakeLock();
    
    // Reset status localmente para performance
    const updatedContacts = [...contacts];
    setTransmission({ total: contacts.length, sent: 0, errors: 0, currentName: 'Iniciando...', isCompleted: false });
    
    let localSent = 0;
    let localErrors = 0;

    try {
      for (let i = 0; i < contacts.length; i++) {
        if (shouldStopRef.current) break;

        const contact = updatedContacts[i];
        const success = await sendDirectMessage(contact.phone, message.replace(/{name}/gi, contact.name));
        
        if (shouldStopRef.current) break;

        if (success) localSent++; else localErrors++;
        updatedContacts[i] = { ...contact, status: success ? 'sent' : 'failed' };

        // Atualiza apenas o Modal para manter performance fluida
        setTransmission(prev => prev ? ({
          ...prev,
          sent: localSent,
          errors: localErrors,
          currentName: contact.name
        }) : null);

        // Notifica apenas a cada 5 mensagens ou no final
        if (i % 5 === 0 || i === contacts.length - 1) notifyProgress(localSent, contacts.length);

        if (i < contacts.length - 1 && !shouldStopRef.current) {
          let wait = isDelayEnabled ? delay : 1;
          if (user.email === 'teste@transmito.com') wait = 2;
          
          setNextSendCountdown(wait);
          for (let s = wait; s > 0; s--) {
            if (shouldStopRef.current) break;
            setNextSendCountdown(s);
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      }
    } catch (e) {
      console.error("Erro na transmissão:", e);
    } finally {
      const wasStopped = shouldStopRef.current;
      // Atualiza a lista completa APENAS uma vez no final para evitar lag
      setContacts(updatedContacts);
      
      setTransmission(prev => prev ? ({ 
        ...prev, 
        isCompleted: true, 
        isStopped: wasStopped,
        currentName: wasStopped ? 'Interrompido' : 'Finalizado' 
      }) : null);
      
      setIsSending(false);
      setNextSendCountdown(0);
      releaseWakeLock();
      if ("vibrate" in navigator) navigator.vibrate(200);
    }
  };

  const improveMessageWithAI = async () => {
    if (!message.trim() || isImproving) return;
    setIsImproving(true);
    setAiStatus("Melhorando...");
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Melhore esta mensagem para WhatsApp (mantenha {name}): "${message}"`,
        config: { systemInstruction: "Retorne apenas o texto melhorado, curto e direto." }
      });
      if (response.text) setMessage(response.text.trim());
    } catch (e) {} finally { setIsImproving(false); setAiStatus("✨ Otimizar com IA"); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <SubscriptionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onConfirm={(expiry) => onSubscribe(expiry)} userEmail={user.email} />

      {transmission && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 overflow-y-auto">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-6 text-center space-y-5 animate-in zoom-in duration-200">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
              {transmission.isStopped ? "Interrompido" : transmission.isCompleted ? "Concluído" : "Transmitindo..."}
            </h3>
            
            <div className="space-y-4">
              <div className="w-full bg-slate-100 h-6 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                <div 
                  className={`h-full transition-all duration-300 ${transmission.isStopped ? 'bg-orange-500' : transmission.isCompleted ? 'bg-green-500' : 'bg-blue-600'}`} 
                  style={{ width: `${Math.round(((transmission.sent + transmission.errors) / transmission.total) * 100)}%` }} 
                />
              </div>
              
              {!transmission.isCompleted && !transmission.isStopped && (
                <div className="py-3 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Próxima Mensagem</p>
                  <p className="text-3xl font-black text-blue-600">{nextSendCountdown}s</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div><p className="text-[8px] font-black text-slate-400 uppercase">Sucesso</p><p className="text-xl font-black text-green-600">{transmission.sent}</p></div>
              <div><p className="text-[8px] font-black text-slate-400 uppercase">Falhas</p><p className="text-xl font-black text-red-500">{transmission.errors}</p></div>
              <div><p className="text-[8px] font-black text-slate-400 uppercase">Total</p><p className="text-xl font-black text-slate-400">{transmission.total}</p></div>
            </div>

            <div className="space-y-3">
              {!transmission.isCompleted && !transmission.isStopped ? (
                <button onClick={handleStopTransmission} className="w-full py-4 bg-red-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95">
                  PARAR ENVIO
                </button>
              ) : (
                <button onClick={() => setTransmission(null)} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest active:scale-95">
                  FECHAR
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-2 z-40 bg-white/95 border border-slate-200 rounded-2xl p-3 flex items-center justify-between shadow-sm">
        <div className="relative" ref={menuRef}>
          <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-9 h-9 rounded-full overflow-hidden border-2 border-slate-100">
            <img src={user.picture} className="w-full h-full object-cover" />
          </button>
          {showProfileMenu && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl p-2 border border-slate-100 animate-in fade-in slide-in-from-top-1">
              <button onClick={handleInstallClick} className="w-full text-left p-3 text-[10px] font-black text-blue-600 hover:bg-blue-50 rounded-lg mb-1">BAIXAR APP</button>
              <button onClick={onLogout} className="w-full text-left p-3 text-[10px] font-black text-red-500 hover:bg-red-50 rounded-lg">SAIR</button>
            </div>
          )}
        </div>
        <button onClick={handleTransmit} disabled={isSending || contacts.length === 0} className={`px-8 py-3 rounded-full font-black text-white text-xs transition-all ${isSending ? 'bg-slate-300' : 'bg-blue-600 active:scale-95 shadow-md'}`}>
          {isSending ? "ENVIANDO..." : `TRANSMITIR (${contacts.length})`}
        </button>
      </header>

      <main className="grid lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 space-y-5">
          <section className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Módulos de Segurança</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl">
                <span className="text-xs font-black text-blue-700">Intervalo Ativo</span>
                <input type="checkbox" checked={isDelayEnabled} onChange={() => setIsDelayEnabled(!isDelayEnabled)} className="w-5 h-5 accent-blue-600" />
              </div>
              <div className={!isDelayEnabled ? 'opacity-30 pointer-events-none' : ''}>
                <div className="flex justify-between text-[9px] font-black text-slate-500 mb-2 uppercase"><span>Tempo Médio</span><span className="text-blue-600">{delay}s</span></div>
                <input type="range" min="10" max="300" step="10" value={delay} onChange={(e) => setDelay(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 space-y-3">
            <div className="flex justify-between items-center">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mensagem</h3>
               <button onClick={improveMessageWithAI} disabled={!message.trim()} className="text-[9px] font-black text-blue-600 uppercase bg-blue-50 px-3 py-1.5 rounded-lg active:scale-95">{aiStatus}</button>
            </div>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Olá {name}..." className="w-full h-32 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:border-blue-400 resize-none" />
          </section>

          <section className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100">
            <FileUpload onDataExtracted={setContacts} />
          </section>
        </div>

        <div className="lg:col-span-7">
          <section className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[300px]">
            <div className="p-5 border-b border-slate-50 flex justify-between items-center">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fila ({contacts.length})</h3>
               {contacts.length > 0 && <button onClick={() => setContacts([])} className="text-[9px] font-black text-red-400 uppercase">Limpar</button>}
            </div>
            <div className="flex-1 overflow-auto max-h-[500px]">
              <ContactTable contacts={contacts} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
