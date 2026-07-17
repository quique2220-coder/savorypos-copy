import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { UNITS, ALLERGENS, INGREDIENT_CATEGORIES, getConversionFactor } from "@/utils/units";
import { costPerBaseUnit } from "@/utils/recipeCalculator";

const DEFAULT = {
  name: "", code: "", category: "", brand: "", supplier: "",
  source_type: "custom",
  purchase_quantity: 1, purchase_unit: "pcs", purchase_price: 0,
  base_unit: "pcs", yield_percent: 100, waste_percent: 0,
  calories_per_base_unit: 0, protein_per_base_unit: 0,
  carbs_per_base_unit: 0, fat_per_base_unit: 0, sodium_mg_per_base_unit: 0,
  allergens: [], notes: "", is_active: true,
};

export default function IngredientForm({ ingredient, onSave, onCancel }) {
  const [form, setForm] = useState(DEFAULT);
  const [showNutrition, setShowNutrition] = useState(true);

  useEffect(() => { setForm(ingredient ? { ...DEFAULT, ...ingredient } : DEFAULT); }, [ingredient]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleAllergen = (a) => {
    const list = form.allergens || [];
    set("allergens", list.includes(a) ? list.filter(x => x !== a) : [...list, a]);
  };

  const cpu = costPerBaseUnit(form);

  return (
    <Card className="mb-6 border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm">{ingredient ? "Editar Ingrediente" : "Nuevo Ingrediente"}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onCancel}><X className="w-4 h-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Básicos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1 col-span-2 md:col-span-2">
            <Label>Nombre *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Ej: Huevo entero" />
          </div>
          <div className="space-y-1">
            <Label>Categoría</Label>
            <Select value={form.category} onValueChange={v => set("category", v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>{INGREDIENT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Código SKU</Label>
            <Input value={form.code} onChange={e => set("code", e.target.value)} placeholder="ING-001" />
          </div>
          <div className="space-y-1">
            <Label>Marca</Label>
            <Input value={form.brand} onChange={e => set("brand", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Proveedor</Label>
            <Input value={form.supplier} onChange={e => set("supplier", e.target.value)} />
          </div>
        </div>

        {/* Compra */}
        <div className="p-3 bg-muted/40 rounded-lg">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Compra</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Qty por paquete</Label>
              <Input type="number" value={form.purchase_quantity} onChange={e => set("purchase_quantity", +e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Unidad de compra</Label>
              <Select value={form.purchase_unit} onValueChange={v => set("purchase_unit", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{UNITS.map(u => <SelectItem key={u.code} value={u.code}>{u.name} ({u.code})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Precio del paquete ($)</Label>
              <Input type="number" value={form.purchase_price} onChange={e => set("purchase_price", +e.target.value)} step="0.01" />
            </div>
            <div className="space-y-1">
              <Label>Unidad base (en recetas)</Label>
              <Select value={form.base_unit} onValueChange={v => set("base_unit", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{UNITS.map(u => <SelectItem key={u.code} value={u.code}>{u.name} ({u.code})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Rendimiento %</Label>
              <Input type="number" value={form.yield_percent} onChange={e => set("yield_percent", +e.target.value)} min={0} max={100} />
            </div>
            <div className="space-y-1">
              <Label>Costo/unidad base (calc.)</Label>
              <div className="h-9 flex items-center px-3 rounded-md border bg-accent/30 text-sm font-semibold text-primary">
                ${cpu.toFixed(4)}
              </div>
            </div>
          </div>
        </div>

        {/* Nutrición toggle */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowNutrition(!showNutrition)}
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            {showNutrition ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Información Nutricional <span className="text-primary">(por 1 {form.base_unit})</span>
          </button>
          {showNutrition && form.purchase_unit !== form.base_unit && (() => {
            const factor = getConversionFactor(form.purchase_unit, form.base_unit);
            const qty = form.purchase_quantity || 1;
            const totalFactor = qty * factor;
            return factor !== null && factor !== 1 ? (
              <button
                type="button"
                onClick={() => {
                  setForm(f => ({
                    ...f,
                    calories_per_base_unit: +((f.calories_per_base_unit || 0) / totalFactor).toFixed(4),
                    protein_per_base_unit: +((f.protein_per_base_unit || 0) / totalFactor).toFixed(4),
                    carbs_per_base_unit: +((f.carbs_per_base_unit || 0) / totalFactor).toFixed(4),
                    fat_per_base_unit: +((f.fat_per_base_unit || 0) / totalFactor).toFixed(4),
                    sodium_mg_per_base_unit: +((f.sodium_mg_per_base_unit || 0) / totalFactor).toFixed(4),
                  }));
                }}
                className="text-xs bg-primary/10 text-primary border border-primary/30 px-2 py-1 rounded-md hover:bg-primary/20 transition-colors font-semibold"
              >
                ÷ {qty} × {factor.toFixed(4)} (convertir de {form.purchase_unit} a {form.base_unit})
              </button>
            ) : null;
          })()}
        </div>

        {showNutrition && (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {[
              ["Calorías", "calories_per_base_unit", "kcal"],
              ["Proteína", "protein_per_base_unit", "g"],
              ["Carbos", "carbs_per_base_unit", "g"],
              ["Grasa", "fat_per_base_unit", "g"],
              ["Sodio", "sodium_mg_per_base_unit", "mg"],
            ].map(([label, key, unit]) => (
              <div key={key} className="space-y-1">
                <Label>{label} ({unit})</Label>
                <Input type="number" value={form[key]} onChange={e => set(key, +e.target.value)} step="0.01" />
              </div>
            ))}
          </div>
        )}

        {/* Alérgenos */}
        <div>
          <Label className="mb-2 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Alérgenos</Label>
          <div className="flex flex-wrap gap-1">
            {ALLERGENS.map(a => (
              <button
                key={a} type="button"
                onClick={() => toggleAllergen(a)}
                className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${(form.allergens || []).includes(a) ? "bg-destructive/10 border-destructive/30 text-destructive font-semibold" : "border-border text-muted-foreground hover:border-foreground"}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name}>Guardar Ingrediente</Button>
        </div>
      </CardContent>
    </Card>
  );
}