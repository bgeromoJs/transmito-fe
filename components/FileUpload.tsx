
import React, { useRef, useState, useEffect } from 'react';
import { Contact } from '../types';

interface FileUploadProps {
  onDataExtracted: (contacts: Contact[]) => void;
}

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataExtracted }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    // Carregar a GAPI para o Picker de forma segura
    const loadGapi = () => {
      if (window.gapi) {
        window.gapi.load('picker', () => {
          console.log('GAPI Picker módulo carregado');
        });
      } else {
        setTimeout(loadGapi, 500);
      }
    };
    loadGapi();
  }, []);

  const parseCsv = (csvText: string) => {
    const lines = csvText.split('\n');
    const contacts: Contact[] = [];
    
    lines.forEach((line, index) => {
      if (!line.trim()) return;
      if (index === 0 && (line.toLowerCase().includes('nome') || line.toLowerCase().includes('phone'))) return;
      
      const parts = line.split(/[;,]/);
      if (parts.length >= 2) {
        const name = parts[0].trim().replace(/"/g, '');
        const phone = parts[1].trim().replace(/\D/g, '');
        
        if (name && phone) {
          contacts.push({
            id: `file-${index}-${Date.now()}`,
            name,
            phone
          });
        }
      }
    });

    onDataExtracted(contacts);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCsv(text);
    };
    reader.readAsText(file);
  };

  const createPicker = (token: string) => {
    const apiKey = process.env.API_KEY; // A chave de API do Google Cloud Console
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!apiKey || !clientId) {
      alert("Configuração incompleta: API_KEY ou GOOGLE_CLIENT_ID ausentes.");
      setIsDriveLoading(false);
      return;
    }

    const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
      .setMimeTypes('text/csv,application/vnd.ms-excel');

    const picker = new window.google.picker.PickerBuilder()
      .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
      .setDeveloperKey(apiKey)
      .setAppId(clientId.split('-')[0])
      .setOAuthToken(token)
      .addView(view)
      .setCallback(async (data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const fileId = data.docs[0].id;
          await downloadDriveFile(fileId, token);
        }
        if (data.action === window.google.picker.Action.CANCEL || data.action === window.google.picker.Action.PICKED) {
          setIsDriveLoading(false);
        }
      })
      .build();

    picker.setVisible(true);
  };

  const downloadDriveFile = async (fileId: string, token: string) => {
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Falha ao baixar arquivo');
      const text = await response.text();
      parseCsv(text);
    } catch (error) {
      console.error("Erro ao baixar arquivo do Drive:", error);
      alert("Erro ao acessar o arquivo selecionado no Drive.");
    }
  };

  const openGoogleDrivePicker = () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      alert("GOOGLE_CLIENT_ID não configurado.");
      return;
    }

    setIsDriveLoading(true);
    
    if (!window.google?.accounts?.oauth2) {
      alert("Biblioteca de autenticação do Google não carregada.");
      setIsDriveLoading(false);
      return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: (response: any) => {
        if (response.error !== undefined) {
          setIsDriveLoading(false);
          console.error(response);
          return;
        }
        setAccessToken(response.access_token);
        createPicker(response.access_token);
      },
    });

    if (accessToken) {
      createPicker(accessToken);
    } else {
      tokenClient.requestAccessToken();
    }
  };

  return (
    <div className="space-y-3">
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="group border-2 border-dashed border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all active:scale-[0.98]"
      >
        <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center mb-2 group-hover:text-blue-500 group-hover:bg-blue-100 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <p className="text-xs sm:text-sm font-bold text-slate-600 group-hover:text-blue-600">Subir Arquivo CSV</p>
        <p className="text-[10px] text-slate-400 mt-0.5">Clique para selecionar localmente</p>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleCsvUpload} 
          accept=".csv" 
          className="hidden" 
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px bg-slate-100 flex-1"></div>
        <span className="text-[10px] font-black text-slate-300 uppercase">ou</span>
        <div className="h-px bg-slate-100 flex-1"></div>
      </div>

      <button
        onClick={openGoogleDrivePicker}
        disabled={isDriveLoading}
        className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-slate-900 rounded-2xl text-white font-bold text-sm hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-slate-200"
      >
        {isDriveLoading ? (
           <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        ) : (
          <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="G-Drive" className="w-5 h-5" />
        )}
        Importar do Google Drive
      </button>
    </div>
  );
};
