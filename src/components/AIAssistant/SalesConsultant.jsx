import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, TrendingUp, BarChart } from "lucide-react";

const getLocalDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
};

export default function SalesConsultant({ playAudio, stopAudio, isActive }) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [lastPlayedId, setLastPlayedId] = useState(null);
  const messagesEndRef = useRef(null);
  const initRef = useRef(false);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (initRef.current || !isActive) return;
    initRef.current = true;

    base44.agents.createConversation({
      agent_name: "restaurantAI",
      metadata: { name: "Ventas & Performance" },
    }).then(conv => {
      setConversationId(conv.id);
      setMessages(conv.messages || []);
      unsubscribeRef.current = base44.agents.subscribeToConversation(conv.id, (data) => {
        setMessages(data.messages || []);
      });
    });

    return () => { unsubscribeRef.current?.(); };
  }, [isActive]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "assistant" && lastMsg?.content) {
      setIsLoading(false);
      if (lastMsg?.id !== lastPlayedId && playAudio && isActive) {
        setLastPlayedId(lastMsg.id);
        stopAudio?.();
        setTimeout(() => playAudio(lastMsg.content), 100);
      }
    }
  }, [messages, isActive]);

  const sendMessage = async (text) => {
    if (!text.trim() || !conversationId) return;
    const textWithContext = `Current date: ${getLocalDate()}\n${text.trim()}`;
    setIsLoading(true);
    setInput("");
    await base44.agents.addMessage({ id: conversationId }, { role: "user", content: textWithContext });
  };

  const quickQuestions = ["¿Cómo voy hoy?", "Ventas de la semana", "Platillo más vendido"];

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {messages.length === 0 && !isLoading ? (
          <div className="h-full flex flex-col items-center justify-center opacity-40 text-center">
            <BarChart className="w-12 h-12 mb-2 text-primary" />
            <p className="text-sm font-medium">Consultor de Ventas</p>
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {quickQuestions.map(q => (
                <Button key={q} variant="outline" size="xs" className="text-[10px] rounded-full" onClick={() => sendMessage(q)}>
                  {q}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <Card className={`max-w-[85%] border-none shadow-sm ${msg.role === "user" ? "bg-slate-800 text-white rounded-tr-none" : "bg-white rounded-tl-none"}`}>
                <CardContent className="p-3 text-sm leading-relaxed">
                  {msg.content}
                </CardContent>
              </Card>
            </div>
          ))
        )}
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary mx-auto" />}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2 p-2 bg-white rounded-full shadow-md border border-slate-100">
        <Input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={e => e.key === "Enter" && sendMessage(input)}
          placeholder="¿Cómo van las ventas?" 
          className="border-none bg-transparent focus-visible:ring-0 shadow-none px-4"
        />
        <Button size="icon" onClick={() => sendMessage(input)} disabled={isLoading || !input.trim()} className="rounded-full shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}