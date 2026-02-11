
import React, { useRef, useState, useEffect } from 'react';
import { Contact } from '../types';
import { GoogleGenAI } from "@google/genai";

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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

  // Efeito para ligar a câmera quando o overlay for ativado
  useEffect(() => {
    const startCameraStream = async () => {
      if (isCameraActive && videoRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            } 
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Erro ao acessar câmera:", err);
          setError("Não foi possível acessar a câmera. Verifique as permissões.");
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

  const processExtractedContacts = (rawContacts: any[]) => {
    const seenPhones = new Set<string>();
    const validContacts: Contact[] = [];
    let duplicateCount = 0;

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
        } else {
          duplicateCount++;
        }
      }
    });

    if (validContacts.length > 0) {
      onDataExtracted(validContacts);
      if (duplicateCount > 0) console.log(`${duplicateCount} duplicatas removidas.`);
    } else {
      setError("Nenhum contato legível encontrado.");
    }
  };

  const parseCsv = (csvText: string) => {
    setError(null);
    const lines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim() !== "");
    
    if (lines.length < 2) {
      setError("O arquivo parece estar vazio.");
      return;
    }

    const firstLine = lines[0];
    const separator = firstLine.includes(';') ? ';' : ',';
    const rawList = lines.slice(1).map(line => {
      const parts = line.split(separator);
      return { name: parts[0], phone: parts[1] };
    });

    processExtractedContacts(rawList);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCameraCapture = async () => {
    if (!canvasRef.current || !videoRef.current) return;
    
    setIsAnalyzing(true);
    const context = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context?.drawImage(videoRef.current, 0, 0);
    
    const base64Image = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
    
    // Parar câmera imediatamente
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          {
            text: "Extraia todos os contatos visíveis. Retorne um JSON strictly: [{\"name\": \"Nome\", \"phone\": \"Número com 55 e DDD\"}]. Se for uma lista impressa ou escrita a mão, tente ser preciso."
          }
        ],
        config: { responseMimeType: "application/json" }
      });

      const textOutput = response.text;
      const result = JSON.parse(textOutput || "[]");
      processExtractedContacts(result);
    } catch (err) {
      console.error("Erro IA Vision:", err);
      setError("Falha ao analisar a imagem. Tente capturar novamente com mais luz.");
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
        setAccessToken(response.access_token);
        // Picker logic here (assumed simplified for brevity)
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
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-blue-700">Escaneia Lista</span>
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
          reader.onload = (e) => parseCsv(e.target?.result as string);
          reader.readAsText(file);
        }
      }} accept=".csv" className="hidden" />

      {/* Interface da Câmera Fullscreen */}
      {isCameraActive && (
        <div className="fixed inset-0 z-[110] bg-black flex flex-col">
          <div className="absolute top-0 left-0 w-full p-6 z-10 flex justify-between">
            <button onClick={() => setIsCameraActive(false)} className="bg-black/50 text-white p-2 rounded-full backdrop-blur-md">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="text-white text-xs font-bold uppercase tracking-widest self-center bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">Centralize a Lista</div>
          </div>
          <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover" />
          <div className="p-12 flex items-center justify-center bg-gradient-to-t from-black/80 to-transparent">
            <button 
              onClick={handleCameraCapture}
              className="w-24 h-24 bg-white rounded-full border-[12px] border-white/20 active:scale-90 transition-transform flex items-center justify-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-white border-2 border-slate-100 rounded-full" />
            </button>
          </div>
        </div>
      )}

      {/* Overlay de Análise */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-[120] bg-slate-900/95 flex flex-col items-center justify-center text-white p-6 backdrop-blur-sm">
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin" />
          </div>
          <h2 className="text-2xl font-black mb-2 tracking-tight">Escaneando Documento</h2>
          <p className="text-slate-400 font-medium text-center max-w-xs">Nossa IA está identificando nomes e números de WhatsApp para você...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
             <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          </div>
          <p className="text-[11px] font-bold text-red-600 leading-tight">{error}</p>
        </div>
      )}

      <button
        onClick={openGoogleDrivePicker}
        disabled={isDriveLoading}
        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border border-slate-200 rounded-2xl text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all shadow-sm active:scale-95"
      >
        <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="G-Drive" className="w-5 h-5" />
        Importar do Drive
      </button>

      <div className="flex justify-center pt-2">
        <button onClick={downloadTemplate} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 flex items-center gap-1.5 py-1 transition-colors">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Template Planilha
        </button>
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
