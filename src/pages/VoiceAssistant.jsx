import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, MicOff, Loader2, TrendingUp, Package, ChefHat, PieChart } from "lucide-react";

const ACTIONS = [
  { label: "Ventas", prompt: "¿Cómo van las ventas de hoy?", icon: TrendingUp },
  { label: "Inventario", prompt: "¿Qué hay bajo en stock?", icon: Package },
  { label: "Platillos", prompt: "Analiza el costo de mis platillos", icon: ChefHat },
  { label: "Márgenes", prompt: "¿Cuáles son mis mejores márgenes?", icon: PieChart },
];

export default function VoiceAssistant() {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef(null);
  const lastSpokenIdRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      const conv = await base44.agents.createConversation({ agent_name: "restaurantAI" });
      setConversationId(conv.id);
    };
    init();
    return () => audioRef.current?.pause();
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    return base44.agents.subscribeToConversation(conversationId, (data) => {
      const msgs = data.messages || [];
      setMessages(msgs);
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg?.role === "assistant" && lastMsg.id !== lastSpokenIdRef.current) {
        setIsLoading(false);
        lastSpokenIdRef.current = lastMsg.id;
        playVoice(lastMsg.content);
      }
    });
  }, [conversationId]);

  const handleVoice = async (text) => {
  // Detenemos cualquier audio que esté sonando
  if (audioRef.current) {
    audioRef.current.pause();
    audioRef.current = null;
  }
  
  setIsSpeaking(true);
  
  try {
    // === FILTRO DE LIMPIEZA PROFUNDA (Aquí está la magia) ===
    const cleanText = text
      .replace(/\n/g, " ")               // Quita saltos de línea para que no haya baches
      .replace(/\*/g, "")                // Quita asteriscos de negritas
      .replace(/%/g, " por ciento")      // Convierte % en palabras
      .replace(/\(/g, ". ")              // Convierte paréntesis en pausas naturales
      .replace(/\)/g, "")                // Elimina el cierre de paréntesis
      .replace(/:/g, ",")                // Cambia dos puntos por comas (pausa breve)
      .replace(/\$/g, " pesos ");        // Asegura que lea la moneda correctamente

    // Enviamos el texto limpio a ElevenLabs
    const res = await base44.functions.invoke("elevenLabsTTS", { text: cleanText });
    
    if (!res.data?.audio) throw new Error("No audio data");

    const audio = new Audio(`data:audio/mpeg;base64,${res.data.audio}`);
    audioRef.current = audio;
    audio.onended = () => setIsSpeaking(false);
    audio.onerror = () => setIsSpeaking(false);
    
    await audio.play();
  } catch (error) {
    console.error("Error en TTS:", error);
    setIsSpeaking(false);
  }
};