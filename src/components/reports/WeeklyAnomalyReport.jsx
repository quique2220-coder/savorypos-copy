import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, TrendingUp, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell, ReferenceLine } from "recharts";
import { format } from "date-fns";
import { calcMenuItemCost } from "@/utils/menuItemCost";

const OPEX_LABELS = {
  commissary: "Comisariato", insurance: "Seguros", electricity: "Electricidad",
  water: "Agua", gas: "Gas", internet: "Internet", rent: "Renta",
  indirect_labor: "Labor Indirecto", admin: "Administración", cleaning: "Limpieza",
  packaging: "Empaque", card_fees: "Comisiones Tarjeta", maintenance: "Mantenimiento",
  waste: "Merma", other: "Otros",
};

export default function WeeklyAnomalyReport({ completed, menuItems, ingredientsMap, operatingExpenses, periodLabel }) {
  const { chartData, anomalies, summary } = useMemo(() => {
    if (!completed || completed.length === 0) {
      return { chartData: [], anomalies: [], summary: { totalSales: 0, totalCosts: 0, anomalyCount: 0, avgSales: 0, avgCosts: 0 } };
    }

    // Determine date range from completed orders
    const dates = completed.map(o => o.created_date ? new Date(o.created_date) : null).filter(Boolean);
    if (dates.length === 0) {
      return { chartData: [], anomalies: [], summary: { totalSales: 0, totalCosts: 0, anomalyCount: 0, avgSales: 0, avgCosts: 0 } };
    }
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    minDate.setHours(0, 0, 0, 0);
    maxDate.setHours(23, 59, 59, 999);

    // Total monthly operating expenses → daily allocation
    const totalMonthlyOpEx = (operatingExpenses || []).reduce((s, e) => s + (e.amount || 0), 0);
    const dailyOpEx = totalMonthlyOpEx / 30;

    // Build per-day data
    const dayMap = {};
    const cursor = new Date(minDate);
    while (cursor <= maxDate) {
      const key = format(cursor, "yyyy-MM-dd");
      dayMap[key] = {
        day: format(cursor, "EEE dd"),
        date: key,
        sales: 0,
        cogs: 0,
        opex: dailyOpEx,
        orders: 0,
      };
      cursor.setDate(cursor.getDate() + 1);
    }

    completed.forEach((o) => {
      if (!o.created_date) return;
      const key = format(new Date(o.created_date), "yyyy-MM-dd");
      if (!dayMap[key]) return;
      dayMap[key].sales += o.total || 0;
      dayMap[key].orders += 1;
      o.items?.forEach((item) => {
        const menuItem = (menuItems || []).find((m) => m.id === item.menu_item_id);
        const { costPerServing } = calcMenuItemCost(menuItem, ingredientsMap);
        dayMap[key].cogs += costPerServing * (item.quantity || 1);
      });
    });

    const chartData = Object.values(dayMap).map(d => ({
      ...d,
      totalCosts: d.cogs + d.opex,
      net: d.sales - d.cogs - d.opex,
    }));

    // Anomaly detection: days where costs > sales, or sales deviate >2 std from mean
    const salesValues = chartData.map(d => d.sales).filter(v => v > 0);
    const meanSales = salesValues.length > 0 ? salesValues.reduce((s, v) => s + v, 0) / salesValues.length : 0;
    const stdSales = salesValues.length > 1
      ? Math.sqrt(salesValues.reduce((s, v) => s + Math.pow(v - meanSales, 2), 0) / salesValues.length)
      : 0;

    const anomalies = chartData
      .filter(d => {
        const costExceedsSales = d.totalCosts > d.sales && d.sales > 0;
        const salesSpike = stdSales > 0 && d.sales > meanSales + 2 * stdSales;
        const salesDrop = stdSales > 0 && d.sales > 0 && d.sales < meanSales - 2 * stdSales;
        const negativeNet = d.net < 0;
        return costExceedsSales || salesSpike || salesDrop || negativeNet;
      })
      .map(d => {
        const reasons = [];
        if (d.totalCosts > d.sales && d.sales > 0) reasons.push("Costos > Ventas");
        if (stdSales > 0 && d.sales > meanSales + 2 * stdSales) reasons.push("Pico de ventas");
        if (stdSales > 0 && d.sales > 0 && d.sales < meanSales - 2 * stdSales) reasons.push("Caída de ventas");
        if (d.net < 0) reasons.push("Pérdida neta");
        return { ...d, reasons, meanSales, stdSales };
      });

    const totalSales = chartData.reduce((s, d) => s + d.sales, 0);
    const totalCosts = chartData.reduce((s, d) => s + d.totalCosts, 0);
    const avgSales = chartData.length > 0 ? totalSales / chartData.length : 0;
    const avgCosts = chartData.length > 0 ? totalCosts / chartData.length : 0;

    return {
      chartData,
      anomalies,
      summary: { totalSales, totalCosts, anomalyCount: anomalies.length, avgSales, avgCosts },
    };
  }, [completed, menuItems, ingredientsMap, operatingExpenses]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
          No hay datos suficientes para detectar anomalías en este período.
        </CardContent>
      </Card>
    );
  }

  const netTotal = summary.totalSales - summary.totalCosts;
  const netPct = summary.totalSales > 0 ? (netTotal / summary.totalSales) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <p className="text-xs font-medium text-muted-foreground uppercase">Ventas totales</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600">${summary.totalSales.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">Promedio: ${summary.avgSales.toFixed(2)}/día</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <p className="text-xs font-medium text-muted-foreground uppercase">Costos totales</p>
            </div>
            <p className="text-2xl font-bold text-red-600">${summary.totalCosts.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">Promedio: ${summary.avgCosts.toFixed(2)}/día</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-primary" />
              <p className="text-xs font-medium text-muted-foreground uppercase">Resultado neto</p>
            </div>
            <p className={`text-2xl font-bold ${netTotal >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              ${netTotal.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{netPct.toFixed(1)}% margen neto</p>
          </CardContent>
        </Card>
        <Card className={summary.anomalyCount > 0 ? "border-amber-300" : ""}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={`w-4 h-4 ${summary.anomalyCount > 0 ? "text-amber-600" : "text-muted-foreground"}`} />
              <p className="text-xs font-medium text-muted-foreground uppercase">Anomalías</p>
            </div>
            <p className={`text-2xl font-bold ${summary.anomalyCount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
              {summary.anomalyCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.anomalyCount === 0 ? "Todo normal" : "Revisar días marcados"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Ventas vs Costos Operativos — {periodLabel}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 10%, 90%)" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v.toFixed(0)}`} />
              <Tooltip
                formatter={(v, name) => [`$${v.toFixed(2)}`, name]}
                labelFormatter={(label) => `Día: ${label}`}
                contentStyle={{ borderRadius: "8px", border: "1px solid hsl(30, 15%, 90%)" }}
              />
              <Legend />
              <Bar dataKey="sales" name="Ventas" fill="hsl(160, 60%, 45%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="totalCosts" name="Costos (COGS + OpEx)" radius={[4, 4, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.totalCosts > d.sales ? "hsl(0, 84%, 60%)" : "hsl(25, 95%, 53%)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Anomaly list */}
      {anomalies.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
              Anomalías detectadas ({anomalies.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {anomalies.map((a, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div>
                  <p className="font-semibold text-sm">{a.day}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {a.reasons.map((r, j) => (
                      <Badge key={j} variant="outline" className="text-xs bg-amber-100 border-amber-300 text-amber-700">
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p className="text-emerald-600 font-mono">Ventas: ${a.sales.toFixed(2)}</p>
                  <p className="text-red-600 font-mono">Costos: ${a.totalCosts.toFixed(2)}</p>
                  <p className={`font-bold font-mono ${a.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    Neto: {a.net >= 0 ? "+" : ""}${a.net.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="font-semibold">Leyenda:</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[hsl(160,60%,45%)]"></span> Ventas</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[hsl(25,95%,53%)]"></span> Costos normales</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[hsl(0,84%,60%)]"></span> Costos &gt; Ventas (anomalía)</span>
      </div>
    </div>
  );
}