import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Mic, MicOff, TrendingUp, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export default function PricingConsultant() {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Fetch recipes for margin analysis
  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => base44.entities.Recipe.list(),
  });

  const marginData = recipes
    .filter(r => r.sale_price > 0 && r.cost >= 0)
    .map(r => ({
      ...r,
      margin: r.sale_price > 0 ? ((r.sale_price - (r.cost || 0)) / r.sale_price) * 100 : 0,
      profit: (r.sale_price || 0) - (r.cost || 0)
    }))
    .sort((a, b) => b.margin - a.margin);

  const bestMargin = marginData[0];
  const worstMargin = marginData[marginData.length - 1];

  useEffect(() => {
    const initConversation = async () => {
      try {
        const conv = await base44.agents.createConversation({
          agent_name: "voiceAssistant",
          metadata: { name: "Pricing Consultant" },
        });
        setConversationId(conv.id);
        setMessages(conv.messages || []);
      } catch (err) {
        console.error("Error:", err);
        toast.error("Error al iniciar consultor");
      }
    };
    initConversation();
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      setMessages(data.messages || []);
      const lastMsg = data.messages?.[data.messages.length - 1];
      if (lastMsg?.role === "assistant") {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [conversationId]);

  const handleSendMessage = async () => {
    if (!input.trim() || !conversationId) return;
    const text = input.trim();
    setInput("");
    setIsLoading(true);
    try {
      await base44.agents.addMessage({ id: conversationId }, { role: "user", content: text });
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
    const recognition = new SpeechRecognition();
    recognition.lang = "es-US";
    recognition.continuous = false;
    let finalTranscript = "";

    recognition.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript + " ";
      }
      setInput(finalTranscript.trim());
    };

    recognition.onend = () => {
      setIsListening(false);
      if (finalTranscript.trim()) {
        setInput(finalTranscript.trim());
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const quickQuestions = [
    "Análisis de márgenes",
    "Platillos rentables",
    "Sugerir precios",
    "Estrategia de precios"
  ];

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Margin Summary */}
      {marginData.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-green-600 mt-0.5" />
                <div className="text-xs">
                  <p className="text-muted-foreground">Mejor margen</p>
                  <p className="font-semibold">{bestMargin.name}</p>
                  <p className="text-green-700 font-bold">{bestMargin.margin.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <TrendingDown className="w-4 h-4 text-red-600 mt-0.5" />
                <div className="text-xs">
                  <p className="text-muted-foreground">Margen bajo</p>
                  <p className="font-semibold truncate">{worstMargin?.name || "N/A"}</p>
                  <p className="text-red-700 font-bold">{worstMargin?.margin.toFixed(1) || "0"}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-auto space-y-3 pr-1 mb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg">💰</span>
            </div>
            <div className="space-y-1">
              <p className="font-semibold">Estrategia de Precios</p>
              <p className="text-sm text-muted-foreground">Optimiza márgenes y precios</p>
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
        <Button
          variant="outline"
          size="icon"
          onClick={isListening ? () => recognitionRef.current?.stop() : startRecording}
          className={isListening ? "bg-destructive/10 border-destructive/20" : ""}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </Button>
        <Input
          placeholder="¿Cómo optimizo precios?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          disabled={isLoading}
        />
        <Button onClick={handleSendMessage} disabled={!input.trim() || isLoading} size="icon">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}