import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

function LineItem({ label, value, indent = false, bold = false, highlight = false, positive = null }) {
  const isPositive = positive !== null ? positive : value >= 0;
  return (
    <div className={cn(
      "flex justify-between items-center py-2 px-3 rounded-md",
      highlight && "bg-primary/8 font-semibold",
      bold && "font-semibold"
    )}>
      <span className={cn("text-sm", indent && "pl-4 text-muted-foreground", bold && "text-foreground", highlight && "text-foreground")}>
        {label}
      </span>
      <span className={cn(
        "text-sm tabular-nums",
        highlight && "text-base font-bold",
        !highlight && !bold && "text-muted-foreground",
        positive !== null && (isPositive ? "text-emerald-600" : "text-red-500")
      )}>
        {value < 0 ? `($${Math.abs(value).toFixed(2)})` : `$${value.toFixed(2)}`}
      </span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-3 pb-1 pt-2">{title}</p>
      <div className="border rounded-lg overflow-hidden divide-y divide-border/50 bg-card">
        {children}
      </div>
    </div>
  );
}

export default function ProfitLoss({ financials, period }) {
  const { revenue, cogs, grossProfit, grossMargin, opExpenses, operatingIncome, taxes, netIncome, netMargin } = financials;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          <h2 className="text-lg font-bold">Profit & Loss Statement</h2>
          <p className="text-xs text-muted-foreground">Period: {period}</p>
        </div>
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold",
          netIncome >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
        )}>
          {netIncome >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {netIncome >= 0 ? "Profitable" : "Net Loss"}
        </div>
      </div>

      <Section title="Revenue">
        <LineItem label="Food & Beverage Sales" value={revenue} indent />
        <LineItem label="Total Revenue" value={revenue} bold />
      </Section>

      <Section title="Cost of Goods Sold (COGS)">
        <LineItem label="Ingredient & Food Costs" value={-cogs} indent />
        <LineItem label="Total COGS" value={-cogs} bold />
      </Section>

      <div className="border rounded-lg overflow-hidden bg-emerald-50/50">
        <LineItem label="Gross Profit" value={grossProfit} highlight positive={grossProfit >= 0} />
        <div className="flex justify-between px-3 py-1.5">
          <span className="text-xs text-muted-foreground">Gross Margin</span>
          <span className={cn("text-xs font-semibold", grossMargin >= 50 ? "text-emerald-600" : "text-amber-600")}>{grossMargin.toFixed(1)}%</span>
        </div>
      </div>

      <Section title="Operating Expenses (Estimates)">
        <LineItem label="Labor (est. 30% of revenue)" value={-opExpenses.labor} indent />
        <LineItem label="Rent & Utilities (est. 10%)" value={-opExpenses.rent} indent />
        <LineItem label="Marketing (est. 3%)" value={-opExpenses.marketing} indent />
        <LineItem label="Other (est. 2%)" value={-opExpenses.other} indent />
        <LineItem label="Total Operating Expenses" value={-(opExpenses.labor + opExpenses.rent + opExpenses.marketing + opExpenses.other)} bold />
      </Section>

      <div className="border rounded-lg overflow-hidden bg-blue-50/50">
        <LineItem label="Operating Income (EBIT)" value={operatingIncome} highlight positive={operatingIncome >= 0} />
      </div>

      <Section title="Taxes">
        <LineItem label="Estimated Tax (25%)" value={-taxes} indent />
      </Section>

      <div className="border-2 border-primary/20 rounded-lg overflow-hidden bg-primary/5 mt-2">
        <LineItem label="Net Income" value={netIncome} highlight positive={netIncome >= 0} />
        <div className="flex justify-between px-3 py-1.5">
          <span className="text-xs text-muted-foreground">Net Margin</span>
          <span className={cn("text-xs font-semibold", netMargin >= 10 ? "text-emerald-600" : netMargin >= 0 ? "text-amber-600" : "text-red-600")}>{netMargin.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}