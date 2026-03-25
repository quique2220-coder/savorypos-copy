import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { calcRecipeTotals } from "@/utils/recipeCalculator";
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  DollarSign, ShoppingCart, Zap, Users
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";

// Delivery channel commissions
const CHANNELS = [
  { key: "in_person", label: "POS / En local", commission: 0, color: "#f97316" },
  { key: "online",    label: "Online (propio)", commission: 0.03, color: "#3b82f6" },
  { key: "uber_eats", label: "UberEats",         commission: 0.30, color: "#22c55e" },
  { key: "doordash",  label: "DoorDash",          commission: 0.25, color: "#ef4444" },
  { key: "rappi",     label: "Rappi",             commission: 0.25, color: "#f59e0b" },
];

// last N days helper
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function AlertBanner({ type, message }) {
  const s = {
    danger:  "bg-red-50 border-red-200 text-red-700",
    warning: "bg-amber-50 border-amber-200 text-amber-700",
    success: "bg-emerald-50 border-emerald-200 text-emerald-700",
    info:    "bg-blue-50 border-blue-200 text-blue-700",
  };
  const ic = { danger: "🚨", warning: "⚠️", success: "✅", info: "💡" };
  return (
    <div className={`flex items-start gap-2 px-3 py-2.5 rounded-lg border text-xs ${s[type]}`}>
      <span className="mt-0.5">{ic[type]}</span><span>{message}</span>
    </div>
  );
}

