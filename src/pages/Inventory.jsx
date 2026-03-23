import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, AlertTriangle, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import InventoryForm from "@/components/inventory/InventoryForm";

export default function Inventory() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.InventoryItem.list(),
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ["ingredients"],
    queryFn: () => base44.entities.Ingredient.list("-name", 500),
  });

  const create = useMutation({
    mutationFn: (d) => base44.entities.InventoryItem.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["inventory"] }); setFormOpen(false); toast.success("Item added"); },
  });
  const update = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InventoryItem.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["inventory"] }); setFormOpen(false); setEditing(null); toast.success("Item updated"); },
  });
  const del = useMutation({
    mutationFn: (id) => base44.entities.InventoryItem.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["inventory"] }); toast.success("Item deleted"); },
  });

  const handleSave = (data) => {
    if (editing) {
      update.mutate({ id: editing.id, data });
    } else {
      create.mutate(data);
    }
  };

  const filtered = inventory.filter((i) => !search || i.name?.toLowerCase().includes(search.toLowerCase()));
  const lowStockCount = inventory.filter((i) => i.min_stock && i.current_stock <= i.min_stock).length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-1">{inventory.length} items tracked</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Item
        </Button>
      </div>

      {lowStockCount > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
          <div>
            <p className="font-semibold text-sm text-destructive">{lowStockCount} item{lowStockCount > 1 ? "s" : ""} low on stock</p>
            <p className="text-xs text-destructive/80">Review and restock these items soon</p>
          </div>
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search inventory..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card" />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Min Stock</TableHead>
              <TableHead>Cost/Unit</TableHead>
              <TableHead>Total Value</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <PackagePlus className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No inventory items found</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => {
                const isLow = item.min_stock && item.current_stock <= item.min_stock;
                const totalValue = (item.current_stock || 0) * (item.cost_per_unit || 0);
                return (
                  <TableRow key={item.id} className={isLow ? "bg-destructive/5" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {isLow && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
                        {item.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{item.category?.replace("_", " ") || "—"}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {item.current_stock} {item.unit}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.min_stock || "—"} {item.min_stock ? item.unit : ""}</TableCell>
                    <TableCell className="text-muted-foreground">{item.cost_per_unit ? `$${item.cost_per_unit.toFixed(2)}` : "—"}</TableCell>
                    <TableCell className="font-medium">{totalValue > 0 ? `$${totalValue.toFixed(2)}` : "—"}</TableCell>
                    <TableCell className="text-sm">{item.supplier || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(item); setFormOpen(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => del.mutate(item.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <InventoryForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSave={handleSave}
        item={editing}
        isSaving={create.isPending || update.isPending}
        ingredients={ingredients}
      />
    </div>
  );
}