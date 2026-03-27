import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, AlertCircle, Package } from "lucide-react";
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
  }, [messages, isActive, lastPlayedId, playAudio]);

  const sendMessage = async (text) => {
    if (!text.trim() || !conversationId) return;
    if (stopAudio) stopAudio();
    setIsLoading(true);
    setInput("");

    const snapshot = inventory.map(i => ({
      n: i.name,
      s: i.current_stock,
      m: i.min_stock || 0,
      st: i.current_stock <= (i.min_stock || 0) ? "CRITICO" : "OK"
    }));

    const textWithContext = `
      SNAPSHOT: ${JSON.stringify(snapshot)}
      USER_QUERY: ${text.trim()}
      INSTRUCTION: Usa los datos del SNAPSHOT para responder rápido.
    `;

    await base44.agents.addMessage({ id: conversationId }, { role: "user", content: textWithContext });
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {lowStockItems.length > 0 && (
        <Card className="border-red-500 bg-red-50 shrink-0 animate-pulse">
          <CardContent className="p-3 flex gap-3 items-center">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-[10px] text-red-700 font-bold uppercase">Stock Crítico detectado</p>
          </CardContent>
        </Card>
      )}

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <Card className={`max-w-[85%] border-none shadow-sm ${msg.role === "user" ? "bg-slate-800 text-white rounded-tr-none" : "bg-white rounded-tl-none border"}`}>
              <CardContent className="p-3 text-sm">
                {msg.role === "user" && msg.content.includes("USER_QUERY:") 
                  ? msg.content.split("USER_QUERY:")[1].split("INSTRUCTION:")[0].trim() 
                  : msg.content}
              </CardContent>
            </Card>
          </div>
        ))}
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary mx-auto" />}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2 p-2 bg-white rounded-full shadow-md border border-slate-100">
        <Input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={e => e.key === "Enter" && sendMessage(input)}
          placeholder="¿Qué falta?" 
          className="border-none bg-transparent focus-visible:ring-0 shadow-none px-4 text-sm"
        />
        <Button size="icon" onClick={() => sendMessage(input)} disabled={isLoading || !input.trim()} className="rounded-full">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}