function KPI({ label, value, sub, color = "text-foreground", icon: IconComp }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start gap-2">
          {IconComp && <IconComp className={`w-4 h-4 mt-0.5 flex-shrink-0 ${color}`} />}
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground leading-tight">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LiveDashboard() {
  // Pull last 30 days of orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders-live-dashboard"],
    queryFn: () => base44.entities.Order.filter({ status: "completed" }, "-created_date", 500),
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes-live"],
    queryFn: () => base44.entities.Recipe.list("-updated_date", 200),
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ["ingredients-live"],
    queryFn: () => base44.entities.Ingredient.list("-updated_date", 500),
  });

  const { data: opex = [] } = useQuery({
    queryKey: ["opex-live"],
    queryFn: () => base44.entities.OperatingExpense.list(),
  });

  // ── Computed metrics ──────────────────────────────────────────────
  const metrics = useMemo(() => {
    if (!orders.length) return null;

    // Last 30 days — compare full ISO timestamps properly
    const cutoffMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = orders.filter(o => {
      const d = o.created_date ? new Date(o.created_date).getTime() : 0;
      return d >= cutoffMs;
    });

    // Use all orders if none fall in last 30 days (e.g. test data)
    const working = recent.length > 0 ? recent : orders;

    const totalRevenue = working.reduce((s, o) => s + (o.total || 0), 0);
    const totalOrders  = working.length;
    const avgTicket    = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const ordersPerDay = totalOrders / 30;

    // COGS from recipe costing — match by ingredient_id
    const ingMap = Object.fromEntries(ingredients.map(i => [i.id, i]));
    const recipeMap = Object.fromEntries(recipes.map(r => [r.name?.toLowerCase().trim(), r]));

    let estimatedCOGS = 0;
    working.forEach(order => {
      (order.items || []).forEach(item => {
        const rec = recipeMap[item.name?.toLowerCase().trim()];
        if (rec) {
          const totals = calcRecipeTotals(rec, ingMap);
          const costPerServing = totals.ingredientCost || 0;
          estimatedCOGS += costPerServing * (item.quantity || 1);
        } else {
          // fallback: 30% food cost estimate
          const itemTotal = item.subtotal || (item.price || 0) * (item.quantity || 1);
          estimatedCOGS += itemTotal * 0.30;
        }
      });
    });

    // If COGS is suspiciously low (<5% of revenue), use 30% flat estimate
    if (totalRevenue > 0 && estimatedCOGS / totalRevenue < 0.05) {
      estimatedCOGS = totalRevenue * 0.30;
    }

    const foodCostPct = totalRevenue > 0 ? (estimatedCOGS / totalRevenue) * 100 : 0;

    // Fixed costs (monthly from opex)
    const monthlyFixed = opex.reduce((s, e) => s + (e.amount || 0), 0);
    const netIncome = totalRevenue - estimatedCOGS - monthlyFixed;
    const netMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

    // Break-even daily units
    const contributionMargin = totalRevenue > 0 ? 1 - (estimatedCOGS / totalRevenue) : 0;
    const beRevenue = contributionMargin > 0 ? monthlyFixed / contributionMargin : 0;
    const beOrdersPerDay = avgTicket > 0 ? Math.ceil((beRevenue / 30) / avgTicket) : 0;

    // Sales by channel
    const channelMap = {};
    working.forEach(o => {
      const src = o.order_source || "in_person";
      if (!channelMap[src]) channelMap[src] = { revenue: 0, count: 0 };
      channelMap[src].revenue += o.total || 0;
      channelMap[src].count += 1;
    });

    // Channel net after commission
    const channelData = CHANNELS.map(ch => {
      const raw = channelMap[ch.key] || { revenue: 0, count: 0 };
      const net = raw.revenue * (1 - ch.commission);
      return { ...ch, revenue: raw.revenue, netRevenue: net, count: raw.count };
    }).filter(c => c.revenue > 0);

    // Top items by revenue — fixed closure bug
    const itemMap = {};
    working.forEach(o => {
      (o.items || []).forEach(item => {
        const key = item.name || "Sin nombre";
        if (!itemMap[key]) itemMap[key] = { revenue: 0, qty: 0 };
        const itemTotal = item.subtotal || (item.price || 0) * (item.quantity || 1);
        itemMap[key].revenue += itemTotal;
        itemMap[key].qty += item.quantity || 1;
      });
    });
    const topItems = Object.entries(itemMap)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([name, d]) => ({ name, ...d }));

    // "What if" scenarios
    const whatIfs = [];
    if (ordersPerDay > 0) {
      const minBreakEven = beOrdersPerDay;
      if (ordersPerDay < minBreakEven) {
        whatIfs.push({ type: "danger", msg: `Vendes ${ordersPerDay.toFixed(0)} ordenes/día pero necesitas ${minBreakEven} para cubrir costos. Estás perdiendo dinero.` });
      } else {
        whatIfs.push({ type: "success", msg: `Vendes ${ordersPerDay.toFixed(0)} ordenes/día — ${(ordersPerDay - minBreakEven).toFixed(0)} por encima del break-even. ✅` });
      }
      // +10% ingredient cost
      const cogsRise10 = estimatedCOGS * 1.10;
      const niWithRise = totalRevenue - cogsRise10 - monthlyFixed;
      const lostPerMonth = niWithRise - netIncome;
      if (lostPerMonth < 0) whatIfs.push({ type: "warning", msg: `Si los ingredientes suben 10%, perderías $${Math.abs(lostPerMonth).toFixed(0)}/mes adicionales. Revisa tu menú de precios.` });

      // Add 1 employee ($2,500/mo)
      const extraEmployee = 2500;
      const niWithEmp = netIncome - extraEmployee;
      const newMargin = totalRevenue > 0 ? (niWithEmp / totalRevenue * 100) : 0;
      if (netMargin > 0) whatIfs.push({ type: "info", msg: `Si contratas 1 empleado ($2,500/mes), tu margen baja de ${netMargin.toFixed(1)}% → ${newMargin.toFixed(1)}%. Necesitarías vender ${Math.ceil(extraEmployee / (avgTicket * contributionMargin))} órdenes más/mes.` });

      if (foodCostPct > 35) whatIfs.push({ type: "danger", msg: `Tu food cost real es ${foodCostPct.toFixed(1)}% — por encima del 35% ideal. Revisa porciones o sube precios ~10% para recuperar margen.` });
    }

    return {
      totalRevenue, totalOrders, avgTicket, ordersPerDay,
      estimatedCOGS, foodCostPct, monthlyFixed,
      netIncome, netMargin,
      beRevenue, beOrdersPerDay,
      channelData, topItems, whatIfs,
    };
  }, [orders, recipes, ingredients, opex]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
      Cargando datos reales del POS...
    </div>
  );

  if (!orders.length) return (
    <div className="text-center py-16 space-y-3">
      <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground/30" />
      <p className="font-semibold text-muted-foreground">Sin órdenes registradas aún</p>
      <p className="text-xs text-muted-foreground">Registra ventas en el POS para ver tu dashboard financiero en tiempo real.</p>
    </div>
  );

  const m = metrics;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-foreground flex items-center gap-2">
            🔴 Dashboard en Vivo
            <Badge className="bg-red-100 text-red-700 text-[10px] animate-pulse">LIVE</Badge>
          </h3>
          <p className="text-xs text-muted-foreground">Conectado con tu POS — últimos 30 días · {m.totalOrders} órdenes completadas</p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Ingresos (30d)" value={`$${(m.totalRevenue).toLocaleString()}`} sub={`${m.totalOrders} órdenes`} color="text-primary" icon={DollarSign} />
        <KPI label="Utilidad Neta Est." value={`$${Math.round(m.netIncome).toLocaleString()}`} sub={`${m.netMargin.toFixed(1)}% margen`} color={m.netIncome >= 0 ? "text-emerald-600" : "text-red-500"} icon={m.netIncome >= 0 ? TrendingUp : TrendingDown} />
        <KPI label="Food Cost Real" value={`${m.foodCostPct.toFixed(1)}%`} sub={m.foodCostPct > 35 ? "⚠️ Alto" : "✅ OK"} color={m.foodCostPct > 35 ? "text-red-500" : "text-emerald-600"} icon={m.foodCostPct > 35 ? AlertTriangle : CheckCircle2} />
        <KPI label="Órdenes/día" value={m.ordersPerDay.toFixed(1)} sub={`BE: ${m.beOrdersPerDay}/día`} color={m.ordersPerDay >= m.beOrdersPerDay ? "text-emerald-600" : "text-red-500"} icon={Users} />
      </div>

      {/* Alerts / What-Ifs */}
      {m.whatIfs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" /> Alertas & Simulaciones de decisión
          </p>
          {m.whatIfs.map((a, i) => <AlertBanner key={i} type={a.type} message={a.msg} />)}
        </div>
      )}

      {/* Channel analysis */}
      {m.channelData.length > 0 && (
        <div className="grid md:grid-cols-2 gap-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Ingreso Real por Canal (después de comisión)</CardTitle>
              <p className="text-xs text-muted-foreground">UberEats/DoorDash cobran 25–30% — esto muestra lo que realmente te queda</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {m.channelData.map(ch => {
                  const retentionPct = ch.revenue > 0 ? (ch.netRevenue / ch.revenue * 100) : 0;
                  const commissionPct = (1 - retentionPct / 100) * 100;
                  return (
                    <div key={ch.key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{ch.label}</span>
                        <span className="text-muted-foreground">
                          ${ch.revenue.toFixed(0)} bruto
                          {commissionPct > 0 && <span className="text-red-500"> − {commissionPct.toFixed(0)}%</span>}
                          {" → "}
                          <span className="font-bold text-foreground">${ch.netRevenue.toFixed(0)} neto</span>
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                        <div className="h-full rounded-full" style={{ width: `${retentionPct}%`, backgroundColor: ch.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 p-2 bg-amber-50 rounded-lg text-xs text-amber-700">
                💡 Si tus órdenes de UberEats/DoorDash son &gt;30% del total, considera subir precios en esas plataformas para mantener el mismo margen.
              </div>
            </CardContent>
          </Card>

          {/* Top items */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top 5 Platillos — Ingresos (30d)</CardTitle>
              <p className="text-xs text-muted-foreground">Los que más dinero generan en el POS</p>
            </CardHeader>
            <CardContent>
              {m.topItems.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={m.topItems} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 'dataMax']} tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v}`} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v, name) => [`$${Number(v).toFixed(2)}`, "Ingresos"]} />
                    <Bar dataKey="revenue" name="Ingresos" radius={[0, 4, 4, 0]} isAnimationActive={false} background={false}>
                      {m.topItems.map((_, i) => (
                        <Cell key={i} fill={`hsl(${25 + i * 30}, 85%, ${55 - i * 5}%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">Sin datos de items</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cost breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Desglose de Cada Dólar Vendido</CardTitle>
          <p className="text-xs text-muted-foreground">De cada $1 de venta, así se distribuye tu dinero</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {[
              { label: "COGS Real", val: m.totalRevenue > 0 ? (m.estimatedCOGS / m.totalRevenue * 100) : 0, color: "bg-orange-100 text-orange-700", hint: "Ingredientes" },
              { label: "Gastos Fijos", val: m.totalRevenue > 0 ? (m.monthlyFixed / m.totalRevenue * 100) : 0, color: "bg-blue-100 text-blue-700", hint: "Renta, payroll, etc." },
              { label: "Utilidad Neta", val: m.netMargin, color: m.netMargin >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700", hint: "Lo que te queda" },
              { label: "Break-Even Rev.", val: null, color: "bg-purple-100 text-purple-700", hint: `$${Math.round(m.beRevenue).toLocaleString()}/mes necesario` },
            ].map((r, i) => (
              <div key={i} className={`p-3 rounded-xl ${r.color} text-center`}>
                <p className="text-xs opacity-80">{r.label}</p>
                {r.val !== null ? (
                  <p className="text-2xl font-bold">{r.val.toFixed(1)}¢</p>
                ) : (
                  <p className="text-sm font-bold mt-1">{r.hint}</p>
                )}
                {r.val !== null && <p className="text-[10px] opacity-70">{r.hint}</p>}
              </div>
            ))}
          </div>
          {m.totalRevenue > 0 && (
            <div className="mt-3 h-4 rounded-full overflow-hidden flex">
              {[
                { val: m.estimatedCOGS / m.totalRevenue, color: "bg-orange-400" },
                { val: m.monthlyFixed / m.totalRevenue, color: "bg-blue-400" },
                { val: Math.max(m.netIncome / m.totalRevenue, 0), color: "bg-emerald-400" },
              ].map((s, i) => (
                <div key={i} className={`h-full ${s.color}`} style={{ width: `${Math.min(s.val * 100, 100)}%` }} />
              ))}
            </div>
          )}
          <div className="flex gap-4 mt-1 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />COGS</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Fijos</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Utilidad</span>
          </div>
        </CardContent>
      </Card>

      <p className="text-[11px] text-center text-muted-foreground">
        COGS calculado con recetas reales cuando están disponibles, estimado 30% donde no. Gastos fijos desde módulo de Gastos Operativos.
      </p>
    </div>
  );
}