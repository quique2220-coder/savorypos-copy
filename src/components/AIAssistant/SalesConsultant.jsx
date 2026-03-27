import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";

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
    if (initRef.current) return;
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
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Apagar loading y reproducir audio cuando llega respuesta
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

  const handleSend = () => {
    sendMessage(input);
    setInput("");
  };

  const quickQuestions = ["¿Cómo voy hoy?", "¿Cuál fue mi mejor día?", "Proyección semanal", "Comparar con ayer"];

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex-1 overflow-auto space-y-3 pr-1">
        {messages.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg">📊</span>
            </div>
            <div className="space-y-1">
              <p className="font-semibold">Análisis de Ventas</p>
              <p className="text-sm text-muted-foreground">Pregunta sobre tu performance de ventas</p>
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
        <Input placeholder="¿Qué quieres saber sobre ventas?" value={input}
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