import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Save, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { buildIngredientsMap, calcMenuItemCost } from "@/utils/menuItemCost";

export default function QuickPriceEditor() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [pendingPrices, setPendingPrices] = useState({}); // id -> new price
  const [savedIds, setSavedIds] = useState(new Set());

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ["recipes", "price-editor"],
    queryFn: () => base44.entities.Recipe.list("-updated_date", 200),
  });
  const { data: ingredients = [] } = useQuery({
    queryKey: ["ingredients", "price-editor"],
    queryFn: () => base44.entities.Ingredient.list(),
  });

  const ingMap = useMemo(() => buildIngredientsMap(ingredients), [ingredients]);

  const items = useMemo(() => {
    return recipes
      .filter(r => r.is_active !== false)
      .filter(r => !search || r.name?.toLowerCase().includes(search.toLowerCase()))
      .map(r => {
        const cost = calcMenuItemCost(r, ingMap);
        const price = pendingPrices[r.id] !== undefined ? pendingPrices[r.id] : r.sale_price;
        const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
        const foodCostPct = price > 0 ? (cost / price) * 100 : 0;
        return { ...r, cost, price, margin, foodCostPct };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [recipes, ingMap, search, pendingPrices]);

  const updatePrice = useMutation({
    mutationFn: ({ id, price }) => base44.entities.Recipe.update(id, { sale_price: Number(price) }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      setPendingPrices(prev => { const n = { ...prev }; delete n[vars.id]; return n; });
      setSavedIds(prev => new Set(prev).add(vars.id));
      setTimeout(() => {
        setSavedIds(prev => { const n = new Set(prev); n.delete(vars.id); return n; });
      }, 2000);
      toast.success("Precio actualizado");
    },
    onError: () => toast.error("Error al actualizar precio"),
  });

  const handlePriceChange = (id, value) => {
    setPendingPrices(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = (item) => {
    const newPrice = pendingPrices[item.id];
    if (newPrice === undefined || newPrice === "") return;
    const num = Number(newPrice);
    if (isNaN(num) || num < 0) {
      toast.error("Precio inválido");
      return;
    }
    updatePrice.mutate({ id: item.id, price: num });
  };

  const hasPending = Object.keys(pendingPrices).length > 0;

  const marginTone = (m) => {
    if (m >= 70) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (m >= 50) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-base">Editor de Precios</CardTitle>
          <div className="flex items-center gap-2">
            {hasPending && (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {Object.keys(pendingPrices).length} sin guardar
              </span>
            )}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar platillo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Cargando menú...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No se encontraron platillos.</p>
        ) : (
          <div className="space-y-1">
            {/* Header */}
            <div className="hidden md:grid grid-cols-12 gap-3 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <div className="col-span-4">Platillo</div>
              <div className="col-span-2 text-right">Costo</div>
              <div className="col-span-2 text-right">% Food Cost</div>
              <div className="col-span-2 text-right">Margen</div>
              <div className="col-span-2 text-right">Precio</div>
            </div>
            {items.map(item => {
              const isSaved = savedIds.has(item.id);
              const isDirty = pendingPrices[item.id] !== undefined;
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-3 items-center px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors border-b"
                >
                  <div className="col-span-12 md:col-span-4 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    {item.category && <p className="text-xs text-muted-foreground">{item.category}</p>}
                  </div>
                  <div className="col-span-4 md:col-span-2 text-right">
                    <p className="text-sm">${(item.cost || 0).toFixed(2)}</p>
                  </div>
                  <div className="col-span-4 md:col-span-2 text-right">
                    <Badge variant="outline" className={marginTone(100 - item.foodCostPct)}>
                      {item.foodCostPct.toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="col-span-4 md:col-span-2 text-right">
                    <Badge variant="outline" className={marginTone(item.margin)}>
                      {item.margin.toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-1.5">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => handlePriceChange(item.id, e.target.value)}
                        className="w-24 pl-5 h-8 text-sm"
                      />
                    </div>
                    {isSaved ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleSave(item)}
                        disabled={!isDirty || updatePrice.isPending}
                      >
                        <Save className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}