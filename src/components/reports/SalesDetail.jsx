import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfWeek, subDays, subMonths, startOfMonth, endOfMonth, startOfYear } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

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

const QUICK_RANGES = [
  { label: "Hoy", getValue: () => ({ from: new Date(), to: new Date() }) },
  { label: "Últ. 7 días", getValue: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { label: "Últ. 30 días", getValue: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { label: "Este mes", getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: "Mes anterior", getValue: () => { const m = subMonths(new Date(), 1); return { from: startOfMonth(m), to: endOfMonth(m) }; } },
  { label: "Todo", getValue: () => null },
];

function groupOrders(orders, granularity, dateRange) {
  const map = {};
  let completed = orders.filter(o => o.status === "completed");
  if (dateRange?.from) {
    const from = new Date(dateRange.from); from.setHours(0, 0, 0, 0);
    const to = dateRange.to ? new Date(dateRange.to) : new Date(); to.setHours(23, 59, 59, 999);
    completed = completed.filter(o => {
      const d = new Date(o.created_date);
      return d >= from && d <= to;
    });
  }

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
  const [dateRange, setDateRange] = useState({ from: subDays(new Date(), 29), to: new Date() });
  const [calOpen, setCalOpen] = useState(false);

  const rows = useMemo(() => groupOrders(orders, granularity, dateRange), [orders, granularity, dateRange]);

  const rangeLabel = dateRange
    ? `${format(dateRange.from, "dd/MM/yy")}${dateRange.to && dateRange.to !== dateRange.from ? ` – ${format(dateRange.to, "dd/MM/yy")}` : ""}`
    : "Todo el tiempo";

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Sales Detail</h2>
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick range buttons */}
          {QUICK_RANGES.map(r => (
            <button
              key={r.label}
              onClick={() => setDateRange(r.getValue())}
              className="text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
            >
              {r.label}
            </button>
          ))}

          {/* Calendar picker */}
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                <CalendarIcon className="w-3.5 h-3.5" />
                {rangeLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => { setDateRange(range); if (range?.from && range?.to) setCalOpen(false); }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {/* Granularity */}
          <Select value={granularity} onValueChange={setGranularity}>
            <SelectTrigger className="w-32 h-8 text-xs">
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