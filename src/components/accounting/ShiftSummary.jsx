import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, Send, TrendingUp, TrendingDown, DollarSign, ShoppingBag, Percent, Receipt } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { calcMenuItemCost, buildIngredientsMap } from "@/utils/menuItemCost";

export default function ShiftSummary() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState(null);

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 500),
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ["menuItems"],
    queryFn: () => base44.entities.MenuItem.list(),
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ["ingredients"],
    queryFn: () => base44.entities.Ingredient.list(),
  });

  const { data: operatingExpenses = [] } = useQuery({
    queryKey: ["OperatingExpense"],
    queryFn: () => base44.entities.OperatingExpense.list(),
  });

  const ingredientsMap = useMemo(() => buildIngredientsMap(ingredients), [ingredients]);

  const summary = useMemo(() => {
    const dayStart = new Date(selectedDate + "T00:00:00");
    const dayEnd = new Date(selectedDate + "T23:59:59.999");

    const dayOrders = orders.filter((o) => {
      if (o.status !== "completed" || !o.created_date) return false;
      const d = new Date(o.created_date);
      return d >= dayStart && d <= dayEnd;
    });

    let revenue = 0;
    let cogs = 0;
    let totalTips = 0;
    const itemCounts = {};
    const paymentBreakdown = {};

    dayOrders.forEach((o) => {
      revenue += o.total || 0;
      totalTips += parseFloat(o.tip) || 0;
      const m = o.payment_method || "cash";
      paymentBreakdown[m] = (paymentBreakdown[m] || 0) + (o.total || 0);
      o.items?.forEach((item) => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + (item.quantity || 1);
        const menuItem = menuItems.find((m) => m.id === item.menu_item_id);
        const { costPerServing } = calcMenuItemCost(menuItem, ingredientsMap);
        cogs += costPerServing * (item.quantity || 1);
      });
    });

    const totalMonthlyOpEx = operatingExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const dailyOpEx = totalMonthlyOpEx / 30;
    const grossProfit = revenue - cogs;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const netProfit = grossProfit - dailyOpEx;
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const avgTicket = dayOrders.length > 0 ? revenue / dayOrders.length : 0;

    const topItems = Object.entries(itemCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return {
      date: selectedDate,
      orderCount: dayOrders.length,
      revenue, cogs, grossProfit, grossMargin,
      dailyOpEx, netProfit, netMargin, totalTips, avgTicket,
      paymentBreakdown, topItems,
    };
  }, [orders, menuItems, ingredientsMap, operatingExpenses, selectedDate]);

  const handleSendEmail = async () => {
    setSending(true);
    try {
      const res = await base44.functions.invoke("sendShiftSummary", { date: selectedDate });
      const data = res.data || res;
      if (data.emailSent) {
        toast.success(`Resumen enviado a ${data.recipient}`);
        setLastSent({ date: selectedDate, time: new Date().toLocaleTimeString(), recipient: data.recipient });
      } else if (data.emailError) {
        toast.error(`No se pudo enviar el email: ${data.emailError}`);
      } else {
        toast.error("No se pudo enviar el email.");
      }
    } catch (e) {
      toast.error(`Error: ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  const paymentLabels = { cash: "Efectivo", card: "Tarjeta", mobile: "Móvil" };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-end justify-between">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Fecha del turno</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          />
        </div>
        <Button onClick={handleSendEmail} disabled={sending || summary.orderCount === 0} className="gap-2">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? "Enviando..." : "Cerrar Turno y Enviar Resumen"}
        </Button>
      </div>

      {lastSent && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
          <Mail className="w-4 h-4" />
          <span>Último envío: {lastSent.date} a las {lastSent.time} → {lastSent.recipient}</span>
        </div>
      )}

      {summary.orderCount === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
            No hay órdenes completadas para el {selectedDate}.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs font-medium text-muted-foreground uppercase">Ingresos</p>
                </div>
                <p className="text-2xl font-bold text-emerald-600">${summary.revenue.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">{summary.orderCount} órdenes · ${summary.avgTicket.toFixed(2)}/orden</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <p className="text-xs font-medium text-muted-foreground uppercase">COGS</p>
                </div>
                <p className="text-2xl font-bold text-red-600">${summary.cogs.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">{summary.grossMargin.toFixed(1)}% margen bruto</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Percent className="w-4 h-4 text-primary" />
                  <p className="text-xs font-medium text-muted-foreground uppercase">Utilidad bruta</p>
                </div>
                <p className={`text-2xl font-bold ${summary.grossProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  ${summary.grossProfit.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">OpEx diario: ${summary.dailyOpEx.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <p className="text-xs font-medium text-muted-foreground uppercase">Utilidad neta</p>
                </div>
                <p className={`text-2xl font-bold ${summary.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  ${summary.netProfit.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{summary.netMargin.toFixed(1)}% margen neto</p>
              </CardContent>
            </Card>
          </div>

          {/* Detail cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Payment breakdown */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Receipt className="w-4 h-4" />Métodos de Pago</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {Object.keys(summary.paymentBreakdown).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
                ) : (
                  Object.entries(summary.paymentBreakdown).map(([method, amount]) => (
                    <div key={method} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <span className="text-sm font-medium">{paymentLabels[method] || method}</span>
                      <span className="font-mono font-semibold">${amount.toFixed(2)}</span>
                    </div>
                  ))
                )}
                <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/20">
                  <span className="text-sm font-semibold">Propinas</span>
                  <span className="font-mono font-semibold text-primary">${summary.totalTips.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Top items */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ShoppingBag className="w-4 h-4" />Top 5 Platillos</CardTitle></CardHeader>
              <CardContent>
                {summary.topItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin ventas</p>
                ) : (
                  <div className="space-y-2">
                    {summary.topItems.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</span>
                        <span className="flex-1 text-sm font-medium truncate">{item.name}</span>
                        <Badge variant="outline" className="text-xs">{item.count} uds</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Email preview */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Mail className="w-4 h-4" />Vista previa del correo</CardTitle></CardHeader>
            <CardContent>
              <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/30 rounded-lg p-4 overflow-x-auto">
{`📊 RESUMEN DEL TURNO — ${summary.date}
═══════════════════════════════════

VENTAS
  Órdenes completadas: ${summary.orderCount}
  Ingresos totales: $${summary.revenue.toFixed(2)}
  Ticket promedio: $${summary.avgTicket.toFixed(2)}
  Propinas: $${summary.totalTips.toFixed(2)}

COSTOS Y MÁRGENES
  COGS (ingredientes): $${summary.cogs.toFixed(2)}
  Utilidad bruta: $${summary.grossProfit.toFixed(2)}
  Margen bruto: ${summary.grossMargin.toFixed(1)}%
  Gastos operativos (diario): $${summary.dailyOpEx.toFixed(2)}
  Utilidad neta: $${summary.netProfit.toFixed(2)}
  Margen neto: ${summary.netMargin.toFixed(1)}%

${summary.netProfit >= 0 ? '✅ Turno rentable' : '⚠️ Revisa tus costos'}`}
              </pre>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}