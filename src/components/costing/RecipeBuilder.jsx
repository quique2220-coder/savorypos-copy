import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Trash2, Calculator, ImagePlus, Loader2 } from "lucide-react";
import { UNITS } from "@/utils/units";
import { calcRecipeTotals } from "@/utils/recipeCalculator";
import { base44 } from "@/api/base44Client";

const RECIPE_CATEGORIES = ["Desayuno","Almuerzo","Cena","Postre","Bebida","Snack","Guarnición","Sub-receta"];

const DEFAULT_RECIPE = {
  name: "", code: "", category: "", recipe_type: "dish",
  description: "", servings: 1, sale_price: 0,
  target_food_cost_percent: 30, prep_time_minutes: 0, cook_time_minutes: 0,
  recipe_items: [], is_active: true,
};

export default function RecipeBuilder({ recipe, ingredients, onSave, onCancel }) {
  const [form, setForm] = useState(DEFAULT_RECIPE);
  const [searchIng, setSearchIng] = useState("");
  const [uploadingImg, setUploadingImg] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("image_url", file_url);
    setUploadingImg(false);
  };

  useEffect(() => { setForm(recipe ? { ...DEFAULT_RECIPE, ...recipe } : DEFAULT_RECIPE); }, [recipe]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const ingMap = Object.fromEntries((ingredients || []).map(i => [i.id, i]));

  const addIngredient = (ing) => {
    const already = form.recipe_items.some(i => i.ingredient_id === ing.id);
    if (already) return;
    set("recipe_items", [
      ...form.recipe_items,
      { ingredient_id: ing.id, ingredient_name: ing.name, quantity: 1, unit: ing.base_unit || "pcs", notes: "" }
    ]);
    setSearchIng("");
  };

  const updateItem = (idx, k, v) => {
    const items = form.recipe_items.map((it, i) => i === idx ? { ...it, [k]: v } : it);
    set("recipe_items", items);
  };

  const removeItem = (idx) => set("recipe_items", form.recipe_items.filter((_, i) => i !== idx));

  const totals = calcRecipeTotals(form, ingMap);

  const filteredIngs = (ingredients || []).filter(i =>
    i.name?.toLowerCase().includes(searchIng.toLowerCase()) && searchIng.length > 0
  ).slice(0, 8);

  const fcColor = totals.foodCostPercent === 0 ? "text-muted-foreground"
    : totals.foodCostPercent <= form.target_food_cost_percent ? "text-emerald-600"
    : totals.foodCostPercent <= form.target_food_cost_percent * 1.2 ? "text-yellow-600"
    : "text-red-600";

  return (
    <Card className="mb-6 border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calculator className="w-4 h-4 text-primary" />
          {recipe ? "Editar Platillo" : "Nuevo Platillo"}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onCancel}><X className="w-4 h-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info básica */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1 col-span-2">
            <Label>Nombre *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Ej: Breakfast Plate" />
          </div>
          <div className="space-y-1">
            <Label>Categoría</Label>
            <Select value={form.category} onValueChange={v => set("category", v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>{RECIPE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={form.recipe_type} onValueChange={v => set("recipe_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dish">Platillo</SelectItem>
                <SelectItem value="subrecipe">Sub-receta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Porciones</Label>
            <Input type="number" min={1} value={form.servings} onChange={e => set("servings", +e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Target Food Cost %</Label>
            <Input type="number" value={form.target_food_cost_percent} onChange={e => set("target_food_cost_percent", +e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Precio de venta ($) *</Label>
            <Input
              type="number"
              value={form.sale_price}
              onChange={e => set("sale_price", +e.target.value)}
              step="0.01"
              className={form.sale_price <= 0 ? "border-red-400 focus-visible:ring-red-400" : ""}
              placeholder="Ej: 8.99"
            />
            {form.sale_price <= 0 && <p className="text-xs text-red-500">⚠️ El precio de venta es obligatorio</p>}
          </div>
          <div className="space-y-1">
            <Label>Prep (min)</Label>
            <Input type="number" value={form.prep_time_minutes} onChange={e => set("prep_time_minutes", +e.target.value)} />
          </div>
        </div>

        {/* Agregar ingrediente */}
        <div className="p-3 bg-muted/40 rounded-lg space-y-2">
          <Label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ingredientes disponibles — clic para agregar</Label>
          <Input
            placeholder="Filtrar ingredientes..."
            value={searchIng}
            onChange={e => setSearchIng(e.target.value)}
            className="mb-2"
          />
          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
            {(ingredients || [])
              .filter(i => !searchIng || i.name?.toLowerCase().includes(searchIng.toLowerCase()))
              .map(ing => {
                const already = form.recipe_items.some(r => r.ingredient_id === ing.id);
                return (
                  <button
                    key={ing.id}
                    type="button"
                    disabled={already}
                    onClick={() => addIngredient(ing)}
                    className={`px-3 py-1.5 rounded-full text-xs border font-medium transition-colors flex items-center gap-1 ${
                      already
                        ? "bg-primary/10 border-primary/40 text-primary cursor-default"
                        : "bg-card border-border hover:bg-primary hover:text-primary-foreground hover:border-primary"
                    }`}
                  >
                    <Plus className={`w-3 h-3 ${already ? "opacity-0" : ""}`} />
                    {ing.name}
                    <span className="opacity-60">({ing.base_unit})</span>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Lista de ingredientes */}
        {form.recipe_items.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Ingrediente</th>
                  <th className="text-center px-2 py-2 font-medium w-24">Cantidad</th>
                  <th className="text-center px-2 py-2 font-medium w-28">Unidad</th>
                  <th className="text-right px-3 py-2 font-medium w-20">Costo</th>
                  <th className="text-right px-3 py-2 font-medium w-20">Calorías</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {form.recipe_items.map((item, idx) => {
                  const ing = ingMap[item.ingredient_id];
                  const qty = Number(item.quantity) || 0;
                  const cpu = ing ? (ing.purchase_quantity > 0 ? ing.purchase_price / ing.purchase_quantity : 0) / ((ing.yield_percent || 100) / 100) : 0;
                  const lineCost = qty * cpu;
                  const lineCal = qty * (ing?.calories_per_base_unit || 0);
                  return (
                    <tr key={idx} className="hover:bg-muted/20">
                      <td className="px-3 py-2">{item.ingredient_name}</td>
                      <td className="px-2 py-2">
                        <Input type="number" value={item.quantity} onChange={e => updateItem(idx, "quantity", +e.target.value)} className="h-7 text-xs text-center" min={0} step="0.1" />
                      </td>
                      <td className="px-2 py-2">
                        <Select value={item.unit} onValueChange={v => updateItem(idx, "unit", v)}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{UNITS.map(u => <SelectItem key={u.code} value={u.code}>{u.code}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">${lineCost.toFixed(4)}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{lineCal.toFixed(1)}</td>
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

        {/* Resumen de costo */}
        {form.recipe_items.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-accent/20 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Costo Total</p>
              <p className="text-lg font-bold">${totals.totalCost.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Costo/Porción</p>
              <p className="text-lg font-bold text-primary">${totals.costPerServing.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Food Cost %</p>
              <p className={`text-lg font-bold ${fcColor}`}>{totals.foodCostPercent.toFixed(1)}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Precio Sugerido</p>
              <p className="text-lg font-bold text-emerald-600">${totals.suggestedPrice.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Calorías Totales</p>
              <p className="font-semibold">{totals.totalCalories.toFixed(0)} kcal</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Cal/Porción</p>
              <p className="font-semibold">{totals.caloriesPerServing.toFixed(0)} kcal</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Ganancia Bruta</p>
              {form.sale_price > 0
                ? <p className={`font-semibold ${totals.grossProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>${totals.grossProfit.toFixed(2)}</p>
                : <p className="font-semibold text-muted-foreground">—</p>}
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Margen Bruto</p>
              {form.sale_price > 0
                ? <p className={`font-semibold ${totals.grossMargin >= 0 ? "text-emerald-600" : "text-red-600"}`}>{totals.grossMargin.toFixed(1)}%</p>
                : <p className="font-semibold text-muted-foreground">—</p>}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name || form.sale_price <= 0}>Guardar Platillo</Button>
        </div>
        {form.sale_price <= 0 && <p className="text-xs text-center text-red-500">Debes ingresar un precio de venta para guardar</p>}
      </CardContent>
    </Card>
  );
}