import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, MicOff, Loader2, MessageCircle, X, Volume2, TrendingUp, DollarSign, Package, ChefHat } from "lucide-react";
import { toast } from "sonner";
import MarginAnalysisVisual from "@/components/costing/MarginAnalysisVisual";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const QUICK_ACTIONS = [
  { label: "¿Cómo voy hoy?", icon: TrendingUp, color: "text-green-600 bg-green-50 border-green-200 hover:bg-green-100" },
  { label: "Registrar gasto", icon: DollarSign, color: "text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100" },
  { label: "Ver inventario", icon: Package, color: "text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100" },
  { label: "Analizar platillo", icon: ChefHat, color: "text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100" },
];

export default function VoiceAssistant() {
  const navigate = useNavigate();
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [showMarginAnalysis, setShowMarginAnalysis] = useState(false);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const lastSpokenIdRef = useRef(null);
  const speakTimerRef = useRef(null);
  const conversationIdRef = useRef(null);
  const isLoadingRef = useRef(false);
  
  // REFERENCIA CRÍTICA: Control de audio para evitar solapamientos
  const currentAudioRef = useRef(null);

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => base44.entities.Recipe.list(),
  });

  // Inicialización de la conversación
  useEffect(() => {
    const initConversation = async () => {
      try {
        const conv = await base44.agents.createConversation({
          agent_name: "voiceAssistant",
          metadata: { name: "Voice Assistant Session" },
        });
        setConversationId(conv.id);
        setMessages(conv.messages || []);
      } catch (err) {
        console.error("Error creating conversation:", err);
        toast.error("Error al iniciar el asistente");
      }
    };
    initConversation();
    
    // Limpieza al desmontar el componente
    return () => {
      if (currentAudioRef.current) currentAudioRef.current.pause();
      clearTimeout(speakTimerRef.current);
    };
  }, []);

  useEffect(() => { conversationIdRef.current = conversationId; }, [conversationId]);
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);

  // Suscripción a mensajes con lógica de voz mejorada
  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      const msgs = data.messages || [];
      setMessages(msgs);
      const lastMsg = msgs[msgs.length - 1];

      if (lastMsg?.role === "assistant" && lastMsg?.content) {
        setIsLoading(false);
        isLoadingRef.current = false;

        // Lógica de visualización de márgenes
        const contentLower = lastMsg.content.toLowerCase();
        setShowMarginAnalysis(
          contentLower.includes("margen") || 
          contentLower.includes("platillo") ||
          contentLower.includes("rentable")
        );

        // Lógica de voz: Evitar repetir el mismo mensaje y controlar timers
        if (lastMsg.id !== lastSpokenIdRef.current) {
          clearTimeout(speakTimerRef.current);
          speakTimerRef.current = setTimeout(() => {
            lastSpokenIdRef.current = lastMsg.id;
            speakMessage(lastMsg.content);
          }, 500); // Reducido el delay para mayor fluidez
        }
      } else if (lastMsg?.role === "user") {
        setIsLoading(true);
      }
    });
    return () => { unsubscribe(); clearTimeout(speakTimerRef.current); };
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Función TTS optimizada para ElevenLabs
  const speakMessage = async (text) => {
    if (!text) return;

    // 1. Detener cualquier audio que esté sonando actualmente
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    setIsSpeaking(true);

    try {
      const res = await base44.functions.invoke("elevenLabsTTS", { text });
      const base64 = res.data?.audio;
      
      if (!base64) throw new Error("No audio data received");

      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      
      const blob = new Blob([bytes], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      currentAudioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        currentAudioRef.current = null;
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        currentAudioRef.current = null;
      };

      await audio.play();
    } catch (error) {
      console.error("TTS Error:", error);
      setIsSpeaking(false);
      // Fallback: usar síntesis nativa si ElevenLabs falla por créditos o red
      // const utterance = new SpeechSynthesisUtterance(text);
      // window.speechSynthesis.speak(utterance);
    }
  };

  const sendMessageDirectly = async (text) => {
    if (!text.trim() || !conversationIdRef.current || isLoadingRef.current) return;
    
    // Detener audio si el usuario interrumpe con un nuevo mensaje
    if (currentAudioRef.current) currentAudioRef.current.pause();

    setInput("");
    setIsLoading(true);
    isLoadingRef.current = true;
    try {
      await base44.agents.addMessage({ id: conversationIdRef.current }, { role: "user", content: text.trim() });
    } catch (err) {
      setIsLoading(false);
      isLoadingRef.current = false;
      toast.error("Error al enviar");
    }
  };

  const handleSendMessage = () => sendMessageDirectly(input);

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Navegador no compatible con voz.");
      return;
    }

    if (currentAudioRef.current) currentAudioRef.current.pause(); // Callar al asistente al hablarle

    const recognition = new SpeechRecognition();
    recognition.lang = "es-MX"; 
    recognition.interimResults = true;
    recognition.continuous = false; // Cambiado a false para detectar el final de la frase más rápido

    recognition.onresult = (e) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      setInterimText(interim);
      if (final) {
        setInput(final);
        sendMessageDirectly(final);
        recognition.stop();
      }
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="max-w-2xl mx-auto w-full flex flex-col h-full gap-3">
        
        {/* Header */}
        <Card className="shrink-0 border-primary/20 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isSpeaking ? "bg-green-100 animate-pulse" : "bg-primary/10"}`}>
                  <Mic className={`w-4 h-4 ${isSpeaking ? "text-green-600" : "text-primary"}`} />
                </div>
                Asistente SavoryPOS
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowWhatsApp(!showWhatsApp)} className="text-xs">
                <MessageCircle className="w-3 h-3 mr-1" /> WhatsApp
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Chat Area */}
        <div className="flex-1 overflow-auto space-y-4 px-1 custom-scrollbar">
          {showMarginAnalysis && recipes.length > 0 && (
            <div className="mb-4 animate-in fade-in slide-in-from-top-4 duration-500">
              <MarginAnalysisVisual recipes={recipes} onNavigate={navigate} />
            </div>
          )}

          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-6 opacity-80">
              <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center">
                <ChefHat className="w-8 h-8 text-primary/40" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-sm">¿En qué puedo ayudarte hoy?</p>
                <p className="text-xs text-muted-foreground">Analizo tus ventas, costos y stock en tiempo real.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                {QUICK_ACTIONS.map((a) => (
                  <button key={a.label} onClick={() => sendMessageDirectly(a.label)} className={`p-3 rounded-xl border text-[11px] font-semibold transition-all hover:scale-105 active:scale-95 flex items-center gap-2 ${a.color}`}>
                    <a.icon className="w-4 h-4" /> {a.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`relative max-w-[85%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                  msg.role === "user" 
                  ? "bg-primary text-primary-foreground rounded-br-none" 
                  : "bg-card border rounded-bl-none"
                }`}>
                  {msg.content}
                  {msg.role === "assistant" && (
                    <button 
                      onClick={() => speakMessage(msg.content)}
                      className="absolute -right-8 top-2 p-1 hover:bg-primary/10 rounded-full transition-colors"
                    >
                      <Volume2 className={`w-4 h-4 ${isSpeaking ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <Card className="shrink-0 shadow-lg border-t-0">
          <CardContent className="p-3">
            <div className="flex gap-2 items-center">
              <Button
                variant={isListening ? "destructive" : "secondary"}
                size="icon"
                onClick={isListening ? stopRecording : startRecording}
                disabled={isLoading}
                className={`rounded-full shrink-0 ${isListening ? "animate-pulse" : ""}`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              
              <div className="relative flex-1">
                <Input
                  placeholder={isListening ? "Escuchando..." : "Escribe aquí..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  className="pr-10 rounded-full bg-muted/50 border-none focus-visible:ring-1"
                />
                {isLoading && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-primary" />}
              </div>

              <Button 
                onClick={handleSendMessage} 
                disabled={!input.trim() || isLoading} 
                size="icon" 
                className="rounded-full shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            {interimText && (
              <p className="text-[10px] text-center mt-2 text-muted-foreground animate-pulse italic">
                "{interimText}..."
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}