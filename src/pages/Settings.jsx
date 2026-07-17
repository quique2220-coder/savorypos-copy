import React, { useState, useEffect } from "react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings2, Store, Receipt, Globe, CreditCard, Check, Truck, MapPin, Image, X } from "lucide-react";
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
  {
    id: "starter",
    name: "🟢 Starter",
    subtitle: "Opera",
    price: "$29/mes",
    tagline: "Para empezar",
    features: [
      "POS",
      "Órdenes",
      "Menú básico",
      "Inventario simple",
      "5 usuarios"
    ],
    restrictions: ["❌ SIN venta online", "❌ SIN delivery"],
    cta: "Cambiar"
  },
  {
    id: "growth",
    name: "🟡 Growth",
    subtitle: "Controla",
    price: "$59/mes",
    tagline: "Aquí empieza lo bueno",
    features: [
      "Todo Starter +",
      "Costeo automático",
      "Dashboard de ganancias",
      "Contabilidad automática",
      "CRM + Marketing",
      "Reportes",
      "🌐 Menú online (link para clientes)",
      "📲 Pedidos online (pickup)"
    ],
    message: "Empieza a vender también en línea sin comisiones",
    cta: "Plan Actual",
    featured: true
  },
  {
    id: "scale",
    name: "🔴 Scale",
    subtitle: "Crece",
    price: "$99/mes",
    tagline: "Aquí entra tu diferenciador fuerte",
    features: [
      "Todo Growth +",
      "🚗 Delivery propio (hasta 5 millas)",
      "📍 Configuración de zona de entrega",
      "💵 Control de tarifas de envío",
      "🤖 AI Voice (mentor)",
      "📊 Proyecciones",
      "👥 Usuarios ilimitados"
    ],
    messages: [
      "Vende online y entrega sin pagar 30% a apps",
      "Deja de pagar comisiones a UberEats"
    ],
    example: "Si vendes $10,000 en UberEats, pierdes $3,000 en comisiones. Con nuestra plataforma, ese dinero se queda en tu negocio.",
    cta: "Cambiar"
  }
];

const DEFAULTS = {
  name: "Mi Restaurante",
  address: "",
  phone: "",
  email: "",
  tax_rate: "8.25",
  state_code: "none",
  currency: "USD",
  language: "es",
  timezone: "America/Denver",
  delivery_enabled: false,
  delivery_lat: "",
  delivery_lng: "",
  delivery_radius_miles: 5,
  delivery_fee_percent: 40,
  logo_url: "",
};

