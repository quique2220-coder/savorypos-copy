import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, TrendingUp, DollarSign, PieChart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const getLocalDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
};

export default function FinancialConsultant({ playAudio, stopAudio, isActive }) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [lastPlayedId, setLastPlayedId] = useState(null);
  const messagesEndRef = useRef(null);
  const initRef = useRef(false);

  // Consultas de datos reales
  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list(),
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.OperatingExpense.list(),
  });

  // Cálculos de negocio (Pre-procesados para el AI)
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  useEffect(() => {
    if (initRef.current || !isActive) return;
    initRef.current = true;

    base44.agents.createConversation({
      agent_name: "restaurantAI",
      metadata: { tab: "financial" },
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

  // FUNCIÓN DE ALTO RENDIMIENTO: Envía Snapshot Financiero
  const sendMessage = async (text) => {
    if (!text.trim() || !conversationId) return;
    if (stopAudio) stopAudio();
    setIsLoading(true);
    setInput("");
    
    // Dataset "masticado" para evitar latencia de cálculo en la IA
    const financialSnapshot = {
      ventas_totales: totalRevenue,
      gastos_totales: totalExpenses,
      utilidad_neta: netProfit,
      margen_utilidad: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) + "%" : "0%",
      conteo_ordenes: orders.length,
      resumen_gastos: expenses.slice(0, 5).map(e => ({ d: e.description, a: e.amount }))
    };

    const textWithContext = `
      Current date: ${getLocalDate()}
      FINANCIAL_SNAPSHOT: ${JSON.stringify(financialSnapshot)}
      USER_QUERY: ${text.trim()}
      INSTRUCCION: Usa los números del SNAPSHOT para responder de forma concisa.
    `;

    await base44.agents.addMessage({ id: conversationId }, { 
      role: "user", 
      content: textWithContext 
    });
  };

  const quickQuestions = ["Estado de resultados", "¿Cómo mejorar mi utilidad?", "Resumen de gastos"];

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Mini Dashboard Financiero */}
      <div className="grid grid-cols-3 gap-2 shrink-0">
        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl shadow-sm">
          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Ventas</p>
          <p className="text-sm font-black text-slate-800">${totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-rose-50 border border-rose-100 p-3 rounded-2xl shadow-sm">
          <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">Gastos</p>
          <p className="text-sm font-black text-slate-800">${totalExpenses.toLocaleString()}</p>
        </div>
        <div className="bg-sky-50 border border-sky-100 p-3 rounded-2xl shadow-sm">
          <p className="text-[10px] text-sky-600 font-bold uppercase tracking-wider">Utilidad</p>
          <p className="text-sm font-black text-slate-800">${netProfit.toLocaleString()}</p>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-40 text-center px-4">
            <PieChart className="w-12 h-12 mb-2 text-primary" />
            <p className="text-sm font-medium">Análisis Financiero Instantáneo</p>
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
                {msg.role === "user" && msg.content.includes("USER_QUERY:") 
                  ? msg.content.split("USER_QUERY:")[1].split("INSTRUCCION:")[0].trim() 
                  : msg.content}
              </CardContent>
            </Card>
          </div>
        ))}
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary mx-auto mt-2" />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 p-2 bg-white rounded-full shadow-md border border-slate-100 shrink-0 mb-1">
        <Input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={e => e.key === "Enter" && sendMessage(input)}
          placeholder="Consulta sobre rentabilidad..." 
          className="border-none bg-transparent focus-visible:ring-0 shadow-none px-4 text-sm"
        />
        <Button size="icon" onClick={() => sendMessage(input)} disabled={isLoading || !input.trim()} className="rounded-full shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}