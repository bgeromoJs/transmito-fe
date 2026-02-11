
import React, { useRef, useState, useEffect } from 'react';
import { Contact } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

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
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadTemplate = () => {
    const csvContent = "name;phone\nJoão Silva;5511999999999\nMaria Souza;5511888888888";
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

  const handleDriveUpload = () => {
    if (!window.gapi) {
       setError("API do Google não carregada. Tente novamente em instantes.");
       return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const apiKey = process.env.GOOGLE_PICKER_API_KEY;

    if (!clientId || !apiKey || clientId.includes("SEU_ID")) {
       setError("Configure as credenciais do Google Drive para usar este recurso.");
       return;
    }

    setIsDriveLoading(true);

    const pickerCallback = (data: any) => {
      if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.PICKED) {
        setError("Integração via Google Drive requer OAuth. Use CSV local por enquanto.");
      }
      if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.CANCEL || 
          data[window.google.picker.Response.ACTION] === window.google.picker.Action.PICKED) {
        setIsDriveLoading(false);
      }
    };

    const showPicker = () => {
      const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
      view.setMimeTypes("text/csv");
      const picker = new window.google.picker.PickerBuilder()
        .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
        .setAppId(clientId)
        .setDeveloperKey(apiKey)
        .addView(view)
        .setCallback(pickerCallback)
        .build();
      picker.setVisible(true);
    };

    window.gapi.load('picker', { 'callback': showPicker });
  };

  useEffect(() => {
    const startCamera = async () => {
      if (isCameraActive && videoRef.current) {
        try {
          const constraints = { 
            video: { 
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            } 
          };
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          streamRef.current = stream;
          videoRef.current.srcObject = stream;
        } catch (err) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;
            videoRef.current.srcObject = stream;
          } catch (e) {
            setError("Não foi possível acessar a câmera.");
            setIsCameraActive(false);
          }
        }
      }
    };
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [isCameraActive]);

  const handleCapture = async () => {
    if (!canvasRef.current || !videoRef.current) return;
    setIsAnalyzing(true);
    setError(null);
    const context = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context?.drawImage(videoRef.current, 0, 0);
    const base64 = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
    
    setIsCameraActive(false);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64 } },
            { text: "Extraia nome e telefone desta lista de contatos em JSON. Formate o telefone com 55 + DDD + Numero." }
          ]
        },
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { name: { type: Type.STRING }, phone: { type: Type.STRING } },
              required: ["name", "phone"]
            }
          }
        }
      });
      const data = JSON.parse(response.text || "[]");
      onDataExtracted(data.map((c: any) => ({ ...c, id: Math.random().toString(36).substr(2, 9) })));
    } catch (e) {
      setError("Erro na análise da imagem.");
    } finally { setIsAnalyzing(false); }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
        if (lines.length < 2) return;
        const separator = lines[0].includes(';') ? ';' : ',';
        const rawList = lines.slice(1).map(line => {
          const parts = line.split(separator);
          return { id: Math.random().toString(36).substr(2, 9), name: parts[0]?.trim(), phone: parts[1]?.trim().replace(/\D/g, '') };
        }).filter(c => c.name && c.phone);
        onDataExtracted(rawList);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Importar Contatos</h3>
      
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => { setError(null); setIsCameraActive(true); }} className="p-4 border border-slate-200 rounded-2xl hover:bg-slate-50 flex flex-col items-center gap-2 transition-all group">
          <svg className="w-6 h-6 text-slate-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Usar Câmera</span>
        </button>

        <button onClick={() => fileInputRef.current?.click()} className="p-4 border border-slate-200 rounded-2xl hover:bg-slate-50 flex flex-col items-center gap-2 transition-all group">
          <svg className="w-6 h-6 text-slate-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Enviar CSV</span>
        </button>
      </div>

      <div className="w-full">
        <button
          onClick={handleDriveUpload}
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

      <div className="flex justify-center pt-2">
        <button 
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-6 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full transition-all active:scale-95 group border border-blue-100"
        >
          <svg className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span className="text-[10px] font-black uppercase tracking-widest">Baixar Template CSV</span>
        </button>
      </div>

      <input type="file" ref={fileInputRef} hidden accept=".csv" onChange={handleCsvUpload} />

      {isCameraActive && (
        <div className="fixed inset-0 z-[110] bg-black flex flex-col h-[100dvh]">
          <div className="p-6 flex justify-between items-center text-white bg-black/40 z-20">
             <button onClick={() => setIsCameraActive(false)} className="text-xs font-black uppercase tracking-widest px-4 py-2 bg-white/10 rounded-full">Fechar</button>
             <span className="text-[10px] font-black uppercase tracking-widest">Digitalizar Lista</span>
             <div className="w-16"/>
          </div>
          <div className="flex-1 relative overflow-hidden flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
            <div className="relative w-64 h-64 border-2 border-white/50 rounded-[2rem] flex items-center justify-center">
               <div className="absolute inset-0 border-4 border-blue-500/30 rounded-[2rem] animate-pulse" />
               <p className="text-[10px] font-black text-white/50 uppercase tracking-widest text-center px-4">Enquadre sua lista aqui</p>
            </div>
          </div>
          <div className="p-12 flex items-center justify-center bg-black/95">
            <button 
              onClick={handleCapture} 
              className="w-24 h-24 bg-white rounded-full border-[6px] border-slate-300 shadow-[0_0_50px_rgba(255,255,255,0.4)] active:scale-90 transition-all flex items-center justify-center"
            >
               <div className="w-18 h-18 rounded-full border-2 border-slate-200 flex items-center justify-center">
                 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-blue-600" />
                 </div>
               </div>
            </button>
          </div>
        </div>
      )}

      {isAnalyzing && (
        <div className="fixed inset-0 z-[120] bg-slate-900 flex flex-col items-center justify-center text-white p-6">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6" />
          <h2 className="text-xl font-black tracking-tight mb-2">IA Transmito</h2>
          <p className="font-bold uppercase tracking-widest text-[11px] text-slate-400">Processando sua lista...</p>
        </div>
      )}

      {error && <div className="p-4 bg-red-50 text-red-600 text-[10px] font-bold rounded-xl border border-red-100 animate-in fade-in">{error}</div>}
      <canvas ref={canvasRef} hidden />
    </div>
  );
};
