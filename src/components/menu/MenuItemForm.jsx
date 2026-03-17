import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FlameIcon } from "lucide-react";
import RecipeCalculator from "./RecipeCalculator";

const DEFAULT_FORM = {
  name: "", description: "", price: "", category_id: "",
  is_available: true, prep_time_minutes: "", tags: "",
  calories: "",
  recipe_servings: "1",
  target_food_cost_pct: "0.3",
  recipe_ingredients: [],
  cost: "",
};

export default function MenuItemForm({ open, onClose, onSave, item, categories, isSaving }) {
  const [form, setForm] = useState(DEFAULT_FORM);

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name || "",
        description: item.description || "",
        price: item.price?.toString() || "",
        cost: item.cost?.toString() || "",
        category_id: item.category_id || "",
        is_available: item.is_available !== false,
        prep_time_minutes: item.prep_time_minutes?.toString() || "",
        tags: item.tags?.join(", ") || "",
        calories: item.calories?.toString() || "",
        recipe_servings: item.recipe_servings?.toString() || "1",
        target_food_cost_pct: item.target_food_cost_pct?.toString() || "0.3",
        recipe_ingredients: item.recipe_ingredients || [],
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [item, open]);

  const handleRecipeUpdate = (changes) => {
    setForm((prev) => ({
      ...prev,
      ...changes,
      cost: changes.calculatedCost !== undefined ? changes.calculatedCost.toString() : prev.cost,
      // auto-update calories from ingredient sum if provided
    }));
  };

  const handleSave = () => {
    onSave({
      name: form.name,
      description: form.description,
      price: parseFloat(form.price) || 0,
      cost: parseFloat(form.cost) || 0,
      category_id: form.category_id,
      is_available: form.is_available,
      prep_time_minutes: parseInt(form.prep_time_minutes) || 0,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      calories: parseFloat(form.calories) || 0,
      recipe_servings: parseFloat(form.recipe_servings) || 1,
      target_food_cost_pct: parseFloat(form.target_food_cost_pct) || 0.3,
      recipe_ingredients: form.recipe_ingredients,
    });
  };

  const caloriesFromIngredients = form.recipe_ingredients.reduce(
    (s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.calories_per_unit) || 0), 0
  ) / (parseFloat(form.recipe_servings) || 1);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details">
          <TabsList className="mb-4">
            <TabsTrigger value="details">Item Details</TabsTrigger>
            <TabsTrigger value="recipe">Recipe & Costing</TabsTrigger>
          </TabsList>

          {/* ── Details Tab ── */}
          <TabsContent value="details" className="space-y-4">
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
                <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Cost / Serving ($)</Label>
                <Input
                  type="number" step="0.01" value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  placeholder="Auto from recipe"
                  className="bg-muted/40"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prep Time (min)</Label>
                <Input type="number" value={form.prep_time_minutes} onChange={(e) => setForm({ ...form, prep_time_minutes: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><FlameIcon className="w-3.5 h-3.5 text-orange-500" /> Calories (kcal / serving)</Label>
                <Input
                  type="number" min="0"
                  value={form.calories}
                  onChange={(e) => setForm({ ...form, calories: e.target.value })}
                  placeholder={caloriesFromIngredients > 0 ? `~${Math.round(caloriesFromIngredients)} from recipe` : "e.g. 450"}
                />
                {caloriesFromIngredients > 0 && (
                  <p className="text-xs text-muted-foreground">Auto-calc from ingredients: ~{Math.round(caloriesFromIngredients)} kcal</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Tags (comma separated)</Label>
                <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="spicy, vegan, gluten-free" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Available on menu</Label>
              <Switch checked={form.is_available} onCheckedChange={(v) => setForm({ ...form, is_available: v })} />
            </div>
          </TabsContent>

          {/* ── Recipe Tab ── */}
          <TabsContent value="recipe">
            <RecipeCalculator
              ingredients={form.recipe_ingredients}
              recipeServings={form.recipe_servings}
              targetFoodCostPct={form.target_food_cost_pct}
              actualPrice={parseFloat(form.price) || 0}
              calories={form.calories}
              onUpdate={handleRecipeUpdate}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.name || !form.price || isSaving}>
            {isSaving ? "Saving..." : item ? "Update Item" : "Create Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}