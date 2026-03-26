import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Mic, MicOff, AlertTriangle, Volume2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export default function InventoryConsultant() {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  // Fetch inventory
  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.InventoryItem.list(),
  });

  const lowStockItems = inventory.filter(item => item.current_stock <= (item.min_stock || 0));

  useEffect(() => {
    const initConversation = async () => {
      try {
        const conv = await base44.agents.createConversation({
          agent_name: "voiceAssistant",
          metadata: { name: "Inventory Consultant" },
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
        playResponse(lastMsg.content);
      }
    });
    return () => unsubscribe();
  }, [conversationId]);

  const playResponse = async (text) => {
    try {
      setIsSpeaking(true);
      const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM?optimize_streaming_latency=0", {
        method: "POST",
        headers: {
          "xi-api-key": localStorage.getItem("elevenLabsKey") || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.substring(0, 3000),
          model_id: "eleven_monolingual_v1",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      });
      if (response.ok) {
        const audioBlob = await response.blob();
        const url = URL.createObjectURL(audioBlob);
        audioRef.current = new Audio(url);
        audioRef.current.play();
        audioRef.current.onended = () => setIsSpeaking(false);
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
    "¿Qué está bajo stock?",
    "Necesito reordenar",
    "Uso de inventario",
    "Ingredientes críticos"
  ];

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Alerts */}
      {lowStockItems.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex gap-2 items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-yellow-900">{lowStockItems.length} items bajo stock</p>
                <p className="text-xs text-yellow-800 mt-1">
                  {lowStockItems.map(i => i.name).join(", ")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-auto space-y-3 pr-1 mb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg">📦</span>
            </div>
            <div className="space-y-1">
              <p className="font-semibold">Gestión de Inventario</p>
              <p className="text-sm text-muted-foreground">Consulta stock, reórdenes y alertas</p>
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
          onClick={startRecording}
          className={isListening ? "bg-destructive/10 border-destructive/20" : ""}
          title="Habla para dictar"
        >
          {isListening ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
        </Button>
        <Input
          placeholder="¿Qué necesitas del inventario?"
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