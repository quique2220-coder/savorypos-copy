import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, BookOpen, BarChart3, Scale, CheckSquare, FileText, Undo2, Printer } from "lucide-react";
import JournalForm from "../components/accounting/JournalForm";
import TrialBalance from "../components/accounting/TrialBalance";
import IRSDeductibles from "../components/accounting/IRSDeductibles";
import AccountingStatements from "../components/accounting/AccountingStatements";

const printStyles = `
  @media print {
    * { margin: 0; padding: 0; }
    body { background: white; }
    aside { display: none !important; }
    [class*="sidebar"] { display: none !important; }
    .print-hidden { display: none !important; }
    .page-content { 
      display: block !important; 
      margin: 0; 
      padding: 40px 20px; 
      width: 100%;
      max-width: 100%;
    }
  }
`;

const CHART_OF_ACCOUNTS = [
  // Assets
  { code: "1100", name_en: "Cash", name_es: "Caja / Efectivo", nature: "Asset", category: "Current Assets" },
  { code: "1110", name_en: "Bank Account", name_es: "Banco", nature: "Asset", category: "Current Assets" },
  { code: "1120", name_en: "Accounts Receivable", name_es: "Cuentas por Cobrar", nature: "Asset", category: "Current Assets" },
  { code: "1130", name_en: "Food Inventory", name_es: "Inventario de Alimentos", nature: "Asset", category: "Current Assets" },
  { code: "1131", name_en: "Beverage Inventory", name_es: "Inventario de Bebidas", nature: "Asset", category: "Current Assets" },
  { code: "1132", name_en: "Packaging Inventory", name_es: "Inventario de Empaque", nature: "Asset", category: "Current Assets" },
  { code: "1200", name_en: "Equipment", name_es: "Equipos de Cocina", nature: "Asset", category: "Fixed Assets" },
  { code: "1210", name_en: "Vehicles", name_es: "Vehículos", nature: "Asset", category: "Fixed Assets" },
  // Liabilities
  { code: "2100", name_en: "Accounts Payable", name_es: "Cuentas por Pagar", nature: "Liability", category: "Current Liabilities" },
  { code: "2110", name_en: "Credit Card", name_es: "Tarjeta de Crédito", nature: "Liability", category: "Current Liabilities" },
  { code: "2120", name_en: "Sales Tax Payable", name_es: "Impuesto sobre Ventas por Pagar", nature: "Liability", category: "Current Liabilities" },
  { code: "2200", name_en: "Business Loan", name_es: "Préstamo Negocio", nature: "Liability", category: "Long-term Liabilities" },
  // Equity
  { code: "3100", name_en: "Owner's Equity", name_es: "Capital del Dueño", nature: "Equity", category: "Equity" },
  { code: "3200", name_en: "Retained Earnings", name_es: "Utilidades Retenidas", nature: "Equity", category: "Equity" },
  { code: "3300", name_en: "Owner Draw / Distributions", name_es: "Retiros del Dueño", nature: "Equity", category: "Equity" },
  // Revenue
  { code: "4100", name_en: "Food Sales", name_es: "Ventas de Alimentos", nature: "Income", category: "Revenue" },
  { code: "4110", name_en: "Beverage Sales", name_es: "Ventas de Bebidas", nature: "Income", category: "Revenue" },
  { code: "4120", name_en: "Delivery Sales", name_es: "Ventas por Delivery", nature: "Income", category: "Revenue" },
  { code: "4130", name_en: "Catering Income", name_es: "Ingresos Catering", nature: "Income", category: "Revenue" },
  { code: "4150", name_en: "Sales Returns & Allowances", name_es: "Devoluciones y Descuentos", nature: "Income", category: "Revenue", type: "contra" },
  { code: "4200", name_en: "Other Income", name_es: "Otros Ingresos", nature: "Income", category: "Revenue" },
  // COGS
  { code: "5100", name_en: "Food Cost", name_es: "Costo de Alimentos", nature: "Expense", category: "Cost of Sales" },
  { code: "5110", name_en: "Beverage Cost", name_es: "Costo de Bebidas", nature: "Expense", category: "Cost of Sales" },
  { code: "5120", name_en: "Packaging", name_es: "Empaque / Envases", nature: "Expense", category: "Cost of Sales" },
  // Expenses
  { code: "6100", name_en: "Rent", name_es: "Renta Local", nature: "Expense", category: "Operating Expenses" },
  { code: "6110", name_en: "Utilities", name_es: "Servicios (Luz, Gas, Agua)", nature: "Expense", category: "Operating Expenses" },
  { code: "6120", name_en: "Direct Labor (Kitchen)", name_es: "Labor Directo (Cocina)", nature: "Expense", category: "Operating Expenses" },
  { code: "6121", name_en: "Indirect Labor (Admin/Cashier)", name_es: "Labor Indirecto (Admin/Caja)", nature: "Expense", category: "Operating Expenses" },
  { code: "6130", name_en: "Payroll Taxes", name_es: "Impuestos sobre Nómina", nature: "Expense", category: "Operating Expenses" },
  { code: "6140", name_en: "Marketing / Advertising", name_es: "Marketing y Publicidad", nature: "Expense", category: "Operating Expenses" },
  { code: "6150", name_en: "Insurance", name_es: "Seguros", nature: "Expense", category: "Operating Expenses" },
  { code: "6160", name_en: "Delivery App Fees", name_es: "Comisiones Apps Delivery", nature: "Expense", category: "Operating Expenses" },
  { code: "6170", name_en: "Repairs & Maintenance", name_es: "Reparaciones y Mantenimiento", nature: "Expense", category: "Operating Expenses" },
  { code: "6180", name_en: "Depreciation", name_es: "Depreciación", nature: "Expense", category: "Operating Expenses" },
  { code: "6190", name_en: "Accounting / Legal", name_es: "Contabilidad / Legal", nature: "Expense", category: "Operating Expenses" },
  { code: "6200", name_en: "Interest Expense", name_es: "Gastos Financieros", nature: "Expense", category: "Operating Expenses" },
];

