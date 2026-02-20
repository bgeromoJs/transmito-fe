
import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';

interface EvolutionSessionManagerProps {
  user: UserProfile;
  onSessionActive: () => void;
  onUpdateNumber: (num: string, apikey: string) => Promise<void>;
  onLogout: () => void;
}

type ConnectionState = 'IDLE' | 'CHECKING' | 'WAITING_PHONE' | 'CREATING_INSTANCE' | 'WAITING_CONNECT' | 'ERROR';

export const EvolutionSessionManager: React.FC<EvolutionSessionManagerProps> = ({ user, onSessionActive, onUpdateNumber, onLogout }) => {
  const [state, setState] = useState<ConnectionState>('CHECKING');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState(user.whatsappNumber || '');
  const [error, setError] = useState<string | null>(null);
  const [instanceName] = useState(user.email.replace(/[^a-zA-Z0-9]/g, '_'));
  const [connectMethod, setConnectMethod] = useState<'QR' | 'CODE'>('CODE');

  const API_URL = process.env.EVOLUTION_API_URL;
  const GLOBAL_API_KEY = process.env.EVOLUTION_GLOBAL_API_KEY;

  const checkConnectionStatus = useCallback(async (num?: string) => {
    try {
      const cleanNumber = (num || phoneNumber || '').replace(/\D/g, '');
      const response = await fetch(`${API_URL}/instance/connectionState/${instanceName}${cleanNumber ? `?number=${cleanNumber}` : ''}`, {
        headers: { 'apikey': GLOBAL_API_KEY || '' }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.instance.state === 'open') {
          // Extract number from JID (e.g. "5511999999999@s.whatsapp.net")
          const jid = data.instance.owner;
          if (jid) {
            const connectedNumber = jid.split('@')[0];
            if (connectedNumber !== user.whatsappNumber) {
              await onUpdateNumber(connectedNumber, user.apikey || '');
            }
          }
          onSessionActive();
          return true;
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  }, [API_URL, GLOBAL_API_KEY, instanceName, onSessionActive, user.whatsappNumber, user.apikey, onUpdateNumber, phoneNumber]);

  const initialCheck = useCallback(async () => {
    setState('CHECKING');
    setError(null);
    
    try {
      const fetchResponse = await fetch(`${API_URL}/instance/fetchInstances`, {
        headers: { 'apikey': GLOBAL_API_KEY || '' }
      });
      
      if (fetchResponse.ok) {
        const data = await fetchResponse.json();
        const instances = Array.isArray(data) ? data : (data.instances || []);
        const instanceData = instances.find((i: any) => i.instanceName === instanceName || i.name === instanceName);
        
        if (instanceData) {
          // Instância existe, vamos ver se está conectada
          const isConnected = await checkConnectionStatus();
          if (isConnected) return; // Sucesso, já foi para o sistema
        }
      }
      
      // Se chegou aqui, ou não existe ou não está conectada.
      // Vamos pedir o número para prosseguir.
      setState('WAITING_PHONE');
    } catch (e) {
      setState('WAITING_PHONE'); // Em caso de erro no fetch, assume que precisa configurar
    }
  }, [API_URL, GLOBAL_API_KEY, instanceName, checkConnectionStatus]);

  const createOrConnectInstance = useCallback(async (targetNumber?: string) => {
    const num = targetNumber || phoneNumber;
    if (!num) {
      setState('WAITING_PHONE');
      return;
    }

    setState('CREATING_INSTANCE');
    setError(null);

    try {
      // 1. Fetch instances (novamente para garantir o estado mais atual)
      const fetchResponse = await fetch(`${API_URL}/instance/fetchInstances`, {
        headers: { 'apikey': GLOBAL_API_KEY || '' }
      });
      
      let instanceData = null;
      if (fetchResponse.ok) {
        const data = await fetchResponse.json();
        const instances = Array.isArray(data) ? data : (data.instances || []);
        instanceData = instances.find((i: any) => i.instanceName === instanceName || i.name === instanceName);
      }

      const cleanNumber = num.replace(/\D/g, '');

      if (!instanceData) {
        // 2. Create instance if not exists
        const createResponse = await fetch(`${API_URL}/instance/create?number=${cleanNumber}`, {
          method: 'POST',
          headers: {
            'apikey': GLOBAL_API_KEY || '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            instanceName: instanceName,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS"
          })
        });

        if (createResponse.ok) {
          const data = await createResponse.json();
          const token = data.hash || data.instance?.token;
          if (token) {
            await onUpdateNumber(cleanNumber, token);
          }
          
          // Get connection data (QR and Code)
          const connectResponse = await fetch(`${API_URL}/instance/connect/${instanceName}?number=${cleanNumber}`, {
            headers: { 'apikey': GLOBAL_API_KEY || '' }
          });

          if (connectResponse.ok) {
            const connectData = await connectResponse.json();
            setPairingCode(connectData.pairingCode || connectData.code);
            setQrCode(connectData.base64);
            setState('WAITING_CONNECT');
          } else {
            setError("Erro ao gerar dados de conexão.");
            setState('ERROR');
          }
        } else {
          const err = await createResponse.json();
          setError(err.message || "Erro ao criar instância.");
          setState('ERROR');
        }
      } else {
        // 3. Instance exists, update user token if needed
        const token = instanceData.token || instanceData.hash;
        if (token && token !== user.apikey) {
          await onUpdateNumber(cleanNumber, token);
        }

        // Check if we need to connect (novamente com o número limpo)
        const isConnected = await checkConnectionStatus(cleanNumber);
        if (isConnected) return;

        const connectResponse = await fetch(`${API_URL}/instance/connect/${instanceName}?number=${cleanNumber}`, {
          headers: { 'apikey': GLOBAL_API_KEY || '' }
        });
        
        if (connectResponse.ok) {
          const data = await connectResponse.json();
          setPairingCode(data.pairingCode || data.code);
          setQrCode(data.base64);
          setState('WAITING_CONNECT');
        } else {
           setError("Erro ao conectar instância.");
           setState('ERROR');
        }
      }
    } catch (e) {
      setError("Falha na comunicação com o servidor Evolution.");
      setState('ERROR');
    }
  }, [API_URL, GLOBAL_API_KEY, instanceName, onUpdateNumber, user.apikey, checkConnectionStatus, phoneNumber]);

  useEffect(() => {
    if (state === 'CHECKING') {
      initialCheck();
    }
  }, [state, initialCheck]);

  // Polling for connection
  useEffect(() => {
    let interval: any;
    if (state === 'WAITING_CONNECT') {
      interval = setInterval(async () => {
        const connected = await checkConnectionStatus();
        if (connected) clearInterval(interval);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [state, checkConnectionStatus]);

  const handleRestart = () => {
    setState('CHECKING');
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length >= 10) {
      createOrConnectInstance(phoneNumber);
    } else {
      setError("Por favor, insira um número válido com DDD.");
    }
  };

  if (state === 'CHECKING' || state === 'CREATING_INSTANCE') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 space-y-6">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-center space-y-2">
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
            {state === 'CHECKING' ? 'Validando Sessão...' : 'Preparando Instância...'}
          </p>
          <button 
            onClick={onLogout}
            className="text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-500 transition-colors"
          >
            Cancelar e Sair
          </button>
        </div>
      </div>
    );
  }

  if (state === 'WAITING_PHONE') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="space-y-4">
            <div className="mx-auto w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Seu WhatsApp</h2>
            <p className="text-sm text-slate-500 font-medium">
              Insira o número do WhatsApp que você deseja conectar (com DDD).
            </p>
          </div>

          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <input 
              type="text"
              placeholder="Ex: 5511999999999"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <button 
              type="submit"
              className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
            >
              Gerar Código de Pareamento
            </button>
          </form>

          <button 
            onClick={onLogout}
            className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
          >
            Voltar ao Login
          </button>
        </div>
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
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Vincular WhatsApp</h2>
          <p className="text-sm text-slate-500 font-medium">
            Use o código abaixo para conectar seu WhatsApp.
          </p>
        </div>

        {error && (
          <div className="p-5 bg-red-50 text-red-600 text-[11px] font-bold rounded-2xl border border-red-100 leading-relaxed">
            {error}
            <div className="flex gap-4 mt-3">
              <button onClick={handleRestart} className="flex-1 py-2 bg-red-100 rounded-xl text-red-700 uppercase tracking-widest text-[9px] font-black">Tentar Novamente</button>
              <button onClick={onLogout} className="flex-1 py-2 bg-white border border-red-100 rounded-xl text-red-400 uppercase tracking-widest text-[9px] font-black">Sair</button>
            </div>
          </div>
        )}

        {state === 'WAITING_CONNECT' && (
          <div className="space-y-8 animate-in zoom-in">
            <div className="flex p-1 bg-slate-100 rounded-2xl mb-4">
              <button 
                onClick={() => setConnectMethod('CODE')}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${connectMethod === 'CODE' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Código de Pareamento
              </button>
              <button 
                onClick={() => setConnectMethod('QR')}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${connectMethod === 'QR' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                QR Code
              </button>
            </div>

            {connectMethod === 'CODE' && pairingCode && (
              <div className="space-y-8">
                <div className="bg-slate-50 p-8 rounded-3xl border-2 border-slate-100 shadow-inner inline-block w-full">
                  <p className="text-4xl font-black text-blue-600 tracking-[0.2em]">{pairingCode}</p>
                </div>
                
                <div className="p-6 bg-slate-50 rounded-3xl text-left space-y-4 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Instruções:</p>
                  <ul className="text-xs text-slate-600 space-y-2 font-bold leading-relaxed">
                    <li>1. Abra o WhatsApp no seu celular</li>
                    <li>2. Vá em <span className="text-slate-900">Aparelhos Conectados</span></li>
                    <li>3. Toque em <span className="text-blue-600">Conectar um Aparelho</span></li>
                    <li>4. Toque em <span className="text-blue-600">Conectar com número de telefone</span></li>
                    <li>5. Insira o código acima no seu celular</li>
                  </ul>
                </div>
              </div>
            )}

            {connectMethod === 'QR' && qrCode && (
              <div className="space-y-8">
                <div className="bg-white p-4 rounded-3xl border-2 border-slate-100 shadow-inner inline-block">
                  <img src={qrCode} alt="QR Code WhatsApp" className="w-64 h-64" />
                </div>
                
                <div className="p-6 bg-slate-50 rounded-3xl text-left space-y-4 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Instruções:</p>
                  <ul className="text-xs text-slate-600 space-y-2 font-bold leading-relaxed">
                    <li>1. Abra o WhatsApp no seu celular</li>
                    <li>2. Toque em <span className="text-slate-900">Configurações</span> ou <span className="text-slate-900">Menu</span></li>
                    <li>3. Selecione <span className="text-blue-600">Aparelhos Conectados</span></li>
                    <li>4. Toque em <span className="text-blue-600">Conectar um Aparelho</span> e aponte para a tela</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></div>
              <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em]">Aguardando pareamento...</p>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => setState('WAITING_PHONE')}
                className="w-full py-4 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors bg-blue-50 rounded-2xl"
              >
                Alterar Número de Telefone
              </button>
              <button 
                onClick={onLogout}
                className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
              >
                Voltar ao Login
              </button>
            </div>
          </div>
        )}

        {state === 'ERROR' && (
          <div className="pt-4 space-y-4">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
              Algo deu errado. Tente novamente ou saia.
            </p>
            <button 
              onClick={() => setState('WAITING_PHONE')}
              className="w-full py-4 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors bg-blue-50 rounded-2xl"
            >
              Tentar com outro número
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
