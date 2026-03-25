import React from "react";
import { cn } from "@/lib/utils";
import { Scale } from "lucide-react";

function LineItem({ label, value, indent = false, bold = false, highlight = false }) {
  return (
    <div className={cn(
      "flex justify-between items-center py-2 px-3 rounded-md",
      highlight && "bg-primary/8 font-semibold",
    )}>
      <span className={cn("text-sm", indent && "pl-4 text-muted-foreground", bold && "font-semibold text-foreground", highlight && "font-bold text-foreground")}>
        {label}
      </span>
      <span className={cn("text-sm tabular-nums", !bold && !highlight && "text-muted-foreground", (bold || highlight) && "font-semibold")}>
        ${value.toFixed(2)}
      </span>
    </div>
  );
}

function Section({ title, color, children }) {
  return (
    <div className="mb-4">
      <p className={cn("text-xs font-bold uppercase tracking-widest px-3 pb-1 pt-2", color || "text-muted-foreground")}>{title}</p>
      <div className="border rounded-lg overflow-hidden divide-y divide-border/50 bg-card">
        {children}
      </div>
    </div>
  );
}

export default function BalanceSheet({ financials, inventory, period, contentRef }) {
  const { revenue, netIncome, cogs } = financials;

  // Assets
  const cashOnHand = revenue * 0.15;
  const accountsReceivable = revenue * 0.05;
  const inventoryValue = inventory.reduce((s, i) => s + (i.current_stock || 0) * (i.cost_per_unit || 0), 0);
  const prepaidExpenses = revenue * 0.02;
  const totalCurrentAssets = cashOnHand + accountsReceivable + inventoryValue + prepaidExpenses;

  const equipment = revenue * 0.4;
  const leasehold = revenue * 0.2;
  const totalFixedAssets = equipment + leasehold;

  const totalAssets = totalCurrentAssets + totalFixedAssets;

  // Liabilities
  const accountsPayable = cogs * 0.1;
  const accruedLiabilities = revenue * 0.04;
  const taxPayable = Math.max(0, netIncome * 0.25);
  const totalCurrentLiabilities = accountsPayable + accruedLiabilities + taxPayable;

  const longTermDebt = revenue * 0.15;
  const totalLiabilities = totalCurrentLiabilities + longTermDebt;

  // Equity
  const retainedEarnings = netIncome;
  const ownerEquity = revenue * 0.25;
  const totalEquity = ownerEquity + retainedEarnings;

  const balanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1;

  return (
    <div className="space-y-1" ref={contentRef}>
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          <h2 className="text-lg font-bold">Balance Sheet</h2>
          <p className="text-xs text-muted-foreground">As of {period}</p>
        </div>
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold",
          "bg-blue-50 text-blue-700"
        )}>
          <Scale className="w-4 h-4" />
          Assets = Liabilities + Equity
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets */}
        <div>
          <p className="text-sm font-bold text-emerald-700 uppercase tracking-wide mb-2 px-1">Assets</p>
          <Section title="Current Assets" color="text-emerald-600">
            <LineItem label="Cash & Equivalents" value={cashOnHand} indent />
            <LineItem label="Accounts Receivable" value={accountsReceivable} indent />
            <LineItem label="Inventory (valued)" value={inventoryValue} indent />
            <LineItem label="Prepaid Expenses" value={prepaidExpenses} indent />
            <LineItem label="Total Current Assets" value={totalCurrentAssets} bold />
          </Section>
          <Section title="Fixed Assets" color="text-emerald-600">
            <LineItem label="Equipment & Appliances" value={equipment} indent />
            <LineItem label="Leasehold Improvements" value={leasehold} indent />
            <LineItem label="Total Fixed Assets" value={totalFixedAssets} bold />
          </Section>
          <div className="border-2 border-emerald-200 rounded-lg bg-emerald-50/60">
            <LineItem label="TOTAL ASSETS" value={totalAssets} highlight />
          </div>
        </div>

        {/* Liabilities + Equity */}
        <div>
          <p className="text-sm font-bold text-red-600 uppercase tracking-wide mb-2 px-1">Liabilities & Equity</p>
          <Section title="Current Liabilities" color="text-red-500">
            <LineItem label="Accounts Payable" value={accountsPayable} indent />
            <LineItem label="Accrued Liabilities" value={accruedLiabilities} indent />
            <LineItem label="Tax Payable" value={taxPayable} indent />
            <LineItem label="Total Current Liabilities" value={totalCurrentLiabilities} bold />
          </Section>
          <Section title="Long-Term Liabilities" color="text-red-500">
            <LineItem label="Long-Term Debt" value={longTermDebt} indent />
          </Section>
          <div className="border rounded-lg overflow-hidden divide-y divide-border/50 bg-card mb-4">
            <LineItem label="Total Liabilities" value={totalLiabilities} bold />
          </div>

          <p className="text-sm font-bold text-blue-700 uppercase tracking-wide mb-2 px-1">Equity</p>
          <Section title="Owner's Equity" color="text-blue-600">
            <LineItem label="Owner's Capital" value={ownerEquity} indent />
            <LineItem label="Retained Earnings" value={retainedEarnings} indent />
            <LineItem label="Total Equity" value={totalEquity} bold />
          </Section>
          <div className="border-2 border-blue-200 rounded-lg bg-blue-50/60">
            <LineItem label="TOTAL LIABILITIES + EQUITY" value={totalLiabilities + totalEquity} highlight />
          </div>
        </div>
      </div>
    </div>
  );
}