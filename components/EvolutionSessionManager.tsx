
import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';

interface EvolutionSessionManagerProps {
  user: UserProfile;
  onSessionActive: () => void;
  onUpdateNumber: (num: string, apikey: string) => Promise<void>;
}

type ConnectionState = 'IDLE' | 'CHECKING' | 'CREATING_INSTANCE' | 'WAITING_QR' | 'ERROR';

export const EvolutionSessionManager: React.FC<EvolutionSessionManagerProps> = ({ user, onSessionActive, onUpdateNumber }) => {
  const [state, setState] = useState<ConnectionState>('CHECKING');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [instanceName] = useState(user.email.replace(/[^a-zA-Z0-9]/g, '_'));

  const API_URL = process.env.EVOLUTION_API_URL;
  const GLOBAL_API_KEY = process.env.EVOLUTION_GLOBAL_API_KEY;

  const checkConnectionStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/instance/connectionState/${instanceName}`, {
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
  }, [API_URL, GLOBAL_API_KEY, instanceName, onSessionActive, user.whatsappNumber, user.apikey, onUpdateNumber]);

  const createOrConnectInstance = useCallback(async () => {
    setState('CREATING_INSTANCE');
    setError(null);

    try {
      // 1. Fetch instances to see if it already exists
      const fetchResponse = await fetch(`${API_URL}/instance/fetchInstances`, {
        headers: { 'apikey': GLOBAL_API_KEY || '' }
      });
      
      let instanceData = null;
      if (fetchResponse.ok) {
        const instances = await fetchResponse.json();
        instanceData = instances.find((i: any) => i.instanceName === instanceName);
      }

      if (!instanceData) {
        // 2. Create instance if not exists
        const createResponse = await fetch(`${API_URL}/instance/create`, {
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
          if (data.hash) {
            // Save the instance token (hash) to the user profile
            await onUpdateNumber(user.whatsappNumber || '', data.hash);
          }
          if (data.qrcode?.base64) {
            setQrCode(data.qrcode.base64);
            setState('WAITING_QR');
          }
        } else {
          const err = await createResponse.json();
          setError(err.message || "Erro ao criar instância.");
          setState('ERROR');
        }
      } else {
        // 3. Instance exists, check if we need to connect
        const isConnected = await checkConnectionStatus();
        if (!isConnected) {
          const connectResponse = await fetch(`${API_URL}/instance/connect/${instanceName}`, {
            headers: { 'apikey': GLOBAL_API_KEY || '' }
          });
          
          if (connectResponse.ok) {
            const data = await connectResponse.json();
            if (data.base64) {
              setQrCode(data.base64);
              setState('WAITING_QR');
            } else if (data.code) {
               // If it returns a pairing code instead of base64 (unlikely with qrcode: true)
               setError("QR Code não disponível.");
               setState('ERROR');
            }
          } else {
             setError("Erro ao conectar instância.");
             setState('ERROR');
          }
        }
      }
    } catch (e) {
      setError("Falha na comunicação com o servidor Evolution.");
      setState('ERROR');
    }
  }, [API_URL, GLOBAL_API_KEY, instanceName, onUpdateNumber, user.whatsappNumber, checkConnectionStatus]);

  useEffect(() => {
    if (state === 'CHECKING') {
      createOrConnectInstance();
    }
  }, [state, createOrConnectInstance]);

  // Polling for connection
  useEffect(() => {
    let interval: any;
    if (state === 'WAITING_QR') {
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

  if (state === 'CHECKING' || state === 'CREATING_INSTANCE') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 space-y-6">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
          {state === 'CHECKING' ? 'Validando Sessão...' : 'Preparando Instância...'}
        </p>
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
            Escaneie o QR Code abaixo com seu WhatsApp para conectar.
          </p>
        </div>

        {error && (
          <div className="p-5 bg-red-50 text-red-600 text-[11px] font-bold rounded-2xl border border-red-100 leading-relaxed">
            {error}
            <button onClick={handleRestart} className="block w-full mt-2 text-blue-600 underline uppercase tracking-widest">Tentar Novamente</button>
          </div>
        )}

        {state === 'WAITING_QR' && qrCode && (
          <div className="space-y-8 animate-in zoom-in">
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

            <div className="flex items-center justify-center gap-3">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></div>
              <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em]">Aguardando leitura do QR Code...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
