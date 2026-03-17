import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, ShoppingBag, CreditCard, Users, BarChart3 } from "lucide-react";
import { format, subDays, isAfter, startOfDay } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";

const COLORS = ["hsl(25, 95%, 53%)", "hsl(160, 60%, 45%)", "hsl(220, 70%, 50%)", "hsl(280, 65%, 60%)", "hsl(340, 75%, 55%)"];

function StatCard({ title, value, subValue, icon: Icon, color }) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-24 h-24 transform translate-x-6 -translate-y-6 ${color} rounded-full opacity-10`} />
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${color} bg-opacity-15`}>
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

export default function Reports() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 500),
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ["menuItems"],
    queryFn: () => base44.entities.MenuItem.list(),
  });

  const stats = useMemo(() => {
    const completed = orders.filter((o) => o.status === "completed");
    const today = startOfDay(new Date());
    const todaysOrders = completed.filter((o) => o.created_date && isAfter(new Date(o.created_date), today));
    const last7 = completed.filter((o) => o.created_date && isAfter(new Date(o.created_date), subDays(new Date(), 7)));

    const totalRevenue = completed.reduce((s, o) => s + (o.total || 0), 0);
    const todayRevenue = todaysOrders.reduce((s, o) => s + (o.total || 0), 0);
    const avgOrderValue = completed.length ? totalRevenue / completed.length : 0;

    // Daily revenue for last 7 days
    const dailyRevenue = [];
    for (let i = 6; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const dayStr = format(day, "yyyy-MM-dd");
      const dayOrders = completed.filter((o) => o.created_date && format(new Date(o.created_date), "yyyy-MM-dd") === dayStr);
      dailyRevenue.push({
        day: format(day, "EEE"),
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
    const topItems = Object.entries(itemCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Payment method breakdown
    const paymentBreakdown = {};
    completed.forEach((o) => {
      const method = o.payment_method || "cash";
      paymentBreakdown[method] = (paymentBreakdown[method] || 0) + (o.total || 0);
    });
    const paymentData = Object.entries(paymentBreakdown).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

    // Order type breakdown
    const typeBreakdown = {};
    completed.forEach((o) => {
      const type = o.order_type || "dine_in";
      typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
    });
    const typeData = Object.entries(typeBreakdown).map(([name, value]) => ({ name: name.replace("_", " "), value }));

    return { totalRevenue, todayRevenue, avgOrderValue, totalOrders: completed.length, todayOrders: todaysOrders.length, dailyRevenue, topItems, paymentData, typeData };
  }, [orders]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financial Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your business performance</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={`$${stats.totalRevenue.toFixed(2)}`} subValue={`${stats.totalOrders} orders`} icon={DollarSign} color="bg-primary" />
        <StatCard title="Today's Revenue" value={`$${stats.todayRevenue.toFixed(2)}`} subValue={`${stats.todayOrders} orders today`} icon={TrendingUp} color="bg-primary" />
        <StatCard title="Avg Order Value" value={`$${stats.avgOrderValue.toFixed(2)}`} icon={ShoppingBag} color="bg-primary" />
        <StatCard title="Menu Items" value={menuItems.length} subValue={`${menuItems.filter((i) => i.is_available !== false).length} available`} icon={BarChart3} color="bg-primary" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 10%, 90%)" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v) => [`$${v.toFixed(2)}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="hsl(25, 95%, 53%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Order Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Orders (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.dailyRevenue}>
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

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Items */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Selling Items</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No data yet</p>
            ) : (
              <div className="space-y-3">
                {stats.topItems.map((item, i) => (
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

        {/* Payment Methods */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent className="h-52">
            {stats.paymentData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {stats.paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Order Types */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Order Types</CardTitle>
          </CardHeader>
          <CardContent className="h-52">
            {stats.typeData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {stats.typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}