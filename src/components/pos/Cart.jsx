import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Minus, Plus, Trash2, ShoppingBag, CreditCard, Banknote, Smartphone, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import CustomerLookup from "./CustomerLookup";

const TAX_RATE = 0.08;
const POINTS_PER_DOLLAR = 1;

const ORDER_SOURCES = [
  { value: "in_person", label: "En local" },
  { value: "uber_eats", label: "Uber Eats" },
  { value: "rappi", label: "Rappi" },
  { value: "doordash", label: "DoorDash" },
  { value: "online", label: "Online" },
  { value: "phone", label: "Teléfono" },
];

export default function Cart({ items, onUpdateQty, onRemove, onCheckout, isProcessing, customers = [], coupons = [] }) {
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [orderType, setOrderType] = useState("dine_in");
  const [orderSource, setOrderSource] = useState("in_person");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Coupon discount
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === "percent") {
      discountAmount = subtotal * (appliedCoupon.discount_value / 100);
    } else {
      discountAmount = appliedCoupon.discount_value;
    }
    discountAmount = Math.min(discountAmount, subtotal);
  }

  const discountedSubtotal = subtotal - discountAmount;
  const tax = discountedSubtotal * TAX_RATE;
  const total = discountedSubtotal + tax;
  const pointsToEarn = Math.floor(total * POINTS_PER_DOLLAR);

  const handleApplyCoupon = () => {
    setCouponError("");
    const coupon = coupons.find(c =>
      c.code?.toUpperCase() === couponCode.toUpperCase() &&
      c.is_active !== false &&
      (!c.expires_at || new Date(c.expires_at) >= new Date()) &&
      subtotal >= (c.min_purchase || 0)
    );
    if (!coupon) {
      setCouponError("Cupón inválido o no aplicable");
      return;
    }
    setAppliedCoupon(coupon);
    setCouponCode("");
  };

  const handleCheckout = () => {
    onCheckout({
      paymentMethod,
      orderType,
      orderSource,
      customerName: selectedCustomer?.name || "",
      customer: selectedCustomer,
      appliedCoupon,
      discountAmount,
      subtotal,
      tax,
      total,
      pointsToEarn,
    });
    // Reset
    setSelectedCustomer(null);
    setAppliedCoupon(null);
    setCouponCode("");
    setOrderSource("in_person");
  };

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            Orden Actual
          </h2>
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
            {items.length} items
          </span>
        </div>

        {/* Order type + Source */}
        <div className="flex gap-2">
          <Select value={orderType} onValueChange={setOrderType}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dine_in">Dine In</SelectItem>
              <SelectItem value="takeout">Para llevar</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
              <SelectItem value="catering">Catering</SelectItem>
            </SelectContent>
          </Select>
          <Select value={orderSource} onValueChange={setOrderSource}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDER_SOURCES.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Customer Lookup */}
        <CustomerLookup
          customers={customers}
          selectedCustomer={selectedCustomer}
          onSelect={setSelectedCustomer}
          onClear={() => setSelectedCustomer(null)}
        />
      </div>

      {/* Items */}
      <div className="flex-1 overflow-auto px-4 py-3 space-y-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <ShoppingBag className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Sin items</p>
            <p className="text-xs mt-1">Toca items del menú para agregar</p>
          </div>
        ) : (
          items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-secondary/50 rounded-lg p-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} c/u</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => onUpdateQty(idx, item.quantity - 1)} className="w-6 h-6 rounded-md bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors">
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                <button onClick={() => onUpdateQty(idx, item.quantity + 1)} className="w-6 h-6 rounded-md bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors">
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

          {/* Coupon */}
          {!appliedCoupon ? (
            <div className="flex gap-1.5">
              <Input
                placeholder="Código cupón..."
                value={couponCode}
                onChange={(e) => { setCouponCode(e.target.value); setCouponError(""); }}
                className="h-8 text-xs flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
              />
              <Button size="sm" variant="outline" onClick={handleApplyCoupon} className="h-8 text-xs px-3">
                <Tag className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
              <span className="text-xs text-green-700 font-medium flex items-center gap-1.5">
                <Tag className="w-3 h-3" />
                {appliedCoupon.code} — {appliedCoupon.discount_type === "percent" ? `${appliedCoupon.discount_value}% off` : `$${appliedCoupon.discount_value} off`}
              </span>
              <button onClick={() => setAppliedCoupon(null)}><X className="w-3.5 h-3.5 text-green-600" /></button>
            </div>
          )}
          {couponError && <p className="text-xs text-destructive">{couponError}</p>}

          {/* Totals */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600 font-medium">
                <span>Descuento</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Tax (8%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-1.5 border-t border-border">
              <span>Total</span>
              <span className="text-primary">${total.toFixed(2)}</span>
            </div>
            {selectedCustomer?.id && (
              <p className="text-xs text-amber-600 text-right">+{pointsToEarn} pts de lealtad</p>
            )}
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
            {isProcessing ? "Procesando..." : `Cobrar $${total.toFixed(2)}`}
          </Button>
        </div>
      )}
    </div>
  );
}