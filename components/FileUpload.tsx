
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

  const downloadTemplate = () => {
    const headers = "Nome,Telefone\n";
    const rows = [
      "João Silva,5511999999999",
      "Maria Oliveira,5511888888888"
    ].join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template_transmito.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCsv = (csvText: string) => {
    setError(null);
    // Remove BOM e divide por linhas, removendo vazias
    const lines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim() !== "");
    
    if (lines.length < 2) {
      setError("O arquivo parece estar vazio ou sem contatos.");
      return;
    }

    const contacts: Contact[] = [];
    let hasInvalidRows = false;

    // Detectar separador (vírgula ou ponto e vírgula)
    const firstLine = lines[0];
    const separator = firstLine.includes(';') ? ';' : ',';

    // Processar a partir da segunda linha (assumindo cabeçalho)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(separator);
      
      if (parts.length >= 2) {
        const name = parts[0].trim().replace(/"/g, '');
        const phone = parts[1].trim().replace(/\D/g, '');
        
        if (name && phone && phone.length >= 8) {
          contacts.push({
            id: `file-${i}-${Date.now()}`,
            name,
            phone
          });
        } else {
          hasInvalidRows = true;
        }
      } else {
        hasInvalidRows = true;
      }
    }

    if (contacts.length === 0) {
      setError("Nenhum contato válido encontrado. Use o modelo: Nome, Telefone.");
      return;
    }

    if (hasInvalidRows) {
      console.warn("Algumas linhas foram ignoradas por estarem mal formatadas.");
    }

    onDataExtracted(contacts);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError("Por favor, selecione apenas arquivos .CSV");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCsv(text);
    };
    reader.readAsText(file);
  };

  const createPicker = (token: string) => {
    const pickerApiKey = process.env.GOOGLE_PICKER_API_KEY; 
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!pickerApiKey || !clientId || pickerApiKey.includes('SUA_CHAVE')) {
      alert("Erro: GOOGLE_PICKER_API_KEY não configurada.");
      setIsDriveLoading(false);
      return;
    }

    const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
      .setMimeTypes('text/csv,application/vnd.ms-excel');

    const picker = new window.google.picker.PickerBuilder()
      .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
      .setDeveloperKey(pickerApiKey)
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
      setError("Erro ao acessar o arquivo no Drive.");
    }
  };

  const openGoogleDrivePicker = () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return;

    setIsDriveLoading(true);
    setError(null);
    
    if (!window.google?.accounts?.oauth2) {
      setIsDriveLoading(false);
      return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: (response: any) => {
        if (response.error !== undefined) {
          setIsDriveLoading(false);
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
    <div className="space-y-4">
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={`group border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-[0.98] ${
          error ? 'border-red-200 bg-red-50/30' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/50'
        }`}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-colors ${
          error ? 'bg-red-100 text-red-500' : 'bg-slate-50 text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-100'
        }`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <p className={`text-xs sm:text-sm font-bold ${error ? 'text-red-600' : 'text-slate-600 group-hover:text-blue-600'}`}>
          {error || "Subir Arquivo CSV"}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">Clique para selecionar localmente</p>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleCsvUpload} 
          accept=".csv" 
          className="hidden" 
        />
      </div>

      <div className="flex justify-center">
        <button 
          onClick={downloadTemplate}
          className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 flex items-center gap-1.5 py-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Baixar Planilha Exemplo
        </button>
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
