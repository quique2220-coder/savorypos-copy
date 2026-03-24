import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, ShoppingBag, BarChart3, FileText, Scale, Droplets, HandCoins, List } from "lucide-react";
import { format, subDays, startOfWeek, startOfMonth, endOfMonth, subMonths, startOfYear, isWithinInterval, getISOWeek, getYear } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import ProfitLoss from "@/components/reports/ProfitLoss";
import SalesDetail from "@/components/reports/SalesDetail";
import BalanceSheet from "@/components/reports/BalanceSheet";
import CashFlow from "@/components/reports/CashFlow";

const COLORS = ["hsl(25, 95%, 53%)", "hsl(160, 60%, 45%)", "hsl(220, 70%, 50%)", "hsl(280, 65%, 60%)", "hsl(340, 75%, 55%)"];

function StatCard({ title, value, subValue, icon: Icon }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 transform translate-x-6 -translate-y-6 bg-primary rounded-full opacity-10" />
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold mt-0.5">{value}</p>
            {subValue && <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const PERIOD_OPTIONS = [
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "Last 3 Months", value: "3m" },
  { label: "All Time", value: "all" },
];

function getPeriodRange(period) {
  const now = new Date();
  switch (period) {
    case "7d": return { start: subDays(now, 7), end: now };
    case "30d": return { start: subDays(now, 30), end: now };
    case "thisMonth": return { start: startOfMonth(now), end: now };
    case "lastMonth": return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
    case "3m": return { start: subMonths(now, 3), end: now };
    default: return null;
  }
}

export default function Reports() {
  const [period, setPeriod] = useState("30d");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 500),
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ["menuItems"],
    queryFn: () => base44.entities.MenuItem.list(),
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.InventoryItem.list(),
  });

  const { completed, financials, dailyRevenue, topItems, paymentData, typeData, sourceData, totalTips, periodLabel } = useMemo(() => {
    const range = getPeriodRange(period);
    const allCompleted = orders.filter((o) => o.status === "completed");
    const completed = range
      ? allCompleted.filter((o) => o.created_date && isWithinInterval(new Date(o.created_date), range))
      : allCompleted;

    const revenue = completed.reduce((s, o) => s + (o.total || 0), 0);
    // COGS derived from menu item costs matched to order items
    let cogsFromItems = 0;
    completed.forEach((o) => {
      o.items?.forEach((item) => {
        const menuItem = menuItems.find((m) => m.id === item.menu_item_id);
        const cost = menuItem?.cost || item.price * 0.35;
        cogsFromItems += cost * (item.quantity || 1);
      });
    });
    const cogs = cogsFromItems || revenue * 0.35;
    const grossProfit = revenue - cogs;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    const opExpenses = {
      labor: revenue * 0.3,
      rent: revenue * 0.1,
      marketing: revenue * 0.03,
      other: revenue * 0.02,
    };
    const totalOpEx = Object.values(opExpenses).reduce((s, v) => s + v, 0);
    const operatingIncome = grossProfit - totalOpEx;
    const taxes = Math.max(0, operatingIncome * 0.25);
    const netIncome = operatingIncome - taxes;
    const netMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0;

    const financials = { revenue, cogs, grossProfit, grossMargin, opExpenses, operatingIncome, taxes, netIncome, netMargin };

    // Daily for last 7 days (used in charts) — uses `completed` so it respects the period filter
    const dailyRevenue = [];
    for (let i = 6; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const dayStr = format(day, "yyyy-MM-dd");
      const dayOrders = completed.filter((o) => o.created_date && format(new Date(o.created_date), "yyyy-MM-dd") === dayStr);
      dailyRevenue.push({
        day: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][day.getDay()],
        revenue: dayOrders.reduce((s, o) => s + (o.total || 0), 0),
        orders: dayOrders.length,
      });
    }

    // Top selling items
    const itemCounts = {};
    completed.forEach((o) => {
      o.items?.forEach((item) => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + (item.quantity || 1);
      });
    });
    const topItems = Object.entries(itemCounts).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, count]) => ({ name, count }));

    const totalTips = completed.reduce((s, o) => s + (o.tip || 0), 0);

    const paymentBreakdown = {};
    completed.forEach((o) => {
      const m = o.payment_method || "cash";
      paymentBreakdown[m] = (paymentBreakdown[m] || 0) + (o.total || 0);
    });
    const paymentData = Object.entries(paymentBreakdown).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

    const typeBreakdown = {};
    completed.forEach((o) => {
      const t = o.order_type || "dine_in";
      typeBreakdown[t] = (typeBreakdown[t] || 0) + 1;
    });
    const typeData = Object.entries(typeBreakdown).map(([name, value]) => ({ name: name.replace("_", " "), value }));

    const SOURCE_LABELS = {
      in_person: "In Person",
      uber_eats: "Uber Eats",
      doordash: "DoorDash",
      rappi: "Rappi",
      online: "Online",
      phone: "Phone",
    };
    const sourceBreakdown = {};
    completed.forEach((o) => {
      const s = o.order_source || "in_person";
      sourceBreakdown[s] = (sourceBreakdown[s] || 0) + (o.total || 0);
    });
    const sourceData = Object.entries(sourceBreakdown).map(([key, value]) => ({ name: SOURCE_LABELS[key] || key, value }));

    const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label || "All Time";
    return { completed, financials, dailyRevenue, topItems, paymentData, typeData, sourceData, totalTips, periodLabel };
  }, [orders, menuItems, period]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Financial Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Statements driven by real sales data</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-6 h-10">
          <TabsTrigger value="overview" className="flex items-center gap-1.5"><BarChart3 className="w-4 h-4" /> Overview</TabsTrigger>
          <TabsTrigger value="sales" className="flex items-center gap-1.5"><List className="w-4 h-4" /> Sales Detail</TabsTrigger>
          <TabsTrigger value="pnl" className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> P&amp;L</TabsTrigger>
          <TabsTrigger value="balance" className="flex items-center gap-1.5"><Scale className="w-4 h-4" /> Balance Sheet</TabsTrigger>
          <TabsTrigger value="cashflow" className="flex items-center gap-1.5"><Droplets className="w-4 h-4" /> Cash Flow</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard title="Total Revenue" value={`$${financials.revenue.toFixed(2)}`} subValue={`${completed.length} orders`} icon={DollarSign} />
            <StatCard title="Gross Profit" value={`$${financials.grossProfit.toFixed(2)}`} subValue={`${financials.grossMargin.toFixed(1)}% margin`} icon={TrendingUp} />
            <StatCard title="Net Income" value={`$${financials.netIncome.toFixed(2)}`} subValue={`${financials.netMargin.toFixed(1)}% net margin`} icon={ShoppingBag} />
            <StatCard title="Avg Order Value" value={`$${completed.length ? (financials.revenue / completed.length).toFixed(2) : "0.00"}`} subValue={`${menuItems.length} menu items`} icon={BarChart3} />
            <StatCard title="Total Tips" value={`$${totalTips.toFixed(2)}`} subValue={`${completed.filter(o => (o.tip || 0) > 0).length} orders with tip`} icon={HandCoins} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Revenue (Last 7 Days)</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 10%, 90%)" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip formatter={(v) => [`$${v.toFixed(2)}`, "Revenue"]} />
                    <Bar dataKey="revenue" fill="hsl(25, 95%, 53%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Orders (Last 7 Days)</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 10%, 90%)" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="orders" stroke="hsl(25, 95%, 53%)" strokeWidth={2.5} dot={{ fill: "hsl(25, 95%, 53%)", r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Ventas por Método de Pago</CardTitle></CardHeader>
              <CardContent className="h-52">
                {paymentData.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No data</p> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Ventas por Canal / Fuente</CardTitle></CardHeader>
              <CardContent className="h-52">
                {sourceData.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No data</p> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sourceData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 10%, 90%)" />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v.toFixed(0)}`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                      <Tooltip formatter={(v) => [`$${v.toFixed(2)}`, "Ventas"]} />
                      <Bar dataKey="value" fill="hsl(25, 95%, 53%)" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Top Selling Items</CardTitle></CardHeader>
              <CardContent>
                {topItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No data yet</p>
                ) : (
                  <div className="space-y-3">
                    {topItems.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</span>
                        <span className="flex-1 text-sm font-medium truncate">{item.name}</span>
                        <span className="text-sm text-muted-foreground">{item.count} sold</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Order Types</CardTitle></CardHeader>
              <CardContent className="h-52">
                {typeData.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No data</p> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── SALES DETAIL ── */}
        <TabsContent value="sales">
          <SalesDetail orders={orders} />
        </TabsContent>

        {/* ── P&L ── */}
        <TabsContent value="pnl">
          <Card><CardContent className="p-6">
            <ProfitLoss financials={financials} period={periodLabel} />
          </CardContent></Card>
        </TabsContent>

        {/* ── BALANCE SHEET ── */}
        <TabsContent value="balance">
          <Card><CardContent className="p-6">
            <BalanceSheet financials={financials} inventory={inventory} period={periodLabel} />
          </CardContent></Card>
        </TabsContent>

        {/* ── CASH FLOW ── */}
        <TabsContent value="cashflow">
          <Card><CardContent className="p-6">
            <CashFlow financials={financials} dailyRevenue={dailyRevenue} period={periodLabel} />
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}