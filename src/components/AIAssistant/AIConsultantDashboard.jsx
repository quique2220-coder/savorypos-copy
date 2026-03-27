import React, { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Package, UtensilsCrossed, BookOpen, PieChart } from "lucide-react";
import SalesConsultant from "./SalesConsultant";
import InventoryConsultant from "./InventoryConsultant";
import RecipeConsultant from "./RecipeConsultant";
import FinancialConsultant from "./FinancialConsultant";
import PricingConsultant from "./PricingConsultant";
import VoiceActivation from "../VoiceActivation";

const TAB_IDS = ["sales", "inventory", "recipes", "pricing", "financial"];

const tabs = [
  { id: "sales", label: "Ventas & Performance", icon: TrendingUp },
  { id: "inventory", label: "Inventario", icon: Package },
  { id: "recipes", label: "Platillos", icon: UtensilsCrossed },
  { id: "pricing", label: "Precios & Márgenes", icon: BarChart3 },
  { id: "financial", label: "Finanzas", icon: PieChart },
];

export default function AIConsultantDashboard() {
  const [activeTab, setActiveTab] = useState("sales");
  const [currentAudio, setCurrentAudio] = useState(null);

  const stopAllAudio = useCallback(() => {
    setCurrentAudio(prev => {
      if (prev) { prev.pause(); prev.currentTime = 0; }
      return null;
    });
  }, []);

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

  const handleTabChange = (tab) => {
    stopAllAudio();
    setActiveTab(tab);
  };

  const sharedProps = { playAudio, stopAudio: stopAllAudio };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="max-w-7xl mx-auto w-full flex flex-col h-full gap-3">

        <Card className="shrink-0">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              Consultor Experto IA
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Análisis inteligente de todos tus datos de negocio
            </p>
          </CardHeader>
        </Card>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-5 mb-4 h-auto bg-card border border-border p-1 rounded-lg shrink-0">
              {tabs.map(({ id, label, icon: Icon }) => (
                <TabsTrigger key={id} value={id} className="flex flex-col gap-0.5 text-xs py-2">
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex-1 overflow-hidden rounded-lg border border-border bg-card">
              {/* Render all tabs always mounted but hidden — each manages its own conversation */}
              <div className={`h-full p-6 ${activeTab === "sales" ? "block" : "hidden"}`}>
                <SalesConsultant {...sharedProps} isActive={activeTab === "sales"} />
              </div>
              <div className={`h-full p-6 ${activeTab === "inventory" ? "block" : "hidden"}`}>
                <InventoryConsultant {...sharedProps} isActive={activeTab === "inventory"} />
              </div>
              <div className={`h-full p-6 ${activeTab === "recipes" ? "block" : "hidden"}`}>
                <RecipeConsultant {...sharedProps} isActive={activeTab === "recipes"} />
              </div>
              <div className={`h-full p-6 ${activeTab === "pricing" ? "block" : "hidden"}`}>
                <PricingConsultant {...sharedProps} isActive={activeTab === "pricing"} />
              </div>
              <div className={`h-full p-6 ${activeTab === "financial" ? "block" : "hidden"}`}>
                <FinancialConsultant {...sharedProps} isActive={activeTab === "financial"} />
              </div>
            </div>
          </Tabs>
        </div>
      </div>
      <VoiceActivation activeTab={activeTab} />
    </div>
  );
}