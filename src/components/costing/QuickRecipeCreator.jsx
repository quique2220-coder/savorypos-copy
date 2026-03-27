import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Trash2, Sparkles, ChefHat, TrendingUp, DollarSign, Zap } from "lucide-react";
import { UNITS } from "@/utils/units";
import { costPerBaseUnit } from "@/utils/recipeCalculator";

const TARGET_MARGIN = 0.70; // 70% margen fijo

const CATEGORIES = ["Desayuno", "Almuerzo", "Cena", "Postre", "Bebida", "Snack", "Guarnición"];

export default function QuickRecipeCreator({ ingredients = [], onSave, onCancel }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [servings, setServings] = useState(1);
  const [searchIng, setSearchIng] = useState("");
  const [items, setItems] = useState([]);
  const [customPrice, setCustomPrice] = useState(null); // null = usar sugerido

  const ingMap = Object.fromEntries(ingredients.map(i => [i.id, i]));

  // Cálculos en tiempo real
  const totalFoodCost = items.reduce((sum, item) => {
    const ing = ingMap[item.ingredient_id];
    const cpu = costPerBaseUnit(ing);
    return sum + (Number(item.quantity) || 0) * cpu;
  }, 0);

  const foodCostPerServing = servings > 0 ? totalFoodCost / servings : 0;
  const suggestedPrice = foodCostPerServing > 0 ? foodCostPerServing / (1 - TARGET_MARGIN) : 0;
  const salePrice = customPrice !== null ? customPrice : suggestedPrice;
  const actualMargin = salePrice > 0 ? ((salePrice - foodCostPerServing) / salePrice) * 100 : 0;
  const isGoodMargin = actualMargin >= 68;

  const filteredIngs = ingredients.filter(i =>
    i.name?.toLowerCase().includes(searchIng.toLowerCase()) && searchIng.length > 0
  ).slice(0, 8);

  const addIngredient = (ing) => {
    if (items.some(i => i.ingredient_id === ing.id)) return;
    setItems(prev => [...prev, {
      ingredient_id: ing.id,
      ingredient_name: ing.name,
      quantity: 1,
      unit: ing.base_unit || "pcs",
    }]);
    setSearchIng("");
  };

  const updateItem = (idx, k, v) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [k]: v } : it));
  };

  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const applyPrice = () => setCustomPrice(parseFloat(suggestedPrice.toFixed(2)));

  const handleSave = () => {
    if (!name.trim() || items.length === 0 || salePrice <= 0) return;
    const finalPrice = parseFloat(salePrice.toFixed(2));
    onSave({
      name: name.trim(),
      category,
      servings,
      sale_price: finalPrice,
      target_food_cost_percent: 30,
      target_margin_percent: 70,
      recipe_items: items,
      is_active: true,
      recipe_type: "dish",
    });
  };

  const canSave = name.trim() && items.length > 0 && salePrice > 0;

  return (
    <Card className="mb-6 border-primary/40 shadow-lg">
      <CardHeader className="pb-3 flex flex-row items-center justify-between bg-gradient-to-r from-primary/5 to-transparent rounded-t-xl">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          Nueva Receta — Cálculo Automático
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onCancel}><X className="w-4 h-4" /></Button>
      </CardHeader>

      <CardContent className="space-y-5 pt-4">
        {/* Nombre y categoría */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2 space-y-1">
            <Label>Nombre del platillo *</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Tacos de Pollo"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label>Categoría</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Porciones</Label>
            <Input
              type="number"
              min={1}
              value={servings}
              onChange={e => setServings(Math.max(1, +e.target.value))}
            />
          </div>
        </div>

        {/* Buscador de ingredientes */}
        <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <ChefHat className="w-3 h-3" /> Agregar ingredientes
          </Label>
          <div className="relative">
            <Input
              placeholder="Buscar ingrediente..."
              value={searchIng}
              onChange={e => setSearchIng(e.target.value)}
            />
            {filteredIngs.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full bg-white border border-border rounded-lg shadow-xl overflow-hidden">
                {filteredIngs.map(ing => {
                  const cpu = costPerBaseUnit(ing);
                  const already = items.some(i => i.ingredient_id === ing.id);
                  return (
                    <button
                      key={ing.id}
                      type="button"
                      disabled={already}
                      onClick={() => addIngredient(ing)}
                      className={`w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-primary/5 transition-colors text-sm ${already ? "opacity-40 cursor-default" : "cursor-pointer"}`}
                    >
                      <span className="font-medium">{ing.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ${cpu.toFixed(3)}/{ing.base_unit}
                        {already && " · ya agregado"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {ingredients.length === 0 && (
            <p className="text-xs text-amber-600">⚠ No hay ingredientes registrados. Ve a Ingredientes para agregarlos.</p>
          )}
        </div>

        {/* Tabla de ingredientes */}
        {items.length > 0 && (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Ingrediente</th>
                  <th className="text-center px-2 py-2 font-semibold w-24">Cantidad</th>
                  <th className="text-center px-2 py-2 font-semibold w-24">Unidad</th>
                  <th className="text-right px-3 py-2 font-semibold w-24">$/unid</th>
                  <th className="text-right px-3 py-2 font-semibold w-24">Subtotal</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item, idx) => {
                  const ing = ingMap[item.ingredient_id];
                  const cpu = costPerBaseUnit(ing);
                  const qty = Number(item.quantity) || 0;
                  const lineCost = qty * cpu;
                  return (
                    <tr key={idx} className="hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium">{item.ingredient_name}</td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={e => updateItem(idx, "quantity", +e.target.value)}
                          className="h-7 text-xs text-center"
                          min={0}
                          step="0.1"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Select value={item.unit} onValueChange={v => updateItem(idx, "unit", v)}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{UNITS.map(u => <SelectItem key={u.code} value={u.code}>{u.code}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">${cpu.toFixed(4)}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs font-bold">${lineCost.toFixed(3)}</td>
                      <td className="px-2 py-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(idx)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Panel de precio sugerido — aparece cuando hay ingredientes */}
        {items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Costo */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-center">
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Costo / porción</p>
              <p className="text-2xl font-black text-blue-700">${foodCostPerServing.toFixed(2)}</p>
              <p className="text-xs text-blue-500 mt-1">Total: ${totalFoodCost.toFixed(2)} ÷ {servings} porc.</p>
            </div>

            {/* Precio sugerido */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center relative">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                <Badge className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" /> Auto
                </Badge>
              </div>
              <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider mb-1">Precio sugerido</p>
              <p className="text-2xl font-black text-emerald-700">${suggestedPrice.toFixed(2)}</p>
              <p className="text-xs text-emerald-600 mt-1">Margen 70% · costo ÷ 0.30</p>
              {customPrice === null && (
                <Button size="sm" variant="outline" className="mt-2 text-xs h-6 border-emerald-300 text-emerald-700 hover:bg-emerald-100" onClick={applyPrice}>
                  Usar este precio
                </Button>
              )}
            </div>

            {/* Precio de venta editable */}
            <div className={`p-4 border rounded-2xl ${isGoodMargin ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isGoodMargin ? "text-amber-700" : "text-red-600"}`}>
                Precio de venta
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span className={`text-lg font-bold ${isGoodMargin ? "text-amber-700" : "text-red-600"}`}>$</span>
                <Input
                  type="number"
                  value={customPrice !== null ? customPrice : suggestedPrice.toFixed(2)}
                  onChange={e => setCustomPrice(+e.target.value)}
                  className="border-0 bg-transparent text-xl font-black p-0 h-auto focus-visible:ring-0 w-full"
                  step="0.25"
                  min="0"
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs font-bold ${isGoodMargin ? "text-amber-600" : "text-red-500"}`}>
                  Margen: {actualMargin.toFixed(1)}%
                </span>
                {!isGoodMargin && (
                  <span className="text-[10px] text-red-500">⚠ Bajo 70%</span>
                )}
              </div>
              {customPrice !== null && (
                <button
                  type="button"
                  onClick={() => setCustomPrice(null)}
                  className="text-[10px] text-muted-foreground underline mt-1 hover:text-primary"
                >
                  Restaurar sugerido
                </button>
              )}
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={!canSave}
            className="gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Guardar Platillo
          </Button>
        </div>

        {!canSave && name && (
          <p className="text-xs text-center text-muted-foreground">
            {items.length === 0 ? "Agrega al menos un ingrediente" : "Verifica el precio de venta"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}