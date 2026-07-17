import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, ShoppingBag, Percent, AlertTriangle, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, subDays, parseISO, isAfter } from "date-fns";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { buildIngredientsMap, calcMenuItemCost } from "@/utils/menuItemCost";

function KpiCard({ title, value, sub, icon: Icon, tone = "primary" }) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    green: "bg-emerald-500/10 text-emerald-600",
    blue: "bg-blue-500/10 text-blue-600",
    amber: "bg-amber-500/10 text-amber-600",
    red: "bg-red-500/10 text-red-600",
  };
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${tones[tone]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold mt-0.5">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminOverview() {
  const { data: orders = [] } = useQuery({
    queryKey: ["orders", "admin-overview"],
    queryFn: () => base44.entities.Order.list("-created_date", 500),
  });
  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes", "admin-overview"],
    queryFn: () => base44.entities.Recipe.list("-updated_date", 200),
  });
  const { data: ingredients = [] } = useQuery({
    queryKey: ["ingredients", "admin-overview"],
    queryFn: () => base44.entities.Ingredient.list(),
  });
  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory", "admin-overview"],
    queryFn: () => base44.entities.InventoryItem.list(),
  });

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const metrics = useMemo(() => {
    const completed = orders.filter(o => o.status === "completed");
    const todayOrders = completed.filter(o => {
      try { return isAfter(parseISO(o.created_date), todayStart); } catch { return false; }
    });
    const todayRevenue = todayOrders.reduce((s, o) => s + (o.total || 0), 0);
    const todayCount = todayOrders.length;
    const avgTicket = todayCount > 0 ? todayRevenue / todayCount : 0;

    // Last 7 days revenue
    const sevenDaysAgo = subDays(new Date(), 7);
    const weekOrders = completed.filter(o => {
      try { return isAfter(parseISO(o.created_date), sevenDaysAgo); } catch { return false; }
    });
    const weekRevenue = weekOrders.reduce((s, o) => s + (o.total || 0), 0);

    // Top items today
    const itemSales = {};
    todayOrders.forEach(o => {
      (o.items || []).forEach(it => {
        const name = it.name || "Unknown";
        if (!itemSales[name]) itemSales[name] = { qty: 0, revenue: 0 };
        itemSales[name].qty += it.quantity || 0;
        itemSales[name].revenue += it.subtotal || 0;
      });
    });
    const topItems = Object.entries(itemSales)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5);

    // Low stock alerts
    const lowStock = inventory.filter(i => i.current_stock <= (i.min_stock || 0));

    // Average margin across menu
    const ingMap = buildIngredientsMap(ingredients);
    const activeRecipes = recipes.filter(r => r.is_active !== false);
    let marginSum = 0, marginCount = 0;
    activeRecipes.forEach(r => {
      const cost = calcMenuItemCost(r, ingMap);
      if (cost > 0 && r.sale_price > 0) {
        marginSum += ((r.sale_price - cost) / r.sale_price) * 100;
        marginCount++;
      }
    });
    const avgMargin = marginCount > 0 ? marginSum / marginCount : 0;

    return { todayRevenue, todayCount, avgTicket, weekRevenue, topItems, lowStock, avgMargin };
  }, [orders, recipes, ingredients, inventory, todayStart]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Ventas Hoy" value={`$${metrics.todayRevenue.toFixed(2)}`} sub={`${metrics.todayCount} órdenes`} icon={DollarSign} />
        <KpiCard title="Ticket Promedio" value={`$${metrics.avgTicket.toFixed(2)}`} sub="Hoy" icon={ShoppingBag} tone="blue" />
        <KpiCard title="Ventas 7 días" value={`$${metrics.weekRevenue.toFixed(2)}`} sub="Última semana" icon={TrendingUp} tone="green" />
        <KpiCard title="Margen Promedio" value={`${metrics.avgMargin.toFixed(1)}%`} sub="Menú activo" icon={Percent} tone="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top items today */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Top Platillos de Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.topItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Sin ventas registradas hoy.</p>
            ) : (
              <div className="space-y-2">
                {metrics.topItems.map(([name, data], i) => (
                  <div key={name} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium truncate">{name}</span>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-sm font-semibold">${data.revenue.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{data.qty} vendidos</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low stock alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Alertas de Inventario
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Todo el inventario está en niveles saludables. ✓</p>
            ) : (
              <div className="space-y-2">
                {metrics.lowStock.slice(0, 6).map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Package className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="text-sm font-medium truncate">{item.name}</span>
                    </div>
                    <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 shrink-0">
                      {item.current_stock} {item.unit}
                    </Badge>
                  </div>
                ))}
                {metrics.lowStock.length > 6 && (
                  <Link to="/Inventory">
                    <Button variant="ghost" size="sm" className="w-full mt-2">Ver todas ({metrics.lowStock.length})</Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accesos Rápidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link to="/Menu"><Button variant="outline" className="w-full">Gestión de Menú</Button></Link>
            <Link to="/Reports"><Button variant="outline" className="w-full">Reportes Detallados</Button></Link>
            <Link to="/Contabilidad"><Button variant="outline" className="w-full">Contabilidad</Button></Link>
            <Link to="/Settings"><Button variant="outline" className="w-full">Configuración</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}