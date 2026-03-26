import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function InventoryConsultant({ conversationId, messages }) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.InventoryItem.list(),
  });

  const lowStockItems = inventory.filter(item => item.current_stock <= (item.min_stock || 0));

  const handleSendMessage = async () => {
    if (!input.trim() || !conversationId) return;
    const today = new Date().toISOString().split('T')[0];
    const textWithContext = `Current date: ${today}\n${input.trim()}`;
    setInput("");
    setIsLoading(true);
    try {
      await base44.agents.addMessage({ id: conversationId }, { role: "user", content: textWithContext });
      setIsLoading(false);
    } catch (err) {
      console.error("Error:", err);
      setIsLoading(false);
    }
  };

  const quickQuestions = [
    "Items bajo stock",
    "Inventario total",
    "Alertas urgentes",
    "Reorder suggestions"
  ];

  return (
    <div className="space-y-4 h-full flex flex-col">
      {lowStockItems.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-orange-900">{lowStockItems.length} items con bajo stock</p>
                <p className="text-orange-700 text-xs mt-1">
                  {lowStockItems.map(i => i.name).join(", ")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex-1 overflow-auto space-y-3 pr-1 mb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg">📦</span>
            </div>
            <div className="space-y-1">
              <p className="font-semibold">Gestión de Inventario</p>
              <p className="text-sm text-muted-foreground">Consulta stock y alertas</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    const textWithContext = `Current date: ${today}\n${q}`;
                    setIsLoading(true);
                    base44.agents.addMessage({ id: conversationId }, { role: "user", content: textWithContext });
                  }}
                  className="text-xs px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-lg px-4 py-3 rounded-2xl ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-secondary text-secondary-foreground rounded-bl-sm"
              }`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
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
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Pregunta sobre inventario..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          disabled={isLoading}
        />
        <Button onClick={handleSendMessage} disabled={!input.trim() || isLoading} size="icon">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}