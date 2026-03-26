import React, { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Package, UtensilsCrossed, BookOpen, PieChart } from "lucide-react";
import { toast } from "sonner";
import SalesConsultant from "./SalesConsultant";
import InventoryConsultant from "./InventoryConsultant";
import RecipeConsultant from "./RecipeConsultant";
import FinancialConsultant from "./FinancialConsultant";
import PricingConsultant from "./PricingConsultant";
import VoiceActivation from "../VoiceActivation";

export default function AIConsultantDashboard() {
  const [activeTab, setActiveTab] = useState("sales");
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [lastPlayedMessageId, setLastPlayedMessageId] = useState(null);
  const initializingRef = useRef(false);

  // Detener audio global
  const stopAllAudio = useCallback(() => {
    setCurrentAudio(prev => {
      if (prev) {
        prev.pause();
        prev.currentTime = 0;
      }
      return null;
    });
  }, []);

  // TTS centralizado
  const playAudio = useCallback(async (text) => {
    if (!text?.trim()) return;
    try {
      const res = await base44.functions.invoke("elevenLabsTTS", { text: text.substring(0, 3000) });
      if (res.data?.audio) {
        const audio = new Audio(`data:audio/mpeg;base64,${res.data.audio}`);
        setCurrentAudio(audio);
        audio.play();
      }
    } catch (err) {
      console.error("TTS error:", err);
    }
  }, []);



  // Crear conversación única al montar
  useEffect(() => {
    if (initializingRef.current) return;
    initializingRef.current = true;

    let unsubscribe;

    const initConversation = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 500)); // Esperar un poco antes de intentar
        const conv = await base44.agents.createConversation({
          agent_name: "voiceAssistant",
          metadata: { name: "Consultor Experto IA" },
        });
        setConversationId(conv.id);
        setMessages(conv.messages || []);

        // Suscribirse a actualizaciones
        unsubscribe = base44.agents.subscribeToConversation(conv.id, (data) => {
          setMessages(data.messages || []);
          // Reproducir audio del último mensaje del asistente (solo si es nuevo)
          const lastMsg = data.messages?.[data.messages.length - 1];
          if (lastMsg?.role === "assistant" && lastMsg?.content && lastMsg?.id !== lastPlayedMessageId) {
            setLastPlayedMessageId(lastMsg.id);
            playAudio(lastMsg.content);
          }
        });
      } catch (err) {
        console.error("Error iniciando conversación:", err);
      }
    };

    initConversation();
    
    return () => {
      unsubscribe?.();
      stopAllAudio();
    };
  }, []);

  // Escuchar eventos de voz y enviar mensaje
  useEffect(() => {
    const handleVoiceEvent = (e) => {
      if (e.detail.tab === activeTab) {
        handleVoiceInput(e.detail.text);
      }
    };

    window.addEventListener("voiceInput", handleVoiceEvent);
    return () => window.removeEventListener("voiceInput", handleVoiceEvent);
  }, [activeTab, conversationId]);

  const handleVoiceInput = async (text) => {
    if (!conversationId) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const textWithContext = `Current date: ${today}\n${text}`;
      await base44.agents.addMessage({ id: conversationId }, { role: "user", content: textWithContext });
    } catch (err) {
      console.error("Error sending voice:", err);
    }
  };

  const tabs = [
    {
      id: "sales",
      label: "Ventas & Performance",
      icon: TrendingUp,
      component: <SalesConsultant />,
      desc: "Análisis de ventas diarias, tendencias y performance"
    },
    {
      id: "inventory",
      label: "Inventario",
      icon: Package,
      component: <InventoryConsultant />,
      desc: "Gestión inteligente de inventario y alertas de stock"
    },
    {
      id: "recipes",
      label: "Platillos",
      icon: UtensilsCrossed,
      component: <RecipeConsultant />,
      desc: "Crear, editar platillos y ver costos"
    },
    {
      id: "pricing",
      label: "Precios & Márgenes",
      icon: BarChart3,
      component: <PricingConsultant />,
      desc: "Análisis de márgenes y sugerencias de precios"
    },
    {
      id: "financial",
      label: "Finanzas",
      icon: PieChart,
      component: <FinancialConsultant />,
      desc: "Reportes financieros y análisis contable"
    }
  ];

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="max-w-7xl mx-auto w-full flex flex-col h-full gap-3">
        
        {/* Header */}
        <Card className="shrink-0">
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  Consultor Experto IA
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Análisis inteligente de todos tus datos de negocio
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tabs */}
        <div className="flex-1 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-5 mb-4 h-auto bg-card border border-border p-1 rounded-lg">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger key={tab.id} value={tab.id} className="flex flex-col gap-0.5 text-xs py-2">
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <div className="flex-1 overflow-auto rounded-lg border border-border bg-card">
              <div className="h-full overflow-auto p-6">
                {!conversationId ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-muted-foreground">Inicializando asistente...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {activeTab === "sales" && <SalesConsultant conversationId={conversationId} messages={messages} />}
                    {activeTab === "inventory" && <InventoryConsultant conversationId={conversationId} messages={messages} />}
                    {activeTab === "recipes" && <RecipeConsultant conversationId={conversationId} messages={messages} />}
                    {activeTab === "pricing" && <PricingConsultant conversationId={conversationId} messages={messages} />}
                    {activeTab === "financial" && <FinancialConsultant conversationId={conversationId} messages={messages} />}
                  </>
                )}
              </div>
            </div>
          </Tabs>
        </div>
      </div>
      <VoiceActivation activeTab={activeTab} />
    </div>
  );
}