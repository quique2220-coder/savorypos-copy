import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfWeek, startOfMonth, startOfYear, getISOWeek, getYear } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

const SOURCE_LABELS = {
  in_person: "In Person",
  uber_eats: "Uber Eats",
  doordash: "DoorDash",
  rappi: "Rappi",
  online: "Online",
  phone: "Phone",
};

const TYPE_LABELS = {
  dine_in: "Dine In",
  takeout: "Takeout",
  delivery: "Delivery",
  catering: "Catering",
};

function groupOrders(orders, granularity) {
  const map = {};
  const completed = orders.filter(o => o.status === "completed");

  completed.forEach(o => {
    const date = new Date(o.created_date);
    let key;
    if (granularity === "day") key = format(date, "yyyy-MM-dd");
    else if (granularity === "week") {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      key = format(weekStart, "yyyy-MM-dd");
    }
    else if (granularity === "month") key = format(date, "yyyy-MM");
    else key = format(date, "yyyy");

    if (!map[key]) map[key] = { key, sales: 0, tips: 0, orders: 0, byType: {}, bySource: {}, byPayment: {} };

    map[key].sales += o.total || 0;
    map[key].tips += o.tip || 0;
    map[key].orders += 1;

    const t = TYPE_LABELS[o.order_type] || o.order_type || "dine_in";
    map[key].byType[t] = (map[key].byType[t] || 0) + (o.total || 0);

    const s = SOURCE_LABELS[o.order_source] || o.order_source || "in_person";
    map[key].bySource[s] = (map[key].bySource[s] || 0) + (o.total || 0);

    const pm = o.payment_method || "cash";
    map[key].byPayment[pm] = (map[key].byPayment[pm] || 0) + (o.total || 0);
  });

  return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
}

function SummaryTable({ rows }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground text-center py-6">No data for this period</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground text-xs uppercase">
            <th className="text-left py-2 px-3">Period</th>
            <th className="text-right py-2 px-3">Orders</th>
            <th className="text-right py-2 px-3">Sales</th>
            <th className="text-right py-2 px-3">Tips</th>
            <th className="text-right py-2 px-3">Avg Ticket</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.key} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
              <td className="py-2 px-3 font-medium">{r.key}</td>
              <td className="py-2 px-3 text-right">{r.orders}</td>
              <td className="py-2 px-3 text-right font-semibold">${r.sales.toFixed(2)}</td>
              <td className="py-2 px-3 text-right text-green-600">${r.tips.toFixed(2)}</td>
              <td className="py-2 px-3 text-right text-muted-foreground">${r.orders ? (r.sales / r.orders).toFixed(2) : "0.00"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold text-sm border-t-2 border-border">
            <td className="py-2 px-3">Total</td>
            <td className="py-2 px-3 text-right">{rows.reduce((s, r) => s + r.orders, 0)}</td>
            <td className="py-2 px-3 text-right">${rows.reduce((s, r) => s + r.sales, 0).toFixed(2)}</td>
            <td className="py-2 px-3 text-right text-green-600">${rows.reduce((s, r) => s + r.tips, 0).toFixed(2)}</td>
            <td className="py-2 px-3 text-right text-muted-foreground">—</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function BreakdownTable({ rows, field, label }) {
  // Collect all keys
  const allKeys = [...new Set(rows.flatMap(r => Object.keys(r[field] || {})))];
  if (!rows.length || !allKeys.length) return <p className="text-sm text-muted-foreground text-center py-6">No data</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground text-xs uppercase">
            <th className="text-left py-2 px-3">Period</th>
            {allKeys.map(k => <th key={k} className="text-right py-2 px-3">{k}</th>)}
            <th className="text-right py-2 px-3">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.key} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
              <td className="py-2 px-3 font-medium">{r.key}</td>
              {allKeys.map(k => (
                <td key={k} className="py-2 px-3 text-right text-muted-foreground">${(r[field]?.[k] || 0).toFixed(2)}</td>
              ))}
              <td className="py-2 px-3 text-right font-semibold">${r.sales.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const COLORS = ["hsl(25,95%,53%)", "hsl(160,60%,45%)", "hsl(220,70%,50%)", "hsl(280,65%,60%)", "hsl(340,75%,55%)", "hsl(50,90%,45%)"];

export default function SalesDetail({ orders }) {
  const [granularity, setGranularity] = useState("day");

  const rows = useMemo(() => groupOrders(orders, granularity), [orders, granularity]);

  // Build chart data with sales + tips
  const chartData = rows.slice(-20).map(r => ({ name: r.key, Ventas: parseFloat(r.sales.toFixed(2)), Tips: parseFloat(r.tips.toFixed(2)) }));

  // For source stacked chart
  const allSources = [...new Set(rows.flatMap(r => Object.keys(r.bySource || {})))];
  const sourceChartData = rows.slice(-20).map(r => {
    const entry = { name: r.key };
    allSources.forEach(s => { entry[s] = parseFloat((r.bySource?.[s] || 0).toFixed(2)); });
    return entry;
  });

  // For type stacked chart
  const allTypes = [...new Set(rows.flatMap(r => Object.keys(r.byType || {})))];
  const typeChartData = rows.slice(-20).map(r => {
    const entry = { name: r.key };
    allTypes.forEach(t => { entry[t] = parseFloat((r.byType?.[t] || 0).toFixed(2)); });
    return entry;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Sales Detail</h2>
        <Select value={granularity} onValueChange={setGranularity}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Por Día</SelectItem>
            <SelectItem value="week">Por Semana</SelectItem>
            <SelectItem value="month">Por Mes</SelectItem>
            <SelectItem value="year">Por Año</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sales + Tips Chart */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Ventas y Tips</CardTitle></CardHeader>
        <CardContent className="h-64">
          {chartData.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">No data</p> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 10%, 90%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={v => `$${v.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="Ventas" fill="hsl(25,95%,53%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Tips" fill="hsl(160,60%,45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Summary Table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Resumen de Ventas y Tips</CardTitle></CardHeader>
        <CardContent><SummaryTable rows={rows} /></CardContent>
      </Card>

      {/* Sales by Channel chart */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Ventas por Canal</CardTitle></CardHeader>
        <CardContent className="h-64">
          {sourceChartData.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">No data</p> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 10%, 90%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={v => `$${v.toFixed(2)}`} />
                <Legend />
                {allSources.map((s, i) => <Bar key={s} dataKey={s} stackId="a" fill={COLORS[i % COLORS.length]} />)}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Breakdown by channel table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Ventas por Canal — Detalle</CardTitle></CardHeader>
        <CardContent><BreakdownTable rows={rows} field="bySource" label="Canal" /></CardContent>
      </Card>

      {/* Sales by order type chart */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Ventas por Tipo de Orden</CardTitle></CardHeader>
        <CardContent className="h-64">
          {typeChartData.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">No data</p> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 10%, 90%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={v => `$${v.toFixed(2)}`} />
                <Legend />
                {allTypes.map((t, i) => <Bar key={t} dataKey={t} stackId="a" fill={COLORS[i % COLORS.length]} />)}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Breakdown by order type table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Ventas por Tipo de Orden — Detalle</CardTitle></CardHeader>
        <CardContent><BreakdownTable rows={rows} field="byType" label="Tipo" /></CardContent>
      </Card>
    </div>
  );
}