import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { TrendingUp, TrendingDown, AlertTriangle, Package } from "lucide-react";
import { calcMenuItemCost, buildIngredientsMap } from "@/utils/menuItemCost";

const MARGIN_THRESHOLDS = {
  healthy: { pct: 65, color: "hsl(160, 60%, 45%)", label: "Saludable", text: "text-emerald-600", icon: TrendingUp },
  moderate: { pct: 40, color: "hsl(25, 95%, 53%)", label: "Moderado", text: "text-amber-600", icon: AlertTriangle },
  low: { pct: 0, color: "hsl(0, 84%, 60%)", label: "Bajo", text: "text-red-500", icon: TrendingDown },
};

function getMarginStatus(marginPct) {
  if (marginPct >= MARGIN_THRESHOLDS.healthy.pct) return MARGIN_THRESHOLDS.healthy;
  if (marginPct >= MARGIN_THRESHOLDS.moderate.pct) return MARGIN_THRESHOLDS.moderate;
  return MARGIN_THRESHOLDS.low;
}

function getMarginColor(marginPct) {
  return getMarginStatus(marginPct).color;
}

export default function CategoryMarginReport({ orders, menuItems, categories, ingredients }) {
  const ingredientsMap = useMemo(() => buildIngredientsMap(ingredients), [ingredients]);

  const { categoryData, totalMatched, totalLines } = useMemo(() => {
    // Contar ventas e ingresos por menu item
    const soldMap = {};
    const revenueMap = {};
    orders.forEach(o => {
      o.items?.forEach(item => {
        const key = item.menu_item_id || item.name;
        soldMap[key] = (soldMap[key] || 0) + (item.quantity || 1);
        revenueMap[key] = (revenueMap[key] || 0) + (item.subtotal || (item.price * (item.quantity || 1)) || 0);
      });
    });

    // Construir data por item con costos reales
    let totalMatched = 0;
    let totalLines = 0;

    const itemData = menuItems
      .filter(m => m.is_available !== false)
      .map(m => {
        const { costPerServing, matchedLines, totalLines: tl } = calcMenuItemCost(m, ingredientsMap);
        totalMatched += matchedLines;
        totalLines += tl;
        const price = m.price || 0;
        const sold = soldMap[m.id] || soldMap[m.name] || 0;
        const revenue = revenueMap[m.id] || revenueMap[m.name] || 0;
        const totalCost = costPerServing * sold;
        const profit = revenue - totalCost;
        const marginPct = price > 0 ? ((price - costPerServing) / price) * 100 : 0;
        const cat = categories.find(c => c.id === m.category_id);
        return {
          id: m.id,
          name: m.name,
          categoryName: cat?.name || "Sin categoría",
          price,
          costPerServing,
          sold,
          revenue,
          totalCost,
          profit,
          marginPct,
        };
      });

    // Agrupar por categoría
    const catMap = {};
    itemData.forEach(item => {
      if (!catMap[item.categoryName]) {
        catMap[item.categoryName] = { name: item.categoryName, revenue: 0, totalCost: 0, profit: 0, items: [] };
      }
      catMap[item.categoryName].revenue += item.revenue;
      catMap[item.categoryName].totalCost += item.totalCost;
      catMap[item.categoryName].profit += item.profit;
      catMap[item.categoryName].items.push(item);
    });

    const categoryData = Object.values(catMap).map(c => ({
      ...c,
      marginPct: c.revenue > 0 ? (c.profit / c.revenue) * 100 : 0,
    })).sort((a, b) => b.revenue - a.revenue);

    return { categoryData, totalMatched, totalLines };
  }, [orders, menuItems, categories, ingredientsMap]);

  if (categoryData.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hay datos de ventas aún.</p>
          <p className="text-sm mt-1">Completa algunas órdenes para ver el margen por categoría.</p>
        </CardContent>
      </Card>
    );
  }

  const consistencyPct = totalLines > 0 ? Math.round((totalMatched / totalLines) * 100) : 100;

  return (
    <div className="space-y-5">
      {/* Consistency indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Package className="w-3.5 h-3.5" />
        <span>
          Costos calculados desde ingredientes maestros: <strong className={consistencyPct === 100 ? "text-emerald-600" : "text-amber-600"}>{consistencyPct}%</strong> de líneas con match real
          {consistencyPct < 100 && <span className="text-amber-600"> · {totalLines - totalMatched} líneas usan costo almacenado</span>}
        </span>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Margen de Ganancia Real por Categoría</CardTitle>
          <p className="text-xs text-muted-foreground">Margen = (Precio − Costo ingredientes) / Precio · Usa costos calculados de ingredientes</p>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData} layout="vertical" margin={{ left: 20, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,10%,90%)" />
              <XAxis type="number" unit="%" tick={{ fontSize: 11 }} domain={[0, 100]} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
              <Tooltip
                formatter={(v) => [`${v.toFixed(1)}%`, "Margen"]}
                labelFormatter={(label) => {
                  const cat = categoryData.find(c => c.name === label);
                  return cat ? `${label} · ${cat.items.length} platillos · $${cat.revenue.toFixed(0)}` : label;
                }}
              />
              <Bar dataKey="marginPct" name="Margen" radius={[0, 6, 6, 0]}>
                {categoryData.map((entry, i) => (
                  <Cell key={i} fill={getMarginColor(entry.marginPct)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categoryData.map(cat => {
          const status = getMarginStatus(cat.marginPct);
          return (
            <Card key={cat.name}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">{cat.name}</h3>
                  <span className={`text-xs font-semibold flex items-center gap-1 ${status.text}`}>
                    <status.icon className="w-3 h-3" /> {status.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <p className="text-muted-foreground">Ingresos</p>
                    <p className="font-bold">${cat.revenue.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Costo ingredientes</p>
                    <p className="font-bold text-red-500">${cat.totalCost.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Ganancia bruta</p>
                    <p className="font-bold text-emerald-600">${cat.profit.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Margen real</p>
                    <p className={`font-bold ${status.text}`}>{cat.marginPct.toFixed(1)}%</p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-3">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(cat.marginPct, 100)}%`, backgroundColor: status.color }} />
                </div>
                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">{cat.items.length} platillos</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {cat.items.sort((a, b) => b.marginPct - a.marginPct).map(item => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <span className="truncate flex-1">{item.name}</span>
                        <span className="font-semibold ml-2" style={{ color: getMarginColor(item.marginPct) }}>
                          {item.marginPct.toFixed(0)}%
                        </span>
                        <span className="text-muted-foreground ml-2 w-12 text-right">{item.sold}u</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}