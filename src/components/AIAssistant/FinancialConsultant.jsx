import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Mic, MicOff, AlertCircle, Volume2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export default function FinancialConsultant({ conversationId: sharedConversationId, messages: sharedMessages, stopAllAudio, setCurrentAudio, isActive = false }) {
  const [conversationId, setConversationId] = useState(sharedConversationId);
  const [messages, setMessages] = useState(sharedMessages || []);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  // Fetch financial data
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.OperatingExpense.list(),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list(),
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  // Usar conversación compartida del dashboard
  useEffect(() => {
    if (sharedConversationId) {
      setConversationId(sharedConversationId);
      setMessages(sharedMessages || []);
    }
  }, [sharedConversationId, sharedMessages]);

  useEffect(() => {
    if (!conversationId) return;
    
    // Escuchar respuesta del asistente central
    const handleAssistantResponse = (e) => {
      if (window.currentActiveTab === "financial" && isActive) {
        setMessages(prev => [...prev, e.detail.message]);
        setIsLoading(false);
        playResponse(e.detail.message.content);
      }
    };
    
    // Escuchar eventos de voz flotante solo si es tab financial
    const handleVoiceInput = (e) => {
      if (e.detail.tab === "financial" && e.detail.text.trim() && conversationId) {
        const today = new Date().toISOString().split('T')[0];
        const textWithContext = `Current date: ${today}\n${e.detail.text}`;
        setIsLoading(true);
        base44.agents.addMessage({ id: conversationId }, { role: "user", content: textWithContext }).catch(err => {
          console.error("Error:", err);
          toast.error("Error al enviar");
          setIsLoading(false);
        });
      }
    };
    
    window.addEventListener("assistantResponse", handleAssistantResponse);
    window.addEventListener("voiceInput", handleVoiceInput);
    return () => {
      window.removeEventListener("assistantResponse", handleAssistantResponse);
      window.removeEventListener("voiceInput", handleVoiceInput);
    };
  }, [conversationId, isActive]);

  const playResponse = async (text) => {
    try {
      setIsSpeaking(true);
      const res = await base44.functions.invoke("elevenLabsTTS", { text: text.substring(0, 3000) });
      if (res.data?.audio) {
        stopAllAudio?.();
        const audio = new Audio(`data:audio/mpeg;base64,${res.data.audio}`);
        audioRef.current = audio;
        setCurrentAudio?.(audio);
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => setIsSpeaking(false);
        audio.play();
      } else {
        setIsSpeaking(false);
      }
    } catch (err) {
      console.error("TTS error:", err);
      setIsSpeaking(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !conversationId) return;
    const today = new Date().toISOString().split('T')[0];
    const textWithContext = `Current date: ${today}\n${input.trim()}`;
    setInput("");
    setIsLoading(true);
    try {
      await base44.agents.addMessage({ id: conversationId }, { role: "user", content: textWithContext });
    } catch (err) {
      console.error("Error:", err);
      toast.error("Error al enviar");
      setIsLoading(false);
    }
  };

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Navegador no soporta voz. Usa Chrome.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-ES";
    recognition.continuous = true;
    recognition.interimResults = true;
    let finalTranscript = "";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (e) => {
      let interimTranscript = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }
      if (finalTranscript) setInput(finalTranscript.trim());
    };

    recognition.onend = () => {
      setIsListening(false);
      if (finalTranscript.trim() && !isLoading && conversationId) {
        const today = new Date().toISOString().split('T')[0];
        const textWithContext = `Current date: ${today}\n${finalTranscript.trim()}`;
        setIsLoading(true);
        setInput("");
        base44.agents.addMessage({ id: conversationId }, { role: "user", content: textWithContext }).catch(err => {
          console.error("Error:", err);
          toast.error("Error al enviar");
          setIsLoading(false);
        });
      }
    };

    recognition.onerror = (e) => {
      console.error("Recognition error:", e.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const quickQuestions = [
    "Estado financiero",
    "Análisis de gastos",
    "Rentabilidad mensual",
    "Flujo de caja"
  ];

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Financial Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground mb-1">Ingresos</div>
            <p className="text-lg font-bold text-green-600">${totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground mb-1">Gastos</div>
            <p className="text-lg font-bold text-red-600">${totalExpenses.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className={netProfit >= 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground mb-1">Ganancia</div>
            <p className={`text-lg font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              ${netProfit.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-auto space-y-3 pr-1 mb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg">📊</span>
            </div>
            <div className="space-y-1">
              <p className="font-semibold">Reportes Financieros</p>
              <p className="text-sm text-muted-foreground">Análisis de estados contables</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-lg px-4 py-3 rounded-2xl ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-secondary text-secondary-foreground rounded-bl-sm"
              }`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-2">
            <div className="bg-secondary rounded-2xl px-4 py-3 rounded-bl-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce delay-100" />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          placeholder="¿Qué analizo de finanzas?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          disabled={isLoading || isListening}
        />
        <Button onClick={handleSendMessage} disabled={!input.trim() || isLoading} size="icon">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
        {isSpeaking && (
          <Button variant="ghost" size="icon" disabled>
            <Volume2 className="w-4 h-4 animate-pulse" />
          </Button>
        )}
      </div>
    </div>
  );
}