const natColor = { Income: "bg-emerald-100 text-emerald-700", Expense: "bg-red-100 text-red-700", Asset: "bg-blue-100 text-blue-700", Liability: "bg-orange-100 text-orange-700", Equity: "bg-purple-100 text-purple-700" };
const typeColor = { contra: "bg-amber-100 text-amber-700" };

export default function Contabilidad() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [statementsStartDate, setStatementsStartDate] = useState("");
  const [statementsEndDate, setStatementsEndDate] = useState("");
  const qc = useQueryClient();

  const { data: entries = [] } = useQuery({
    queryKey: ["JournalEntry"],
    queryFn: () => base44.entities.JournalEntry.list("-date", 500),
  });

  const { data: refunds = [] } = useQuery({
    queryKey: ["Refund"],
    queryFn: () => base44.entities.Refund.list("-created_date", 500),
  });

  const createMutation = useMutation({
    mutationFn: d => base44.entities.JournalEntry.create(d),
    onSuccess: () => { qc.invalidateQueries(["JournalEntry"]); setFormOpen(false); }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, d }) => base44.entities.JournalEntry.update(id, d),
    onSuccess: () => { qc.invalidateQueries(["JournalEntry"]); setFormOpen(false); setEditing(null); }
  });
  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.JournalEntry.delete(id),
    onSuccess: () => qc.invalidateQueries(["JournalEntry"])
  });

  const handleSave = (data) => {
    if (editing) updateMutation.mutate({ id: editing.id, d: data });
    else createMutation.mutate(data);
  };

  const filtered = entries.filter(e =>
    !search || e.description?.toLowerCase().includes(search.toLowerCase()) ||
    e.account_dr?.toLowerCase().includes(search.toLowerCase()) ||
    e.account_cr?.toLowerCase().includes(search.toLowerCase())
  );

  const totalDr = filtered.reduce((s, e) => s + (e.amount_dr || 0), 0);
  const totalCr = filtered.reduce((s, e) => s + (e.amount_cr || 0), 0);

  return (
    <div className="p-6 min-h-screen bg-background">
      <style>{printStyles}</style>
      <div className="max-w-7xl mx-auto print-hidden">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="w-6 h-6 text-primary" />Contabilidad</h1>
          <p className="text-muted-foreground text-sm mt-1">Mini QuickBooks — Diario Contable Bilingüe con IRS</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto">
        <Tabs defaultValue="journal" className="print-hidden">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="journal" className="gap-1"><FileText className="w-4 h-4" />Diario</TabsTrigger>
            <TabsTrigger value="accounts" className="gap-1"><BookOpen className="w-4 h-4" />Plan de Cuentas</TabsTrigger>
            <TabsTrigger value="statements" className="gap-1"><BarChart3 className="w-4 h-4" />Estados Financieros</TabsTrigger>
            <TabsTrigger value="trial" className="gap-1"><Scale className="w-4 h-4" />Balanza Comprobación</TabsTrigger>
            <TabsTrigger value="refunds" className="gap-1"><Undo2 className="w-4 h-4" />Devoluciones</TabsTrigger>
            <TabsTrigger value="irs" className="gap-1"><CheckSquare className="w-4 h-4" />IRS Deducibles</TabsTrigger>
          </TabsList>

          {/* DIARIO CONTABLE */}
          <TabsContent value="journal">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar asientos..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2">
                <Plus className="w-4 h-4" />Nuevo Asiento
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                <p className="text-xs text-emerald-600 font-medium">Total Debe (Dr)</p>
                <p className="text-xl font-bold text-emerald-700">${totalDr.toLocaleString("en-US", { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <p className="text-xs text-red-600 font-medium">Total Haber (Cr)</p>
                <p className="text-xl font-bold text-red-700">${totalCr.toLocaleString("en-US", { maximumFractionDigits: 0 })}</p>
              </div>
              <div className={`rounded-lg p-3 text-center border ${Math.abs(totalDr - totalCr) < 0.01 ? "bg-blue-50 border-blue-200" : "bg-amber-50 border-amber-200"}`}>
                <p className="text-xs font-medium text-muted-foreground">Asientos</p>
                <p className="text-xl font-bold">{filtered.length}</p>
              </div>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Debe (Dr) ↓</TableHead>
                    <TableHead>Haber (Cr) ↑</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Cat.</TableHead>
                    <TableHead>IRS</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">No hay asientos. Haz clic en "Nuevo Asiento" para comenzar.</TableCell></TableRow>
                  )}
                  {filtered.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm whitespace-nowrap">{e.date}</TableCell>
                      <TableCell className="max-w-[180px]"><p className="font-medium text-sm truncate">{e.description}</p><p className="text-xs text-muted-foreground">{e.reference}</p></TableCell>
                      <TableCell><p className="text-sm text-emerald-700 font-medium">{e.account_dr}</p><Badge className={`text-[10px] ${natColor[e.account_dr_type] || ""}`}>{e.account_dr_type}</Badge></TableCell>
                      <TableCell><p className="text-sm text-red-700 font-medium">{e.account_cr}</p><Badge className={`text-[10px] ${natColor[e.account_cr_type] || ""}`}>{e.account_cr_type}</Badge></TableCell>
                      <TableCell className="text-sm font-semibold">${(e.amount_dr || e.amount_cr || 0).toFixed(2)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{e.category}</Badge></TableCell>
                      <TableCell>{e.is_irs_deductible && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">✓ IRS</Badge>}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(e); setFormOpen(true); }}><Pencil className="w-3 h-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(e.id)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* PLAN DE CUENTAS */}
          <TabsContent value="accounts">
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Código</TableHead>
                    <TableHead>English</TableHead>
                    <TableHead>Español</TableHead>
                    <TableHead>Naturaleza</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoría</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CHART_OF_ACCOUNTS.map(a => (
                    <TableRow key={a.code}>
                      <TableCell className="font-mono text-sm font-semibold">{a.code}</TableCell>
                      <TableCell className="font-medium">{a.name_en}</TableCell>
                      <TableCell className="text-muted-foreground">{a.name_es}</TableCell>
                      <TableCell><Badge className={natColor[a.nature] || ""}>{a.nature}</Badge></TableCell>
                      <TableCell>{a.type && <Badge className={typeColor[a.type] || ""}>{a.type}</Badge>}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.category}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ESTADOS FINANCIEROS */}
          <TabsContent value="statements">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Fecha Inicio</label>
                  <Input type="date" value={statementsStartDate} onChange={e => setStatementsStartDate(e.target.value)} />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Fecha Fin</label>
                  <Input type="date" value={statementsEndDate} onChange={e => setStatementsEndDate(e.target.value)} />
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => { setStatementsStartDate(""); setStatementsEndDate(""); }}>
                  Limpiar
                </Button>
                <Button size="sm" className="gap-2" onClick={() => window.print()}>
                  <Printer className="w-4 h-4" />Imprimir
                </Button>
              </div>
              <AccountingStatements entries={entries.filter(e => {
                if (!statementsStartDate && !statementsEndDate) return true;
                const entryDate = new Date(e.date);
                const start = statementsStartDate ? new Date(statementsStartDate) : new Date("1900-01-01");
                const end = statementsEndDate ? new Date(statementsEndDate) : new Date("2100-12-31");
                return entryDate >= start && entryDate <= end;
              })} />
            </div>
          </TabsContent>

          {/* BALANZA DE COMPROBACIÓN */}
          <TabsContent value="trial">
            <TrialBalance entries={entries} />
          </TabsContent>

          {/* DEVOLUCIONES Y DESCUENTOS */}
          <TabsContent value="refunds">
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Orden</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Razón</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refunds.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">No hay devoluciones registradas</TableCell></TableRow>
                  )}
                  {refunds.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm whitespace-nowrap">{r.created_date?.split('T')[0]}</TableCell>
                      <TableCell className="font-mono font-semibold">{r.order_number}</TableCell>
                      <TableCell className="text-sm">{r.customer_name || "—"}</TableCell>
                      <TableCell className="text-sm capitalize">{r.reason?.replace(/_/g, " ")}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs capitalize">{r.refund_type}</Badge></TableCell>
                      <TableCell className="font-semibold text-red-600">${r.amount?.toFixed(2)}</TableCell>
                      <TableCell className="text-sm capitalize">{r.refund_method}</TableCell>
                      <TableCell>
                        <Badge className={r.status === "processed" ? "bg-emerald-100 text-emerald-700" : r.status === "approved" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}>
                          {r.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {refunds.length > 0 && (
              <div className="mt-4 grid grid-cols-4 gap-3">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-red-600 font-medium">Total Devoluciones</p>
                  <p className="text-xl font-bold text-red-700">${refunds.reduce((s, r) => s + (r.amount || 0), 0).toFixed(2)}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-600 font-medium">Procesadas</p>
                  <p className="text-xl font-bold text-blue-700">{refunds.filter(r => r.status === "processed").length}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-amber-600 font-medium">Aprobadas</p>
                  <p className="text-xl font-bold text-amber-700">{refunds.filter(r => r.status === "approved").length}</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-orange-600 font-medium">Pendientes</p>
                  <p className="text-xl font-bold text-orange-700">{refunds.filter(r => r.status === "pending").length}</p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* IRS DEDUCIBLES */}
          <TabsContent value="irs">
            <IRSDeductibles />
          </TabsContent>
        </Tabs>

        <JournalForm
           entry={editing}
           open={formOpen}
           onOpenChange={setFormOpen}
           onSave={handleSave}
           saving={createMutation.isPending || updateMutation.isPending}
         />
        </div>

        <div className="hidden print:block page-content">
        <AccountingStatements entries={entries.filter(e => {
          if (!statementsStartDate && !statementsEndDate) return true;
          const entryDate = new Date(e.date);
          const start = statementsStartDate ? new Date(statementsStartDate) : new Date("1900-01-01");
          const end = statementsEndDate ? new Date(statementsEndDate) : new Date("2100-12-31");
          return entryDate >= start && entryDate <= end;
        })} />
        </div>
        </div>
  );
}