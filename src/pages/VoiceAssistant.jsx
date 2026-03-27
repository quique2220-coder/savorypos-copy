import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, MicOff, Loader2, TrendingUp, Package, ChefHat, PieChart } from "lucide-react";

const ACTIONS = [
  { label: "Ventas", prompt: "¿Cómo van las ventas hoy?", icon: TrendingUp },
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
  const audioRef = useRef(null);
  const lastSpokenIdRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      const conv = await base44.agents.createConversation({ agent_name: "restaurantAI" });
      setConversationId(conv.id);
    };
    init();
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    return base44.agents.subscribeToConversation(conversationId, (data) => {
      const msgs = data.messages || [];
      setMessages(msgs);
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg?.role === "assistant" && lastMsg.id !== lastSpokenIdRef.current) {
        setIsLoading(false);
        lastSpokenIdRef.current = lastMsg.id;
        playVoice(lastMsg.content);
      }
    });
  }, [conversationId]);

  const playVoice = async (text) => {
    if (audioRef.current) audioRef.current.pause();
    setIsSpeaking(true);
    try {
      const cleanText = text.replace(/[*#]/g, "").replace(/%/g, " por ciento").replace(/\$/g, " pesos ");
      const res = await base44.functions.invoke("elevenLabsTTS", { text: cleanText });
      const audio = new Audio(`data:audio/mpeg;base64,${res.data.audio}`);
      audioRef.current = audio;
      audio.onended = () => setIsSpeaking(false);
      audio.play();
    } catch { setIsSpeaking(false); }
  };

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return;
    setIsLoading(true);
    setInput("");
    const lang = /[áéíóúñ]/i.test(text) ? "RESPONDER EN ESPAÑOL:" : "RESPOND IN ENGLISH:";
    await base44.agents.addMessage({ id: conversationId }, { role: "user", content: `${lang} ${text}` });
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 p-4 gap-4">
      <Card><CardHeader className="flex flex-row justify-between items-center">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isSpeaking ? "bg-green-500 animate-pulse" : "bg-slate-300"}`} />
          Consultor Experto
        </CardTitle>
      </CardHeader></Card>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {ACTIONS.map(a => (
          <Button key={a.label} variant="outline" size="sm" onClick={() => sendMessage(a.prompt)} className="rounded-full flex gap-2">
            <a.icon className="w-4 h-4" /> {a.label}
          </Button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`p-3 rounded-2xl max-w-[85%] text-sm ${msg.role === "user" ? "bg-slate-800 text-white" : "bg-white border shadow-sm"}`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage(input)} placeholder="Pregunta algo..." className="rounded-full" />
        <Button onClick={() => sendMessage(input)} disabled={isLoading} className="rounded-full">
          {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
        </Button>
      </div>
    </div>
  );
}