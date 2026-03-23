import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { costPerBaseUnit } from "@/utils/recipeCalculator";

export default function InventoryForm({ open, onClose, onSave, item, isSaving, ingredients = [] }) {
  const [form, setForm] = useState({ ingredient_id: "", current_stock: "", min_stock: "" });

  useEffect(() => {
    if (item) {
      setForm({
        ingredient_id: item.ingredient_id || "",
        current_stock: item.current_stock?.toString() || "",
        min_stock: item.min_stock?.toString() || "",
      });
    } else {
      setForm({ ingredient_id: "", current_stock: "", min_stock: "" });
    }
  }, [item, open]);

  const selectedIng = ingredients.find(i => i.id === form.ingredient_id);
  const cpu = selectedIng ? costPerBaseUnit(selectedIng) : 0;

  const handleSave = () => {
    if (!selectedIng) return;
    onSave({
      ingredient_id: selectedIng.id,
      name: selectedIng.name,
      unit: selectedIng.base_unit || "pcs",
      current_stock: parseFloat(form.current_stock) || 0,
      min_stock: parseFloat(form.min_stock) || 0,
      cost_per_unit: cpu,
      supplier: selectedIng.supplier || "",
      category: selectedIng.category || "other",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Editar Stock" : "Agregar Stock"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Ingrediente *</Label>
            <Select value={form.ingredient_id} onValueChange={(v) => setForm({ ...form, ingredient_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar ingrediente..." />
              </SelectTrigger>
              <SelectContent>
                {ingredients.map(i => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name} <span className="text-muted-foreground">({i.base_unit})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedIng && (
            <div className="grid grid-cols-3 gap-2 p-3 bg-muted/40 rounded-lg text-xs">
              <div>
                <p className="text-muted-foreground">Unidad</p>
                <p className="font-semibold">{selectedIng.base_unit}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Costo/unidad</p>
                <p className="font-semibold text-primary">${cpu.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Proveedor</p>
                <p className="font-semibold">{selectedIng.supplier || "—"}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Stock actual *</Label>
              <div className="flex items-center gap-1.5">
                <Input type="number" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: e.target.value })} />
                {selectedIng && <Badge variant="outline" className="text-xs shrink-0">{selectedIng.base_unit}</Badge>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Stock mínimo</Label>
              <Input type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
            </div>
          </div>

          {selectedIng && form.current_stock && (
            <div className="p-2 bg-accent/20 rounded-lg text-xs text-center">
              Valor en inventario: <span className="font-bold text-primary">${(parseFloat(form.current_stock) * cpu).toFixed(2)}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.ingredient_id || !form.current_stock || isSaving}>
            {isSaving ? "Guardando..." : item ? "Actualizar" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}