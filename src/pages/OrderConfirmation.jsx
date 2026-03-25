import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock, ChefHat, Bell, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "pending",   label: "Orden recibida",    icon: CheckCircle2, desc: "Tu orden llegó al restaurante" },
  { key: "preparing", label: "En preparación",    icon: ChefHat,      desc: "El equipo está preparando tu pedido" },
  { key: "ready",     label: "¡Lista para recoger!", icon: Bell,      desc: "Tu orden está lista. ¡Pasa por ella!" },
];

export default function OrderConfirmation() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("orderId");

  const [order, setOrder] = useState(null);
  const [notified, setNotified] = useState(false);

  // Load order — by id param, or find latest online pending/preparing order
  useEffect(() => {
    let foundId = orderId;

    const load = async () => {
      if (!foundId) {
        // Find the most recent online order (pending or preparing)
        const recent = await base44.entities.Order.filter({ order_source: "online" });
        const sorted = (recent || []).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        const match = sorted.find(o => ["pending", "preparing", "ready"].includes(o.status));
        if (match) {
          foundId = match.id;
          setOrder(match);
        }
      } else {
        const res = await base44.entities.Order.filter({ id: foundId });
        if (res?.[0]) setOrder(res[0]);
      }
    };

    load();

    const unsub = base44.entities.Order.subscribe((event) => {
      if (foundId && (event.id === foundId || event.data?.id === foundId)) {
        setOrder(event.data);
      }
    });

    return () => unsub?.();
  }, [orderId]);

  // Browser notification when ready
  useEffect(() => {
    if (order?.status === "ready" && !notified) {
      setNotified(true);
      if (Notification.permission === "granted") {
        new Notification("🔔 ¡Tu orden está lista!", {
          body: `Orden #${order.order_number} — pasa a recogerla`,
          icon: "/favicon.ico",
        });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((p) => {
          if (p === "granted") {
            new Notification("🔔 ¡Tu orden está lista!", {
              body: `Orden #${order.order_number} — pasa a recogerla`,
            });
          }
        });
      }
    }
  }, [order?.status, notified]);

  const currentStep = order?.status ?? "pending";
  const stepIndex = STEPS.findIndex((s) => s.key === currentStep);

  // Countdown timer
  const [remaining, setRemaining] = useState(null);
  useEffect(() => {
    if (!order?.accepted_at || !order?.prep_time_minutes) return;
    if (order.status !== "preparing") return;

    const tick = () => {
      const elapsed = (Date.now() - new Date(order.accepted_at).getTime()) / 1000 / 60;
      const left = Math.max(0, order.prep_time_minutes - elapsed);
      setRemaining(Math.ceil(left));
    };
    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, [order?.accepted_at, order?.prep_time_minutes, order?.status]);

  return (
    <div className="min-h-screen bg-[#f9f5f0] flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full space-y-6">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-11 h-11 text-green-500" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground">¡Orden Confirmada!</h1>
          {order?.order_number && (
            <p className="text-muted-foreground text-sm">Orden <span className="font-bold text-foreground">#{order.order_number}</span></p>
          )}
        </div>

        {/* Status tracker */}
        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6 space-y-5">
          <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wide">Estado de tu orden</h2>

          <div className="space-y-4">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const isActive = i === stepIndex;
              const isDone = i < stepIndex;
              const isFuture = i > stepIndex;

              return (
                <div key={step.key} className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                    isDone ? "bg-green-500 text-white" :
                    isActive ? "bg-primary text-white shadow-md shadow-primary/30" :
                    "bg-secondary text-muted-foreground"
                  )}>
                    {isActive ? (
                      <motion.div animate={{ rotate: step.key === "preparing" ? 360 : 0 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                        <Icon className="w-4 h-4" />
                      </motion.div>
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 pt-1">
                    <p className={cn(
                      "text-sm font-semibold",
                      isActive ? "text-foreground" : isFuture ? "text-muted-foreground" : "text-green-700"
                    )}>
                      {step.label}
                    </p>
                    {isActive && (
                      <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                    )}
                  </div>

                  {/* Active dot */}
                  {isActive && (
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-2.5 h-2.5 rounded-full bg-primary mt-2 flex-shrink-0"
                    />
                  )}
                  {isDone && (
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Countdown */}
          <AnimatePresence>
            {currentStep === "preparing" && remaining !== null && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3"
              >
                <Clock className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-orange-700">
                    {remaining <= 0 ? "¡Casi lista!" : `~${remaining} min restantes`}
                  </p>
                  <p className="text-xs text-orange-500">Tiempo estimado por el restaurante</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ready banner */}
          <AnimatePresence>
            {currentStep === "ready" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-green-500 text-white rounded-xl px-4 py-4 text-center"
              >
                <Bell className="w-7 h-7 mx-auto mb-1 animate-bounce" />
                <p className="font-extrabold text-lg">¡Tu orden está lista!</p>
                <p className="text-green-100 text-sm">Pasa a recogerla en el mostrador</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Items summary */}
        {order?.items?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-5">
            <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" /> Tu pedido
            </h2>
            <div className="space-y-1.5">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span><span className="font-bold">{item.quantity}×</span> {item.name}</span>
                  <span className="text-muted-foreground">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-primary">${order.total?.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        <Link to="/OrderOnline">
          <Button variant="outline" className="w-full h-11">
            Hacer otro pedido
          </Button>
        </Link>
      </div>
    </div>
  );
}