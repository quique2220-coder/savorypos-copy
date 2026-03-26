import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, MicOff, Loader2, MessageCircle, X, Volume2, TrendingUp, DollarSign, Package, ChefHat } from "lucide-react";
import { toast } from "sonner";
import MarginAnalysisVisual from "@/components/costing/MarginAnalysisVisual";
import { useQuery } from "@tanstack/react-query";

const QUICK_ACTIONS = [
  { label: "¿Cómo voy hoy?", icon: TrendingUp, color: "text-green-600 bg-green-50 border-green-200 hover:bg-green-100" },
  { label: "Registrar gasto", icon: DollarSign, color: "text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100" },
  { label: "Ver inventario", icon: Package, color: "text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100" },
  { label: "Analizar platillo", icon: ChefHat, color: "text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100" },
];

export default function VoiceAssistant() {
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

  // Fetch recipes para el análisis visual de márgenes
  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => base44.entities.Recipe.list(),
  });

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
  }, []);

  useEffect(() => { conversationIdRef.current = conversationId; }, [conversationId]);
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);

  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      const msgs = data.messages || [];
      setMessages(msgs);
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg?.role === "assistant" && lastMsg?.content) {
        setIsLoading(false);
        isLoadingRef.current = false;
        // Detectar si es análisis de márgenes
        const isMarginAnalysis = lastMsg.content.toLowerCase().includes("margen") || 
                                  lastMsg.content.toLowerCase().includes("platillo") ||
                                  lastMsg.content.toLowerCase().includes("rentable");
        setShowMarginAnalysis(isMarginAnalysis);
        if (lastMsg.id !== lastSpokenIdRef.current) {
          clearTimeout(speakTimerRef.current);
          speakTimerRef.current = setTimeout(() => {
            lastSpokenIdRef.current = lastMsg.id;
            speakMessage(lastMsg.content);
          }, 800);
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

  const sendMessageDirectly = async (text) => {
    if (!text.trim() || !conversationIdRef.current || isLoadingRef.current) return;
    setInput("");
    setIsLoading(true);
    isLoadingRef.current = true;
    try {
      await base44.agents.addMessage({ id: conversationIdRef.current }, { role: "user", content: text.trim() });
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Error al enviar mensaje");
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !conversationId || isLoadingRef.current) return;
    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);
    isLoadingRef.current = true;
    try {
      await base44.agents.addMessage({ id: conversationId }, { role: "user", content: userMessage });
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Error al enviar mensaje");
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  };

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Tu navegador no soporta reconocimiento de voz. Usa Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "es-US"; // bilingual: Chrome will detect both Spanish and English
    recognition.interimResults = true;
    recognition.continuous = true;

    let finalTranscript = "";
    let silenceTimer = null;
    let hasSent = false;

    recognition.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript + " ";
        else interim = e.results[i][0].transcript;
      }
      setInput(finalTranscript.trim());
      setInterimText(interim);
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => recognition.stop(), 2000);
    };

    recognition.onerror = (e) => {
      clearTimeout(silenceTimer);
      if (e.error !== "no-speech") toast.error("Error al reconocer voz: " + e.error);
      setIsListening(false);
      setInterimText("");
    };

    recognition.onend = () => {
      clearTimeout(silenceTimer);
      setIsListening(false);
      setInterimText("");
      if (!hasSent && finalTranscript.trim()) {
        hasSent = true;
        sendMessageDirectly(finalTranscript.trim());
      }
    };

    recognitionRef.current = recognition;
    finalTranscript = "";
    setInput("");
    setInterimText("");
    recognition.start();
    setIsListening(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const speakMessage = async (text) => {
    if (!text) return;
    window.speechSynthesis?.cancel();
    setIsSpeaking(true);
    try {
      const res = await base44.functions.invoke("elevenLabsTTS", { text });
      const base64 = res.data?.audio;
      if (!base64) throw new Error("No audio");
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url); };
      audio.onerror = () => setIsSpeaking(false);
      audio.play();
    } catch {
      setIsSpeaking(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="max-w-2xl mx-auto w-full flex flex-col h-full gap-3">

        {/* Header */}
        <Card className="shrink-0">
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mic className="w-4 h-4 text-primary" />
                </div>
                Asistente de Negocio
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowWhatsApp(!showWhatsApp)}>
                <MessageCircle className="w-4 h-4 mr-1.5" />
                WhatsApp
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ventas • Inventario • Costos • Contabilidad
            </p>
            {showWhatsApp && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-green-700">Conecta con WhatsApp</span>
                  <button onClick={() => setShowWhatsApp(false)}>
                    <X className="w-3.5 h-3.5 text-green-600" />
                  </button>
                </div>
                <a
                  href={base44.agents.getWhatsAppConnectURL("voiceAssistant")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs font-semibold text-green-700 bg-white border border-green-300 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
                >
                  💬 Abrir en WhatsApp
                </a>
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Messages */}
        <div className="flex-1 overflow-auto space-y-3 pr-1">
          {showMarginAnalysis && recipes.length > 0 && (
            <div className="mb-4">
              <MarginAnalysisVisual recipes={recipes} />
            </div>
          )}
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-6 pb-8">
              <div className="space-y-2">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Mic className="w-8 h-8 text-primary/50" />
                </div>
                <p className="text-sm font-semibold">Tu Operador de Negocio con IA</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Lee datos reales, ejecuta acciones y te da recomendaciones como coach
                </p>
              </div>
              {/* Quick Actions */}
              <div className="w-full grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => sendMessageDirectly(action.label)}
                    disabled={isLoading}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors text-left ${action.color}`}
                  >
                    <action.icon className="w-4 h-4 shrink-0" />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card border border-border rounded-bl-sm shadow-sm"
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap flex-1">{msg.content}</p>
                      {msg.role === "assistant" && msg.content && (
                        <button
                          className="shrink-0 mt-0.5 opacity-50 hover:opacity-100 transition-opacity"
                          onClick={() => speakMessage(msg.content)}
                          disabled={isSpeaking}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {msg.tool_calls?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-current/10 space-y-1">
                        {msg.tool_calls.map((tc, tcIdx) => (
                          <div key={tcIdx} className="text-[11px] opacity-60 flex items-center gap-1">
                            {tc.status === "completed"
                              ? <span>✓ {tc.name}</span>
                              : <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />{tc.name}</span>
                            }
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {/* Quick actions below messages */}
              {!isLoading && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => sendMessageDirectly(action.label)}
                      disabled={isLoading}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-colors ${action.color}`}
                    >
                      <action.icon className="w-3 h-3" />
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          {isLoading && (
            <div className="flex gap-2 justify-start">
              <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce delay-100" />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <Card className="shrink-0">
          <CardContent className="pt-3 pb-3 px-3">
            <div className="flex gap-2">
              <Button
                variant="default"
                size="icon"
                onClick={isListening ? stopRecording : startRecording}
                disabled={isLoading}
                className={`shrink-0 ${isListening ? "animate-pulse bg-destructive hover:bg-destructive/90" : ""}`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Input
                placeholder={isListening ? "Escuchando..." : "Escribe o habla..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                disabled={isLoading}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} disabled={!input.trim() || isLoading} size="icon" className="shrink-0">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            {isListening && (
              <div className="mt-2 text-center space-y-0.5">
                <p className="text-xs text-primary animate-pulse">🎤 Escuchando... habla ahora</p>
                {interimText && <p className="text-xs text-muted-foreground italic">{interimText}</p>}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}