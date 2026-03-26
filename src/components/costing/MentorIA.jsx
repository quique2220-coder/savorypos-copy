import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Lightbulb } from "lucide-react";
import { toast } from "sonner";

export default function MentorIA() {
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState(null);

  const handleAskAdvice = async () => {
    if (!price || parseFloat(price) <= 0) {
      toast.error("Ingresa un precio válido");
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke("restaurantMentor", {
        price: parseFloat(price),
      });
      setAdvice(response.data);
      setPrice("");
    } catch (err) {
      console.error("Error:", err);
      toast.error("Error al obtener consejos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-gradient-to-r from-primary/10 to-accent rounded-lg p-6 border border-primary/20">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Mentor IA</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Consejos para tu negocio. Ingresa tu precio de venta y presiona "Pedir consejo" para recibir 3 recomendaciones concretas de un mentor virtual especializado en restaurantes.
        </p>

        <div className="flex gap-2 mb-4">
          <Input
            type="number"
            placeholder="Precio de venta ($)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAskAdvice();
            }}
            disabled={loading}
            step="0.01"
            min="0"
            className="flex-1"
          />
          <Button
            onClick={handleAskAdvice}
            disabled={loading || !price}
            className="gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
            Pedir consejo
          </Button>
        </div>

        {advice && (
          <div className="space-y-3 mt-6 pt-4 border-t border-border">
            <p className="text-sm font-semibold text-foreground mb-3">
              Recomendaciones para precio ${price}:
            </p>
            {advice.recommendations && advice.recommendations.map((rec, idx) => (
              <div key={idx} className="bg-card p-3 rounded border border-border">
                <p className="text-sm font-medium text-primary mb-1">
                  {idx + 1}. {rec.title}
                </p>
                <p className="text-sm text-foreground">{rec.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}