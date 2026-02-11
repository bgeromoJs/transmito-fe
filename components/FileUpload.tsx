
import React, { useRef, useState, useEffect } from 'react';
import { Contact } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

interface FileUploadProps {
  onDataExtracted: (contacts: Contact[]) => void;
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    gapi?: any;
    google?: any;
    aistudio?: AIStudio;
  }
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataExtracted }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<{message: string, isQuota: boolean} | null>(null);

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

  useEffect(() => {
    const startCameraStream = async () => {
      if (isCameraActive && videoRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: 'environment',
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            } 
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Erro ao acessar câmera:", err);
          setError({ message: "Não foi possível acessar a câmera. Verifique as permissões.", isQuota: false });
          setIsCameraActive(false);
        }
      }
    };

    startCameraStream();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isCameraActive]);

  const handleSelectKey = async () => {
    try {
      if (window.aistudio) {
        await window.aistudio.openSelectKey();
        setError(null);
      }
    } catch (e) {
      console.error("Erro ao abrir seletor de chave:", e);
    }
  };

  const processExtractedContacts = (rawContacts: any[]) => {
    const seenPhones = new Set<string>();
    const validContacts: Contact[] = [];

    if (!Array.isArray(rawContacts)) return;

    rawContacts.forEach((c, i) => {
      const name = c.name?.toString().trim();
      const phone = c.phone?.toString().replace(/\D/g, '');
      
      if (name && phone && phone.length >= 8) {
        if (!seenPhones.has(phone)) {
          seenPhones.add(phone);
          validContacts.push({
            id: `extracted-${i}-${Date.now()}`,
            name,
            phone
          });
        }
      }
    });

    if (validContacts.length > 0) {
      onDataExtracted(validContacts);
    } else {
      setError({ message: "Nenhum contato identificado. Tente uma foto mais nítida.", isQuota: false });
    }
  };

  const downloadCsvTemplate = () => {
    const csvContent = "nome,telefone\nJoão Silva,5511999998888\nMaria Santos,5511977776666";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "template_transmito.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCameraCapture = async () => {
    if (!canvasRef.current || !videoRef.current) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    const context = canvasRef.current.getContext('2d');
    const videoWidth = videoRef.current.videoWidth;
    const videoHeight = videoRef.current.videoHeight;
    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;
    context?.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);
    
    const base64Image = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image
              }
            },
            {
              text: "Extraia nome e telefone de todos os contatos visíveis nesta lista. Formate o telefone com 55 e DDD."
            }
          ]
        },
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Nome completo do contato" },
                phone: { type: Type.STRING, description: "Número do WhatsApp com 55, DDD e dígitos" }
              },
              required: ["name", "phone"]
            }
          }
        }
      });

      const result = JSON.parse(response.text || "[]");
      processExtractedContacts(result);
    } catch (err: any) {
      console.error("Erro na extração:", err);
      const isQuotaError = err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED');
      
      if (isQuotaError) {
        setError({ 
          message: "Limite de uso atingido. Use sua própria chave do Google AI Studio para continuar.", 
          isQuota: true 
        });
      } else {
        setError({ message: "Falha ao processar imagem. Verifique a iluminação.", isQuota: false });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openGoogleDrivePicker = () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return;
    setIsDriveLoading(true);
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: (response: any) => {
        setIsDriveLoading(false);
      },
    });
    tokenClient.requestAccessToken();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={() => { setError(null); setIsCameraActive(true); }}
          className="flex flex-col items-center justify-center p-6 border-2 border-slate-200 border-dashed rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
        >
          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center mb-2 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-blue-700">Escanear lista</span>
        </button>

        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center p-6 border-2 border-slate-200 border-dashed rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
        >
          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center mb-2 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-blue-700">Subir CSV</span>
        </button>
      </div>

      <input type="file" ref={fileInputRef} onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
             const csvText = e.target?.result as string;
             const lines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim() !== "");
             if (lines.length < 2) return setError({ message: "Arquivo vazio.", isQuota: false });
             const separator = lines[0].includes(';') ? ';' : ',';
             const rawList = lines.slice(1).map(line => {
               const parts = line.split(separator);
               return { name: parts[0], phone: parts[1] };
             });
             processExtractedContacts(rawList);
          };
          reader.readAsText(file);
        }
      }} accept=".csv" className="hidden" />

      {isCameraActive && (
        <div className="fixed inset-0 z-[110] bg-black flex flex-col h-[100dvh] w-screen overflow-hidden">
          <div className="flex-none p-4 flex justify-between items-center bg-black/40 backdrop-blur-md z-20">
            <button onClick={() => setIsCameraActive(false)} className="w-10 h-10 flex items-center justify-center bg-white/10 text-white rounded-full">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="text-white text-[10px] font-black uppercase tracking-[0.2em] bg-blue-600 px-3 py-1.5 rounded-full shadow-lg">Lista na Moldura</div>
            <div className="w-10" />
          </div>
          <div className="flex-1 relative bg-slate-900 overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6 sm:p-10">
              <div className="w-full h-[70%] border-2 border-white/30 rounded-3xl relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />
              </div>
            </div>
          </div>
          <div className="flex-none h-32 flex items-center justify-center bg-black p-4 z-20">
            <button onClick={handleCameraCapture} className="relative active:scale-95 transition-transform">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center border-4 border-white/30 backdrop-blur-sm">
                <div className="w-14 h-14 bg-white rounded-full shadow-2xl border-2 border-slate-100" />
              </div>
            </button>
          </div>
        </div>
      )}

      {isAnalyzing && (
        <div className="fixed inset-0 z-[120] bg-slate-900/95 flex flex-col items-center justify-center text-white p-6 backdrop-blur-md">
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute inset-0 border-[4px] border-blue-600/20 rounded-full animate-pulse" />
            <div className="absolute inset-0 border-[4px] border-t-blue-500 rounded-full animate-spin" />
          </div>
          <h2 className="text-2xl font-black mb-2 tracking-tighter">IA Processando Lista</h2>
          <p className="text-slate-400 font-bold text-center max-w-xs leading-relaxed text-xs">Aguarde a extração de nomes e números...</p>
        </div>
      )}

      <div className="space-y-2">
        <button
          onClick={openGoogleDrivePicker}
          disabled={isDriveLoading}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border border-slate-200 rounded-2xl text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all shadow-sm active:scale-95"
        >
          <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="G-Drive" className="w-5 h-5" />
          Importar do Drive
        </button>

        <button
          onClick={downloadCsvTemplate}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Baixar Template CSV
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
               <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            </div>
            <p className="text-[11px] font-bold text-red-600 leading-tight flex-1">{error.message}</p>
          </div>
          {error.isQuota && (
            <div className="pt-2 border-t border-red-100 flex flex-col gap-2">
              <button 
                onClick={handleSelectKey}
                className="w-full py-2 bg-red-600 text-white text-[10px] font-black uppercase rounded-lg shadow-sm hover:bg-red-700 transition-colors"
              >
                Vincular Minha Chave de API
              </button>
            </div>
          )}
        </div>
      )}
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
