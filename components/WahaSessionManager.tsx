
import React, { useState, useEffect, useCallback } from 'react';

interface WahaSessionManagerProps {
  onSessionActive: () => void;
}

type ConnectionState = 'IDLE' | 'CHECKING' | 'REQUESTING_CODE' | 'WAITING_AUTH' | 'ERROR';

export const WahaSessionManager: React.FC<WahaSessionManagerProps> = ({ onSessionActive }) => {
  const [state, setState] = useState<ConnectionState>('CHECKING');
  const [phoneNumber, setPhoneNumber] = useState('');
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
          onSessionActive();
        } else {
          setState('IDLE');
        }
      } else {
        setState('IDLE');
      }
    } catch (e) {
      setError("Falha ao conectar com o servidor WAHA.");
      setState('ERROR');
    }
  }, [API_URL, API_KEY, onSessionActive]);

  useEffect(() => {
    checkSessionStatus();
  }, [checkSessionStatus]);

  // Polling quando está esperando autenticação
  useEffect(() => {
    let interval: any;
    if (state === 'WAITING_AUTH') {
      interval = setInterval(checkSessionStatus, 5000);
    }
    return () => clearInterval(interval);
  }, [state, checkSessionStatus]);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;
    
    // Limpa formatação: apenas números
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError("Número inválido.");
      return;
    }

    setState('REQUESTING_CODE');
    setError(null);

    try {
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
        setError("Não foi possível gerar o código. Tente novamente.");
        setState('IDLE');
      }
    } catch (e) {
      setError("Erro de rede ao solicitar código.");
      setState('IDLE');
    }
  };

  if (state === 'CHECKING') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 space-y-6">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Validando Sessão WhatsApp...</p>
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
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Conectar WhatsApp</h2>
          <p className="text-sm text-slate-500 font-medium">
            {state === 'WAITING_AUTH' 
              ? "Agora, digite o código abaixo no seu WhatsApp." 
              : "Sua sessão expirou ou não está conectada."}
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100">
            {error}
          </div>
        )}

        {state === 'IDLE' || state === 'REQUESTING_CODE' ? (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Seu Telefone (DDD + Número)</label>
              <input 
                type="text" 
                placeholder="Ex: 5511999999999"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <button 
              type="submit"
              disabled={state === 'REQUESTING_CODE'}
              className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 active:scale-95 transition-all disabled:opacity-50"
            >
              {state === 'REQUESTING_CODE' ? "GERANDO CÓDIGO..." : "GERAR CÓDIGO DE PAREAMENTO"}
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
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Como conectar:</p>
              <ol className="text-xs text-slate-600 space-y-2 font-bold leading-relaxed">
                <li>1. Abra o WhatsApp no seu celular</li>
                <li>2. Vá em <span className="text-slate-900">Configurações</span> ou <span className="text-slate-900">Aparelhos Conectados</span></li>
                <li>3. Selecione <span className="text-blue-600">Conectar com número de telefone</span></li>
                <li>4. Digite o código acima</li>
              </ol>
            </div>

            <div className="flex items-center justify-center gap-3 py-4">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></div>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Aguardando Autenticação...</p>
            </div>

            <button 
              onClick={() => setState('IDLE')}
              className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600"
            >
              Cancelar e tentar outro número
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
