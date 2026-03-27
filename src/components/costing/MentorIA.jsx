import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Lightbulb, Sparkles, Target } from "lucide-react";
import { toast } from "sonner";

export default function MentorIA() {
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState(null);
  const [lastPrice, setLastPrice] = useState(null); // Para mantener el título correcto

  const handleAskAdvice = async () => {
    const numericPrice = parseFloat(price);
    if (!price || numericPrice <= 0) {
      toast.error("Ingresa un precio válido para analizar");
      return;
    }

    setLoading(true);
    setAdvice(null); // Limpiar consejo anterior para feedback visual
    try {
      // Llamada a la función personalizada en el backend de Base44
      const response = await base44.functions.invoke("restaurantMentor", {
        price: numericPrice,
      });
      
      setAdvice(response.data);
      setLastPrice(numericPrice);
      setPrice("");
    } catch (err) {
      console.error("Error MentorIA:", err);
      toast.error("El mentor está ocupado. Intenta en un momento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
        {/* Decoración visual de IA */}
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkles className="w-20 h-20 text-primary" />
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Mentor Estratégico</h3>
        </div>
        
        <p className="text-sm text-slate-500 mb-6">
          Simula un escenario de precios. Ingresa cuánto quieres cobrar por un nuevo platillo y recibirás 3 estrategias de rentabilidad.
        </p>

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
            <Input
              type="number"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={loading}
              className="pl-7 bg-slate-50 border-slate-200 focus:bg-white transition-all"
            />
          </div>
          <Button
            onClick={handleAskAdvice}
            disabled={loading || !price}
            className="rounded-xl px-6 shadow-md transition-transform active:scale-95"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Target className="w-4 h-4 mr-2" />}
            Analizar
          </Button>
        </div>

        {advice && (
          <div className="space-y-4 mt-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Recomendaciones para ${lastPrice}
              </p>
            </div>
            
            <div className="grid gap-3">
              {advice.recommendations?.map((rec, idx) => (
                <div key={idx} className="group bg-slate-50 hover:bg-white p-4 rounded-xl border border-transparent hover:border-primary/20 transition-all shadow-sm">
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white border border-slate-200 text-[10px] font-bold flex items-center justify-center text-primary shadow-sm">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-800 mb-1 group-hover:text-primary transition-colors">
                        {rec.title}
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {rec.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}