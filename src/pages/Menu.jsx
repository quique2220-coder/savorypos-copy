import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Tag, FolderOpen, FlameIcon, TrendingUp } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import MenuItemForm from "@/components/menu/MenuItemForm";
import CategoryForm from "@/components/menu/CategoryForm";

export default function Menu() {
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [catFormOpen, setCatFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingCat, setEditingCat] = useState(null);
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => base44.entities.Category.list(),
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ["menuItems"],
    queryFn: () => base44.entities.MenuItem.list(),
  });

  const createItem = useMutation({
    mutationFn: (d) => base44.entities.MenuItem.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["menuItems"] }); setItemFormOpen(false); setEditingItem(null); toast.success("Item created"); },
  });
  const updateItem = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MenuItem.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["menuItems"] }); setItemFormOpen(false); setEditingItem(null); toast.success("Item updated"); },
  });
  const deleteItem = useMutation({
    mutationFn: (id) => base44.entities.MenuItem.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["menuItems"] }); toast.success("Item deleted"); },
  });

  const createCat = useMutation({
    mutationFn: (d) => base44.entities.Category.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); setCatFormOpen(false); setEditingCat(null); toast.success("Category created"); },
  });
  const updateCat = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Category.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); setCatFormOpen(false); setEditingCat(null); toast.success("Category updated"); },
  });
  const deleteCat = useMutation({
    mutationFn: (id) => base44.entities.Category.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); toast.success("Category deleted"); },
  });

  const getCategoryName = (id) => categories.find((c) => c.id === id)?.name || "—";

  const handleSaveItem = (data) => {
    if (editingItem) {
      updateItem.mutate({ id: editingItem.id, data });
    } else {
      createItem.mutate(data);
    }
  };

  const handleSaveCat = (data) => {
    if (editingCat) {
      updateCat.mutate({ id: editingCat.id, data });
    } else {
      createCat.mutate(data);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Menu Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your menu items and categories</p>
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
                  <TableHead>Cost/Serving</TableHead>
                  <TableHead>Food Cost %</TableHead>
                  <TableHead>Target Price</TableHead>
                  <TableHead>GP %</TableHead>
                  <TableHead className="flex items-center gap-1"><FlameIcon className="w-3.5 h-3.5 text-orange-500" />Calories</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menuItems.map((item) => {
                  const foodCostPct = item.price && item.cost ? item.cost / item.price : null;
                  const targetFCP = item.target_food_cost_pct || 0.3;
                  const targetPrice = item.cost ? item.cost / targetFCP : null;
                  const gpPct = item.price && item.cost ? ((item.price - item.cost) / item.price) * 100 : null;
                  const isOver = foodCostPct && foodCostPct > targetFCP;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{item.name}</span>
                          {item.description && <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{getCategoryName(item.category_id)}</TableCell>
                      <TableCell className="font-semibold">${item.price?.toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">{item.cost ? `$${item.cost.toFixed(2)}` : "—"}</TableCell>
                      <TableCell>
                        {foodCostPct !== null ? (
                          <Badge className={isOver ? "bg-red-100 text-red-700 border-red-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"}>
                            {(foodCostPct * 100).toFixed(1)}%
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {targetPrice ? <span className={item.price < targetPrice ? "text-amber-600 font-semibold" : "text-emerald-600"}>${targetPrice.toFixed(2)}</span> : "—"}
                      </TableCell>
                      <TableCell>
                        {gpPct !== null ? (
                          <Badge variant="secondary" className="text-xs">{gpPct.toFixed(1)}%</Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {item.calories ? (
                          <span className="flex items-center gap-1 text-sm text-orange-600">
                            <FlameIcon className="w-3.5 h-3.5" />{item.calories}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.is_available !== false ? "default" : "secondary"}>
                          {item.is_available !== false ? "Available" : "Unavailable"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingItem(item); setItemFormOpen(true); }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
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
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No menu items yet. Add your first item to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setEditingCat(null); setCatFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Add Category
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((cat) => (
              <div key={cat.id} className="bg-card rounded-xl border p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cat.icon || "📁"}</span>
                  <div>
                    <p className="font-semibold">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">{menuItems.filter((i) => i.category_id === cat.id).length} items</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingCat(cat); setCatFormOpen(true); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteCat.mutate(cat.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No categories yet. Create categories to organize your menu.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <MenuItemForm
        open={itemFormOpen}
        onClose={() => { setItemFormOpen(false); setEditingItem(null); }}
        onSave={handleSaveItem}
        item={editingItem}
        categories={categories}
        isSaving={createItem.isPending || updateItem.isPending}
      />
      <CategoryForm
        open={catFormOpen}
        onClose={() => { setCatFormOpen(false); setEditingCat(null); }}
        onSave={handleSaveCat}
        category={editingCat}
        isSaving={createCat.isPending || updateCat.isPending}
      />
    </div>
  );
}