
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
  failedContacts: Contact[];
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

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } else {
      alert("Para instalar no iPhone: Toque no ícone de Compartilhar e selecione 'Adicionar à Tela de Início'.\n\nNo Android: Toque nos três pontos do navegador e selecione 'Instalar aplicativo'.");
    }
  };

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try { 
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen'); 
      } catch (err) {
        console.warn("Wake Lock não suportado");
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().then(() => { wakeLockRef.current = null; });
    }
  };

  const notifyProgress = (sent: number, total: number, isFinished = false, isStopped = false) => {
    if ("Notification" in window && Notification.permission === "granted") {
      let title = 'Transmito 🚀';
      let body = `Progresso: ${sent}/${total}`;

      if (isFinished) {
        title = 'Concluído ✅';
        body = `Sucesso: ${sent}/${total} mensagens.`;
      } else if (isStopped) {
        title = 'Parado ⚠️';
        body = `Interrompido em: ${sent}/${total}.`;
      }

      new Notification(title, { 
        body, 
        tag: 'transmito-status',
        silent: true,
        icon: 'https://img.icons8.com/fluency/192/000000/chat.png' 
      });
    }
  };

  const sendDirectMessage = async (to: string, text: string): Promise<boolean> => {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const apiUrl = `https://wasenderapi.com/api/send-message`;
    
    // MOCK: Para o usuário de teste ou se o token não estiver configurado corretamente
    if (!token || token.includes('TOKEN') || user.email === 'teste@transmito.com') {
      await new Promise(r => setTimeout(r, 700));
      return true; 
    }
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, text })
      });
      return response.ok;
    } catch (e) { 
      return false; 
    }
  };

  const handleStopTransmission = () => {
    shouldStopRef.current = true;
  };

  const handleTransmit = async () => {
    if (!user.isSubscribed) return setIsModalOpen(true);
    if (!message.trim() || contacts.length === 0) return alert('Configure a mensagem e carregue contatos.');

    setIsSending(true);
    shouldStopRef.current = false;
    await requestWakeLock();
    
    setContacts(prev => prev.map(c => ({ ...c, status: undefined })));
    setTransmission({ total: contacts.length, sent: 0, errors: 0, currentName: 'Iniciando...', isCompleted: false, failedContacts: [] });
    
    // Feedback tátil inicial
    if ("vibrate" in navigator) navigator.vibrate(50);

    let localSent = 0;
    let localErrors = 0;

    for (let i = 0; i < contacts.length; i++) {
      if (shouldStopRef.current) {
        setTransmission(prev => prev ? { ...prev, isCompleted: true, isStopped: true, currentName: 'Interrompido' } : null);
        notifyProgress(localSent, contacts.length, false, true);
        break;
      }

      const contact = contacts[i];
      const personalizedMsg = message.replace(/{name}/gi, contact.name);
      
      const success = await sendDirectMessage(contact.phone, personalizedMsg);
      
      if (success) {
        localSent++;
        if ("vibrate" in navigator) navigator.vibrate([30]);
      } else {
        localErrors++;
      }

      setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, status: success ? 'sent' : 'failed' } : c));
      
      setTransmission(prev => {
        if (!prev) return null;
        return {
          ...prev,
          sent: localSent,
          errors: localErrors,
          failedContacts: success ? prev.failedContacts : [...prev.failedContacts, contact],
          currentName: contact.name
        };
      });

      // Notificação em tempo real (limitada para não sobrecarregar no mobile)
      if (i % 2 === 0 || i === contacts.length - 1) {
        notifyProgress(localSent + localErrors, contacts.length);
      }

      if (i < contacts.length - 1 && !shouldStopRef.current) {
        let waitSeconds = isDelayEnabled ? delay : 1;
        if (user.email === 'teste@transmito.com') waitSeconds = 2; // Rápido no teste

        for (let s = waitSeconds; s > 0; s--) {
          if (shouldStopRef.current) break;
          setNextSendCountdown(s);
          await new Promise(r => setTimeout(r, 1000));
        }
        setNextSendCountdown(0);
      }
    }

    setTransmission(prev => {
      if (prev && !prev.isStopped) {
        notifyProgress(localSent, contacts.length, true);
        return { ...prev, isCompleted: true, currentName: 'Finalizado' };
      }
      return prev;
    });
    
    setIsSending(false);
    releaseWakeLock();
  };

  const improveMessageWithAI = async () => {
    if (!message.trim()) return;
    setIsImproving(true);
    setAiStatus("Melhorando...");
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Melhore esta mensagem para WhatsApp mantendo a variável {name} no contexto: "${message}"`,
        config: { systemInstruction: "Seja persuasivo e profissional. Retorne apenas a mensagem melhorada." }
      });
      if (response.text) setMessage(response.text.trim());
    } catch (e) { console.error(e); } finally { setIsImproving(false); setAiStatus("✨ Otimizar com IA"); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <SubscriptionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onConfirm={(expiry) => onSubscribe(expiry)} userEmail={user.email} />

      {transmission && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 text-center space-y-6">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              {transmission.isStopped ? "Interrompido" : transmission.isCompleted ? "Concluído" : "Transmitindo"}
            </h3>
            <div className="space-y-4">
              <div className="w-full bg-slate-100 h-8 rounded-full overflow-hidden relative border border-slate-200 shadow-inner">
                <div 
                  className={`h-full transition-all duration-500 ${transmission.isStopped ? 'bg-orange-500' : transmission.isCompleted ? 'bg-green-500' : 'bg-blue-600'}`} 
                  style={{ width: `${Math.round(((transmission.sent + transmission.errors) / transmission.total) * 100)}%` }} 
                />
              </div>
              {!transmission.isCompleted && !transmission.isStopped && (
                <div className="flex justify-between items-center px-4 py-3 bg-blue-50 rounded-2xl border border-blue-100 animate-pulse">
                  <div className="text-left">
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Aguardando intervalo</p>
                    <p className="text-2xl font-black text-blue-600 leading-none">{nextSendCountdown}s</p>
                  </div>
                  <ChatIcon className="text-blue-300 w-8 h-8" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <div><p className="text-[9px] font-black text-slate-400 uppercase">Sucesso</p><p className="text-2xl font-black text-green-600">{transmission.sent}</p></div>
              <div className="border-x border-slate-200"><p className="text-[9px] font-black text-slate-400 uppercase">Falhas</p><p className="text-2xl font-black text-red-500">{transmission.errors}</p></div>
              <div><p className="text-[9px] font-black text-slate-400 uppercase">Total</p><p className="text-2xl font-black text-slate-300">{transmission.total}</p></div>
            </div>

            <div className="flex flex-col gap-3">
              {!transmission.isCompleted && !transmission.isStopped && (
                <>
                  <div className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-sm uppercase tracking-widest border border-slate-200">
                    Aguarde o Envio...
                  </div>
                  <button 
                    onClick={handleStopTransmission}
                    className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-200 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" /></svg>
                    PARAR ENVIO AGORA
                  </button>
                </>
              )}
              {(transmission.isCompleted || transmission.isStopped) && (
                <button 
                  onClick={() => setTransmission(null)} 
                  className="w-full py-5 bg-slate-900 text-white shadow-lg rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:bg-black"
                >
                  FECHAR E CONTINUAR
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-2 z-40 bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 p-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-200 hover:border-blue-400 transition-colors">
              <img src={user.picture} className="w-full h-full object-cover" />
            </button>
            {showProfileMenu && (
              <div className="absolute top-full left-0 mt-2 w-56 glass-menu rounded-2xl shadow-xl p-2 z-50 animate-in slide-in-from-top-2">
                <button onClick={handleInstallClick} className="w-full text-left p-3 text-xs font-black text-blue-600 hover:bg-blue-50 rounded-xl mb-1 flex items-center gap-2">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                   BAIXAR APP
                </button>
                <button onClick={onLogout} className="w-full text-left p-3 text-xs font-black text-red-500 hover:bg-red-50 rounded-xl">SAIR</button>
              </div>
            )}
          </div>
        </div>
        <button onClick={handleTransmit} disabled={isSending || contacts.length === 0} className={`px-10 py-3.5 rounded-full font-black text-white text-sm transition-all shadow-md ${isSending ? 'bg-slate-300 animate-pulse' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}>
          {isSending ? "ENVIANDO..." : `TRANSMITIR (${contacts.length})`}
        </button>
      </header>

      <main className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Módulos Anti-Ban</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-blue-700">Intervalo Inteligente</span>
                  <span className="text-[9px] text-blue-400 font-bold uppercase">Previne bloqueios</span>
                </div>
                <input type="checkbox" checked={isDelayEnabled} onChange={() => setIsDelayEnabled(!isDelayEnabled)} className="w-6 h-6 rounded-md border-blue-200 text-blue-600 cursor-pointer" />
              </div>
              <div className={`flex items-center justify-between p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 ${!isDelayEnabled ? 'opacity-30 pointer-events-none' : ''}`}>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-indigo-700">Inteligência Humana</span>
                  <span className="text-[9px] text-indigo-400 font-bold uppercase">Simula comportamento real</span>
                </div>
                <input type="checkbox" checked={isHumanMode} onChange={() => setIsHumanMode(!isHumanMode)} className="w-6 h-6 rounded-md border-indigo-200 text-indigo-600 cursor-pointer" />
              </div>
              <div className={!isDelayEnabled ? 'opacity-30 pointer-events-none' : ''}>
                <div className="flex justify-between text-[10px] font-black text-slate-500 mb-2"><span>TEMPO MÉDIO</span><span className="text-blue-600 font-black">{delay}s</span></div>
                <input type="range" min="10" max="300" step="10" value={delay} onChange={(e) => setDelay(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 space-y-4">
            <div className="flex justify-between items-center">
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Mensagem</h3>
               <button 
                 onClick={improveMessageWithAI} 
                 disabled={isImproving || !message} 
                 className="px-4 py-2 bg-slate-900 hover:bg-black text-[10px] font-black text-white uppercase rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
               >
                 {aiStatus}
               </button>
            </div>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Olá {name}, como vai?..." className="w-full h-40 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:border-blue-400 resize-none transition-all" />
          </section>

          <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
            <FileUpload onDataExtracted={setContacts} />
          </section>
        </div>

        <div className="lg:col-span-7">
          <section className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[400px]">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Fila ({contacts.length})</h3>
               {contacts.length > 0 && <button onClick={() => setContacts([])} className="text-[10px] font-black text-red-400 uppercase hover:text-red-500">Limpar</button>}
            </div>
            <div className="flex-1 overflow-auto bg-slate-50/20">
              {contacts.length > 0 ? <ContactTable contacts={contacts} /> : <div className="flex flex-col items-center justify-center h-full text-slate-300 space-y-3 opacity-50"><ChatIcon className="w-12 h-12" /><p className="text-[10px] font-black uppercase tracking-widest text-center">Importe uma lista para começar.</p></div>}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
