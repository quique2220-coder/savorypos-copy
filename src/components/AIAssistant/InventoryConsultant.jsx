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

  // Obtener inventario en tiempo real
  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.InventoryItem.list(),
  });

  const lowStockItems = inventory.filter(item => item.current_stock <= (item.min_stock || 0));

  // Inicializar conversación
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
        // Si el último mensaje es del asistente, dejamos de cargar
        if (data.messages?.[data.messages.length - 1]?.role === "assistant") {
          setIsLoading(false);
        }
      });
    });
  }, [isActive]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Manejo de Voz
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "assistant" && lastMsg.id !== lastPlayedId && isActive) {
      setLastPlayedId(lastMsg.id);
      if (playAudio) playAudio(lastMsg.content);
    }
  }, [messages, isActive, lastPlayedId, playAudio]);

  // ENVÍO CON SNAPSHOT DE ALTA VELOCIDAD
  const sendMessage = async (text) => {
    if (!text.trim() || !conversationId) return;
    if (stopAudio) stopAudio();
    setIsLoading(true);
    const userText = text.trim();
    setInput("");

    // Mapa simplificado para que la IA no trabaje de más
    const inventorySnapshot = inventory.map(i => ({
      n: i.name,
      s: i.current_stock,
      m: i.min_stock || 0,
      st: i.current_stock <= (i.min_stock || 0) ? "ALERTA" : "OK"
    }));

    const textWithContext = `
      SNAPSHOT: ${JSON.stringify(inventorySnapshot)}
      USER_QUERY: ${userText}
      INSTRUCTION: Respond directly using SNAPSHOT data. Be ultra-concise.
    `;

    try {
      await base44.agents.addMessage({ id: conversationId }, { role: "user", content: textWithContext });
    } catch (err) {
      console.error("Error sending message:", err);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {lowStockItems.length > 0 && (
        <Card className="border-red