import React, { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle } from "lucide-react";

export default function TrialBalance({ entries }) {
  const balances = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const dr = e.account_dr;
      const cr = e.account_cr;
      if (!map[dr]) map[dr] = { name: dr, type: e.account_dr_type, debit: 0, credit: 0 };
      map[dr].debit += e.amount_dr || 0;
      if (!map[cr]) map[cr] = { name: cr, type: e.account_cr_type, debit: 0, credit: 0 };
      map[cr].credit += e.amount_cr || 0;
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [entries]);

  const totalDr = balances.reduce((s, b) => s + b.debit, 0);
  const totalCr = balances.reduce((s, b) => s + b.credit, 0);
  const balanced = Math.abs(totalDr - totalCr) < 0.01;

  const typeColor = { Asset: "bg-blue-100 text-blue-700", Liability: "bg-orange-100 text-orange-700", Equity: "bg-purple-100 text-purple-700", Income: "bg-emerald-100 text-emerald-700", Expense: "bg-red-100 text-red-700" };

  return (
    <div className="space-y-4">
      <div className={`flex items-center gap-2 p-3 rounded-lg ${balanced ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
        {balanced ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
        <span className={`font-semibold ${balanced ? "text-emerald-700" : "text-red-700"}`}>
          {balanced ? "Balanceado ✓ — Debe = Haber" : `Descuadre: $${Math.abs(totalDr - totalCr).toFixed(2)}`}
        </span>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Cuenta</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right text-emerald-700">Debe (Dr)</TableHead>
              <TableHead className="text-right text-red-700">Haber (Cr)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {balances.map((b, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{b.name}</TableCell>
                <TableCell><Badge className={typeColor[b.type] || "bg-gray-100"}>{b.type}</Badge></TableCell>
                <TableCell className="text-right text-emerald-700">{b.debit > 0 ? `$${b.debit.toFixed(2)}` : "—"}</TableCell>
                <TableCell className="text-right text-red-700">{b.credit > 0 ? `$${b.credit.toFixed(2)}` : "—"}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted font-bold">
              <TableCell colSpan={2}>TOTALES</TableCell>
              <TableCell className="text-right text-emerald-700">${totalDr.toFixed(2)}</TableCell>
              <TableCell className="text-right text-red-700">${totalCr.toFixed(2)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}