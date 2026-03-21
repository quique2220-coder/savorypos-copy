import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Pencil, Trash2, FlaskConical } from "lucide-react";
import IngredientForm from "@/components/costing/IngredientForm";
import { INGREDIENT_CATEGORIES } from "@/utils/units";
import { costPerBaseUnit } from "@/utils/recipeCalculator";

export default function Ingredients() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();

  const { data: ingredients = [] } = useQuery({
    queryKey: ["ingredients"],
    queryFn: () => base44.entities.Ingredient.list("-updated_date", 500),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => id
      ? base44.entities.Ingredient.update(id, data)
      : base44.entities.Ingredient.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ingredients"] }); setShowForm(false); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Ingredient.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ingredients"] }),
  });

  const filtered = ingredients.filter(i => {
    const matchSearch = i.name?.toLowerCase().includes(search.toLowerCase()) || i.supplier?.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || i.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="p-6 min-h-screen bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FlaskConical className="w-6 h-6 text-primary" /> Ingredientes
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{ingredients.length} ingredientes en catálogo</p>
          </div>
          <Button onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Nuevo Ingrediente
          </Button>
        </div>

        {showForm && (
          <IngredientForm
            ingredient={editing}
            onSave={(data) => saveMutation.mutate({ id: editing?.id, data })}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        )}

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar ingrediente o proveedor..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => setCategoryFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${categoryFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>Todos</button>
            {INGREDIENT_CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategoryFilter(c)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${categoryFilter === c ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>{c}</button>
            ))}
          </div>
        </div>

        {/* Tabla */}
        {filtered.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">No hay ingredientes. Crea tu primer ingrediente.</CardContent></Card>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Nombre</th>
                  <th className="text-left px-3 py-3 font-medium hidden md:table-cell">Categoría</th>
                  <th className="text-left px-3 py-3 font-medium hidden lg:table-cell">Proveedor</th>
                  <th className="text-right px-3 py-3 font-medium">Costo/paq.</th>
                  <th className="text-right px-3 py-3 font-medium">Costo/unidad base</th>
                  <th className="text-right px-3 py-3 font-medium hidden md:table-cell">Calorías</th>
                  <th className="text-right px-3 py-3 font-medium hidden md:table-cell">Rendimiento</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(ing => (
                  <tr key={ing.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                          {ing.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{ing.name}</p>
                          {ing.code && <p className="text-xs text-muted-foreground">{ing.code}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      {ing.category && <Badge variant="secondary" className="text-xs">{ing.category}</Badge>}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground hidden lg:table-cell">{ing.supplier || "—"}</td>
                    <td className="px-3 py-3 text-right font-mono">${(ing.purchase_price || 0).toFixed(2)} / {ing.purchase_quantity || 1} {ing.purchase_unit}</td>
                    <td className="px-3 py-3 text-right font-mono font-semibold text-primary">${costPerBaseUnit(ing).toFixed(4)} /{ing.base_unit}</td>
                    <td className="px-3 py-3 text-right hidden md:table-cell text-muted-foreground">{ing.calories_per_base_unit || 0} kcal</td>
                    <td className="px-3 py-3 text-right hidden md:table-cell">
                      <span className={`text-xs font-medium ${(ing.yield_percent || 100) < 90 ? "text-yellow-600" : "text-emerald-600"}`}>
                        {ing.yield_percent || 100}%
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(ing); setShowForm(true); }}><Pencil className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(ing.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}