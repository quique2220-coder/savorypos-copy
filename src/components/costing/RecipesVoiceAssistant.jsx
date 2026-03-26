import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, MicOff, Send, Loader2, Bot, ChevronDown, Calculator, TrendingUp, DollarSign, BarChart2, HelpCircle, PlusCircle, Volume2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const QUICK_ACTIONS = [
  { label: "Explicar overhead", icon: HelpCircle, msg: "¿Cómo calculas el overhead por platillo y qué significa?" },
  { label: "Costear receta", icon: Calculator, msg: "Quiero costear una receta. ¿Qué información necesitas?" },
  { label: "Sugerir precio", icon: DollarSign, msg: "¿Cuál debería ser el precio de venta de mi platillo considerando overhead e ingredientes?" },
  { label: "Simular ventas", icon: TrendingUp, msg: "¿Qué pasa con mi overhead si cambio el volumen de platillos vendidos al mes?" },
  { label: "Analizar margen", icon: BarChart2, msg: "¿Cuál de mis platillos tiene mejor margen y cuál deja menos utilidad?" },
  { label: "Agregar gasto", icon: PlusCircle, msg: "Quiero agregar un gasto operativo mensual." },
];

export default function RecipesVoiceAssistant({ conversationId, onConversationCreated, externalOpen, onOpenChange }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (externalOpen !== undefined) setOpen(externalOpen);
  }, [externalOpen]);

  const handleSetOpen = (val) => {
    setOpen(val);
    onOpenChange?.(val);
  };
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const qc = useQueryClient();
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const convIdRef = useRef(conversationId);
  const isLoadingRef = useRef(false);
  const lastSpokenIdRef = useRef(null);
  const audioRef = useRef(null);
  const isSpeakingRef = useRef(false);

  useEffect(() => { convIdRef.current = conversationId; }, [conversationId]);
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);

  useEffect(() => {
    if (!conversationId) return;
    const unsub = base44.agents.subscribeToConversation(conversationId, (data) => {
      const msgs = data.messages || [];
      setMessages(msgs);
      const last = msgs[msgs.length - 1];
      if (last?.role === "assistant") {
        setIsLoading(false);
        isLoadingRef.current = false;
        // Speak assistant message (con ID único para evitar duplicados)
        if (last.content) {
          const messageId = `${last.id || last.content}-${last.timestamp || Date.now()}`;
          speakMessage(last.content, messageId);
        }
        // Invalidate TODAS las queries después de CUALQUIER acción del AI
        setTimeout(() => {
          qc.invalidateQueries({ queryKey: ["orders"] });
          qc.invalidateQueries({ queryKey: ["recipes"] });
          qc.invalidateQueries({ queryKey: ["ingredients"] });
          qc.invalidateQueries({ queryKey: ["operating_expenses"] });
          qc.invalidateQueries({ queryKey: ["inventory"] });
          qc.invalidateQueries({ queryKey: ["menu_items"] });
          qc.invalidateQueries({ queryKey: ["journal_entries"] });
        }, 500);
      }
    });
    return () => unsub();
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initConversation = async () => {
    if (convIdRef.current) return convIdRef.current;
    const conv = await base44.agents.createConversation({
      agent_name: "voiceAssistant",
      metadata: { name: "Recipes Assistant", context: "costing" },
    });
    onConversationCreated?.(conv.id);
    convIdRef.current = conv.id;
    return conv.id;
  };

  const sendMessage = async (text) => {
    if (!text.trim() || isLoadingRef.current) return;
    setInput("");
    setIsLoading(true);
    isLoadingRef.current = true;
    try {
      const id = await initConversation();
      const today = new Date().toISOString().split('T')[0];
      
      const contextMsg = `[${today}] ${text.trim()}`;
      
      await base44.agents.addMessage({ id }, { role: "user", content: contextMsg });
      
      // Invalidar queries
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["orders"] });
        qc.invalidateQueries({ queryKey: ["recipes"] });
        qc.invalidateQueries({ queryKey: ["ingredients"] });
        qc.invalidateQueries({ queryKey: ["operating_expenses"] });
        qc.invalidateQueries({ queryKey: ["inventory"] });
        qc.invalidateQueries({ queryKey: ["menu_items"] });
      }, 100);
    } catch (err) {
      console.error("Send error:", err);
      toast.error("Error al enviar");
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error("Usa Chrome para reconocimiento de voz"); return; }
    const rec = new SR();
    rec.lang = "es-MX";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 5;
    let final = "";

    rec.onstart = () => {
      setIsListening(true);
      toast.info("🎤 Escuchando...");
    };

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          final += transcript + " ";
        } else {
          interim += transcript;
        }
      }
      setInput(final.trim() || interim.trim());
      setInterimText(interim);
    };

    rec.onerror = (e) => {
      console.error("Speech error:", e.error);
      setIsListening(false);
      if (e.error === "no-speech") {
        toast.error("Sin voz. Intenta de nuevo");
      } else if (e.error === "network") {
        toast.error("Error de conexión");
      } else if (e.error === "not-allowed") {
        toast.error("Permiso denegado");
      }
    };

    rec.onend = () => {
      setIsListening(false);
      setInterimText("");
      if (final.trim()) {
        const cleaned = final.trim()
          .replace(/\b(cabo|cava|cava de)\b/gi, "acabo de")
          .replace(/\b(ventaos|ventao|venta o)\b/gi, "venta")
          .replace(/\b(Montessori|mentos|mento|menton)\b/gi, "monto")
          .replace(/\b(love you|llevó|llegó|llevo|cover)\b/gi, "")
          .replace(/\s+/g, " ")
          .trim();
        setInput(cleaned);
        if (cleaned) toast.success("✓ Voz capturada");
      }
    };

    recognitionRef.current = rec;
    final = "";
    rec.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const speakMessage = async (text, messageId) => {
    // Evitar reproducir el mismo mensaje o reproducir múltiples a la vez
    if (lastSpokenIdRef.current === messageId || isSpeakingRef.current) return;
    
    lastSpokenIdRef.current = messageId;
    isSpeakingRef.current = true;

    try {
      // Detener reproducción anterior si existe
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }

      const res = await base44.functions.invoke("elevenLabsTTS", { text });
      if (res.data?.audio) {
        const audio = new Audio(`data:audio/mpeg;base64,${res.data.audio}`);
        audioRef.current = audio;
        
        audio.onended = () => {
          isSpeakingRef.current = false;
        };
        
        audio.onerror = () => {
          isSpeakingRef.current = false;
        };
        
        audio.play();
      } else {
        isSpeakingRef.current = false;
      }
    } catch (err) {
      console.error("TTS Error:", err);
      isSpeakingRef.current = false;
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => handleSetOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl flex flex-col items-center justify-center hover:scale-105 transition-transform z-[99999]"
          style={{ boxShadow: "0 0 0 4px hsl(var(--primary)/0.2), 0 8px 32px rgba(0,0,0,0.25)" }}
        >
          <Bot className="w-6 h-6" />
          <span className="text-[9px] font-bold leading-none mt-0.5">IA</span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 w-80 bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ height: 440, zIndex: 99999 }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground shrink-0">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              <div>
                <p className="text-sm font-semibold leading-none">Asistente de Costeo</p>
                <p className="text-[10px] opacity-75 mt-0.5">Precios · Overhead · Márgenes</p>
              </div>
            </div>
            <button onClick={() => handleSetOpen(false)} className="opacity-80 hover:opacity-100">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {messages.length === 0 ? (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-muted-foreground text-center px-2">Soy tu asesor de costeo. Puedo calcular precios, simular escenarios y explicar el overhead.</p>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {QUICK_ACTIONS.map((a) => (
                    <button
                      key={a.label}
                      onClick={() => sendMessage(a.msg)}
                      className="flex items-center gap-1.5 text-left text-xs px-2.5 py-2 rounded-lg bg-accent/60 hover:bg-accent border border-accent-foreground/10 transition-colors"
                    >
                      <a.icon className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="leading-tight">{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted border border-border rounded-bl-sm"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted border border-border rounded-xl rounded-bl-sm px-3 py-2 flex gap-2 items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce delay-100" />
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce delay-200" />
                  <span className="text-xs text-muted-foreground ml-1">Pensando...</span>
                </div>
              </div>
            )}
            {/* Quick actions below messages */}
            {messages.length > 0 && !isLoading && (
              <div className="flex flex-wrap gap-1 pt-1">
                {QUICK_ACTIONS.map((a) => (
                  <button
                    key={a.label}
                    onClick={() => sendMessage(a.msg)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-accent/60 hover:bg-accent border border-accent-foreground/10 transition-colors"
                  >
                    <a.icon className="w-3 h-3 text-primary" />
                    {a.label}
                  </button>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 p-3 border-t border-border space-y-1.5">
            {isListening && (
              <p className="text-xs text-primary text-center animate-pulse font-medium">
                🎤 {interimText || "Escuchando..."}
              </p>
            )}
            <div className="flex gap-1.5">
              <Button
                size="icon"
                variant={isListening ? "destructive" : "default"}
                className="h-8 w-8 shrink-0"
                onClick={isListening ? stopListening : startListening}
                disabled={isLoading}
                title={isListening ? "Detener micrófono" : "Iniciar micrófono"}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </Button>
              <Input
                className="h-8 text-xs"
                placeholder="Escribe o habla..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                disabled={isLoading || isListening}
                autoFocus
              />
              <Button
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                title="Enviar mensaje"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}