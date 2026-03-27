import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, MicOff, Loader2, Volume2, TrendingUp, Package, ChefHat, PieChart, DollarSign } from "lucide-react";

const CONSULTANT_ACTIONS = [
  { label: "Ventas", prompt: "¿Cómo van las ventas de hoy?", icon: TrendingUp, color: "text-blue-600 bg-blue-50" },
  { label: "Inventario", prompt: "¿Qué artículos están bajos?", icon: Package, color: "text-orange-600 bg-orange-50" },
  { label: "Platillos", prompt: "Analiza el costo de mis platillos", icon: ChefHat, color: "text-purple-600 bg-purple-50" },
  { label: "Márgenes", prompt: "¿Cuáles son mis mejores márgenes?", icon: PieChart, color: "text-green-600 bg-green-50" },
  { label: "Finanzas", prompt: "Resumen de gastos de este mes", icon: DollarSign, color: "text-red-600 bg-red-50" },
];

export default function VoiceAssistant() {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const audioRef = useRef(null);
  const lastSpokenIdRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        const conv = await base44.agents.createConversation({ agent_name: "restaurantAI" });
        setConversationId(conv.id);
      } catch (err) { console.error("Error al iniciar agente"); }
    };
    init();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      const msgs = data.messages || [];
      setMessages(msgs);
      const lastMsg = msgs[msgs.length - 1];
      
      if (lastMsg?.role === "assistant" && lastMsg.id !== lastSpokenIdRef.current) {
        setIsLoading(false);
        lastSpokenIdRef.current = lastMsg.id;
        handleVoice(lastMsg.content);
      }
    });
    return () => unsubscribe();
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleVoice = async (text) => {
    // 1. Detener audio previo de forma segura
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setIsSpeaking(true);
    try {
      // 2. Limpieza Ultra para TTS: convierte listas y símbolos en habla fluida
      const cleanText = text
        .replace(/[*#_]/g, "") // Limpiar Markdown
        .replace(/(\d+)\./g, "Punto $1,") // Convierte "1." en "Punto 1," para pausas
        .replace(/%/g, " por ciento")
        .replace(/\$/g, " pesos ")
        .replace(/-/g, " menos ")
        .replace(/\n/g, ". ")
        .trim();

      const res = await base44.functions.invoke("elevenLabsTTS", { text: cleanText });
      if (!res.data?.audio) throw new Error("No audio payload");

      const audio = new Audio(`data:audio/mpeg;base64,${res.data.audio}`);
      audioRef.current = audio;
      
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);
      
      await audio.play();
    } catch (err) { 
      console.error("Audio Error:", err);
      setIsSpeaking(false); 
    }
  };

  const sendMessage = async (text) => {
    const messageText = text || input;
    if (!messageText.trim() || isLoading) return;
    
    // Detener voz si el usuario interrumpe con una nueva pregunta
    if (audioRef.current) {
      audioRef.current.pause();
      setIsSpeaking(false);
    }

    setIsLoading(true);
    setInput("");
    
    const today = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const isSpanish = /[áéíóúñ]/i.test(messageText);
    const langHeader = isSpanish ? "CONTESTA EN ESPAÑOL:" : "RESPOND IN ENGLISH:";
    
    try {
      await base44.agents.addMessage(
        { id: conversationId }, 
        { role: "user", content: `Hoy es ${today}. ${langHeader} ${messageText}` }
      );
    } catch (err) { 
      setIsLoading(false); 
    }
  };

  const startVoiceCapture = () => {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) {
      alert("Tu navegador no soporta reconocimiento de voz.");
      return;
    }
    const rec = new Speech();
    rec.lang = "es-MX";
    rec.continuous = false;
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      sendMessage(transcript);
    };
    rec.onend = () => setIsListening(false);
    rec.start();
    setIsListening(true);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${isSpeaking ? "bg-green-500 animate-ping" : "bg-slate-300"}`} />
            <div className={`absolute inset-0 w-3 h-3 rounded-full ${isSpeaking ? "bg-green-500" : "bg-slate-300"}`} />
          </div>
          <h1 className="font-bold text-slate-800">Savory Consultant</h1>
        </div>
        <div className="text-[10px] font-black text-slate-400 tracking-tighter uppercase">AI Analytics Engine</div>
      </div>

      {/* Acciones Rápidas */}
      <div className="flex gap-2 p-4 overflow-x-auto no-scrollbar bg-white/40 border-b shrink-0">
        {CONSULTANT_ACTIONS.map((btn) => (
          <button
            key={btn.label}
            onClick={() => sendMessage(btn.prompt)}
            disabled={isLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold transition-all hover:shadow-sm active:scale-95 disabled:opacity-50 ${btn.color} border-current/10`}
          >
            <btn.icon className="w-3.5 h-3.5" />
            {btn.label}
          </button>
        ))}
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4 opacity-50">
            <ChefHat className="w-16 h-16" />
            <div className="text-center">
              <p className="text-sm font-bold">Bienvenido, Chef.</p>
              <p className="text-xs">Pregúntame sobre tus ventas, costos o inventario.</p>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`p-4 rounded-2xl max-w-[85%] text-sm leading-relaxed ${
              msg.role === "user" 
                ? "bg-slate-900 text-slate-50 rounded-tr-none shadow-lg shadow-slate-200" 
                : "bg-white border border-slate-100 rounded-tl-none text-slate-700 shadow-sm"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border p-4 rounded-2xl rounded-tl-none">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-6 bg-white border-t shrink-0">
        <div className="max-w-4xl mx-auto flex gap-3">
          <Button 
            variant={isListening ? "destructive" : "outline"} 
            size="icon"
            className={`rounded-full shrink-0 transition-all ${isListening ? "animate-pulse" : ""}`}
            onClick={startVoiceCapture}
            disabled={isLoading}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          
          <Input 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            onKeyDown={e => e.key === "Enter" && sendMessage()} 
            placeholder="Escribe o usa el micrófono..." 
            className="rounded-full bg-slate-50 border-slate-200 px-6 focus-visible:ring-slate-300"
            disabled={isLoading}
          />
          
          <Button 
            onClick={() => sendMessage()} 
            disabled={isLoading || !input.trim()} 
            size="icon"
            className="rounded-full shrink-0 shadow-md"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}