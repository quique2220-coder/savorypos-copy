import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, ChefHat, Utensils, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

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

  // Traemos las recetas y los ingredientes para el Snapshot
  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => base44.entities.Recipe.list(),
  });

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
        if (data.messages?.[data.messages.length - 1]?.role === "assistant") {
          setIsLoading(false);
        }
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
      setLastPlayedId(lastMsg.id);
      if (playAudio) playAudio(lastMsg.content);
    }
  }, [messages, isActive, lastPlayedId, playAudio]);

  // FUNCIÓN DE ALTA VELOCIDAD: Inyección de Recetario
  const sendMessage = async (text) => {
    if (!text.trim() || !conversationId) return;
    if (stopAudio) stopAudio();
    setIsLoading(true);
    const userText = text.trim();
    setInput("");

    // Creamos una versión ultra-ligera de las recetas para la IA
    const recipeSnapshot = recipes.map(r => ({
      n: r.name,
      c: r.cost ? `$${r.cost.toFixed(2)}` : "Costo no definido",
      p: `$${r.sale_price.toFixed(2)}`
    })).slice(0, 15); // Enviamos las primeras 15 para no saturar el contexto

    const textWithContext = `
      RECIPE_SNAPSHOT: ${JSON.stringify(recipeSnapshot)}
      USER_QUERY: ${userText}
      INSTRUCTION: Eres un Chef Ejecutivo. Usa el SNAPSHOT para dar costos exactos. No inventes conversiones.
    `;

    try {
      await base44.agents.addMessage({ id: conversationId }, { role: "user", content: textWithContext });
    } catch (err) {
      console.error("Error:", err);
      setIsLoading(false);
    }
  };

  const quickQuestions = ["¿Costo del Mexican Rice?", "Platillos más caros", "Sugerir ajustes de precio"];

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-40 text-center px-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <ChefHat className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm font-bold uppercase tracking-wider text-slate-600">Gestión de Recetas & Costeo</p>
            <div className="flex flex-wrap gap-2 mt-6 justify-center">
              {quickQuestions.map(q => (
                <Button key={q} variant="outline" size="xs" className="text-[10px] rounded-full border-slate-200 hover:bg-slate-50" onClick={() => sendMessage(q)}>
                  {q}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <Card className={`max-w-[85%] border-none shadow-sm ${msg.role === "user" ? "bg-slate-800 text-white rounded-tr-none" : "bg-white rounded-tl-none border border-slate-100"}`}>
              <CardContent className="p-3 text-sm leading-relaxed">
                {msg.role === "user" && msg.content.includes("USER_QUERY:") 
                  ? msg.content.split("USER_QUERY:")[1].split("INSTRUCTION:")[0].trim() 
                  : msg.content}
              </CardContent>
            </Card>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-slate-100 p-3 rounded-xl rounded-tl-none animate-pulse">
               <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2 p-2 bg-white rounded-full shadow-lg border border-slate-100 shrink-0 mb-2">
        <Input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={e => e.key === "Enter" && !isLoading && sendMessage(input)}
          placeholder="Pregunta al Chef sobre costos..." 
          className="border-none bg-transparent focus-visible:ring-0 shadow-none px-4 text-sm"
        />
        <Button size="icon" onClick={() => sendMessage(input)} disabled={isLoading || !input.trim()} className="rounded-full shrink-0 shadow-md">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}