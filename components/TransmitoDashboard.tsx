
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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

  const sendDirectMessage = async (to: string, text: string): Promise<boolean> => {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!token || token.includes('TOKEN') || user.email === 'teste@transmito.com') {
      await new Promise(r => setTimeout(r, 800));
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
    } catch (e) { 
      return false; 
    }
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
    
    const updatedContacts = [...contacts];
    setTransmission({ total: contacts.length, sent: 0, errors: 0, currentName: 'Iniciando...', isCompleted: false });
    
    let localSent = 0;
    let localErrors = 0;

    try {
      for (let i = 0; i < contacts.length; i++) {
        if (shouldStopRef.current) break;

        const contact = updatedContacts[i];
        
        // Try-catch interno para garantir que falha em um contato não quebre o loop
        let success = false;
        try {
          success = await sendDirectMessage(contact.phone, message.replace(/{name}/gi, contact.name));
        } catch (err) {
          success = false;
        }
        
        if (shouldStopRef.current) break;

        if (success) localSent++; else localErrors++;
        updatedContacts[i] = { ...contact, status: success ? 'sent' : 'failed' };

        // Atualiza status da transmissão para UI
        setTransmission(prev => prev ? ({
          ...prev,
          sent: localSent,
          errors: localErrors,
          currentName: contact.name
        }) : null);

        // Se houver próximo e não for o último, aguarda o delay
        if (i < contacts.length - 1 && !shouldStopRef.current) {
          let wait = isDelayEnabled ? delay : 1;
          if (user.email === 'teste@transmito.com') wait = 5;
          
          setNextSendCountdown(wait);
          for (let s = wait; s > 0; s--) {
            if (shouldStopRef.current) break;
            setNextSendCountdown(s);
            await new Promise(r => setTimeout(r, 1000));
          }
          setNextSendCountdown(0);
        }
      }
    } catch (e) {
      console.error("Erro crítico na transmissão:", e);
    } finally {
      const wasStopped = shouldStopRef.current;
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
      if ("vibrate" in navigator) navigator.vibrate([100, 50, 100]);
    }
  };

  const improveMessageWithAI = async () => {
    if (!message.trim() || isImproving) return;
    setIsImproving(true);
    setAiStatus("Otimizando...");
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Melhore esta mensagem para WhatsApp (mantenha {name}): "${message}"`,
        config: { systemInstruction: "Retorne apenas o texto melhorado, curto, direto e profissional." }
      });
      if (response.text) setMessage(response.text.trim());
    } catch (e) {} finally { setIsImproving(false); setAiStatus("✨ Otimizar com IA"); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <SubscriptionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onConfirm={(expiry) => onSubscribe(expiry)} userEmail={user.email} />

      {transmission && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 text-center space-y-6 animate-in zoom-in duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-100">
               <div 
                  className={`h-full transition-all duration-500 ${transmission.isStopped ? 'bg-orange-500' : transmission.isCompleted ? 'bg-green-500' : 'bg-blue-600'}`} 
                  style={{ width: `${Math.round(((transmission.sent + transmission.errors) / transmission.total) * 100)}%` }} 
               />
            </div>

            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight pt-2">
              {transmission.isStopped ? "Interrompido" : transmission.isCompleted ? "Concluído" : "Transmitindo"}
            </h3>
            
            <div className="space-y-4">
              {!transmission.isCompleted && !transmission.isStopped && (
                <div className="py-6 bg-blue-50 rounded-[2rem] border-2 border-blue-100 shadow-inner relative group transition-all">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Próximo Envio em</p>
                  <p className="text-5xl font-black text-blue-600 tracking-tighter tabular-nums">
                    {nextSendCountdown > 0 ? formatTime(nextSendCountdown) : '00:00'}
                  </p>
                  <div className="absolute inset-0 bg-blue-400/5 animate-pulse rounded-[2rem] pointer-events-none" />
                </div>
              )}

              {transmission.isCompleted && (
                 <div className="py-6 bg-green-50 rounded-[2rem] border-2 border-green-100 animate-in zoom-in">
                    <svg className="w-12 h-12 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    <p className="text-xs font-black text-green-600 uppercase tracking-widest">Processo Finalizado</p>
                 </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
              <div><p className="text-[9px] font-black text-slate-400 uppercase">Sucesso</p><p className="text-2xl font-black text-green-600">{transmission.sent}</p></div>
              <div className="border-x border-slate-200 px-2"><p className="text-[9px] font-black text-slate-400 uppercase">Falhas</p><p className="text-2xl font-black text-red-500">{transmission.errors}</p></div>
              <div><p className="text-[9px] font-black text-slate-400 uppercase">Total</p><p className="text-2xl font-black text-slate-300">{transmission.total}</p></div>
            </div>

            <div className="space-y-3">
              {!transmission.isCompleted && !transmission.isStopped ? (
                <button onClick={handleStopTransmission} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-red-200 active:scale-95 transition-all">
                  PARAR ENVIO AGORA
                </button>
              ) : (
                <button onClick={() => setTransmission(null)} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                  FECHAR RELATÓRIO
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-2 z-40 bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-3 flex items-center justify-between shadow-xl">
        <div className="relative" ref={menuRef}>
          <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-100 hover:border-blue-400 transition-all active:scale-90">
            <img src={user.picture} className="w-full h-full object-cover" />
          </button>
          {showProfileMenu && (
            <div className="absolute top-full left-0 mt-3 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-2 border border-slate-100 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-3 border-b border-slate-50 mb-1">
                 <p className="text-xs font-black text-slate-800 truncate">{user.name}</p>
                 <p className="text-[9px] font-bold text-slate-400 truncate">{user.email}</p>
              </div>
              <button onClick={onLogout} className="w-full text-left p-3 text-[11px] font-black text-red-500 hover:bg-red-50 rounded-xl flex items-center gap-2 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                ENCERRAR SESSÃO
              </button>
            </div>
          )}
        </div>
        <button 
          onClick={handleTransmit} 
          disabled={isSending || contacts.length === 0} 
          className={`px-10 py-3.5 rounded-full font-black text-white text-xs tracking-widest transition-all ${isSending ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-xl shadow-blue-200'}`}
        >
          {isSending ? "ENVIANDO..." : `TRANSMITIR (${contacts.length})`}
        </button>
      </header>

      <main className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white rounded-[2.5rem] p-7 shadow-sm border border-slate-100 hover:shadow-lg transition-all">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Configurações de Segurança</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50 shadow-inner">
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-blue-700 uppercase">Intervalo Inteligente</span>
                  <span className="text-[9px] text-blue-400 font-bold">ANTI-BLOQUEIO</span>
                </div>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={isDelayEnabled} onChange={() => setIsDelayEnabled(!isDelayEnabled)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
              </div>
              <div className={!isDelayEnabled ? 'opacity-30 pointer-events-none' : ''}>
                <div className="flex justify-between text-[10px] font-black text-slate-500 mb-4 uppercase tracking-widest">
                  <span>Tempo Médio</span>
                  <span className="text-blue-600 bg-blue-100/50 px-3 py-1 rounded-lg font-mono">{formatTime(delay)}</span>
                </div>
                <input type="range" min="10" max="300" step="10" value={delay} onChange={(e) => setDelay(parseInt(e.target.value))} className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-[2.5rem] p-7 shadow-sm border border-slate-100 space-y-4 hover:shadow-lg transition-all">
            <div className="flex justify-between items-center">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Mensagem</h3>
               <button 
                onClick={improveMessageWithAI} 
                disabled={!message.trim() || isImproving} 
                className="text-[9px] font-black text-white uppercase bg-slate-900 px-5 py-2.5 rounded-xl active:scale-95 shadow-xl shadow-slate-100 transition-all disabled:opacity-50"
               >
                 {aiStatus}
               </button>
            </div>
            <textarea 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              placeholder="Olá {name}, como você está?..." 
              className="w-full h-44 p-6 bg-slate-50 border border-slate-100 rounded-[1.8rem] text-sm outline-none focus:border-blue-400 focus:bg-white transition-all resize-none shadow-inner font-medium text-slate-700" 
            />
            <p className="text-[9px] font-bold text-slate-300 uppercase text-center">Use {"{name}"} para personalizar cada envio</p>
          </section>

          <section className="bg-white rounded-[2.5rem] p-7 shadow-sm border border-slate-100 hover:shadow-lg transition-all">
            <FileUpload onDataExtracted={setContacts} />
          </section>
        </div>

        <div className="lg:col-span-7">
          <section className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[500px] hover:shadow-lg transition-all">
            <div className="p-7 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fila de Envio Ativa ({contacts.length})</h3>
               {contacts.length > 0 && (
                <button onClick={() => setContacts([])} className="text-[9px] font-black text-red-400 uppercase hover:text-red-600 transition-colors bg-red-50 px-3 py-1.5 rounded-lg">Limpar Tudo</button>
               )}
            </div>
            <div className="flex-1 overflow-auto bg-slate-50/10">
              {contacts.length > 0 ? (
                <ContactTable contacts={contacts} />
              ) : (
                <div className="flex flex-col items-center justify-center h-80 text-slate-300 opacity-50 space-y-4">
                   <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                      <ChatIcon className="w-10 h-10" />
                   </div>
                   <p className="text-[11px] font-black uppercase tracking-widest">Nenhum contato na lista</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
