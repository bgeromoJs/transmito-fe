
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
  onDisconnect: () => void;
  onSubscribe: (expiryDate?: string) => void;
  onCancelSubscription: () => void;
  onIncrementUsage: (count: number) => Promise<void>;
  initialShowSubscription?: boolean;
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
  onDisconnect,
  onSubscribe,
  onCancelSubscription,
  onIncrementUsage,
  initialShowSubscription
}) => {
  const [isSending, setIsSending] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<string>("✨ Otimizar com IA");
  const [isModalOpen, setIsModalOpen] = useState(initialShowSubscription || false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [transmission, setTransmission] = useState<TransmissionStatus | null>(null);
  const [nextSendCountdown, setNextSendCountdown] = useState<number>(0);
  const [delay, setDelay] = useState(60);
  const [isDelayEnabled, setIsDelayEnabled] = useState(true);

  const menuRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<any>(null);
  const shouldStopRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const selectedQueue = contacts.filter(c => c.selected !== false);

  useEffect(() => {
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

  const handleToggleContact = (id: string) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, selected: !(c.selected !== false) } : c));
  };

  const handleToggleAll = (selected: boolean) => {
    setContacts(prev => prev.map(c => ({ ...c, selected })));
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
    const apiUrl = process.env.EVOLUTION_API_URL;
    const instanceName = user.email.replace(/[^a-zA-Z0-9]/g, '_');
    const apikey = user.apikey;

    // Em modo demonstração sem configuração real, simulamos o sucesso.
    if (user.email === 'teste@transmito.com' || !apiUrl || !apikey) {
      await new Promise(r => setTimeout(r, 800));
      return true; 
    }

    try {
      abortControllerRef.current = new AbortController();
      const response = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers: { 
          'accept': 'application/json',
          'apikey': apikey,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          number: to, 
          text: text
        }),
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
    setTransmission(prev => prev ? { ...prev, isStopped: true } : null);
    setNextSendCountdown(0);
  };

  const handleImproveText = async () => {
    if (!user.isSubscribed && user.email !== 'teste@transmito.com') {
      return setIsModalOpen(true);
    }
    if (!message.trim()) return;
    setIsImproving(true);
    setAiStatus("✨ Processando...");
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Melhore o seguinte texto de mensagem para WhatsApp, tornando-o mais profissional e persuasivo, mantendo a clareza. Retorne APENAS o texto melhorado:\n\n${message}`,
      });
      if (response.text) {
        setMessage(response.text.trim());
        setAiStatus("✨ Texto Otimizado!");
        setTimeout(() => setAiStatus("✨ Otimizar com IA"), 3000);
      }
    } catch (e) {
      setAiStatus("❌ Erro na IA");
      setTimeout(() => setAiStatus("✨ Otimizar com IA"), 3000);
    } finally {
      setIsImproving(false);
    }
  };

  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user.isSubscribed && user.email !== 'teste@transmito.com') {
      e.target.value = '';
      return setIsModalOpen(true);
    }
    const file = e.target.files?.[0];
    if (!file) return;
    setIsOcrLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '' });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: {
            parts: [
              { inlineData: { data: base64, mimeType: file.type } },
              { text: "Extraia os contatos desta imagem (planilha ou lista). Retorne um JSON no formato: [{\"name\": \"Nome\", \"phone\": \"5511999999999\"}]. Retorne APENAS o JSON válido." }
            ]
          }
        });
        
        if (response.text) {
          try {
            const jsonStr = response.text.replace(/```json|```/g, '').trim();
            const extracted: any[] = JSON.parse(jsonStr);
            const newContacts: Contact[] = extracted.map((c, i) => ({
              id: `ocr-${Date.now()}-${i}`,
              name: c.name || 'Contato Extraído',
              phone: c.phone.replace(/\D/g, ''),
              sentCount: 0,
              failCount: 0,
              selected: true
            }));
            setContacts(prev => [...prev, ...newContacts]);
          } catch (err) {
            alert("Não foi possível processar os contatos da imagem. Tente uma foto mais clara.");
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      alert("Erro ao processar imagem.");
    } finally {
      setIsOcrLoading(false);
      e.target.value = '';
    }
  };

  const handleTransmit = async () => {
    // Verificação de bypass para teste
    const isDemo = user.email === 'teste@transmito.com';
    
    // Check daily limit for free users
    if (!user.isSubscribed && !isDemo) {
      const remaining = (user.dailyLimit || 10) - (user.messagesSentToday || 0);
      if (remaining <= 0) {
        alert("Você atingiu o limite diário do plano gratuito (10 mensagens). Faça o upgrade para enviar ilimitado!");
        return setIsModalOpen(true);
      }
      if (selectedQueue.length > remaining) {
        if (!window.confirm(`Você tem apenas ${remaining} envios restantes hoje no plano gratuito. Deseja enviar apenas para os primeiros ${remaining} contatos?`)) {
          return setIsModalOpen(true);
        }
      }
    }
    
    if (!message.trim() || selectedQueue.length === 0) return alert('Escreva a mensagem e selecione pelo menos um contato.');

    setIsSending(true);
    shouldStopRef.current = false;
    await requestWakeLock();
    
    const actualQueue = (!user.isSubscribed && !isDemo) 
      ? selectedQueue.slice(0, (user.dailyLimit || 10) - (user.messagesSentToday || 0))
      : selectedQueue;

    setTransmission({ 
      total: actualQueue.length, 
      sent: 0, 
      errors: 0, 
      currentName: 'Iniciando...', 
      isCompleted: false 
    });
    
    let localSent = 0;
    let localErrors = 0;
    let updatedContacts = [...contacts];

    try {
      for (let i = 0; i < actualQueue.length; i++) {
        if (shouldStopRef.current) break;

        const contact = actualQueue[i];
        let success = false;
        
        try {
          success = await sendDirectMessage(contact.phone, message.replace(/{name}/gi, contact.name));
        } catch (err) {
          success = false;
        }
        
        if (shouldStopRef.current) break;

        if (success) {
          localSent++;
          await onIncrementUsage(1);
        } else {
          localErrors++;
        }
        
        // Atualiza o status e os contadores na lista principal
        updatedContacts = updatedContacts.map(c => {
          if (c.id === contact.id) {
            return {
              ...c,
              status: success ? 'sent' : 'failed',
              sentCount: success ? (c.sentCount || 0) + 1 : (c.sentCount || 0),
              failCount: !success ? (c.failCount || 0) + 1 : (c.failCount || 0)
            };
          }
          return c;
        });

        setContacts([...updatedContacts]); // Atualiza UI da tabela em tempo real

        setTransmission(prev => prev ? ({
          ...prev,
          sent: localSent,
          errors: localErrors,
          currentName: contact.name
        }) : null);

        // Aguarda delay apenas se habilitado e não for o último
        if (i < actualQueue.length - 1 && !shouldStopRef.current && isDelayEnabled) {
          const waitTime = isDemo ? 5 : delay;
          setNextSendCountdown(waitTime);
          for (let s = waitTime; s > 0; s--) {
            if (shouldStopRef.current) break;
            setNextSendCountdown(s);
            await new Promise(r => setTimeout(r, 1000));
          }
          setNextSendCountdown(0);
        } else if (i < actualQueue.length - 1 && !shouldStopRef.current && !isDelayEnabled) {
          await new Promise(r => setTimeout(r, 100));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      const wasStopped = shouldStopRef.current;
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

  const handleDisconnect = async () => {
    if (!window.confirm("Tem certeza que deseja desconectar seu WhatsApp?")) return;
    
    const apiUrl = process.env.EVOLUTION_API_URL;
    const instanceName = user.email.replace(/[^a-zA-Z0-9]/g, '_');
    const globalApiKey = process.env.EVOLUTION_GLOBAL_API_KEY;

    try {
      // Logout and Delete instance
      await fetch(`${apiUrl}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: { 'apikey': user.apikey || '' }
      });
      
      await fetch(`${apiUrl}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: { 'apikey': globalApiKey || '' }
      });
    } catch (e) {
      console.error("Erro ao desconectar:", e);
    } finally {
      onDisconnect();
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <SubscriptionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onConfirm={(expiry) => onSubscribe(expiry)} userEmail={user.email} />

      {transmission && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 text-center space-y-6 animate-in zoom-in duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-100">
               <div className={`h-full transition-all duration-500 ${transmission.isStopped ? 'bg-orange-500' : transmission.isCompleted ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${Math.round(((transmission.sent + transmission.errors) / transmission.total) * 100)}%` }} />
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight pt-2">
              {transmission.isStopped ? "Interrompido" : transmission.isCompleted ? "Concluído" : "Transmitindo"}
            </h3>
            <div className="space-y-4">
              {!transmission.isCompleted && !transmission.isStopped && (
                <div className="py-6 bg-blue-50 rounded-[2rem] border-2 border-blue-100 shadow-inner relative group">
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
                    <p className="text-xs font-black text-green-600 uppercase tracking-widest text-green-700">Processo Finalizado</p>
                 </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
              <div><p className="text-[9px] font-black text-slate-400 uppercase">Sucesso</p><p className="text-2xl font-black text-green-600 tabular-nums">{transmission.sent}</p></div>
              <div className="border-x border-slate-200 px-2"><p className="text-[9px] font-black text-slate-400 uppercase">Falhas</p><p className="text-2xl font-black text-red-500 tabular-nums">{transmission.errors}</p></div>
              <div><p className="text-[9px] font-black text-slate-400 uppercase">Total</p><p className="text-2xl font-black text-slate-300 tabular-nums">{transmission.total}</p></div>
            </div>
            <div className="space-y-3">
              {!transmission.isCompleted && !transmission.isStopped ? (
                <button onClick={handleStopTransmission} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all">PARAR ENVIO</button>
              ) : (
                <button onClick={() => setTransmission(null)} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all">FECHAR RELATÓRIO</button>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-2 z-40 bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-3 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          {!user.isSubscribed && (
            <div className="hidden md:flex flex-col items-start">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Envios Hoje</p>
              <p className="text-xs font-bold text-slate-700">
                {user.messagesSentToday || 0} / {user.dailyLimit || 10}
              </p>
            </div>
          )}
          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-100 active:scale-90 transition-all shadow-sm">
              <img src={user.picture} className="w-full h-full object-cover" />
            </button>
            {showProfileMenu && (
              <div className="absolute top-full left-0 mt-3 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-2 border border-slate-100 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-3 border-b border-slate-50 mb-1">
                   <p className="text-xs font-black text-slate-800 truncate">{user.name}</p>
                   <p className="text-[9px] font-bold text-slate-400 truncate">{user.email}</p>
                </div>
                <button onClick={onLogout} className="w-full text-left p-3 text-[11px] font-black text-red-500 hover:bg-red-50 rounded-xl flex items-center gap-2 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>ENCERRAR SESSÃO</button>
                <button onClick={handleDisconnect} className="w-full text-left p-3 text-[11px] font-black text-orange-500 hover:bg-orange-50 rounded-xl flex items-center gap-2 transition-colors">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                   </svg>
                   DESCONECTAR WHATSAPP
                 </button>
              </div>
            )}
          </div>
          {!user.isSubscribed && (
            <div className="hidden sm:flex flex-col">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Plano Free</p>
              <p className="text-[11px] font-bold text-slate-600">{(user.dailyLimit || 10) - (user.messagesSentToday || 0)} envios restantes</p>
            </div>
          )}
        </div>
        <button 
          onClick={handleTransmit} 
          disabled={isSending || selectedQueue.length === 0} 
          className={`px-8 py-3.5 rounded-full font-black text-white text-[10px] tracking-widest transition-all ${isSending ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-xl shadow-blue-200'}`}
        >
          {isSending ? "ENVIANDO..." : `TRANSMITIR (${selectedQueue.length}/${contacts.length})`}
        </button>
      </header>

      <main className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white rounded-[2.5rem] p-7 shadow-sm border border-slate-100 hover:shadow-lg transition-all">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Segurança</h3>
            <div className="space-y-6">
              <label 
                className="flex items-center justify-between p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50 shadow-inner cursor-pointer select-none transition-colors"
                htmlFor="delay-switch"
              >
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-blue-700 uppercase">Intervalo</span>
                  <span className="text-[9px] text-blue-400 font-bold uppercase">{isDelayEnabled ? 'Ativo' : 'Desativado'}</span>
                </div>
                <div className="relative inline-flex items-center">
                  <input 
                    id="delay-switch"
                    type="checkbox" 
                    checked={isDelayEnabled} 
                    onChange={(e) => setIsDelayEnabled(e.target.checked)} 
                    className="sr-only peer" 
                  />
                  <div className="w-12 h-7 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full transition-colors shadow-sm"></div>
                </div>
              </label>
              <div className={!isDelayEnabled ? 'opacity-30 pointer-events-none' : ''}>
                <div className="flex justify-between text-[10px] font-black text-slate-500 mb-4 uppercase">
                  <span>Média de Espera</span>
                  <span className="text-blue-600 bg-blue-100/50 px-3 py-1 rounded-lg font-mono tabular-nums">{formatTime(delay)}</span>
                </div>
                <input type="range" min="60" max="600" step="10" value={delay} onChange={(e) => setDelay(parseInt(e.target.value))} className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-[2.5rem] p-7 shadow-sm border border-slate-100 space-y-4">
            <div className="flex justify-between items-center">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Mensagem</h3>
               <button 
                 onClick={handleImproveText} 
                 disabled={isImproving} 
                 className={`text-[9px] font-black text-white uppercase px-5 py-2.5 rounded-xl active:scale-95 shadow-xl transition-all disabled:opacity-50 flex items-center gap-2 ${!user.isSubscribed && user.email !== 'teste@transmito.com' ? 'bg-amber-500' : 'bg-slate-900'}`}
               >
                 {!user.isSubscribed && user.email !== 'teste@transmito.com' && (
                   <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                 )}
                 {aiStatus}
               </button>
            </div>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Olá {name}, como você está?..." className="w-full h-44 p-6 bg-slate-50 border border-slate-100 rounded-[1.8rem] text-sm outline-none focus:border-blue-400 focus:bg-white transition-all resize-none shadow-inner" />
          </section>

          <section className="bg-white rounded-[2.5rem] p-7 shadow-sm border border-slate-100 flex flex-col gap-6">
             <div className="flex justify-between items-center">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Importar Contatos</h3>
               {!user.isSubscribed && user.email !== 'teste@transmito.com' && (
                 <span className="px-3 py-1 bg-amber-100 text-amber-600 text-[9px] font-black rounded-full uppercase tracking-widest">Plano Free</span>
               )}
             </div>
             
             <FileUpload 
               onDataExtracted={setContacts} 
               isSubscribed={user.isSubscribed || false}
               onShowSubscription={() => setIsModalOpen(true)}
               isDemo={user.email === 'teste@transmito.com'}
             />

             <div className="pt-4 border-t border-slate-50">
               <div className="flex items-center gap-3">
                 <label className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border cursor-pointer transition-all ${isOcrLoading ? 'opacity-50' : ''} ${!user.isSubscribed && user.email !== 'teste@transmito.com' ? 'bg-amber-50 border-amber-100 text-amber-600 hover:bg-amber-100' : 'bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100'}`}>
                   {!user.isSubscribed && user.email !== 'teste@transmito.com' ? (
                     <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                   ) : (
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                   )}
                   <span className="text-[10px] font-black uppercase tracking-widest">
                     {!user.isSubscribed && user.email !== 'teste@transmito.com' ? 'Extrair de Foto (PRO)' : (isOcrLoading ? 'Processando...' : 'Extrair de Foto')}
                   </span>
                   <input type="file" accept="image/*" className="hidden" onChange={handleOcrUpload} disabled={isOcrLoading} />
                 </label>
               </div>
             </div>
          </section>
        </div>

        <div className="lg:col-span-7">
          <section className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[500px]">
            <div className="p-7 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fila Ativa ({selectedQueue.length}/{contacts.length})</h3>
               {contacts.length > 0 && <button onClick={() => setContacts([])} className="text-[9px] font-black text-red-400 uppercase hover:text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">Limpar</button>}
            </div>
            <div className="flex-1 overflow-auto bg-slate-50/10">
              {contacts.length > 0 ? (
                <ContactTable contacts={contacts} onToggleContact={handleToggleContact} onToggleAll={handleToggleAll} />
              ) : (
                <div className="flex flex-col items-center justify-center h-80 text-slate-300 opacity-50 space-y-4">
                   <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center"><ChatIcon className="w-10 h-10" /></div>
                   <p className="text-[11px] font-black uppercase tracking-widest text-center">Importe contatos para começar sua transmissão</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
