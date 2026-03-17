import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const UNITS = ["kg", "g", "lbs", "oz", "liters", "ml", "units", "boxes", "bags"];
const CATEGORIES = ["proteins", "produce", "dairy", "grains", "beverages", "spices", "packaging", "other"];

export default function InventoryForm({ open, onClose, onSave, item, isSaving }) {
  const [form, setForm] = useState({
    name: "", unit: "units", current_stock: "", min_stock: "",
    cost_per_unit: "", supplier: "", category: "other",
  });

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name || "",
        unit: item.unit || "units",
        current_stock: item.current_stock?.toString() || "",
        min_stock: item.min_stock?.toString() || "",
        cost_per_unit: item.cost_per_unit?.toString() || "",
        supplier: item.supplier || "",
        category: item.category || "other",
      });
    } else {
      setForm({ name: "", unit: "units", current_stock: "", min_stock: "", cost_per_unit: "", supplier: "", category: "other" });
    }
  }, [item, open]);

  const handleSave = () => {
    onSave({
      name: form.name,
      unit: form.unit,
      current_stock: parseFloat(form.current_stock) || 0,
      min_stock: parseFloat(form.min_stock) || 0,
      cost_per_unit: parseFloat(form.cost_per_unit) || 0,
      supplier: form.supplier,
      category: form.category,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Inventory Item" : "Add Inventory Item"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Current Stock *</Label>
              <Input type="number" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Min Stock Alert</Label>
              <Input type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cost per Unit ($)</Label>
              <Input type="number" step="0.01" value={form.cost_per_unit} onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.name || !form.current_stock || isSaving}>
            {isSaving ? "Saving..." : item ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}