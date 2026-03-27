import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, ChefHat, Utensils, BookOpen } from "lucide-react";

const getLocalDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
};

export default function RecipeConsultant({ playAudio, stopAudio, isActive }) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [lastPlayedId, setLastPlayedId] = useState(null);
  const messagesEndRef = useRef(null);
  const initRef = useRef(false);

  // Inicialización de la conversación
  useEffect(() => {
    if (initRef.current || !isActive) return;
    initRef.current = true;

    base44.agents.createConversation({
      agent_name: "restaurantAI",
      metadata: { tab: "recipes" },
    }).then(conv => {
      setConversationId(conv.id);
      setMessages(conv.messages || []);
      base44.agents.subscribeToConversation(conv.id, (data) => {
        setMessages(data.messages || []);
      });
    });
  }, [isActive]);

  // Scroll automático al recibir mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Manejo de Voz (TTS)
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

  const quickQuestions = ["¿Cuánto cuesta hacer el Arroz?", "Analizar costos de platillos", "Ingredientes faltantes"];

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Área de Mensajes */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-40 text-center px-4">
            <ChefHat className="w-12 h-12 mb-2 text-primary" />
            <p className="text-sm font-medium">Gestión de Recetas y Costeo</p>
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {quickQuestions.map(q => (
                <Button key={q} variant="outline" size="xs" className="text-[10px] rounded-full" onClick={() => sendMessage(q)}>
                  {q}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <Card className={`max-w-[85%] border-none shadow-sm ${msg.role === "user" ? "bg-slate-800 text-white rounded-tr-none" : "bg-white rounded-tl-none"}`}>
              <CardContent className="p-3 text-sm leading-relaxed">
                {msg.content}
                {/* Icono decorativo para respuestas del chef */}
                {msg.role === "assistant" && i === messages.length - 1 && (
                  <div className="mt-2 flex justify-end">
                    <Utensils className="w-3 h-3 opacity-20" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary mx-auto" />}
        <div ref={messagesEndRef} />
      </div>

      {/* Barra de Entrada */}
      <div className="flex gap-2 p-2 bg-white rounded-full shadow-md border border-slate-100 shrink-0">
        <Input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={e => e.key === "Enter" && sendMessage(input)}
          placeholder="Ej: ¿Cuál es el costo del Fettuccine?" 
          className="border-none bg-transparent focus-visible:ring-0 shadow-none px-4 text-sm"
        />
        <Button size="icon" onClick={() => sendMessage(input)} disabled={isLoading || !input.trim()} className="rounded-full shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}