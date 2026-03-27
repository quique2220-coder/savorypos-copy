import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, TrendingUp, TrendingDown } from "lucide-react";
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
  const unsubscribeRef = useRef(null);

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => base44.entities.Recipe.list(),
  });

  const marginData = recipes
    .filter(r => r.sale_price > 0)
    .map(r => ({ ...r, margin: ((r.sale_price - (r.cost || 0)) / r.sale_price) * 100 }))
    .sort((a, b) => b.margin - a.margin);
  const bestMargin = marginData[0];
  const worstMargin = marginData[marginData.length - 1];

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    base44.agents.createConversation({
      agent_name: "restaurantAI",
      metadata: { name: "Precios & Márgenes" },
    }).then(conv => {
      setConversationId(conv.id);
      setMessages(conv.messages || []);
      unsubscribeRef.current = base44.agents.subscribeToConversation(conv.id, (data) => {
        setMessages(data.messages || []);
      });
    });

    return () => { unsubscribeRef.current?.(); };
  }, []);

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
  }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim() || !conversationId) return;
    const textWithContext = `Current date: ${getLocalDate()}\n${text.trim()}`;
    setIsLoading(true);
    await base44.agents.addMessage({ id: conversationId }, { role: "user", content: textWithContext });
  };

  const handleSend = () => { sendMessage(input); setInput(""); };

  const quickQuestions = ["Análisis de márgenes", "Platillos rentables", "Sugerir precios", "Estrategia de precios"];

  return (
    <div className="space-y-4 h-full flex flex-col">
      {marginData.length > 0 && (
        <div className="grid grid-cols-2 gap-3 shrink-0">
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
      <div className="flex-1 overflow-auto space-y-3 pr-1">
        {messages.length === 0 && !isLoading ? (
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
                <button key={q} onClick={() => sendMessage(q)}
                  className="text-xs px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-lg px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
                msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary text-secondary-foreground rounded-bl-sm"
              }`}>{msg.content}</div>
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
        <div ref={messagesEndRef} />
      </div>
      <div className="flex gap-2 shrink-0">
        <Input placeholder="¿Cómo optimizo precios?" value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={isLoading} />
        <Button onClick={handleSend} disabled={!input.trim() || isLoading} size="icon">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}