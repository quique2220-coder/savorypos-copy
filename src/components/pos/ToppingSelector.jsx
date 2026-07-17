import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";

export default function ToppingSelector({ item, open, onClose, onConfirm }) {
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (open) setSelected([]);
  }, [open, item]);

  const toggle = (topping) => {
    setSelected(prev => {
      const exists = prev.find(t => t.name === topping.name);
      if (exists) return prev.filter(t => t.name !== topping.name);
      return [...prev, { name: topping.name, price: topping.price || 0 }];
    });
  };

  const toppingsTotal = selected.reduce((sum, t) => sum + (t.price || 0), 0);
  const total = (item?.price || 0) + toppingsTotal;

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{item.name}</span>
            <span className="text-sm font-normal text-muted-foreground">Extra Toppings</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-2 max-h-[50vh] overflow-auto">
          {item.available_toppings?.length > 0 ? (
            item.available_toppings.map((topping, i) => {
              const checked = !!selected.find(t => t.name === topping.name);
              return (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => toggle(topping)}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox checked={checked} />
                    <span className="text-sm font-medium">{topping.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-primary">+${(topping.price || 0).toFixed(2)}</span>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No hay toppings disponibles</p>
          )}
        </div>

        <div className="flex justify-between items-center px-1 pb-2 text-sm border-t pt-3">
          <span className="text-muted-foreground">
            {selected.length > 0 ? `${selected.length} topping(s) seleccionado(s)` : "Sin toppings extra"}
          </span>
          <span className="font-bold text-lg text-primary">${total.toFixed(2)}</span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onConfirm(item, selected)}>
            <Plus className="w-4 h-4 mr-1" /> Agregar ${total.toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}