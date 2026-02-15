
import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';

interface WahaSessionManagerProps {
  user: UserProfile;
  onSessionActive: () => void;
  onUpdateNumber: (num: string) => Promise<void>;
}

type ConnectionState = 'IDLE' | 'CHECKING' | 'REQUESTING_CODE' | 'WAITING_AUTH' | 'ERROR';

export const WahaSessionManager: React.FC<WahaSessionManagerProps> = ({ user, onSessionActive, onUpdateNumber }) => {
  const [state, setState] = useState<ConnectionState>('CHECKING');
  const [phoneNumber, setPhoneNumber] = useState(user.whatsappNumber || '');
  const [pairingCode, setPairingCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.WAHA_API_URL;
  const API_KEY = process.env.WAHA_API_KEY;

  const checkSessionStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/sessions/default`, {
        headers: { 'X-Api-Key': API_KEY || '', 'accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        const isConnected = data.status === 'WORKING' || data.engine?.state === 'CONNECTED';
        
        if (isConnected) {
          const connectedId = data.me?.id || ''; // formato: 55119... @c.us
          const connectedNumber = connectedId.split('@')[0];
          
          // Se já temos um número gravado no perfil do usuário
          if (user.whatsappNumber) {
            if (connectedNumber === user.whatsappNumber) {
              onSessionActive();
            } else {
              setError(`Erro de Segurança: Esta conta está vinculada ao número ${user.whatsappNumber}, mas detectamos o número ${connectedNumber} conectado no WhatsApp. Por favor, conecte o número correto ou entre em contato com o suporte.`);
              setState('IDLE');
            }
          } else {
            // Caso raro onde conectou mas não salvou o número no app ainda (limpamos e pedimos input)
            setState('IDLE');
          }
        } else {
          // Se não estiver conectado, permite que o usuário peça o código se tiver o número setado
          if (state !== 'WAITING_AUTH') {
            setState('IDLE');
          }
        }
      } else {
        setState('IDLE');
      }
    } catch (e) {
      setError("Falha ao conectar com o servidor WAHA.");
      setState('ERROR');
    }
  }, [API_URL, API_KEY, onSessionActive, user.whatsappNumber, state]);

  useEffect(() => {
    if (state === 'CHECKING') {
      checkSessionStatus();
    }
  }, [state, checkSessionStatus]);

  // Polling para detectar a conclusão do pareamento
  useEffect(() => {
    let interval: any;
    if (state === 'WAITING_AUTH') {
      interval = setInterval(checkSessionStatus, 5000);
    }
    return () => clearInterval(interval);
  }, [state, checkSessionStatus]);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError("Digite o número completo com DDD (ex: 5511999999999)");
      return;
    }

    setState('REQUESTING_CODE');
    setError(null);

    try {
      // 1. Gravar no Firebase se for a primeira vez
      if (!user.whatsappNumber) {
        await onUpdateNumber(cleanPhone);
      } else if (user.whatsappNumber !== cleanPhone) {
        setError(`Este perfil já está vinculado ao número ${user.whatsappNumber}. Você deve conectar o mesmo dispositivo.`);
        setState('IDLE');
        return;
      }

      // 2. Solicitar código ao WAHA
      const response = await fetch(`${API_URL}/api/default/auth/request-code`, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'X-Api-Key': API_KEY || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber: cleanPhone,
          method: null
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPairingCode(data.code);
        setState('WAITING_AUTH');
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.message || "Erro ao gerar código. Verifique se o número é válido no WhatsApp.");
        setState('IDLE');
      }
    } catch (e) {
      setError("Erro de rede ao processar solicitação.");
      setState('IDLE');
    }
  };

  if (state === 'CHECKING') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 space-y-6">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Validando Sessão...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <div className="space-y-4">
          <div className="mx-auto w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Vincular Conta</h2>
          <p className="text-sm text-slate-500 font-medium">
            {state === 'WAITING_AUTH' 
              ? "Código gerado com sucesso!" 
              : "Conecte o seu número oficial para realizar as transmissões."}
          </p>
        </div>

        {error && (
          <div className="p-5 bg-red-50 text-red-600 text-[11px] font-bold rounded-2xl border border-red-100 leading-relaxed animate-pulse">
            {error}
          </div>
        )}

        {state === 'IDLE' || state === 'REQUESTING_CODE' ? (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Telefone de Transmissão</label>
              <input 
                type="text" 
                placeholder="5511999999999"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={!!user.whatsappNumber}
                className={`w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none transition-all ${user.whatsappNumber ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'focus:border-blue-500'}`}
              />
              {user.whatsappNumber && <p className="text-[9px] text-slate-400 font-bold px-2">Este número foi registrado permanentemente em sua conta.</p>}
            </div>
            <button 
              type="submit"
              disabled={state === 'REQUESTING_CODE'}
              className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 active:scale-95 transition-all disabled:opacity-50"
            >
              {state === 'REQUESTING_CODE' ? "PROCESSANDO..." : "SOLICITAR CÓDIGO"}
            </button>
          </form>
        ) : state === 'WAITING_AUTH' ? (
          <div className="space-y-8 animate-in zoom-in">
            <div className="flex justify-center gap-2">
              {pairingCode.split('').map((char, i) => (
                <div key={i} className={`w-10 h-14 flex items-center justify-center text-2xl font-black rounded-xl border-2 ${char === '-' ? 'border-transparent text-slate-300' : 'border-blue-100 bg-blue-50 text-blue-700'}`}>
                  {char}
                </div>
              ))}
            </div>
            
            <div className="p-6 bg-slate-50 rounded-3xl text-left space-y-4 border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atenção ao vincular:</p>
              <ul className="text-xs text-slate-600 space-y-2 font-bold leading-relaxed">
                <li>• No seu celular, vá em <span className="text-slate-900">Aparelhos Conectados</span></li>
                <li>• Toque em <span className="text-blue-600">Conectar com número de telefone</span></li>
                <li>• Digite exatamente o código acima</li>
                <li>• Certifique-se que o número é o <span className="text-slate-900">{user.whatsappNumber || phoneNumber}</span></li>
              </ul>
            </div>

            <div className="flex items-center justify-center gap-3 py-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></div>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Aguardando conexão...</p>
            </div>

            {!user.whatsappNumber && (
              <button 
                onClick={() => setState('IDLE')}
                className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 underline"
              >
                Corrigir número
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
