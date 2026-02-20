
import React, { useRef, useState, useEffect } from 'react';
import { Contact } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

interface FileUploadProps {
  onDataExtracted: (contacts: Contact[]) => void;
  isSubscribed: boolean;
  onShowSubscription: () => void;
  isDemo?: boolean;
}

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataExtracted, isSubscribed, onShowSubscription, isDemo }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [isManualActive, setIsManualActive] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const canUsePremium = isSubscribed || isDemo;

  const formatPhoneNumber = (rawPhone: string): string => {
    const digits = rawPhone.replace(/\D/g, '');
    if (digits.length === 10 || digits.length === 11) {
      return `55${digits}`;
    }
    if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
      return digits;
    }
    return digits;
  };

  const downloadTemplate = () => {
    const csvContent = "name;phone\nJoão Silva;11999999999\nMaria Souza;5511888888888";
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
    if (!canUsePremium) return onShowSubscription();
    if (!window.gapi) {
       setError("API do Google não carregada.");
       return;
    }
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const apiKey = process.env.GOOGLE_PICKER_API_KEY;
    if (!clientId || !apiKey || clientId.includes("SEU_ID")) {
       setError("Configure as credenciais do Google Drive.");
       return;
    }
    setIsDriveLoading(true);
    const pickerCallback = (data: any) => {
      if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.PICKED) {
        setError("Use CSV local por enquanto.");
      }
      setIsDriveLoading(false);
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
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: { ideal: "environment" } } 
          });
          streamRef.current = stream;
          videoRef.current.srcObject = stream;
        } catch (err) {
          setIsCameraActive(false);
        }
      }
    };
    startCamera();
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, [isCameraActive]);

  const handleCapture = async () => {
    if (!canvasRef.current || !videoRef.current) return;
    setIsAnalyzing(true);
    const context = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context?.drawImage(videoRef.current, 0, 0);
    const base64 = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
    setIsCameraActive(false);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64 } },
            { text: "Extraia nome e telefone desta lista de contatos em JSON." }
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
      onDataExtracted(data.map((c: any) => ({ 
        id: Math.random().toString(36).substr(2, 9),
        name: c.name?.trim(),
        phone: formatPhoneNumber(c.phone),
        selected: true,
        sentCount: 0,
        failCount: 0
      })));
    } catch (e) {
      setError("Erro na análise.");
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
          return { 
            id: Math.random().toString(36).substr(2, 9), 
            name: parts[0]?.trim(), 
            phone: formatPhoneNumber(parts[1]?.trim() || ""),
            selected: true,
            sentCount: 0,
            failCount: 0
          } as Contact;
        }).filter(c => c.name && c.phone);
        onDataExtracted(rawList);
        if (fileInputRef.current) fileInputRef.current.value = "";
      };
      reader.readAsText(file);
    }
  };

  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: {
            parts: [
              { inlineData: { data: base64, mimeType: file.type } },
              { text: "Extraia os contatos desta imagem (planilha ou lista). Retorne um JSON no formato: [{\"name\": \"Nome\", \"phone\": \"5511999999999\"}]. Retorne APENAS o JSON válido." }
            ]
          }
        });
        
        if (response.text) {
          try {
            const jsonStr = response.text.replace(/```json|```/g, '').trim();
            const extracted: any[] = JSON.parse(jsonStr);
            const newContacts: Contact[] = extracted.map((c, i) => ({
              id: `ocr-${Date.now()}-${i}`,
              name: c.name || 'Contato Extraído',
              phone: formatPhoneNumber(c.phone),
              sentCount: 0,
              failCount: 0,
              selected: true
            }));
            onDataExtracted(newContacts);
            setIsCameraActive(false);
          } catch (err) {
            setError("Não foi possível processar a imagem.");
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setError("Erro ao processar imagem.");
    } finally {
      setIsAnalyzing(false);
      e.target.value = '';
    }
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName || !manualPhone) return;
    const newContact: Contact = {
      id: `manual-${Date.now()}`,
      name: manualName.trim(),
      phone: formatPhoneNumber(manualPhone),
      sentCount: 0,
      failCount: 0,
      selected: true
    };
    onDataExtracted([newContact]);
    setManualName('');
    setManualPhone('');
    setIsManualActive(false);
  };

  const handleCameraClick = () => {
    if (!canUsePremium) return onShowSubscription();
    setIsCameraActive(true);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <button 
          onClick={handleCameraClick} 
          className={`p-4 border rounded-2xl flex flex-col items-center gap-2 transition-all group ${!canUsePremium ? 'bg-amber-50 border-amber-100' : 'border-slate-200 hover:bg-slate-50'}`}
        >
          {canUsePremium ? (
            <svg className="w-6 h-6 text-slate-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
          ) : (
            <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
          )}
          <span className={`text-[9px] font-black uppercase tracking-widest ${!canUsePremium ? 'text-amber-600' : 'text-slate-500'}`}>Câmera {!canUsePremium && '(PRO)'}</span>
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="p-4 border border-slate-200 rounded-2xl hover:bg-slate-50 flex flex-col items-center gap-2 transition-all group">
          <svg className="w-6 h-6 text-slate-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">CSV</span>
        </button>
        <button onClick={() => setIsManualActive(true)} className="p-4 border border-slate-200 rounded-2xl hover:bg-slate-50 flex flex-col items-center gap-2 transition-all group">
          <svg className="w-6 h-6 text-slate-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Manual</span>
        </button>
      </div>
      
      <button 
        onClick={handleDriveUpload} 
        className={`w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl font-bold text-sm shadow-lg transition-all ${!canUsePremium ? 'bg-amber-500 text-white' : 'bg-slate-900 text-white'}`}
      >
        {!canUsePremium ? (
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
        ) : (
          <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" className="w-5 h-5" />
        )}
        Google Drive {!canUsePremium && '(PRO)'}
      </button>

      {isManualActive && (
        <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 animate-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adicionar Contato</h4>
            <button onClick={() => setIsManualActive(false)} className="text-slate-400 hover:text-slate-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
          <form onSubmit={handleManualAdd} className="space-y-3">
            <input type="text" value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Nome do contato" className="w-full p-4 bg-white border border-slate-100 rounded-xl text-sm outline-none focus:border-blue-400" required />
            <input type="tel" value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} placeholder="Telefone (ex: 11999999999)" className="w-full p-4 bg-white border border-slate-100 rounded-xl text-sm outline-none focus:border-blue-400" required />
            <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-blue-100">Adicionar</button>
          </form>
        </div>
      )}

      <div className="flex justify-center pt-2">
        <button onClick={downloadTemplate} className="flex items-center gap-2 px-6 py-3 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">Baixar Template</button>
      </div>
      <input type="file" ref={fileInputRef} hidden accept=".csv" onChange={handleCsvUpload} />
      <input type="file" ref={galleryInputRef} hidden accept="image/*" onChange={handleOcrUpload} />
      {isCameraActive && (
        <div className="fixed inset-0 z-[110] bg-black flex flex-col h-[100dvh]">
          <div className="p-6 flex justify-between items-center text-white">
            <button onClick={() => setIsCameraActive(false)} className="text-xs font-black uppercase bg-white/10 px-4 py-2 rounded-full">Fechar</button>
            <button onClick={() => galleryInputRef.current?.click()} className="text-xs font-black uppercase bg-white/10 px-4 py-2 rounded-full flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Galeria
            </button>
          </div>
          <video ref={videoRef} autoPlay playsInline muted className="flex-1 object-cover" />
          <div className="p-12 flex justify-center bg-black/95"><button onClick={handleCapture} className="w-20 h-20 bg-white rounded-full border-[6px] border-slate-300"></button></div>
        </div>
      )}
      {isAnalyzing && (
        <div className="fixed inset-0 z-[120] bg-slate-900 flex flex-col items-center justify-center text-white"><div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6" /><h2 className="text-xl font-black">Analisando...</h2></div>
      )}
      {error && <div className="p-4 bg-red-50 text-red-600 text-[10px] font-bold rounded-xl border border-red-100">{error}</div>}
      <canvas ref={canvasRef} hidden />
    </div>
  );
};
