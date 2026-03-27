import React, { useState, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Package, UtensilsCrossed, BookOpen, PieChart, Sparkles } from "lucide-react";
import SalesConsultant from "./SalesConsultant";
import InventoryConsultant from "./InventoryConsultant";
import RecipeConsultant from "./RecipeConsultant";
import FinancialConsultant from "./FinancialConsultant";
import PricingConsultant from "./PricingConsultant";
import VoiceActivation from "../VoiceActivation";

const tabs = [
  { id: "sales", label: "Ventas", icon: TrendingUp },
  { id: "inventory", label: "Inventario", icon: Package },
  { id: "recipes", label: "Platillos", icon: UtensilsCrossed },
  { id: "pricing", label: "Precios", icon: BarChart3 },
  { id: "financial", label: "Finanzas", icon: PieChart },
];

export default function AIConsultantDashboard() {
  const [activeTab, setActiveTab] = useState("sales");
  const audioRef = useRef(null);

  const stopAllAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  }, []);

  const playAudio = useCallback(async (text) => {
    if (!text?.trim()) return;
    stopAllAudio(); // Detener cualquier audio previo antes de empezar el nuevo
    
    try {
      const res = await base44.functions.invoke("elevenLabsTTS", { 
        text: text.substring(0, 1000) // Limitar para máxima velocidad de respuesta
      });
      
      if (res.data?.audio) {
        const audio = new Audio(`data:audio/mpeg;base64,${res.data.audio}`);
        audioRef.current = audio;
        await audio.play();
      }
    } catch (err) {
      console.error("Error en TTS:", err);
    }
  }, [stopAllAudio]);

  const handleTabChange = (tab) => {
    stopAllAudio();
    setActiveTab(tab);
  };

  const sharedProps = { playAudio, stopAudio: stopAllAudio };

  return (
    <div className="h-screen flex flex-col bg-slate-50 p-4 overflow-hidden">
      <div className="max-w-7xl mx-auto w-full flex flex-col h-full gap-4">
        
        {/* Header con Efecto AI */}
        <Card className="shrink-0 border-none shadow-sm bg-white/80 backdrop-blur-md">
          <CardHeader className="py-4 px-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold tracking-tight">Savory AI Consultant</CardTitle>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Motor de Análisis en Tiempo Real</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
            
            {/* Tabs Estilo Moderno */}
            <div className="px-6 pt-6">
              <TabsList className="flex w-full justify-start gap-2 bg-slate-100/50 p-1.5 rounded-2xl h-auto">
                {tabs.map(({ id, label, icon: Icon }) => (
                  <TabsTrigger 
                    key={id} 
                    value={id} 
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-semibold">{label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Área de Contenido con Carga Condicional pero Persistente */}
            <div className="flex-1 relative mt-2">
              <div className={`absolute inset-0 p-6 ${activeTab === "sales" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}>
                <SalesConsultant {...sharedProps} isActive={activeTab === "sales"} />
              </div>
              <div className={`absolute inset-0 p-6 ${activeTab === "inventory" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}>
                <InventoryConsultant {...sharedProps} isActive={activeTab === "inventory"} />
              </div>
              <div className={`absolute inset-0 p-6 ${activeTab === "recipes" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}>
                <RecipeConsultant {...sharedProps} isActive={activeTab === "recipes"} />
              </div>
              <div className={`absolute inset-0 p-6 ${activeTab === "pricing" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}>
                <PricingConsultant {...sharedProps} isActive={activeTab === "pricing"} />
              </div>
              <div className={`absolute inset-0 p-6 ${activeTab === "financial" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}>
                <FinancialConsultant {...sharedProps} isActive={activeTab === "financial"} />
              </div>
            </div>
          </Tabs>
        </div>
      </div>
      
      {/* Activación por Voz Flotante */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <VoiceActivation activeTab={activeTab} />
      </div>
    </div>
  );
}