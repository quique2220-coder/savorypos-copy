import React, { useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function LineItem({ label, value, indent = false, bold = false, highlight = false }) {
  return (
    <div className={`flex justify-between py-1.5 px-3 ${bold ? "font-bold" : ""} ${highlight ? "bg-primary/5 rounded" : ""} ${indent ? "pl-8" : ""}`}>
      <span className="text-sm">{label}</span>
      <span className={`text-sm font-mono ${value < 0 ? "text-red-600" : ""}`}>${(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>
  );
}

function SectionHeader({ title, color = "bg-muted" }) {
  return <div className={`${color} px-3 py-2 font-semibold text-sm rounded mt-3 mb-1`}>{title}</div>;
}

export default function AccountingStatements({ entries, activeTab, onTabChange }) {
  const data = useMemo(() => {
    const income = entries.filter(e => e.account_cr_type === "Income").reduce((s, e) => s + (e.amount_cr || 0), 0);
    const cogs = entries.filter(e => e.category === "Cost of Sales").reduce((s, e) => s + (e.amount_dr || 0), 0);
    const opex = entries.filter(e => e.category === "Operating Expense").reduce((s, e) => s + (e.amount_dr || 0), 0);
    const grossProfit = income - cogs;
    const netIncome = grossProfit - opex;

    const assets = entries.filter(e => e.account_dr_type === "Asset").reduce((s, e) => s + (e.amount_dr || 0), 0)
                 - entries.filter(e => e.account_cr_type === "Asset").reduce((s, e) => s + (e.amount_cr || 0), 0);
    const liabilities = entries.filter(e => e.account_cr_type === "Liability").reduce((s, e) => s + (e.amount_cr || 0), 0)
                      - entries.filter(e => e.account_dr_type === "Liability").reduce((s, e) => s + (e.amount_dr || 0), 0);
    const equity = assets - liabilities;

    const cashIn = entries.filter(e => e.account_dr === "Cash in hand" || e.account_dr === "Bank Account").reduce((s, e) => s + (e.amount_dr || 0), 0);
    const cashOut = entries.filter(e => e.account_cr === "Cash in hand" || e.account_cr === "Bank Account").reduce((s, e) => s + (e.amount_cr || 0), 0);

    // By month for sparkline
    const byMonth = {};
    entries.forEach(e => {
      const m = e.date?.slice(0, 7);
      if (!m) return;
      if (!byMonth[m]) byMonth[m] = { revenue: 0, expenses: 0 };
      if (e.account_cr_type === "Income") byMonth[m].revenue += e.amount_cr || 0;
      if (e.account_dr_type === "Expense") byMonth[m].expenses += e.amount_dr || 0;
    });

    return { income, cogs, grossProfit, opex, netIncome, assets, liabilities, equity, cashIn, cashOut };
  }, [entries]);

  return (
    <Tabs value={activeTab || "income"} onValueChange={onTabChange}>
      <TabsList className="mb-4 print:hidden">
        <TabsTrigger value="income">Estado de Resultados</TabsTrigger>
        <TabsTrigger value="balance">Balance General</TabsTrigger>
        <TabsTrigger value="cashflow">Flujo de Caja</TabsTrigger>
      </TabsList>

      <TabsContent value="income">
        <div className="max-w-lg bg-card border rounded-xl p-4 print:border-none print:rounded-none print:bg-transparent print:p-0 print:mb-8">
          <h3 className="font-bold text-center mb-4 text-base">Estado de Resultados (P&L)</h3>
          <SectionHeader title="INGRESOS / REVENUE" color="bg-emerald-100 text-emerald-800" />
          <LineItem label="Ventas Totales" value={data.income} indent />
          <LineItem label="INGRESOS BRUTOS" value={data.income} bold highlight />

          <SectionHeader title="COSTO DE VENTAS / COGS" color="bg-orange-100 text-orange-800" />
          <LineItem label="Costo de Alimentos & Bebidas" value={data.cogs} indent />
          <LineItem label="UTILIDAD BRUTA" value={data.grossProfit} bold highlight />

          <SectionHeader title="GASTOS OPERATIVOS" color="bg-red-100 text-red-800" />
          <LineItem label="Gastos Operativos" value={data.opex} indent />
          <div className="border-t mt-2 pt-2">
            <LineItem label="UTILIDAD NETA" value={data.netIncome} bold highlight />
          </div>
          {data.income > 0 && (
            <div className="mt-3 p-2 bg-muted rounded text-sm text-center text-muted-foreground">
              Margen Neto: {((data.netIncome / data.income) * 100).toFixed(1)}% | Margen Bruto: {((data.grossProfit / data.income) * 100).toFixed(1)}%
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="balance">
        <div className="max-w-lg bg-card border rounded-xl p-4 print:border-none print:rounded-none print:bg-transparent print:p-0 print:mb-8">
          <h3 className="font-bold text-center mb-4 text-base">Balance General</h3>
          <SectionHeader title="ACTIVOS / ASSETS" color="bg-blue-100 text-blue-800" />
          <LineItem label="Activos Corrientes (Cash, Bank, AR, Inventario)" value={data.assets} indent />
          <LineItem label="TOTAL ACTIVOS" value={data.assets} bold highlight />

          <SectionHeader title="PASIVOS / LIABILITIES" color="bg-orange-100 text-orange-800" />
          <LineItem label="Pasivos Corrientes" value={data.liabilities} indent />

          <SectionHeader title="PATRIMONIO / EQUITY" color="bg-purple-100 text-purple-800" />
          <LineItem label="Capital del Dueño" value={data.equity} indent />
          <div className="border-t mt-2 pt-2">
            <LineItem label="TOTAL PASIVO + PATRIMONIO" value={data.liabilities + data.equity} bold highlight />
          </div>
          <div className={`mt-3 p-2 rounded text-sm text-center font-semibold ${Math.abs(data.assets - (data.liabilities + data.equity)) < 1 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {Math.abs(data.assets - (data.liabilities + data.equity)) < 1 ? "✓ Balance Cuadrado" : "⚠ Revisar asientos"}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="cashflow">
        <div className="max-w-lg bg-card border rounded-xl p-4 print:border-none print:rounded-none print:bg-transparent print:p-0 print:mb-8">
          <h3 className="font-bold text-center mb-4 text-base">Flujo de Caja</h3>
          <SectionHeader title="ACTIVIDADES OPERATIVAS" color="bg-emerald-100 text-emerald-800" />
          <LineItem label="Cobros de Clientes" value={data.cashIn} indent />
          <LineItem label="Pagos a Proveedores / Gastos" value={data.cashOut} indent />
          <div className="border-t mt-2 pt-2">
            <LineItem label="FLUJO NETO DE CAJA" value={data.cashIn - data.cashOut} bold highlight />
          </div>
          <div className="mt-3 p-2 bg-muted rounded text-xs text-muted-foreground">
            Nota: Para flujo completo (inversiones, financiamiento), registra todos tus asientos en el Diario Contable.
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}