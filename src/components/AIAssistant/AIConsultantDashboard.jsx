import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Package, UtensilsCrossed, BookOpen, PieChart } from "lucide-react";
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

  // Detener audio global
  const stopAllAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
  };

  // Mantener el tab activo en window para que los consultants lo lean
  useEffect(() => {
    window.activeTab = activeTab;
  }, [activeTab]);

  // Crear conversación única al montar
  useEffect(() => {
    const initConversation = async () => {
      try {
        const conv = await base44.agents.createConversation({
          agent_name: "voiceAssistant",
          metadata: { name: "Consultor Experto IA" },
        });
        setConversationId(conv.id);
        setMessages(conv.messages || []);

        // Suscribirse a actualizaciones
        const unsubscribe = base44.agents.subscribeToConversation(conv.id, (data) => {
          setMessages(data.messages || []);
          // Reproducir audio solo si el último mensaje es del asistente
          const lastMsg = data.messages?.[data.messages.length - 1];
          if (lastMsg?.role === "assistant") {
            const event = new CustomEvent("assistantResponse", { detail: { message: lastMsg } });
            window.dispatchEvent(event);
          }
        });

        return unsubscribe;
      } catch (err) {
        console.error("Error iniciando conversación:", err);
      }
    };

    let unsubscribe;
    initConversation().then(unsub => { unsubscribe = unsub; });
    
    return () => {
      unsubscribe?.();
      stopAllAudio();
    };
  }, []);

  const handleVoiceInput = (text) => {
    // Solo enviar al consultant activo
    const event = new CustomEvent("voiceInput", { detail: { text, tab: activeTab } });
    window.dispatchEvent(event);
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
                {activeTab === "sales" && <SalesConsultant conversationId={conversationId} messages={messages} stopAllAudio={stopAllAudio} setCurrentAudio={setCurrentAudio} />}
                {activeTab === "inventory" && <InventoryConsultant conversationId={conversationId} messages={messages} stopAllAudio={stopAllAudio} setCurrentAudio={setCurrentAudio} />}
                {activeTab === "recipes" && <RecipeConsultant conversationId={conversationId} messages={messages} stopAllAudio={stopAllAudio} setCurrentAudio={setCurrentAudio} />}
                {activeTab === "pricing" && <PricingConsultant conversationId={conversationId} messages={messages} stopAllAudio={stopAllAudio} setCurrentAudio={setCurrentAudio} />}
                {activeTab === "financial" && <FinancialConsultant conversationId={conversationId} messages={messages} stopAllAudio={stopAllAudio} setCurrentAudio={setCurrentAudio} />}
              </div>
            </div>
          </Tabs>
        </div>
      </div>
      <VoiceActivation activeTab={activeTab} />
    </div>
  );
}