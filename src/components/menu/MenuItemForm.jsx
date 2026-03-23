import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const DEFAULT_FORM = {
  name: "", description: "", sale_price: "", category: "",
  is_active: true, prep_time_minutes: "", image_url: "",
  target_food_cost_percent: "30",
};

export default function MenuItemForm({ open, onClose, onSave, item, categories, isSaving }) {
  const [form, setForm] = useState(DEFAULT_FORM);

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
              <Label>Target Food Cost %</Label>
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
          <div className="space-y-1.5">
            <Label>Image URL</Label>
            <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
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