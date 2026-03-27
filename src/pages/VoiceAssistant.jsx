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
  
  // REFERENCIA MAESTRA: Evita que se encimen los audios
  const audioRef = useRef(null);

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => base44.entities.Recipe.list(),
  });

  useEffect(() => {
    const initConversation = async () => {
      try {
        const conv = await base44.agents.createConversation({
          agent_name: "restaurantAI", // Usando el agente nuevo que creaste
          metadata: { name: "Voice Session" },
        });
        setConversationId(conv.id);
        setMessages(conv.messages || []);
      } catch (err) {
        toast.error("Error al conectar con el asistente");
      }
    };
    initConversation();
    return () => {
      if (audioRef.current) audioRef.current.pause();
      clearTimeout(speakTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      const msgs = data.messages || [];
      setMessages(msgs);
      const lastMsg = msgs[msgs.length - 1];
      
      if (lastMsg?.role === "assistant" && lastMsg?.content) {
        setIsLoading(false);
        const contentLower = lastMsg.content.toLowerCase();
        setShowMarginAnalysis(contentLower.includes("margen") || contentLower.includes("rentable"));
        
        // Solo hablar si el mensaje es nuevo
        if (lastMsg.id !== lastSpokenIdRef.current) {
          clearTimeout(speakTimerRef.current);
          speakTimerRef.current = setTimeout(() => {
            lastSpokenIdRef.current = lastMsg.id;
            speakMessage(lastMsg.content);
          }, 600);
        }
      }
    });
    return () => unsubscribe();
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const speakMessage = async (text) => {
    if (!text || isListening) return;

    // DETENER AUDIO ANTERIOR (Solución al problema de "muchos hablando")
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsSpeaking(true);

    try {
      // Parámetros de ESTABILIDAD Y CLARIDAD
      const res = await base44.functions.invoke("elevenLabsTTS", { 
        text,
        voice_settings: {
          stability: 0.5,       // Evita que la voz se quiebre
          similarity_boost: 0.8, // Mayor nitidez
          use_speaker_boost: true
        }
      });

      const base64 = res.data?.audio;
      if (!base64) throw new Error();

      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      
      const blob = new Blob([bytes], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      audioRef.current = audio;
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };
      
      await audio.play();
    } catch {
      setIsSpeaking(false);
      console.warn("Fallo en TTS o límites de ElevenLabs.");
    }
  };

  const sendMessage = async (text) => {
    if (!text.trim() || !conversationId || isLoading) return;
    
    // Callar al asistente si el usuario responde
    if (audioRef.current) audioRef.current.pause(); 
    
    setInput("");
    setIsLoading(true);
    try {
      // Usamos la fecha local de tu zona horaria (Mountain Time) para que no haya desfase de días
      const localDate = new Date().toLocaleDateString('en-CA'); 
      await base44.agents.addMessage(
        { id: conversationId }, 
        { role: "user", content: text.trim(), metadata: { currentDate: localDate } }
      );
    } catch {
      setIsLoading(false);
      toast.error("Error al enviar mensaje");
    }
  };

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return toast.error("Usa Chrome para esta función.");

    if (audioRef.current) audioRef.current.pause();
    
    const recognition = new SpeechRecognition();
    recognition.lang = "es-MX";
    recognition.interimResults = true;

    recognition.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) sendMessage(e.results[i][0].transcript);
        else interim = e.results[i][0].transcript;
      }
      setInterimText(interim);
    };

    recognition.onend = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
    recognitionRef.current = recognition;
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 p-4">
      <div className="max-w-2xl mx-auto w-full flex flex-col h-full gap-4">
        
        <Card className="border-none shadow-sm">
          <CardHeader className="p-4 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isSpeaking ? "bg-green-500 animate-ping" : "bg-slate-300"}`} />
              Asistente SavoryPOS
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowWhatsApp(!showWhatsApp)}>
              <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
            </Button>
          </CardHeader>
        </Card>

        <div className="flex-1 overflow-y-auto space-y-4 px-2 scrollbar-hide">
          {showMarginAnalysis && recipes.length > 0 && <MarginAnalysisVisual recipes={recipes} onNavigate={navigate} />}
          
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-60 gap-4">
               <ChefHat className="w-12 h-12" />
               <p>Pregúntame sobre tus ventas de hoy o gastos.</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
                  msg.role === "user" ? "bg-blue-600 text-white rounded-tr-none" : "bg-white border rounded-tl-none"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <Card className="border-t shadow-lg">
          <CardContent className="p-3">
            <div className="flex gap-2">
              <Button 
                variant={isListening ? "destructive" : "secondary"} 
                onClick={isListening ? () => recognitionRef.current?.stop() : startRecording}
                className="rounded-full w-12 h-12 p-0 shrink-0"
              >
                {isListening ? <MicOff /> : <Mic />}
              </Button>
              <Input 
                value={input} 
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage(input)}
                placeholder="Escribe o presiona el micro..."
                className="rounded-full bg-slate-100 border-none"
                disabled={isLoading}
              />
              <Button onClick={() => sendMessage(input)} className="rounded-full w-12 h-12 p-0 shrink-0" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
              </Button>
            </div>
            {interimText && <p className="text-[10px] text-center mt-2 text-slate-400 italic">"{interimText}..."</p>}
          </CardContent>
        </Card>
      </div>}