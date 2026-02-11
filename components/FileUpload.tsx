
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
  const [error, setError] = useState<string | null>(null);

  // Google Drive Logic
  const handleDriveUpload = () => {
    if (!window.gapi) {
       setError("API do Google não carregada. Tente novamente em instantes.");
       return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const apiKey = process.env.GOOGLE_PICKER_API_KEY;

    if (!clientId || !apiKey || clientId.includes("SEU_ID")) {
       setError("Configure as credenciais do Google Drive no .env para usar este recurso.");
       return;
    }

    const pickerCallback = async (data: any) => {
      if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.PICKED) {
        const file = data[window.google.picker.Response.DOCUMENTS][0];
        const fileId = file[window.google.picker.Document.ID];
        
        // Simulação de leitura de arquivo do drive (em app real usaria gapi.client.drive)
        // Por agora, avisamos que a integração precisa de escopos de leitura ativos.
        setError("Integração completa do Drive requer permissão de escopo 'drive.readonly'. Use CSV local por enquanto.");
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
            setError("Não foi possível acessar a câmera do dispositivo.");
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
            { text: "Extraia nome e telefone desta lista de contatos. Formate o telefone apenas com números, garantindo que comece com 55 e tenha o DDD." }
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
      setError("Erro ao ler imagem com IA. Tente novamente.");
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
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => { setError(null); setIsCameraActive(true); }} className="p-4 border-2 border-dashed border-slate-200 rounded-2xl hover:bg-slate-50 flex flex-col items-center gap-2 transition-all group">
          <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Foto</span>
        </button>

        <button onClick={() => fileInputRef.current?.click()} className="p-4 border-2 border-dashed border-slate-200 rounded-2xl hover:bg-slate-50 flex flex-col items-center gap-2 transition-all group">
          <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">CSV</span>
        </button>

        <button onClick={handleDriveUpload} className="p-4 border-2 border-dashed border-slate-200 rounded-2xl hover:bg-slate-50 flex flex-col items-center gap-2 transition-all group">
          <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M7.71 3.5L1.15 15l3.43 6l6.55-11.5h12.87l-3.42-6H7.71zM14.28 15h6.57l-3.43 6H4.86l9.42-6z"/></svg>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Drive</span>
        </button>
      </div>

      <input type="file" ref={fileInputRef} hidden accept=".csv" onChange={handleCsvUpload} />

      {isCameraActive && (
        <div className="fixed inset-0 z-[110] bg-black flex flex-col h-[100dvh]">
          <div className="p-4 flex justify-between items-center text-white bg-black/40 z-20">
             <button onClick={() => setIsCameraActive(false)} className="text-xs font-black uppercase tracking-widest">Cancelar</button>
             <span className="text-[10px] font-black uppercase tracking-widest">Posicione a Lista</span>
             <div className="w-10"/>
          </div>
          <video ref={videoRef} autoPlay playsInline muted className="flex-1 object-cover" />
          <div className="p-10 flex items-center justify-center bg-black">
            <button onClick={handleCapture} className="w-20 h-20 bg-white rounded-full border-8 border-slate-300 active:scale-95 transition-transform flex items-center justify-center">
               <div className="w-12 h-12 rounded-full border-2 border-slate-200" />
            </button>
          </div>
        </div>
      )}

      {isAnalyzing && (
        <div className="fixed inset-0 z-[120] bg-slate-900/95 flex flex-col items-center justify-center text-white p-6">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          <h2 className="text-lg font-black tracking-tight mb-2">IA Transmito</h2>
          <p className="font-bold uppercase tracking-widest text-[10px] text-slate-400">Extraindo contatos da imagem...</p>
        </div>
      )}

      {error && <div className="p-4 bg-red-50 text-red-600 text-[10px] font-bold rounded-xl border border-red-100 animate-in fade-in">{error}</div>}
      <canvas ref={canvasRef} hidden />
    </div>
  );
};
