import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Tag, Trash2, X } from "lucide-react";

export default function CouponManager({ customers }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", description: "", discount_type: "percent", discount_value: 10, min_purchase: 0, is_active: true });
  const qc = useQueryClient();

  const { data: coupons = [] } = useQuery({
    queryKey: ["coupons"],
    queryFn: () => base44.entities.Coupon.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Coupon.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["coupons"] }); setShowForm(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Coupon.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] }),
  });

  const genCode = () => setForm(f => ({ ...f, code: "TCUALI-" + Math.random().toString(36).substring(2,7).toUpperCase() }));

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{coupons.length} cupones activos</p>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1" />Nuevo Cupón</Button>
      </div>

      {showForm && (
        <Card className="mb-4 border-primary/30">
          <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="space-y-1 col-span-2 md:col-span-1">
              <Label>Código</Label>
              <div className="flex gap-1">
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
                <Button variant="outline" size="sm" onClick={genCode}>Auto</Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={form.discount_type} onValueChange={v => setForm(f => ({ ...f, discount_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">% Descuento</SelectItem>
                  <SelectItem value="fixed">$ Fijo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Valor</Label>
              <Input type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: +e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Mínimo de compra</Label>
              <Input type="number" value={form.min_purchase} onChange={e => setForm(f => ({ ...f, min_purchase: +e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Vence</Label>
              <Input type="date" onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="col-span-2 md:col-span-3 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}><X className="w-3 h-3 mr-1" />Cancelar</Button>
              <Button size="sm" onClick={() => createMutation.mutate(form)} disabled={!form.code}>Guardar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {coupons.map(c => (
          <Card key={c.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Tag className="w-5 h-5 text-primary" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm">{c.code}</span>
                    <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Activo" : "Inactivo"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {c.discount_type === "percent" ? `${c.discount_value}% OFF` : `$${c.discount_value} OFF`}
                    {c.min_purchase > 0 && ` · Mín $${c.min_purchase}`}
                    {c.expires_at && ` · Vence ${c.expires_at}`}
                    {c.description && ` · ${c.description}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{c.times_used || 0} usos</span>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(c.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {coupons.length === 0 && <Card><CardContent className="py-12 text-center text-muted-foreground">Sin cupones creados</CardContent></Card>}
      </div>
    </div>
  );
}