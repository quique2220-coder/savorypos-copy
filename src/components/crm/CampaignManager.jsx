import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Megaphone, Trash2, Send, X } from "lucide-react";

const STATUS_COLORS = { draft: "secondary", sent: "default", scheduled: "outline" };

export default function CampaignManager({ customers }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", channel: "sms", message: "", target: "all", status: "draft" });
  const qc = useQueryClient();

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => base44.entities.Campaign.list("-created_date", 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Campaign.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["campaigns"] }); setShowForm(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Campaign.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  const sendMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.Campaign.update(id, { status: "sent", sent_count: customers.length }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  const targetCount = (target) => {
    if (target === "all") return customers.length;
    if (target === "vip") return customers.filter(c => c.status === "vip").length;
    if (target === "inactive") return customers.filter(c => c.status === "inactive").length;
    return customers.filter(c => c.birthday).length;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{campaigns.length} campañas</p>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1" />Nueva Campaña</Button>
      </div>

      {showForm && (
        <Card className="mb-4 border-primary/30">
          <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Promo Fin de Semana" />
            </div>
            <div className="space-y-1">
              <Label>Canal</Label>
              <Select value={form.channel} onValueChange={v => setForm(f => ({ ...f, channel: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">📱 SMS</SelectItem>
                  <SelectItem value="email">📧 Email</SelectItem>
                  <SelectItem value="both">📱📧 Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Audiencia</Label>
              <Select value={form.target} onValueChange={v => setForm(f => ({ ...f, target: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos ({customers.length})</SelectItem>
                  <SelectItem value="vip">VIP ({customers.filter(c => c.status === "vip").length})</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                  <SelectItem value="birthday">Cumpleaños este mes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:row-span-2">
              <Label>Mensaje</Label>
              <Textarea
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Hola {nombre}, tenemos una promo especial para ti..."
                className="h-24"
              />
              <p className="text-xs text-muted-foreground">{form.message.length}/160 chars · Dest: ~{targetCount(form.target)} clientes</p>
            </div>
            <div className="flex justify-end gap-2 md:col-span-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}><X className="w-3 h-3 mr-1" />Cancelar</Button>
              <Button size="sm" onClick={() => createMutation.mutate(form)} disabled={!form.name || !form.message}>
                <Plus className="w-3 h-3 mr-1" />Crear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {campaigns.map(c => (
          <Card key={c.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Megaphone className="w-5 h-5 text-primary" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{c.name}</span>
                    <Badge variant={STATUS_COLORS[c.status] || "secondary"}>{c.status}</Badge>
                    <span className="text-xs text-muted-foreground">{c.channel === "sms" ? "📱" : c.channel === "email" ? "📧" : "📱📧"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{c.message}</p>
                  {c.sent_count > 0 && <p className="text-xs text-emerald-600">✓ Enviado a {c.sent_count} clientes</p>}
                </div>
              </div>
              <div className="flex gap-1">
                {c.status === "draft" && (
                  <Button variant="outline" size="sm" onClick={() => sendMutation.mutate({ id: c.id })}>
                    <Send className="w-3 h-3 mr-1" />Enviar
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(c.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {campaigns.length === 0 && <Card><CardContent className="py-12 text-center text-muted-foreground">Sin campañas creadas</CardContent></Card>}
      </div>
    </div>
  );
}