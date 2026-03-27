import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, MicOff, Loader2, Volume2, TrendingUp, Package, ChefHat, PieChart, DollarSign } from "lucide-react";

// Botones de Consultoría Experta
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
    return () => audioRef.current?.pause();
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
    if (audioRef.current) audioRef.current.pause();
    setIsSpeaking(true);
    try {
      // Limpieza profunda para estabilidad de voz
      const cleanText = text
        .replace(/[*#]/g, "")
        .replace(/%/g, " por ciento")
        .replace(/\$/g, " pesos ")
        .replace(/\n/g, ". ");

      const res = await base44.functions.invoke("elevenLabsTTS", { text: cleanText });
      if (!res.data?.audio) throw new Error("No audio");

      const audio = new Audio(`data:audio/mpeg;base64,${res.data.audio}`);
      audioRef.current = audio;
      audio.onended = () => setIsSpeaking(false);
      await audio.play();
    } catch { 
      setIsSpeaking(false); 
      // Fallback: Si ElevenLabs falla, mostramos error visual pero no bloqueamos
    }
  };

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return;
    if (audioRef.current) audioRef.current.pause();
    setIsLoading(true);
    setInput("");
    const today = new Date().toLocaleDateString('en-CA');
    const isSpanish = /[áéíóúñ]/i.test(text);
    const lang = isSpanish ? "RESPONDER EN ESPAÑOL:" : "RESPOND IN ENGLISH:";
    
    try {
      await base44.agents.addMessage(
        { id: conversationId }, 
        { role: "user", content: `Date: ${today}. ${lang} ${text}` }
      );
    } catch { setIsLoading(false); }
  };

  const startVoiceCapture = () => {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) return;
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
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <Card className="rounded-none border-b shadow-sm">
        <CardHeader className="p-4 py-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isSpeaking ? "bg-green-500 animate-pulse" : "bg-slate-300"}`} />
            Consultor Experto IA
          </CardTitle>
          <div className="text-[10px] text-slate-400 font-mono">BILINGUAL ANALYTICS</div>
        </CardHeader>
      </Card>

      {/* Botones de Acción Rápida */}
      <div className="flex gap-2 p-4 overflow-x-auto bg-white/50 border-b">
        {CONSULTANT_ACTIONS.map((btn) => (
          <button
            key={btn.label}
            onClick={() => sendMessage(btn.prompt)}
            className={`flex items-center gap-2 px-3 py-2 rounded-full border text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${btn.color} border-current/20`}
          >
            <btn.icon className="w-3.5 h-3.5" />
            {btn.label}
          </button>
        ))}
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 opacity-60">
            <ChefHat className="w-12 h-12" />
            <p className="text-sm font-medium">¿En qué área de tu negocio nos enfocamos hoy?</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`p-4 rounded-2xl max-w-[85%] text-sm shadow-sm ${
              msg.role === "user" ? "bg-slate-800 text-white rounded-tr-none" : "bg-white border rounded-tl-none text-slate-700"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer / Input */}
      <div className="p-4 bg-white border-t space-y-3">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <Button 
            variant={isListening ? "destructive" : "secondary"} 
            className="rounded-full w-12 h-12 shrink-0"
            onClick={startVoiceCapture}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          
          <Input 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            onKeyDown={e => e.key === "Enter" && sendMessage(input)} 
            placeholder="Hazme una pregunta analítica..." 
            className="rounded-full bg-slate-100 border-none px-6"
            disabled={isLoading}
          />
          
          <Button onClick={() => sendMessage(input)} disabled={isLoading} className="rounded-full w-12 h-12 shrink-0">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}