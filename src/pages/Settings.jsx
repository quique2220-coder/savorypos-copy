import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings2, Store, Receipt, Globe, CreditCard, Check, Truck, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

// Sales tax by US state (%)
const US_STATE_TAX = [
  { code: "none", name: "— Sin estado —", rate: "" },
  { code: "AL", name: "Alabama", rate: "4" },
  { code: "AK", name: "Alaska", rate: "0" },
  { code: "AZ", name: "Arizona", rate: "5.6" },
  { code: "AR", name: "Arkansas", rate: "6.5" },
  { code: "CA", name: "California", rate: "7.25" },
  { code: "CO", name: "Colorado", rate: "2.9" },
  { code: "CT", name: "Connecticut", rate: "6.35" },
  { code: "DE", name: "Delaware", rate: "0" },
  { code: "FL", name: "Florida", rate: "6" },
  { code: "GA", name: "Georgia", rate: "4" },
  { code: "HI", name: "Hawaii", rate: "4" },
  { code: "ID", name: "Idaho", rate: "6" },
  { code: "IL", name: "Illinois", rate: "6.25" },
  { code: "IN", name: "Indiana", rate: "7" },
  { code: "IA", name: "Iowa", rate: "6" },
  { code: "KS", name: "Kansas", rate: "6.5" },
  { code: "KY", name: "Kentucky", rate: "6" },
  { code: "LA", name: "Louisiana", rate: "4.45" },
  { code: "ME", name: "Maine", rate: "5.5" },
  { code: "MD", name: "Maryland", rate: "6" },
  { code: "MA", name: "Massachusetts", rate: "6.25" },
  { code: "MI", name: "Michigan", rate: "6" },
  { code: "MN", name: "Minnesota", rate: "6.875" },
  { code: "MS", name: "Mississippi", rate: "7" },
  { code: "MO", name: "Missouri", rate: "4.225" },
  { code: "MT", name: "Montana", rate: "0" },
  { code: "NE", name: "Nebraska", rate: "5.5" },
  { code: "NV", name: "Nevada", rate: "6.85" },
  { code: "NH", name: "New Hampshire", rate: "0" },
  { code: "NJ", name: "New Jersey", rate: "6.625" },
  { code: "NM", name: "New Mexico", rate: "5" },
  { code: "NY", name: "New York", rate: "4" },
  { code: "NC", name: "North Carolina", rate: "4.75" },
  { code: "ND", name: "North Dakota", rate: "5" },
  { code: "OH", name: "Ohio", rate: "5.75" },
  { code: "OK", name: "Oklahoma", rate: "4.5" },
  { code: "OR", name: "Oregon", rate: "0" },
  { code: "PA", name: "Pennsylvania", rate: "6" },
  { code: "RI", name: "Rhode Island", rate: "7" },
  { code: "SC", name: "South Carolina", rate: "6" },
  { code: "SD", name: "South Dakota", rate: "4.2" },
  { code: "TN", name: "Tennessee", rate: "7" },
  { code: "TX", name: "Texas", rate: "6.25" },
  { code: "UT", name: "Utah", rate: "7.25" },
  { code: "VT", name: "Vermont", rate: "6" },
  { code: "VA", name: "Virginia", rate: "5.3" },
  { code: "WA", name: "Washington", rate: "6.5" },
  { code: "WV", name: "West Virginia", rate: "6" },
  { code: "WI", name: "Wisconsin", rate: "5" },
  { code: "WY", name: "Wyoming", rate: "4" },
  { code: "DC", name: "Washington D.C.", rate: "6" },
];

const PLANS = [
  { id: "starter", name: "Starter", price: "$29/mo", features: ["POS", "Menu", "Inventory", "5 usuarios"] },
  { id: "growth", name: "Growth", price: "$59/mo", features: ["Todo Starter", "CRM + Marketing", "Contabilidad", "Reportes avanzados"] },
  { id: "scale", name: "Scale", price: "$99/mo", features: ["Todo Growth", "Voice AI", "Proyecciones", "Usuarios ilimitados"] },
];

const STORAGE_KEY = "pos_settings";

export default function Settings() {
  const [business, setBusiness] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      name: "Mi Restaurante",
      address: "",
      phone: "",
      email: "",
      tax_rate: "8.25",
      state_code: "none",
      currency: "USD",
      language: "es",
      timezone: "America/Chicago",
      delivery_enabled: false,
      delivery_lat: "",
      delivery_lng: "",
      delivery_radius_miles: 5,
      delivery_fee_percent: 40,
    };
  });
  const [saved, setSaved] = useState(false);

  const handleStateChange = (code) => {
    const state = US_STATE_TAX.find(s => s.code === code);
    setBusiness(prev => ({
      ...prev,
      state_code: code,
      tax_rate: state?.rate !== "" ? state.rate : prev.tax_rate,
    }));
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(business));
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
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label>Estado (EE.UU.)</Label>
                <Select value={business.state_code || "none"} onValueChange={handleStateChange}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar estado" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {US_STATE_TAX.map(s => (
                      <SelectItem key={s.code} value={s.code}>
                        {s.name}{s.rate !== "" ? ` — ${s.rate}%` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Sales Tax (%)</Label>
                <Input
                  type="number"
                  value={business.tax_rate}
                  onChange={e => setBusiness({ ...business, tax_rate: e.target.value, state_code: "none" })}
                  placeholder="e.g. 8.25"
                />
                <p className="text-[11px] text-muted-foreground">Seleccionar estado llena este campo automáticamente</p>
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

          {/* Delivery Settings */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Truck className="w-4 h-4" />Delivery</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Activar Delivery Online</p>
                  <p className="text-xs text-muted-foreground">Los clientes podrán seleccionar delivery en la tienda online</p>
                </div>
                <Switch
                  checked={!!business.delivery_enabled}
                  onCheckedChange={v => setBusiness({ ...business, delivery_enabled: v })}
                />
              </div>
              {business.delivery_enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
                  <div className="space-y-1 md:col-span-2">
                    <Label className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" />Coordenadas de tu local</Label>
                    <p className="text-xs text-muted-foreground mb-1">Busca tu dirección en <a href="https://www.latlong.net/" target="_blank" rel="noopener noreferrer" className="text-primary underline">latlong.net</a> y copia las coordenadas.</p>
                  </div>
                  <div className="space-y-1">
                    <Label>Latitud</Label>
                    <Input
                      type="number"
                      placeholder="ej. 29.7604"
                      value={business.delivery_lat}
                      onChange={e => setBusiness({ ...business, delivery_lat: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Longitud</Label>
                    <Input
                      type="number"
                      placeholder="ej. -95.3698"
                      value={business.delivery_lng}
                      onChange={e => setBusiness({ ...business, delivery_lng: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Radio de entrega (millas)</Label>
                    <Input
                      type="number"
                      value={business.delivery_radius_miles}
                      onChange={e => setBusiness({ ...business, delivery_radius_miles: parseFloat(e.target.value) || 5 })}
                      min={0.5}
                      max={50}
                      step={0.5}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Cargo extra por delivery (%)</Label>
                    <Input
                      type="number"
                      value={business.delivery_fee_percent}
                      onChange={e => setBusiness({ ...business, delivery_fee_percent: parseFloat(e.target.value) || 40 })}
                      min={0}
                      max={200}
                    />
                    <p className="text-[11px] text-muted-foreground">Se suma al subtotal de platillos en pedidos delivery</p>
                  </div>
                </div>
              )}
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