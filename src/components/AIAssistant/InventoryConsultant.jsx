import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, AlertCircle, Package, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const getLocalDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
};

export default function InventoryConsultant({ playAudio, stopAudio, isActive }) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [lastPlayedId, setLastPlayedId] = useState(null);
  const messagesEndRef = useRef(null);
  const initRef = useRef(false);

  // Consulta de inventario real para alertas visuales
  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.InventoryItem.list(),
  });

  const lowStockItems = inventory.filter(item => item.current_stock <= (item.min_stock || 0));

  useEffect(() => {
    if (initRef.current || !isActive) return;
    initRef.current = true;

    base44.agents.createConversation({
      agent_name: "restaurantAI",
      metadata: { tab: "inventory" },
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

  const sendMessage = async (text) => {
    if (!text.trim() || !conversationId) return;
    if (stopAudio) stopAudio();
    setIsLoading(true);
    setInput("");
    const context = `Current date: ${getLocalDate()}. `;
    await base44.agents.addMessage({ id: conversationId }, { 
      role: "user", 
      content: context + text.trim() 
    });
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Alerta Visual de Stock Bajo */}
      {lowStockItems.length > 0 && (
        <Card className="border-red-200 bg-red-50 shrink-0 shadow-sm">
          <CardContent className="p-3 flex gap-3 items-center">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-red-900">¡Alerta de Stock!</p>
              <p className="text-[10px] text-red-700 truncate">
                Bajo nivel en: {lowStockItems.map(i => i.name).join(", ")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial de Chat */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-40 text-center">
            <Package className="w-12 h-12 mb-2 text-primary" />
            <p className="text-sm font-medium">Control de Insumos e Inventario</p>
            <Button variant="ghost" size="sm" className="mt-4 text-[10px]" onClick={() => sendMessage("¿Qué productos tienen poco stock?")}>
              <RefreshCw className="w-3 h-3 mr-1" /> Analizar stock crítico
            </Button>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <Card className={`max-w-[85%] border-none shadow-sm ${msg.role === "user" ? "bg-slate-800 text-white rounded-tr-none" : "bg-white rounded-tl-none"}`}>
              <CardContent className="p-3 text-sm leading-relaxed">
                {msg.content}
              </CardContent>
            </Card>
          </div>
        ))}
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary mx-auto" />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de consulta */}
      <div className="flex gap-2 p-2 bg-white rounded-full shadow-md border border-slate-100 shrink-0">
        <Input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={e => e.key === "Enter" && sendMessage(input)}
          placeholder="Ej: ¿Cuánto pollo queda?" 
          className="border-none bg-transparent focus-visible:ring-0 shadow-none px-4 text-sm"
        />
        <Button size="icon" onClick={() => sendMessage(input)} disabled={isLoading || !input.trim()} className="rounded-full shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}