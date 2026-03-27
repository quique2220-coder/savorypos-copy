import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingDown, HelpCircle, AlertTriangle } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";

const CATEGORIES = {
  star:      { label: "Star",      icon: Star,          color: "bg-amber-100 text-amber-800 border-amber-300",    dot: "#f59e0b", desc: "High margin + High sales. Promote aggressively." },
  plowhorse: { label: "Plowhorse", icon: TrendingDown,   color: "bg-blue-100 text-blue-800 border-blue-300",      dot: "#3b82f6", desc: "Low margin + High sales. Recheck cost or increase price." },
  puzzle:    { label: "Puzzle",    icon: HelpCircle,     color: "bg-purple-100 text-purple-800 border-purple-300", dot: "#8b5cf6", desc: "High margin + Low sales. Market and feature more." },
  dog:       { label: "Dog",       icon: AlertTriangle,  color: "bg-red-100 text-red-800 border-red-300",          dot: "#ef4444", desc: "Low margin + Low sales. Consider removing." },
};

function categorize(margin, sold, avgMargin, avgSold) {
  const highMargin = margin >= avgMargin;
  const highSold   = sold   >= avgSold;
  if (highMargin && highSold)   return "star";
  if (!highMargin && highSold)  return "plowhorse";
  if (highMargin && !highSold)  return "puzzle";
  return "dog";
}

const CustomDot = (props) => {
  const { cx, cy, payload } = props;
  const cat = CATEGORIES[payload.category];
  return (
    <circle
      cx={cx} cy={cy} r={7}
      fill={cat.dot}
      stroke="white"
      strokeWidth={2}
      style={{ cursor: "pointer" }}
    />
  );
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const cat = CATEGORIES[d.category];
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-sm max-w-[200px]">
      <p className="font-bold text-slate-800 truncate">{d.name}</p>
      <p className="text-muted-foreground">Sold: <span className="font-semibold text-slate-700">{d.sold} units</span></p>
      <p className="text-muted-foreground">Margin: <span className="font-semibold text-slate-700">{d.margin.toFixed(1)}%</span></p>
      <span className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${cat.color}`}>
        <cat.icon className="w-3 h-3" />{cat.label}
      </span>
    </div>
  );
};

export default function OpportunityFinder({ orders, menuItems }) {
  const { items, avgMargin, avgSold } = useMemo(() => {
    // Count sales per menu item name
    const soldMap = {};
    orders.forEach((o) => {
      o.items?.forEach((item) => {
        soldMap[item.name] = (soldMap[item.name] || 0) + (item.quantity || 1);
      });
    });

    // Build per-item profitability
    const items = menuItems
      .filter((m) => m.is_available !== false)
      .map((m) => {
        const sold = soldMap[m.name] || 0;
        const price = m.price || 0;
        const cost = m.cost || price * 0.35;
        const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
        return { id: m.id, name: m.name, sold, margin, price, cost };
      });

    if (items.length === 0) return { items: [], avgMargin: 50, avgSold: 0 };

    const avgMargin = items.reduce((s, i) => s + i.margin, 0) / items.length;
    const avgSold   = items.reduce((s, i) => s + i.sold, 0)   / items.length;

    return {
      items: items.map((i) => ({ ...i, category: categorize(i.margin, i.sold, avgMargin, avgSold) })),
      avgMargin,
      avgSold,
    };
  }, [orders, menuItems]);

  const grouped = useMemo(() => {
    const g = { star: [], plowhorse: [], puzzle: [], dog: [] };
    items.forEach((i) => g[i.category].push(i));
    return g;
  }, [items]);

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No menu items with sales data yet.</p>
          <p className="text-sm mt-1">Complete some orders to see your opportunity matrix.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scatter chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Menu Engineering Matrix</CardTitle>
          <p className="text-xs text-muted-foreground">Each dot is a menu item. Dashed lines = averages.</p>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,10%,92%)" />
              <XAxis
                type="number" dataKey="sold" name="Units Sold"
                label={{ value: "Units Sold →", position: "insideBottomRight", offset: -10, fontSize: 11 }}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="number" dataKey="margin" name="Net Margin %"
                unit="%" tick={{ fontSize: 11 }}
                label={{ value: "Margin % ↑", angle: -90, position: "insideLeft", offset: 10, fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine x={avgSold}   stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1.5} />
              <ReferenceLine y={avgMargin} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1.5} />
              <Scatter data={items} shape={<CustomDot />} />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quadrant labels overlay */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(CATEGORIES).map(([key, cat]) => (
          <div key={key} className={`rounded-xl border p-3 ${cat.color}`}>
            <div className="flex items-center gap-2 mb-1">
              <cat.icon className="w-4 h-4" />
              <span className="font-bold text-sm">{cat.label}</span>
              <span className="ml-auto font-black text-lg">{grouped[key].length}</span>
            </div>
            <p className="text-xs opacity-80 leading-snug">{cat.desc}</p>
          </div>
        ))}
      </div>

      {/* Category breakdown tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Object.entries(CATEGORIES).map(([key, cat]) => {
          const list = grouped[key];
          if (list.length === 0) return null;
          return (
            <Card key={key} className="overflow-hidden">
              <CardHeader className="py-3 px-4 border-b">
                <div className="flex items-center gap-2">
                  <cat.icon className="w-4 h-4" style={{ color: cat.dot }} />
                  <CardTitle className="text-sm">{cat.label}s ({list.length})</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {list.sort((a, b) => b.sold - a.sold).map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} · cost ${item.cost.toFixed(2)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold">{item.margin.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">{item.sold} sold</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}