import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2, ChefHat, TrendingUp, DollarSign } from "lucide-react";
import RecipeBuilder from "@/components/costing/RecipeBuilder";
import { calcRecipeTotals } from "@/utils/recipeCalculator";

export default function Recipes() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => base44.entities.Recipe.list("-updated_date", 200),
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ["ingredients"],
    queryFn: () => base44.entities.Ingredient.list("-updated_date", 500),
  });

  const ingMap = Object.fromEntries(ingredients.map(i => [i.id, i]));

  const saveMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      if (!id) return base44.entities.Recipe.create(data);
      try {
        return await base44.entities.Recipe.update(id, data);
      } catch (e) {
        // Si el registro ya no existe, crear uno nuevo
        return base44.entities.Recipe.create(data);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["recipes"] }); setShowForm(false); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Recipe.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });

  const filtered = recipes.filter(r => r.name?.toLowerCase().includes(search.toLowerCase()));

  const fcColor = (pct, target) => {
    if (pct === 0) return "text-muted-foreground";
    if (pct <= target) return "text-emerald-600";
    if (pct <= target * 1.2) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="p-6 min-h-screen bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ChefHat className="w-6 h-6 text-primary" /> Platillos & Recetas
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{recipes.length} recetas · cálculo automático de costos</p>
          </div>
          <Button onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Nuevo Platillo
          </Button>
        </div>

        {showForm && (
          <RecipeBuilder
            recipe={editing}
            ingredients={ingredients}
            onSave={(data) => saveMutation.mutate({ id: editing?.id, data })}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        )}

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar platillo..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {filtered.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">
            <ChefHat className="w-10 h-10 mx-auto mb-3 opacity-30" />
            No hay platillos. Crea tu primera receta.
          </CardContent></Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(recipe => {
              const totals = calcRecipeTotals(recipe, ingMap);
              const items = recipe.recipe_items || [];
              return (
                <Card key={recipe.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{recipe.name}</h3>
                          <Badge variant={recipe.recipe_type === "subrecipe" ? "outline" : "default"} className="text-xs">
                            {recipe.recipe_type === "subrecipe" ? "Sub-receta" : "Platillo"}
                          </Badge>
                        </div>
                        {recipe.category && <p className="text-xs text-muted-foreground">{recipe.category}</p>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(recipe); setShowForm(true); }}><Pencil className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(recipe.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="p-2 bg-muted/40 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Costo/porción</p>
                        <p className="font-bold text-primary">${totals.costPerServing.toFixed(2)}</p>
                      </div>
                      <div className="p-2 bg-muted/40 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Precio venta</p>
                        <p className="font-bold">${(recipe.sale_price || 0).toFixed(2)}</p>
                      </div>
                      <div className="p-2 bg-muted/40 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Food Cost %</p>
                        <p className={`font-bold ${fcColor(totals.foodCostPercent, recipe.target_food_cost_percent)}`}>
                          {totals.foodCostPercent.toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-2 bg-muted/40 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Precio sugerido</p>
                        <p className="font-bold text-emerald-600">${totals.suggestedPrice.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex justify-between text-xs text-muted-foreground border-t border-border pt-2">
                      <span>{items.length} ingredientes · {recipe.servings || 1} porciones</span>
                      <span>{totals.caloriesPerServing.toFixed(0)} kcal/porción</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}