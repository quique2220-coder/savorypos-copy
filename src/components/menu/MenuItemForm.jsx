import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ImagePlus, Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { calcRecipeTotals } from "@/utils/recipeCalculator";

const DEFAULT_FORM = {
  name: "", description: "", sale_price: "", category: "",
  is_active: true, prep_time_minutes: "", image_url: "",
  target_food_cost_percent: "30",
};

export default function MenuItemForm({ open, onClose, onSave, item, categories, isSaving, ingredients = [] }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name || "",
        description: item.description || "",
        sale_price: item.sale_price?.toString() || "",
        category: item.category || "",
        is_active: item.is_active !== false,
        prep_time_minutes: item.prep_time_minutes?.toString() || "",
        image_url: item.image_url || "",
        target_food_cost_percent: item.target_food_cost_percent?.toString() || "30",
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [item, open]);

  // Calculate suggested price and cost breakdown from recipe ingredients
  const { suggestedPrice, costPerServing, breakdown } = useMemo(() => {
    if (!item?.recipe_items?.length || !ingredients.length) return { suggestedPrice: null, costPerServing: null, breakdown: [] };
    const ingMap = Object.fromEntries(ingredients.map(i => [i.id, i]));
    const totals = calcRecipeTotals(item, ingMap);

    // Build line-by-line breakdown for debugging
    const lines = (item.recipe_items || []).map(ri => {
      const ing = ingMap[ri.ingredient_id];
      if (!ing) return null;
      const cpu = ing.purchase_price && ing.purchase_quantity
        ? (ing.purchase_price / ing.purchase_quantity) / ((ing.yield_percent || 100) / 100)
        : 0;
      const lineCost = cpu * (Number(ri.quantity) || 0);
      return { name: ri.ingredient_name || ing.name, qty: ri.quantity, unit: ri.unit, cpu, lineCost };
    }).filter(Boolean);

    return {
      suggestedPrice: totals.suggestedPrice > 0 ? totals.suggestedPrice : null,
      costPerServing: totals.costPerServing > 0 ? totals.costPerServing : null,
      breakdown: lines,
    };
  }, [item, ingredients, form.target_food_cost_percent]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, image_url: file_url }));
    setUploading(false);
  };

  const handleSave = () => {
    onSave({
      name: form.name,
      description: form.description,
      sale_price: parseFloat(form.sale_price) || 0,
      category: form.category,
      is_active: form.is_active,
      prep_time_minutes: parseInt(form.prep_time_minutes) || 0,
      image_url: form.image_url,
      target_food_cost_percent: parseFloat(form.target_food_cost_percent) || 30,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-20" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Selling Price ($) *</Label>
              <Input type="number" step="0.01" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Target Food Cost %</Label>
                {suggestedPrice && (
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Sugerido: ${suggestedPrice.toFixed(2)}
                  </span>
                )}
              </div>
              <Input type="number" step="1" value={form.target_food_cost_percent} onChange={(e) => setForm({ ...form, target_food_cost_percent: e.target.value })} placeholder="30" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input
                list="cat-list"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Burgers"
              />
              <datalist id="cat-list">
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label>Prep Time (min)</Label>
              <Input type="number" value={form.prep_time_minutes} onChange={(e) => setForm({ ...form, prep_time_minutes: e.target.value })} />
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-1.5">
            <Label>Imagen del platillo</Label>
            <div className="flex items-center gap-3">
              {form.image_url ? (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border shrink-0">
                  <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, image_url: "" }))}
                    className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border bg-muted/30 flex items-center justify-center shrink-0">
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <ImagePlus className="w-5 h-5 text-muted-foreground" />}
                </div>
              )}
              <label className="cursor-pointer flex-1">
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
                <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors w-full justify-center">
                  <ImagePlus className="w-4 h-4" />
                  {uploading ? "Subiendo..." : "Subir imagen (PNG, JPG, JPEG, PDF)"}
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Available on menu</Label>
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          </div>
          <p className="text-xs text-muted-foreground">
            💡 To add ingredients & recipe details, use the <strong>Recipes</strong> section after creating this item.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.name || !form.sale_price || isSaving}>
            {isSaving ? "Saving..." : item ? "Update Item" : "Create Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}