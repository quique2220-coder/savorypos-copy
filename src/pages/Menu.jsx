import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Tag, FolderOpen, FlameIcon, ExternalLink } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import MenuItemForm from "@/components/menu/MenuItemForm";
import { costPerBaseUnit } from "@/utils/recipeCalculator";

export default function Menu() {
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const queryClient = useQueryClient();

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => base44.entities.Recipe.list("-updated_date", 200),
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ["ingredients"],
    queryFn: () => base44.entities.Ingredient.list(),
  });

  // Only dish recipes
  const menuItems = useMemo(() =>
    recipes.filter(r => r.recipe_type !== "subrecipe"),
    [recipes]
  );

  // Calculate cost from recipe_items + ingredients
  const calcCost = (recipe) => {
    if (!recipe.recipe_items?.length) return null;
    let total = 0;
    for (const ri of recipe.recipe_items) {
      const ing = ingredients.find(i => i.id === ri.ingredient_id);
      if (!ing) continue;
      const costPerUnit = ing.purchase_price && ing.purchase_quantity
        ? (ing.purchase_price / ing.purchase_quantity) / ((ing.yield_percent || 100) / 100)
        : 0;
      total += costPerUnit * (ri.quantity || 0);
    }
    return total > 0 ? total / (recipe.servings || 1) : null;
  };

  // Unique string categories from recipes
  const categories = useMemo(() => {
    const cats = [...new Set(recipes.filter(r => r.category).map(r => r.category))];
    return cats.sort();
  }, [recipes]);

  const createItem = useMutation({
    mutationFn: (d) => base44.entities.Recipe.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["recipes"] }); setItemFormOpen(false); setEditingItem(null); toast.success("Item created"); },
  });
  const updateItem = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Recipe.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["recipes"] }); setItemFormOpen(false); setEditingItem(null); toast.success("Item updated"); },
  });
  const deleteItem = useMutation({
    mutationFn: (id) => base44.entities.Recipe.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["recipes"] }); toast.success("Item deleted"); },
  });

  const handleSave = (data) => {
    if (editingItem) {
      // Preserve all existing recipe fields (recipe_items, servings, etc.) and only overwrite what MenuItemForm changes
      updateItem.mutate({ id: editingItem.id, data: { ...editingItem, ...data } });
    } else {
      createItem.mutate({ ...data, recipe_type: "dish" });
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Menu Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Linked to Recipes & Inventory — changes reflect in POS instantly
          </p>
        </div>
      </div>

      <Tabs defaultValue="items">
        <TabsList className="mb-4">
          <TabsTrigger value="items" className="flex items-center gap-1.5"><Tag className="w-4 h-4" /> Items ({menuItems.length})</TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-1.5"><FolderOpen className="w-4 h-4" /> Categories ({categories.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setEditingItem(null); setItemFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Add Item
            </Button>
          </div>
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Cost/Srv</TableHead>
                  <TableHead>Food Cost%</TableHead>
                  <TableHead>Target $</TableHead>
                  <TableHead>GP %</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menuItems.map((item) => {
                  const cost = calcCost(item);
                  const price = item.sale_price || 0;
                  const foodCostPct = price && cost ? cost / price : null;
                  const targetFCP = (item.target_food_cost_percent || 30) / 100;
                  const targetPrice = cost ? cost / targetFCP : null;
                  const gpPct = price && cost ? ((price - cost) / price) * 100 : null;
                  const isOver = foodCostPct && foodCostPct > targetFCP;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{item.name}</span>
                          {item.description && <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{item.category || "—"}</TableCell>
                      <TableCell className="font-semibold">${price?.toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">{cost ? `$${cost.toFixed(2)}` : "—"}</TableCell>
                      <TableCell>
                        {foodCostPct !== null ? (
                          <Badge className={isOver ? "bg-red-100 text-red-700 border-red-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"}>
                            {(foodCostPct * 100).toFixed(1)}%
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {targetPrice ? <span className={price < targetPrice ? "text-amber-600 font-semibold" : "text-emerald-600"}>${targetPrice.toFixed(2)}</span> : "—"}
                      </TableCell>
                      <TableCell>
                        {gpPct !== null ? (
                          <Badge variant="secondary" className="text-xs">{gpPct.toFixed(1)}%</Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.is_active !== false ? "default" : "secondary"}>
                          {item.is_active !== false ? "Available" : "Unavailable"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingItem(item); setItemFormOpen(true); }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Link to="/Recipes">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" title="Edit full recipe & ingredients">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteItem.mutate(item.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {menuItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      No menu items yet. Add your first item or create recipes in the Recipes section.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            💡 To manage ingredients & detailed costing, go to <Link to="/Recipes" className="text-primary underline">Recipes</Link>.
            Cost/Srv is automatically calculated from linked ingredients in Inventory.
          </p>
        </TabsContent>

        <TabsContent value="categories">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((cat) => (
              <div key={cat} className="bg-card rounded-xl border p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{cat}</p>
                  <p className="text-xs text-muted-foreground">{menuItems.filter(i => i.category === cat).length} items</p>
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No categories yet. Categories are derived from your Recipes.
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            💡 Categories are automatically generated from the "Category" field of your <Link to="/Recipes" className="text-primary underline">Recipes</Link>.
          </p>
        </TabsContent>
      </Tabs>

      <MenuItemForm
        open={itemFormOpen}
        onClose={() => { setItemFormOpen(false); setEditingItem(null); }}
        onSave={handleSave}
        item={editingItem}
        categories={categories}
        isSaving={createItem.isPending || updateItem.isPending}
        ingredients={ingredients}
      />
    </div>
  );
}