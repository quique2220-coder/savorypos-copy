import React, { useEffect, useState, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function VoiceActivation({ activeTab = "sales" }) {
  const [isListening, setIsListening] = useState(false);
  const [micAvailable, setMicAvailable] = useState(true);
  const recognitionRef = useRef(null);
  const listeningTimeoutRef = useRef(null);

  useEffect(() => {
    const initMicrophone = async () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        setMicAvailable(false);
        toast.error('Tu navegador no soporta grabación de voz');
        return;
      }

      try {
        // Pedir permiso de micrófono
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        setMicAvailable(false);
        toast.error('Necesitas dar permiso de micrófono');
      }
    };

    initMicrophone();
  }, []);

  const startListening = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error('Tu navegador no soporta grabación de voz');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      clearTimeout(listeningTimeoutRef.current);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = true;

    let finalTranscript = '';

    recognition.onstart = () => {
      setIsListening(true);
      // Auto-stop después de 10 segundos de silencio
      clearTimeout(listeningTimeoutRef.current);
      listeningTimeoutRef.current = setTimeout(() => {
        if (recognition) {
          recognition.stop();
        }
      }, 10000);
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
    };
    
    recognition.onend = () => {
      setIsListening(false);
      clearTimeout(listeningTimeoutRef.current);
      
      // Dispatch event cuando termina con transcript final
      if (finalTranscript.trim()) {
        const voiceEvent = new CustomEvent("voiceInput", { detail: { text: finalTranscript.trim(), tab: activeTab } });
        console.log('Enviando voz:', finalTranscript.trim(), 'a tab:', activeTab);
        window.dispatchEvent(voiceEvent);
      }
    };

    recognition.onerror = (event) => {
      console.error('Microphone error:', event.error);
      setIsListening(false);
      clearTimeout(listeningTimeoutRef.current);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  if (!micAvailable) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={startListening}
        size="lg"
        className={`rounded-full shadow-2xl transition-all ${
          isListening
            ? 'bg-red-500 hover:bg-red-600 animate-pulse'
            : 'bg-primary hover:bg-primary/90'
        }`}
        title={isListening ? 'Escuchando... Haz clic para detener' : 'Haz clic o di "hey" para hablar'}
      >
        {isListening ? (
          <MicOff className="w-6 h-6" />
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </Button>
    </div>
  );
}