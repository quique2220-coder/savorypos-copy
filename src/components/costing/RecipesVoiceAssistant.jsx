import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, MicOff, Send, Loader2, Bot, ChevronDown, Calculator, TrendingUp, DollarSign, BarChart2, HelpCircle, PlusCircle } from "lucide-react";
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

export default function RecipesVoiceAssistant({ conversationId, onConversationCreated }) {
  const [open, setOpen] = useState(false);
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
        // Invalidate after AI likely made changes
        qc.invalidateQueries({ queryKey: ["ingredients"] });
        qc.invalidateQueries({ queryKey: ["operating_expenses"] });
        qc.invalidateQueries({ queryKey: ["recipes"] });
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
      await base44.agents.addMessage({ id }, { role: "user", content: text.trim() });
    } catch (err) {
      toast.error("Error al enviar");
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error("Usa Chrome para reconocimiento de voz"); return; }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    let final = "";
    let timer = null;
    let sent = false;

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
        else interim = e.results[i][0].transcript;
      }
      setInput(final.trim());
      setInterimText(interim);
      clearTimeout(timer);
      timer = setTimeout(() => rec.stop(), 2000);
    };
    rec.onerror = () => { setIsListening(false); setInterimText(""); };
    rec.onend = () => {
      setIsListening(false);
      setInterimText("");
      if (!sent && final.trim()) { sent = true; sendMessage(final.trim()); }
    };
    recognitionRef.current = rec;
    final = "";
    setInput("");
    rec.start();
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-50"
        >
          <Bot className="w-6 h-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 w-80 bg-card border border-border rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden" style={{ height: 440 }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground shrink-0">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              <div>
                <p className="text-sm font-semibold leading-none">Asistente de Costeo</p>
                <p className="text-[10px] opacity-75 mt-0.5">Precios · Overhead · Márgenes</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="opacity-80 hover:opacity-100">
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
                <div className="bg-muted border border-border rounded-xl rounded-bl-sm px-3 py-2">
                  <div className="flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce delay-100" />
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce delay-200" />
                  </div>
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
              <p className="text-xs text-primary text-center animate-pulse">
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
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </Button>
              <Input
                className="h-8 text-xs"
                placeholder="Escribe o habla..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                disabled={isLoading}
              />
              <Button
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
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