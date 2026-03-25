import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, Check, X, Clock, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function OnlineOrderAlert({ orders = [], onAccepted }) {
  const [accepting, setAccepting] = useState(null);
  const [prepTime, setPrepTime] = useState(15);

  const pendingOnline = orders.filter(
    (o) => o.status === "pending" && o.order_source === "online"
  );

  if (pendingOnline.length === 0) return null;

  const handleAccept = async (order) => {
    setAccepting(order.id);
    await base44.entities.Order.update(order.id, {
      status: "preparing",
      prep_time_minutes: prepTime,
      accepted_at: new Date().toISOString(),
    });
    toast.success(`Orden ${order.order_number} aceptada — ${prepTime} min`);
    setAccepting(null);
    onAccepted?.();
  };

  const handleReject = async (order) => {
    await base44.entities.Order.update(order.id, { status: "cancelled" });
    toast.error(`Orden ${order.order_number} cancelada`);
    onAccepted?.();
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full">
      <AnimatePresence>
        {pendingOnline.map((order) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, x: 100, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            className="bg-white border-2 border-orange-400 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-orange-500 text-white px-4 py-3 flex items-center gap-2">
              <Bell className="w-4 h-4 animate-pulse" />
              <span className="font-bold text-sm">Nueva Orden Online</span>
              <span className="ml-auto font-mono text-xs bg-white/20 px-2 py-0.5 rounded-full">
                #{order.order_number}
              </span>
            </div>

            {/* Items */}
            <div className="px-4 py-3 space-y-1 max-h-36 overflow-auto">
              {order.items?.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-foreground">
                    <span className="font-bold text-orange-600">{item.quantity}×</span> {item.name}
                  </span>
                  <span className="text-muted-foreground font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-1 flex justify-between text-sm font-bold">
                <span>Total</span>
                <span className="text-primary">${order.total?.toFixed(2)}</span>
              </div>
            </div>

            {/* Prep time + actions */}
            <div className="px-4 pb-4 space-y-3">
              <div className="flex items-center gap-2 bg-orange-50 rounded-xl px-3 py-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-orange-700 font-medium">Tiempo estimado:</span>
                <div className="flex items-center gap-1 ml-auto">
                  <button onClick={() => setPrepTime(Math.max(5, prepTime - 5))} className="w-6 h-6 rounded-full bg-orange-200 text-orange-700 font-bold text-sm flex items-center justify-center hover:bg-orange-300">−</button>
                  <span className="text-sm font-bold w-12 text-center">{prepTime} min</span>
                  <button onClick={() => setPrepTime(prepTime + 5)} className="w-6 h-6 rounded-full bg-orange-200 text-orange-700 font-bold text-sm flex items-center justify-center hover:bg-orange-300">+</button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white h-9 text-sm font-bold"
                  onClick={() => handleAccept(order)}
                  disabled={accepting === order.id}
                >
                  <ChefHat className="w-4 h-4 mr-1" />
                  {accepting === order.id ? "Aceptando..." : "Aceptar"}
                </Button>
                <Button
                  variant="destructive"
                  className="h-9 px-3"
                  onClick={() => handleReject(order)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}