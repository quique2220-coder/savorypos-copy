import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings2, Store, Receipt, Globe, Shield, CreditCard, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const PLANS = [
  { id: "starter", name: "Starter", price: "$29/mo", features: ["POS", "Menu", "Inventory", "5 usuarios"] },
  { id: "growth", name: "Growth", price: "$59/mo", features: ["Todo Starter", "CRM + Marketing", "Contabilidad", "Reportes avanzados"] },
  { id: "scale", name: "Scale", price: "$99/mo", features: ["Todo Growth", "Voice AI", "Proyecciones", "Usuarios ilimitados"] },
];

export default function Settings() {
  const [business, setBusiness] = useState({
    name: "Mi Restaurante",
    address: "",
    phone: "",
    email: "",
    tax_rate: "8.25",
    currency: "USD",
    language: "es",
    timezone: "America/Chicago",
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-primary" /> Settings
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Configuración general del negocio</p>
        </div>

        <div className="space-y-6">
          {/* Business Info */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Store className="w-4 h-4" />Información del Negocio</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nombre del negocio</Label>
                <Input value={business.name} onChange={e => setBusiness({ ...business, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Teléfono</Label>
                <Input value={business.phone} onChange={e => setBusiness({ ...business, phone: e.target.value })} placeholder="+1 555 000 0000" />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input value={business.email} onChange={e => setBusiness({ ...business, email: e.target.value })} placeholder="negocio@email.com" />
              </div>
              <div className="space-y-1">
                <Label>Dirección</Label>
                <Input value={business.address} onChange={e => setBusiness({ ...business, address: e.target.value })} />
              </div>
            </CardContent>
          </Card>

          {/* Tax & POS */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Receipt className="w-4 h-4" />POS & Impuestos</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Sales Tax (%)</Label>
                <Input type="number" value={business.tax_rate} onChange={e => setBusiness({ ...business, tax_rate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Moneda</Label>
                <Select value={business.currency} onValueChange={v => setBusiness({ ...business, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD — Dólar</SelectItem>
                    <SelectItem value="MXN">MXN — Peso Mexicano</SelectItem>
                    <SelectItem value="EUR">EUR — Euro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Idioma</Label>
                <Select value={business.language} onValueChange={v => setBusiness({ ...business, language: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="pt">Português</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Globe className="w-4 h-4" />Notificaciones</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Alertas de bajo inventario", key: "low_stock" },
                { label: "Resumen diario de ventas por email", key: "daily_summary" },
                { label: "Notificación de nuevas órdenes", key: "new_orders" },
              ].map(({ label, key }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm">{label}</span>
                  <Switch defaultChecked />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Membership Plans */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CreditCard className="w-4 h-4" />Plan de Membresía</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PLANS.map(plan => (
                  <div key={plan.id} className={`p-4 rounded-xl border-2 transition-all ${plan.id === "growth" ? "border-primary bg-accent/30" : "border-border"}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">{plan.name}</span>
                      {plan.id === "growth" && <Badge className="text-xs">Actual</Badge>}
                    </div>
                    <p className="text-xl font-bold text-primary mb-3">{plan.price}</p>
                    <ul className="space-y-1">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Check className="w-3 h-3 text-emerald-500" />{f}
                        </li>
                      ))}
                    </ul>
                    <Button variant={plan.id === "growth" ? "default" : "outline"} size="sm" className="w-full mt-3">
                      {plan.id === "growth" ? "Plan Actual" : "Cambiar"}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} className="px-8">
              {saved ? <><Check className="w-4 h-4 mr-1" />Guardado</> : "Guardar Cambios"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}