import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, TrendingUp, TrendingDown, Target } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const getLocalDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
};

export default function PricingConsultant({ playAudio, stopAudio, isActive }) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [lastPlayedId, setLastPlayedId] = useState(null);
  const messagesEndRef = useRef(null);
  const initRef = useRef(false);

  // Consulta de datos
  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => base44.entities.Recipe.list(),
  });

  // Cálculo de márgenes optimizado
  const marginData = recipes
    .filter(r => r.sale_price > 0)
    .map(r => ({ 
      ...r, 
      margin: ((r.sale_price - (r.cost || 0)) / r.sale_price) * 100 
    }))
    .sort((a, b) => b.margin - a.margin);

  const bestMargin = marginData[0];
  const worstMargin = marginData[marginData.length - 1];

  useEffect(() => {
    if (initRef.current || !isActive) return;
    initRef.current = true;

    base44.agents.createConversation({
      agent_name: "restaurantAI",
      metadata: { tab: "pricing" },
    }).then(conv => {
      setConversationId(conv.id);
      setMessages(conv.messages || []);
      base44.agents.subscribeToConversation(conv.id, (data) => {
        setMessages(data.messages || []);
      });
    });
  }, [isActive]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "assistant" && lastMsg.id !== lastPlayedId && isActive) {
      setIsLoading(false);
      setLastPlayedId(lastMsg.id);
      if (playAudio) playAudio(lastMsg.content);
    }
  }, [messages, isActive]);

  // FUNCIÓN DE ALTO RENDIMIENTO (Snapshot para el AI)
  const sendMessage = async (text) => {
    if (!text.trim() || !conversationId) return;
    if (stopAudio) stopAudio();
    setIsLoading(true);
    setInput("");

    const dataContext = {
      analisis_real: marginData.map(r => ({
        nombre: r.name,
        precio: `$${r.sale_price}`,
        margen: `${r.margin.toFixed(1)}%`,
        estado: r.margin < 30 ? "CRITICO" : "SALUDABLE"
      }))
    };

    const promptFinal = `
      INSTRUCCION: Usa estos datos directos para responder. No calcules nada.
      SNAPSHOT: ${JSON.stringify(dataContext)}
      
      PREGUNTA: ${text.trim()}
    `;

    await base44.agents.addMessage(
      { id: conversationId }, 
      { role: "user", content: promptFinal }
    );
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Dashboard superior */}
      {marginData.length > 0 && (
        <div className="grid grid-cols-2 gap-2 shrink-0">
          <div className="bg-green-50 border border-green-100 p-3 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <p className="text-[10px] text-green-700 font-bold uppercase">Mejor Margen</p>
            </div>
            <p className="text-xs font-bold truncate">{bestMargin.name}</p>
            <p className="text-sm font-black text-green-600">{bestMargin.margin.toFixed(1)}%</p>
          </div>
          <div className="bg-red-50 border border-red-100 p-3 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-3 h-3 text-red-600" />
              <p className="text-[10px] text-red-700 font-bold uppercase">Peor Margen</p>
            </div>
            <p className="text-xs font-bold truncate">{worstMargin?.name || "N/A"}</p>
            <p className="text-sm font-black text-red-600">{worstMargin?.margin.toFixed(1) || 0}%</p>
          </div>
        </div>
      )}

      {/* Chat */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <Card className={`max-w-[85%] border-none shadow-sm ${msg.role === "user" ? "bg-slate-800 text-white rounded-tr-none" : "bg-white rounded-tl-none"}`}>
              <CardContent className="p-3 text-sm">
                {msg.role === "user" && msg.content.includes("PREGUNTA:") 
                  ? msg.content.split("PREGUNTA:")[1].trim() 
                  : msg.content}
              </CardContent>
            </Card>
          </div>
        ))}
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary mx-auto" />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 p-2 bg-white rounded-full shadow-md border border-slate-100">
        <Input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={e => e.key === "Enter" && sendMessage(input)}
          placeholder="¿Cuál es mi mejor platillo?" 
          className="border-none bg-transparent focus-visible:ring-0 shadow-none px-4"
        />
        <Button size="icon" onClick={() => sendMessage(input)} disabled={isLoading || !input.trim()} className="rounded-full">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}