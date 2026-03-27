import React, { useEffect, useState, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function VoiceActivation({ activeTab = "sales" }) {
  const [isListening, setIsListening] = useState(false);
  const [micAvailable, setMicAvailable] = useState(true);
  const recognitionRef = useRef(null);
  const listeningTimeoutRef = useRef(null);
  // Usamos un ref para el transcript para evitar problemas de closure en los eventos
  const transcriptRef = useRef('');

  useEffect(() => {
    const initMicrophone = async () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        setMicAvailable(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        setMicAvailable(false);
        console.warn('Micrófono no disponible o permiso denegado');
      }
    };

    initMicrophone();
    return () => clearTimeout(listeningTimeoutRef.current);
  }, []);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition || isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-MX'; // Optimizado para español latino/mexicano
    recognition.continuous = false; 
    recognition.interimResults = false; // Cambiado a false para obtener solo el bloque final limpio

    transcriptRef.current = ''; // Resetear al inicio

    recognition.onstart = () => {
      setIsListening(true);
      // Timeout de seguridad: si no detecta nada en 8s, se apaga
      listeningTimeoutRef.current = setTimeout(() => recognition.stop(), 8000);
    };

    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1][0].transcript;
      transcriptRef.current = result;
    };
    
    recognition.onend = () => {
      setIsListening(false);
      clearTimeout(listeningTimeoutRef.current);
      
      const finalText = transcriptRef.current.trim();
      if (finalText) {
        // Notificamos al sistema
        const voiceEvent = new CustomEvent("voiceInput", { 
          detail: { text: finalText, tab: activeTab } 
        });
        window.dispatchEvent(voiceEvent);
        toast.success(`Entendido: "${finalText}"`, { duration: 2000 });
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech error:', event.error);
      setIsListening(false);
      if (event.error !== 'no-speech') toast.error('Error al reconocer voz');
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  if (!micAvailable) return null;

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      <div className="flex flex-col items-center gap-3">
        {isListening && (
           <div className="flex gap-1 mb-2">
              <span className="w-1 h-4 bg-red-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-6 bg-red-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-4 bg-red-500 animate-bounce" style={{ animationDelay: '300ms' }} />
           </div>
        )}
        <Button
          onClick={startListening}
          size="icon"
          className={`w-14 h-14 rounded-full shadow-xl transition-all duration-300 ${
            isListening
              ? 'bg-red-500 hover:bg-red-600 scale-110'
              : 'bg-primary hover:bg-primary/90 hover:scale-105'
          }`}
        >
          {isListening ? (
            <MicOff className="w-6 h-6 animate-pulse" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </Button>
        <span className={`text-[10px] font-bold uppercase tracking-widest transition-opacity ${isListening ? 'text-red-500' : 'text-slate-400'}`}>
          {isListening ? 'Escuchando...' : 'Voz'}
        </span>
      </div>
    </div>
  );
}