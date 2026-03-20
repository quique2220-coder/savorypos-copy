import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Search } from "lucide-react";

const ACCOUNTS = [
  // Revenue
  { code: "TC-00001", name: "Beverage Sales / Ventas Bebidas", nature: "Income", deductible: false, explanation: "Ingreso gravable" },
  { code: "TC-00002", name: "Food Sales / Ventas Alimentos", nature: "Income", deductible: false, explanation: "Ingreso gravable" },
  { code: "TC-00003", name: "Delivery App Income / Ingresos Apps", nature: "Income", deductible: false, explanation: "Ingreso gravable" },
  { code: "TC-00004", name: "Catering Income / Ingresos Catering", nature: "Income", deductible: false, explanation: "Ingreso gravable" },
  // COGS
  { code: "TC-00010", name: "Food Cost / Costo Alimentos", nature: "Expense", deductible: true, explanation: "COGS deducible - Schedule C Line 38" },
  { code: "TC-00011", name: "Beverage Cost / Costo Bebidas", nature: "Expense", deductible: true, explanation: "COGS deducible - Schedule C" },
  { code: "TC-00012", name: "Packaging / Empaque", nature: "Expense", deductible: true, explanation: "Supplies deductible" },
  // Operating
  { code: "TC-00020", name: "Rent / Renta", nature: "Expense", deductible: true, explanation: "Business rent - Schedule C Line 20b" },
  { code: "TC-00021", name: "Utilities / Servicios", nature: "Expense", deductible: true, explanation: "Electricity, gas, water - Schedule C Line 25" },
  { code: "TC-00022", name: "Labor / Nómina", nature: "Expense", deductible: true, explanation: "Wages - Schedule C Line 26" },
  { code: "TC-00023", name: "Payroll Taxes / Impuestos Nómina", nature: "Expense", deductible: true, explanation: "Employer portion FICA" },
  { code: "TC-00024", name: "Marketing / Publicidad", nature: "Expense", deductible: true, explanation: "Advertising - Schedule C Line 8" },
  { code: "TC-00025", name: "Insurance / Seguro", nature: "Expense", deductible: true, explanation: "Business insurance - Schedule C Line 15" },
  { code: "TC-00026", name: "Depreciation / Depreciación", nature: "Expense", deductible: true, explanation: "Form 4562 - Section 179" },
  { code: "TC-00027", name: "Interest / Intereses", nature: "Expense", deductible: true, explanation: "Business loan interest - Schedule C Line 16b" },
  { code: "TC-00028", name: "Supplies / Suministros", nature: "Expense", deductible: true, explanation: "Office & kitchen supplies - Line 22" },
  { code: "TC-00029", name: "Doordash / Ubereats Fees", nature: "Expense", deductible: true, explanation: "Platform fees deductible as commissions" },
  { code: "TC-00030", name: "Accounting / Contabilidad", nature: "Expense", deductible: true, explanation: "Professional services - Line 17" },
  { code: "TC-00031", name: "Meals 50% / Comidas", nature: "Expense", deductible: true, explanation: "50% deductible for business meals" },
  { code: "TC-00032", name: "Repairs / Reparaciones", nature: "Expense", deductible: true, explanation: "Repairs & maintenance - Line 21" },
  { code: "TC-00033", name: "Owner Draw / Retiro Dueño", nature: "Equity", deductible: false, explanation: "NOT deductible — es distribución" },
  { code: "TC-00034", name: "Personal Expenses / Gastos Personales", nature: "Expense", deductible: false, explanation: "NOT deductible — mezcla personal/negocio" },
];

export default function IRSDeductibles() {
  const [search, setSearch] = useState("");
  const filtered = ACCOUNTS.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        ⚠️ Esta tabla es referencia general. Consulta un CPA para tu situación específica.
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar cuenta..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Código</TableHead>
              <TableHead>Cuenta (EN/ES)</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>IRS Deducible</TableHead>
              <TableHead>Explicación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(a => (
              <TableRow key={a.code}>
                <TableCell className="font-mono text-xs">{a.code}</TableCell>
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell><Badge variant="outline">{a.nature}</Badge></TableCell>
                <TableCell>
                  {a.deductible
                    ? <span className="flex items-center gap-1 text-emerald-600 font-semibold"><CheckCircle2 className="w-4 h-4" />Sí</span>
                    : <span className="flex items-center gap-1 text-red-500 font-semibold"><XCircle className="w-4 h-4" />No</span>
                  }
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.explanation}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}