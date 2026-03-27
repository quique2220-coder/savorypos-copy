import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, MicOff, Loader2, TrendingUp, Package, ChefHat, PieChart, AlertCircle } from "lucide-react";

// Botones de acceso rápido para el Consultor
const ACTIONS = [
  { label: "Ventas", prompt: "¿Cómo van las ventas de hoy?", icon: TrendingUp },
  { label: "Inventario", prompt: "¿Qué hay bajo en stock?", icon: Package },
  { label: "Platillos", prompt: "Analiza el costo de mis platillos", icon: ChefHat },
  { label: "Márgenes", prompt: "¿Cuáles son mis mejores márgenes?", icon: PieChart },
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

  // Inicializar conversación
  useEffect(() => {
    const init = async () => {
      try {
        const conv = await base44.agents.createConversation({ agent_name: "restaurantAI" });
        setConversationId(conv.id);
      } catch (err) {
        console.error("Error al conectar con el agente");
      }
    };
    init();
    return () => audioRef.current?.pause();
  }, []);

  // Suscribirse a los mensajes
  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      const msgs = data.messages || [];
      setMessages(msgs);
      const lastMsg = msgs[msgs.length - 1];

      // Si el mensaje es del asistente y no se ha hablado, reproducir voz
      if (lastMsg?.role === "assistant" && lastMsg.id !== lastSpokenIdRef.current) {
        setIsLoading(false);
        lastSpokenIdRef.current = lastMsg.id;
        handleVoice(lastMsg.content);
      }
    });
    return () => unsubscribe();
  }, [conversationId]);

  // Auto-scroll al final
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleVoice = async (text) => {
    if (audioRef.current) audioRef.current.pause();
    setIsSpeaking(true);
    try {
      // FILTRO MAESTRO: Limpia el texto para que ElevenLabs sea fluido
      const cleanText = text
        .replace(/[*#]/g, "")                // Quita asteriscos/hashtags
        .replace(/%/g, " por ciento")        // % -> texto
        .replace(/\$/g, " pesos ")           // $ -> texto
        .replace(/\n/g, ". ")                // Saltos de línea -> puntos
        .replace(/\((.*?)\)/g, ". ");        // Quita paréntesis para evitar cortes

      const res = await base44.functions.invoke("elevenLabsTTS", { text: cleanText });
      
      if (res.data?.audio) {
        const audio = new Audio(`data:audio/mpeg;base64,${res.data.audio}`);
        audioRef.current = audio;
        audio.onended = () => setIsSpeaking(false);
        await audio.play();
      }
    } catch (error) {
      console.error("Error en audio:", error);
      setIsSpeaking(false);
    }
  };

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return;
    if (audioRef.current) audioRef.current.pause();
    
    setIsLoading(true);
    setInput("");
    
    const today = new Date().toLocaleDateString('en-CA');
    const isSpanish = /[áéíóúñ]/i.test(text);
    const langPrefix = isSpanish ? "RESPONDER EN ESPAÑOL:" : "RESPOND IN ENGLISH:";

    try {
      await base44.agents.addMessage(
        { id: conversationId }, 
        { role: "user", content: `Date: ${today}. ${langPrefix} ${text.trim()}` }
      );
    } catch (err) {
      setIsLoading(false);
    }
  };

  const toggleListening = () => {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) return alert("Navegador no compatible con voz");
    
    const rec = new Speech();
    rec.lang = "es-MX";
    rec.onresult = (e) => {
      if (e.results[0].isFinal) sendMessage(e.results[0][0].transcript);
    };
    rec.onend = () => setIsListening(false);
    rec.start();
    setIsListening(true);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100 p-4 gap-4 overflow-hidden">
      {/* Header Visual */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded-full ${isSpeaking ? "bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]" : "bg-slate-300"}`} />
          <h1 className="font-bold text-slate-800">Consultor SavoryPOS</h1>
        </div>
        <div className="text-[10px] bg-slate-800 text-white px-2 py-1 rounded-md font-mono tracking-tighter">BILINGUAL AI</div>
      </div>

      {/* Botones de Acción */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {ACTIONS.map(a => (
          <Button key={a.label} variant="outline" size="sm" onClick={() => sendMessage(a.prompt)} className="rounded-full bg-white shadow-sm hover:bg-slate-50 shrink-0 border-slate-200">
            <a.icon className="w-4 h-4 mr-2" /> {a.label}
          </Button>
        ))}
      </div>

      {/* Historial de Mensajes */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 opacity-50">
            <ChefHat className="w-12 h-12" />
            <p className="text-sm font-medium italic">¿En qué área de tu negocio nos enfocamos hoy?</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <Card className={`max-w-[85%] border-none shadow-sm ${msg.role === "user" ? "bg-slate-800 text-white rounded-tr-none" : "bg-white rounded-tl-none"}`}>
              <CardContent className="p-4 text-sm leading-relaxed">
                {msg.content}
                {/* Visualizador de errores de ingredientes */}
                {msg.content.includes("failed") && msg.role === "assistant" && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-xs">
                    <AlertCircle className="w-4 h-4" /> Error en conversión de unidades
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Barra de Entrada */}
      <div className="bg-white p-3 rounded-3xl shadow-xl border border-slate-200 flex gap-2 max-w-4xl mx-auto w-full">
        <Button 
          variant={isListening ? "destructive" : "secondary"} 
          className="rounded-full w-12 h-12 shrink-0 transition-all"
          onClick={toggleListening}
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </Button>
        
        <Input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={e => e.key === "Enter" && sendMessage(input)}
          placeholder="Consulta ventas, márgenes o costos..." 
          className="border-none bg-slate-50 rounded-full focus-visible:ring-0 px-6 h-12"
          disabled={isLoading}
        />
        
        <Button onClick={() => sendMessage(input)} disabled={isLoading || !input.trim()} className="rounded-full w-12 h-12 shrink-0 bg-slate-800 hover:bg-slate-700">
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </Button>
      </div>
    </div>
  );
}