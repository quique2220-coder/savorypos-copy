import React from "react";
import { cn } from "@/lib/utils";
import { ArrowDownCircle, ArrowUpCircle, Droplets } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";

function LineItem({ label, value, indent = false, bold = false, highlight = false }) {
  const isOutflow = value < 0;
  return (
    <div className={cn(
      "flex justify-between items-center py-2 px-3 rounded-md",
      highlight && "bg-primary/8"
    )}>
      <span className={cn("text-sm", indent && "pl-4 text-muted-foreground", (bold || highlight) && "font-semibold text-foreground")}>
        {label}
      </span>
      <span className={cn(
        "text-sm tabular-nums",
        !bold && !highlight && (isOutflow ? "text-red-400" : "text-muted-foreground"),
        highlight && "font-bold text-base",
        highlight && (value >= 0 ? "text-emerald-600" : "text-red-600"),
        bold && (isOutflow ? "text-red-600 font-semibold" : "text-emerald-600 font-semibold")
      )}>
        {value < 0 ? `($${Math.abs(value).toFixed(2)})` : `$${value.toFixed(2)}`}
      </span>
    </div>
  );
}

function Section({ title, icon: Icon, iconColor, children }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 px-3 pb-1 pt-2">
        <Icon className={cn("w-3.5 h-3.5", iconColor)} />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
      </div>
      <div className="border rounded-lg overflow-hidden divide-y divide-border/50 bg-card">
        {children}
      </div>
    </div>
  );
}

export default function CashFlow({ financials, dailyRevenue, period }) {
  const { revenue, cogs, opExpenses, taxes, netIncome } = financials;

  // Operating Activities
  const cashFromSales = revenue;
  const cashPaidSuppliers = -(cogs * 1.05); // slight lag
  const cashPaidLabor = -opExpenses.labor;
  const cashPaidRent = -opExpenses.rent;
  const cashPaidOther = -(opExpenses.marketing + opExpenses.other);
  const taxesPaid = -Math.max(0, taxes * 0.8);
  const netOperating = cashFromSales + cashPaidSuppliers + cashPaidLabor + cashPaidRent + cashPaidOther + taxesPaid;

  // Investing Activities
  const equipmentPurchase = -(revenue * 0.03);
  const netInvesting = equipmentPurchase;

  // Financing Activities
  const ownerDrawings = -(netIncome * 0.3);
  const netFinancing = ownerDrawings;

  const netCashFlow = netOperating + netInvesting + netFinancing;
  const openingBalance = revenue * 0.10;
  const closingBalance = openingBalance + netCashFlow;

  // Weekly cash flow chart
  const chartData = dailyRevenue.map((d) => ({
    day: d.day,
    inflow: d.revenue,
    outflow: -(d.revenue * 0.65),
    net: d.revenue * 0.35,
  }));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          <h2 className="text-lg font-bold">Cash Flow Statement</h2>
          <p className="text-xs text-muted-foreground">Period: {period}</p>
        </div>
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold",
          netCashFlow >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
        )}>
          <Droplets className="w-4 h-4" />
          {netCashFlow >= 0 ? "Positive Cash Flow" : "Negative Cash Flow"}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-card border rounded-xl p-4 mb-4">
        <p className="text-sm font-semibold mb-3">Daily Cash Flow (Last 7 Days)</p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 10%, 90%)" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v) => `$${Math.abs(v).toFixed(2)}`} />
              <ReferenceLine y={0} stroke="#888" />
              <Bar dataKey="inflow" name="Cash In" fill="hsl(160, 60%, 45%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outflow" name="Cash Out" fill="hsl(0, 75%, 60%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="net" name="Net" fill="hsl(25, 95%, 53%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Operating */}
        <div>
          <Section title="Operating Activities" icon={ArrowUpCircle} iconColor="text-emerald-600">
            <LineItem label="Cash from Sales" value={cashFromSales} indent />
            <LineItem label="Paid to Suppliers" value={cashPaidSuppliers} indent />
            <LineItem label="Labor & Wages" value={cashPaidLabor} indent />
            <LineItem label="Rent & Utilities" value={cashPaidRent} indent />
            <LineItem label="Marketing & Other" value={cashPaidOther} indent />
            <LineItem label="Taxes Paid" value={taxesPaid} indent />
            <LineItem label="Net Operating Cash" value={netOperating} bold />
          </Section>
        </div>

        {/* Investing */}
        <div>
          <Section title="Investing Activities" icon={ArrowDownCircle} iconColor="text-blue-600">
            <LineItem label="Equipment Purchases" value={equipmentPurchase} indent />
            <LineItem label="Net Investing Cash" value={netInvesting} bold />
          </Section>

          <Section title="Financing Activities" icon={ArrowDownCircle} iconColor="text-purple-600">
            <LineItem label="Owner Drawings" value={ownerDrawings} indent />
            <LineItem label="Net Financing Cash" value={netFinancing} bold />
          </Section>
        </div>

        {/* Summary */}
        <div>
          <div className="border rounded-lg overflow-hidden divide-y divide-border/50 bg-card mb-4">
            <div className="px-3 py-2">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground pb-1">Cash Summary</p>
            </div>
            <LineItem label="Opening Balance" value={openingBalance} indent />
            <LineItem label="Net Cash from Operations" value={netOperating} indent />
            <LineItem label="Net Cash from Investing" value={netInvesting} indent />
            <LineItem label="Net Cash from Financing" value={netFinancing} indent />
            <LineItem label="Net Change in Cash" value={netCashFlow} bold />
          </div>
          <div className="border-2 border-primary/20 rounded-lg bg-primary/5">
            <LineItem label="Closing Cash Balance" value={closingBalance} highlight />
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">Cash Inflows</p>
              <p className="text-base font-bold text-emerald-700">${cashFromSales.toFixed(0)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">Cash Outflows</p>
              <p className="text-base font-bold text-red-600">${Math.abs(cashPaidSuppliers + cashPaidLabor + cashPaidRent + cashPaidOther + taxesPaid).toFixed(0)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}