import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Minus, Plus, Trash2, ShoppingBag, CreditCard, Banknote, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

const TAX_RATE = 0.08;

export default function Cart({ items, onUpdateQty, onRemove, onCheckout, isProcessing }) {
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [orderType, setOrderType] = useState("dine_in");
  const [customerName, setCustomerName] = useState("");

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const handleCheckout = () => {
    onCheckout({ paymentMethod, orderType, customerName, subtotal, tax, total });
  };

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            Current Order
          </h2>
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
            {items.length} items
          </span>
        </div>
        <div className="flex gap-2 mt-3">
          <Select value={orderType} onValueChange={setOrderType}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dine_in">Dine In</SelectItem>
              <SelectItem value="takeout">Takeout</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
              <SelectItem value="catering">Catering</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Customer name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-auto px-4 py-3 space-y-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <ShoppingBag className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No items yet</p>
            <p className="text-xs mt-1">Tap menu items to add</p>
          </div>
        ) : (
          items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-secondary/50 rounded-lg p-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} each</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onUpdateQty(idx, item.quantity - 1)}
                  className="w-6 h-6 rounded-md bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQty(idx, item.quantity + 1)}
                  className="w-6 h-6 rounded-md bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <p className="text-sm font-bold w-16 text-right">${(item.price * item.quantity).toFixed(2)}</p>
              <button onClick={() => onRemove(idx)} className="text-destructive/60 hover:text-destructive transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className="border-t border-border px-4 py-4 space-y-3">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tax (8%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-1.5 border-t border-border">
              <span>Total</span>
              <span className="text-primary">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="flex gap-1.5">
            {[
              { value: "cash", icon: Banknote, label: "Cash" },
              { value: "card", icon: CreditCard, label: "Card" },
              { value: "mobile", icon: Smartphone, label: "Mobile" },
            ].map((method) => (
              <button
                key={method.value}
                onClick={() => setPaymentMethod(method.value)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium transition-all",
                  paymentMethod === method.value
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                <method.icon className="w-4 h-4" />
                {method.label}
              </button>
            ))}
          </div>

          <Button
            className="w-full h-12 text-base font-bold shadow-lg"
            onClick={handleCheckout}
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : `Charge $${total.toFixed(2)}`}
          </Button>
        </div>
      )}
    </div>
  );
}