import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const ACCOUNT_TYPES = ["Asset","Liability","Equity","Income","Expense"];
const CATEGORIES = ["Revenue","Cost of Sales","Operating Expense","Asset","Liability","Equity","Other"];
const PAYMENT_METHODS = ["Cash","Bank","Card","App","Other"];

const defaultEntry = {
  date: new Date().toISOString().split("T")[0],
  description: "",
  account_dr: "",
  account_cr: "",
  amount_dr: "",
  amount_cr: "",
  account_dr_type: "Asset",
  account_cr_type: "Income",
  category: "Revenue",
  payment_method: "Cash",
  reference: "",
  is_irs_deductible: false,
  notes: ""
};

export default function JournalForm({ entry, open, onOpenChange, onSave, saving }) {
  const [form, setForm] = useState(defaultEntry);

  useEffect(() => {
    setForm(entry ? { ...defaultEntry, ...entry } : defaultEntry);
  }, [entry, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      amount_dr: parseFloat(form.amount_dr) || 0,
      amount_cr: parseFloat(form.amount_cr) || 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{entry ? "Editar Asiento" : "Nuevo Asiento Contable"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={form.date} onChange={e => set("date", e.target.value)} required />
            </div>
            <div>
              <Label>Categoría</Label>
              <Select value={form.category} onValueChange={v => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Descripción</Label>
            <Input value={form.description} onChange={e => set("description", e.target.value)} placeholder="Ej: Venta de alimentos, Pago renta..." required />
          </div>

          <div className="grid grid-cols-2 gap-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="space-y-2">
              <Label className="text-emerald-700 font-semibold">↓ DEBE / ENTRA (Debit)</Label>
              <Input value={form.account_dr} onChange={e => set("account_dr", e.target.value)} placeholder="Cuenta que recibe" required />
              <Select value={form.account_dr_type} onValueChange={v => set("account_dr_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" step="0.01" value={form.amount_dr} onChange={e => set("amount_dr", e.target.value)} placeholder="$0.00" />
            </div>
            <div className="space-y-2">
              <Label className="text-red-700 font-semibold">↑ HABER / SALE (Credit)</Label>
              <Input value={form.account_cr} onChange={e => set("account_cr", e.target.value)} placeholder="Cuenta que entrega" required />
              <Select value={form.account_cr_type} onValueChange={v => set("account_cr_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" step="0.01" value={form.amount_cr} onChange={e => set("amount_cr", e.target.value)} placeholder="$0.00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Método de Pago</Label>
              <Select value={form.payment_method} onValueChange={v => set("payment_method", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Referencia (# Factura)</Label>
              <Input value={form.reference} onChange={e => set("reference", e.target.value)} placeholder="INV-001" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={form.is_irs_deductible} onCheckedChange={v => set("is_irs_deductible", v)} />
            <Label>Deducible IRS</Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar Asiento"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}