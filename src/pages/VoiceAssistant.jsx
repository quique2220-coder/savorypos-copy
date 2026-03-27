import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Send, Mic, MicOff, Loader2, MessageCircle, 
  TrendingUp, Package, ChefHat, DollarSign, PieChart, Volume2 
} from "lucide-react";
import { toast } from "sonner";
import MarginAnalysisVisual from "@/components/costing/MarginAnalysisVisual";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const ANALYTIC_ACTIONS = [
  { label: "Ventas & Performance", icon: TrendingUp, prompt: "¿Cómo van las ventas y el performance de hoy?", color: "text-blue-600 bg-blue-50 border-blue-200" },
  { label: "Inventario", icon: Package, prompt: "¿Qué artículos están bajos en inventario?", color: "text-orange-600 bg-orange-50 border-orange-200" },
  { label: "Platillos", icon: ChefHat, prompt: "Analiza el costo y rendimiento de mis platillos", color: "text-purple-600 bg-purple-50 border-purple-200" },
  { label: "Precios & Márgenes", icon: PieChart, prompt: "¿Cuáles son mis platillos con mejor margen de ganancia?", color: "text-green-600 bg-green-50 border-green-200" },
  { label: "Finanzas", icon: DollarSign, prompt: "Dame un resumen de mis gastos y salud financiera", color: "text-red-600 bg-red-50 border-red-200" },
];

export default function VoiceAssistant() {
  const navigate = useNavigate();
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showMarginAnalysis, setShowMarginAnalysis] = useState(false);
  const [interimText, setInterimText] = useState("");

  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  const lastSpokenIdRef = useRef(null);

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => base44.entities.Recipe.list(),
  });

  useEffect(() => {
    const init = async () => {
      try {
        const conv = await base44.agents.createConversation({
          agent_name: "restaurantAI",
          metadata: { type: "expert_consultant" }
        });
        setConversationId(conv.id);
        setMessages(conv.messages || []);
      } catch (err) {
        toast.error("Error al iniciar Consultor IA");
      }
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
      
      if (lastMsg?.role === "assistant" && lastMsg?.content) {
        setIsLoading(false);
        // Activar visual de márgenes si se menciona
        if (lastMsg.content.toLowerCase().includes("margen")) setShowMarginAnalysis(true);

        if (lastMsg.id !== lastSpokenIdRef.current) {
          lastSpokenIdRef.current = lastMsg.id;
          speak(lastMsg.content);
        }
      }
    });
    return () => unsubscribe();
  }, [conversationId]);

  const speak = async (text) => {
    if (audioRef.current) audioRef.current.pause();
    setIsSpeaking(true);
    try {
      const res = await base44.functions.invoke("elevenLabsTTS", { 
        text,
        voice_settings: { stability: 0.6, similarity_boost: 0.85 } 
      });
      const audio = new Audio(`data:audio/mpeg;base64,${res.data.audio}`);
      audioRef.current = audio;
      audio.onended = () => setIsSpeaking(false);
      await audio.play();
    } catch {
      setIsSpeaking(false);
    }
  };

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return;
    if (audioRef.current) audioRef.current.pause();
    setInput("");
    setIsLoading(true);
    try {
      const today = new Date().toLocaleDateString('en-CA');
      await base44.agents.addMessage(
        { id: conversationId }, 
        { role: "user", content: `Current date: ${today}. ${text.trim()}` }
      );
    } catch {
      setIsLoading(false);
    }
  };

  const startVoice = () => {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) return toast.error("Navegador no compatible");
    const rec = new Speech();
    rec.lang = "es-MX";
    rec.onresult = (e) => {
      const txt = e.results[0][0].transcript;
      if (e.results[0].isFinal) sendMessage(txt);
      else setInterimText(txt);
    };
    rec.onend = () => setIsListening(false);
    rec.start();
    setIsListening(true);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header Estilo Consultor */}
      <header className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isSpeaking ? "bg-green-500 animate-pulse" : "bg-slate-300"}`} />
            Consultor Experto IA
          </h1>
          <p className="text-xs text-slate-500">Análisis inteligente de tu negocio</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>Salir</Button>
      </header>

      {/* Botones de Análisis Rápido */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 p-4 bg-white/50 border-b">
        {ANALYTIC_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => sendMessage(action.prompt)}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all hover:shadow-md active:scale-95 ${action.color}`}
          >
            <action.icon className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold text-center leading-tight">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Chat & Visuals */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {showMarginAnalysis && recipes.length > 0 && (
          <div className="animate-in fade-in zoom-in duration-300">
            <MarginAnalysisVisual recipes={recipes} onNavigate={navigate} />
          </div>
        )}

        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
            <PieChart className="w-16 h-16" />
            <p className="text-sm max-w-xs">Selecciona un área de análisis arriba o usa el micrófono para consultar datos específicos.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm shadow-sm ${
              msg.role === "user" ? "bg-slate-800 text-white rounded-tr-none" : "bg-white border rounded-tl-none text-slate-700"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>

      {/* Input de Control */}
      <footer className="p-4 bg-white border-t">
        <div className="max-w-3xl mx-auto flex gap-3 items-center">
          <Button 
            variant={isListening ? "destructive" : "secondary"}
            className="rounded-full w-12 h-12 shrink-0 shadow-inner"
            onClick={startVoice}
          >
            {isListening ? <MicOff /> : <Mic />}
          </Button>
          <div className="relative flex-1">
            <Input 
              placeholder="Haz una consulta analítica..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
              className="rounded-full bg-slate-100 border-none pr-10"
            />
            {isLoading && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-slate-400" />}
          </div>
          <Button onClick={() => sendMessage(input)} className="rounded-full w-12 h-12 shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
        {interimText && <p className="text-[10px] text-center mt-2 text-slate-400 italic">"{interimText}..."</p>}
      </footer>
    </div>
  );
}