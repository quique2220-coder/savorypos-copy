import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Building2 } from "lucide-react";

const CATEGORIES = [
  { value: "commissary",     label: "Comisaría / Commissary" },
  { value: "insurance",      label: "Aseguranza" },
  { value: "electricity",    label: "Electricidad / Luz" },
  { value: "water",          label: "Agua" },
  { value: "gas",            label: "Gas" },
  { value: "internet",       label: "Internet / Software" },
  { value: "rent",           label: "Renta / Storage" },
  { value: "indirect_labor", label: "Mano de obra indirecta" },
  { value: "admin",          label: "Administración / Contador" },
  { value: "cleaning",       label: "Limpieza" },
  { value: "packaging",      label: "Empaque (global)" },
  { value: "card_fees",      label: "Comisiones tarjeta" },
  { value: "maintenance",    label: "Mantenimiento" },
  { value: "waste",          label: "Desperdicio estimado" },
  { value: "other",          label: "Otro" },
];

const EMPTY = { name: "", category: "other", amount: "", notes: "" };

export default function OverheadSettings({ monthlyDishes, onOverheadPerDish }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [adding, setAdding] = useState(false);

  const { data: expenses = [] } = useQuery({
    queryKey: ["operating_expenses"],
    queryFn: () => base44.entities.OperatingExpense.list("-created_date", 200),
  });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.OperatingExpense.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["operating_expenses"] }); setForm(EMPTY); setAdding(false); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.OperatingExpense.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["operating_expenses"] }),
  });

  const totalMonthly = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const overheadPerDish = monthlyDishes > 0 ? totalMonthly / monthlyDishes : 0;

  // Notify parent
  React.useEffect(() => { onOverheadPerDish?.(overheadPerDish); }, [overheadPerDish]);

  const byCategory = CATEGORIES.map(c => ({
    ...c,
    total: expenses.filter(e => e.category === c.value).reduce((s, e) => s + (Number(e.amount) || 0), 0),
  })).filter(c => c.total > 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          Gastos Operativos Mensuales
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAdding(!adding)}>
          <Plus className="w-3 h-3 mr-1" /> Agregar gasto
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {adding && (
          <div className="p-3 bg-muted/40 rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Nombre (ej: Renta)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <Input type="number" placeholder="$0.00 / mes" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setAdding(false)}>Cancelar</Button>
              <Button size="sm" disabled={!form.name || !form.amount} onClick={() => createMut.mutate({ ...form, amount: parseFloat(form.amount) || 0 })}>Guardar</Button>
            </div>
          </div>
        )}

        {expenses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin gastos registrados aún</p>
        ) : (
          <div className="space-y-1">
            {expenses.map(exp => (
              <div key={exp.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{CATEGORIES.find(c => c.value === exp.category)?.label || exp.category}</Badge>
                  <span className="text-sm">{exp.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium">${Number(exp.amount).toFixed(2)}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteMut.mutate(exp.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-accent/20 rounded-lg">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Mensual</p>
            <p className="font-bold text-lg">${totalMonthly.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Platillos/mes estimados</p>
            <p className="font-bold text-lg">{monthlyDishes.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Overhead / platillo</p>
            <p className="font-bold text-lg text-primary">${overheadPerDish.toFixed(2)}</p>
          </div>
        </div>

        {byCategory.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Por categoría</p>
            {byCategory.map(c => (
              <div key={c.value} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{c.label}</span>
                <span className="font-mono">${c.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}