export default function Settings() {
  const [business, setBusiness] = useState(DEFAULTS);
  const [settingsId, setSettingsId] = useState(null);
  const [saved, setSaved] = useState(false);
  const { user } = useAuth();
  const qc = useQueryClient();

  const { isLoading: settingsLoading } = useQuery({
    queryKey: ['AppSettings', 'business'],
    queryFn: async () => {
      const list = await base44.entities.AppSettings.filter({ key: "business" });
      if (list && list.length > 0) {
        const s = list[0];
        setSettingsId(s.id);
        setBusiness({
          name: s.business_name || DEFAULTS.name,
          address: s.address || "",
          phone: s.phone || "",
          email: s.email || "",
          tax_rate: s.tax_rate || DEFAULTS.tax_rate,
          state_code: s.state_code || "none",
          currency: s.currency || "USD",
          language: s.language || "es",
          timezone: s.timezone || "America/Chicago",
          delivery_enabled: !!s.delivery_enabled,
          delivery_lat: s.delivery_lat != null ? String(s.delivery_lat) : "",
          delivery_lng: s.delivery_lng != null ? String(s.delivery_lng) : "",
          delivery_radius_miles: s.delivery_radius_miles || 5,
          delivery_fee_percent: s.delivery_fee_percent || 40,
          logo_url: s.logo_url || "",
        });
        localStorage.setItem("pos_settings", JSON.stringify({
          ...s,
          delivery_enabled: !!s.delivery_enabled,
        }));
      }
      return list;
    }
  });

  const { data: account } = useQuery({
    queryKey: ['Account', user?.email],
    queryFn: () => base44.entities.Account.filter({ email: user?.email }),
    enabled: !!user?.email,
  });

  const updatePlanMutation = useMutation({
    mutationFn: async (newPlan) => {
      if (!account || account.length === 0) throw new Error('Account no encontrada');
      await base44.entities.Account.update(account[0].id, { current_plan: newPlan });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['Account', user?.email] });
      qc.invalidateQueries({ queryKey: ['AppSettings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (e) => {
      console.error("Error updating plan:", e);
      alert("Error al cambiar el plan. Intenta de nuevo.");
    }
  });

  const handleStateChange = (code) => {
    const state = US_STATE_TAX.find(s => s.code === code);
    setBusiness(prev => ({
      ...prev,
      state_code: code,
      tax_rate: state?.rate !== "" ? state.rate : prev.tax_rate,
    }));
  };

  const handleSave = async () => {
    const payload = {
      key: "business",
      business_name: business.name,
      address: business.address,
      phone: business.phone,
      email: business.email,
      tax_rate: business.tax_rate,
      state_code: business.state_code,
      currency: business.currency,
      language: business.language,
      timezone: business.timezone,
      delivery_enabled: !!business.delivery_enabled,
      delivery_lat: business.delivery_lat ? parseFloat(business.delivery_lat) : null,
      delivery_lng: business.delivery_lng ? parseFloat(business.delivery_lng) : null,
      delivery_radius_miles: parseFloat(business.delivery_radius_miles) || 5,
      delivery_fee_percent: parseFloat(business.delivery_fee_percent) || 40,
      logo_url: business.logo_url || "",
    };
    try {
      if (settingsId) {
        await base44.entities.AppSettings.update(settingsId, payload);
      } else {
        const created = await base44.entities.AppSettings.create(payload);
        setSettingsId(created.id);
      }
      // Also keep localStorage in sync for POS
      localStorage.setItem("pos_settings", JSON.stringify(payload));
      // Invalidate plan access cache when plan changes
      qc.invalidateQueries({ queryKey: ['AppSettings', 'business'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Error saving settings:", e);
      alert("Error al guardar. Intenta de nuevo.");
    }
  };

  if (settingsLoading) {
    return (
      <div className="p-6 min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

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
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
              <div className="border-t pt-4">
                <Label className="flex items-center gap-2 mb-3"><Image className="w-4 h-4" />Logo de tu negocio</Label>
                <div className="flex flex-col gap-3">
                  {business.logo_url && (
                    <div className="relative w-32 h-32 rounded-lg border border-border bg-secondary/30 flex items-center justify-center overflow-hidden">
                      <img src={business.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setBusiness({ ...business, logo_url: "" })}
                        className="absolute top-1 right-1 bg-destructive/80 hover:bg-destructive text-white p-1 rounded transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <label className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                    <Image className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Subir logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const res = await base44.integrations.Core.UploadFile({ file });
                        setBusiness({ ...business, logo_url: res.file_url });
                      }}
                    />
                  </label>
                  <p className="text-xs text-muted-foreground">Se mostrará como watermark en los tickets de los clientes</p>
                </div>
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
                   <p className="text-xs text-muted-foreground mb-1">Busca tu dirección en <a href="https://www.latlong.net/" target="_blank" rel="noopener noreferrer" className="text-primary underline">latlong.net</a> y copia las coordenadas, o usa el botón para detectar tu ubicación actual.</p>
                   <button
                     type="button"
                     onClick={() => {
                       if (!navigator.geolocation) return alert("Geolocalización no disponible en este navegador.");
                       navigator.geolocation.getCurrentPosition(
                         (pos) => setBusiness(prev => ({ ...prev, delivery_lat: pos.coords.latitude.toFixed(6), delivery_lng: pos.coords.longitude.toFixed(6) })),
                         () => alert("No se pudo obtener la ubicación. Verifica los permisos del navegador.")
                       );
                     }}
                     className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/40 bg-accent/50 hover:bg-accent px-3 py-1.5 rounded-lg transition-colors"
                   >
                     <MapPin className="w-3.5 h-3.5" /> Detectar mi ubicación actual
                   </button>
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
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><CreditCard className="w-4 h-4" />Plan de Membresía</CardTitle>
              <p className="text-xs text-muted-foreground mt-2">Elige el plan que mejor se adapte a tu negocio</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PLANS.map(plan => (
                  <div
                    key={plan.id}
                    className={`p-4 rounded-xl border-2 transition-all relative flex flex-col ${
                      plan.featured
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-border"
                    }`}
                  >
                    {plan.featured && (
                      <div className="absolute -top-3 left-4 bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded">
                        ⭐ Más popular
                      </div>
                    )}
                    {account && account[0]?.current_plan === plan.id && (
                      <div className="absolute -top-3 right-4 bg-emerald-500 text-white text-xs font-semibold px-2 py-1 rounded">
                        ✓ Actual
                      </div>
                    )}
                    <div className="mb-3">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-bold text-lg">{plan.name}</span>
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {plan.subtitle}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground italic">{plan.tagline}</p>
                    </div>
                    <p className="text-2xl font-bold text-primary mb-3">{plan.price}</p>
                    {plan.message && (
                      <p className="text-xs font-semibold text-primary/80 bg-primary/10 rounded px-2 py-1 mb-3">
                        👉 {plan.message}
                      </p>
                    )}
                    {plan.messages && (
                      <div className="space-y-1.5 mb-3">
                        {plan.messages.map((msg, idx) => (
                          <p key={idx} className="text-xs font-semibold text-primary/80 bg-primary/10 rounded px-2 py-1">
                            👉 {msg}
                          </p>
                        ))}
                        {plan.example && (
                          <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1.5 border border-amber-200 italic">
                            💡 {plan.example}
                          </p>
                        )}
                      </div>
                    )}
                    <ul className="space-y-2 mb-4">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-2 text-xs leading-relaxed">
                          <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>
                    {plan.restrictions && (
                      <ul className="space-y-1 mb-4 border-t pt-3">
                        {plan.restrictions.map(r => (
                          <li key={r} className="text-xs text-red-600">{r}</li>
                        ))}
                      </ul>
                    )}
                    <Button
                      variant={account && account[0]?.current_plan === plan.id ? "default" : "outline"}
                      size="sm"
                      className="w-full mt-auto"
                      disabled={updatePlanMutation.isPending || account && account[0]?.current_plan === plan.id}
                      onClick={() => updatePlanMutation.mutate(plan.id)}
                    >
                      {updatePlanMutation.isPending ? "Cambiando..." : account && account[0]?.current_plan === plan.id ? "Plan Actual" : "Cambiar"}
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