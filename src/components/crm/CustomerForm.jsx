import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

const DEFAULT = { name: "", phone: "", email: "", birthday: "", notes: "", status: "active", opted_in_sms: false, opted_in_email: false };

export default function CustomerForm({ customer, onSave, onCancel }) {
  const [form, setForm] = useState(DEFAULT);

  useEffect(() => {
    setForm(customer ? { ...DEFAULT, ...customer } : DEFAULT);
  }, [customer]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Card className="mb-6 border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm">{customer ? "Editar Cliente" : "Nuevo Cliente"}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onCancel}><X className="w-4 h-4" /></Button>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label>Nombre *</Label>
          <Input value={form.name} onChange={e => set("name", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Teléfono</Label>
          <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+1 555..." />
        </div>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Cumpleaños</Label>
          <Input type="date" value={form.birthday} onChange={e => set("birthday", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => set("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="vip">VIP ⭐</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Notas</Label>
          <Input value={form.notes} onChange={e => set("notes", e.target.value)} />
        </div>
        <div className="flex items-center justify-between col-span-1 md:col-span-3 pt-1 gap-6">
          <div className="flex items-center gap-2">
            <Switch checked={form.opted_in_sms} onCheckedChange={v => set("opted_in_sms", v)} />
            <Label>Acepta SMS</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.opted_in_email} onCheckedChange={v => set("opted_in_email", v)} />
            <Label>Acepta Email</Label>
          </div>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button onClick={() => onSave(form)} disabled={!form.name}>Guardar</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}