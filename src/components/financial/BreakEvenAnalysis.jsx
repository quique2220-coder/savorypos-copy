import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  TrendingUp, Target, AlertTriangle, CheckCircle2, Sparkles,
  Loader2, ChevronDown, ChevronUp, Users, DollarSign, Zap, Info
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────
function buildChartData(sales, cogs, fixedCosts) {
  if (!sales || !cogs || !fixedCosts) return [];
  const variableRatio = cogs / sales;
  const monthlyFixed = fixedCosts / 12;
  const maxMonthly = sales / 12 * 1.2;
  const steps = 12;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const s = (maxMonthly / steps) * i;
    return {
      revenue: Math.round(s),
      totalCost: Math.round(monthlyFixed + s * variableRatio),
      fixedCost: Math.round(monthlyFixed),
    };
  });
}

function MarginBar({ sales, breakEven, year }) {
  if (!sales) return null;
  const safetyPct = Math.min(Math.max(((sales - breakEven) / sales) * 100, 0), 100);
  const bePct = Math.min((breakEven / sales) * 100, 100);
  const isHealthy = safetyPct > 20;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="font-medium">{year}</span>
        <span className={isHealthy ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>
          Margen de seguridad: {safetyPct.toFixed(1)}%
        </span>
      </div>
      <div className="h-4 w-full bg-muted rounded-full overflow-hidden flex">
        <div className="h-full bg-red-400/70 rounded-l-full" style={{ width: `${bePct}%` }} />
        <div className="h-full bg-emerald-400" style={{ width: `${safetyPct}%` }} />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-red-500">Costos fijos</span>
        <span className="text-muted-foreground">▲ BE ${(breakEven / 1000).toFixed(0)}K</span>
        <span className="text-emerald-600">Ganancia</span>
      </div>
    </div>
  );
}

function NumberInput({ label, value, onChange, prefix = "$", hint }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground font-medium">{label}</label>
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>
        <input
          type="number" min="0" step="1"
          className="w-full h-9 pl-6 pr-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          value={value === 0 ? "" : value}
          placeholder="0"
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
        />
      </div>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ── Alert banner ──────────────────────────────────────────────────────
function AlertBanner({ type, message }) {
  const styles = {
    danger: "bg-red-50 border-red-200 text-red-700",
    warning: "bg-amber-50 border-amber-200 text-amber-700",
    success: "bg-emerald-50 border-emerald-200 text-emerald-700",
    info: "bg-blue-50 border-blue-200 text-blue-700",
  };
  const icons = {
    danger: "🚨", warning: "⚠️", success: "✅", info: "💡"
  };
  return (
    <div className={`flex items-start gap-2 px-3 py-2.5 rounded-lg border text-xs ${styles[type]}`}>
      <span>{icons[type]}</span>
      <span>{message}</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────
const DEFAULT_YR = { sales: 850000, cogs: 150000, avgTicket: 18.5 };
const DEFAULT_FIXED = {
  rent: 12000, payrollCooks: 25000, payrollFront: 10000, payrollManager: 35000,
  insurance: 1500, electricity: 5000, water: 500, gas: 500, internet: 1200, other: 1000,
};

export default function BreakEvenAnalysis() {
  const [selectedYear, setSelectedYear] = useState(0);
  const [years, setYears] = useState([
    { label: "Actual", ...DEFAULT_YR },
    { label: "Meta Año 1", sales: 0, cogs: 0, avgTicket: 18.5 },
    { label: "Meta Año 2", sales: 0, cogs: 0, avgTicket: 18.5 },
  ]);
  const [fixed, setFixed] = useState(DEFAULT_FIXED);
  const [showFixedBreakdown, setShowFixedBreakdown] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  // Pull OperatingExpenses from DB to auto-fill
  const { data: opex = [] } = useQuery({
    queryKey: ["opex-breakeven"],
    queryFn: () => base44.entities.OperatingExpense.list(),
  });

  function importFromOpex() {
    const sum = (cats) => opex.filter(e => cats.includes(e.category)).reduce((s, e) => s + (e.amount * 12), 0);
    setFixed({
      rent: sum(["commissary", "rent"]),
      payrollCooks: 0,
      payrollFront: 0,
      payrollManager: 0,
      insurance: sum(["insurance"]),
      electricity: sum(["electricity"]),
      water: sum(["water"]),
      gas: sum(["gas"]),
      internet: sum(["internet"]),
      other: sum(["admin", "cleaning", "packaging", "card_fees", "maintenance", "waste", "other"]),
    });
    setShowImport(false);
  }

  const totalFixedAnnual = Object.values(fixed).reduce((s, v) => s + v, 0);
  const totalLaborAnnual = fixed.payrollCooks + fixed.payrollFront + fixed.payrollManager;
  const yr = years[selectedYear];

  function updateYr(field, value) {
    setYears(prev => prev.map((y, i) => i === selectedYear ? { ...y, [field]: value } : y));
  }

  // Computed values
  const computed = useMemo(() => {
    return years.map(y => {
      if (!y.sales || !y.cogs || !totalFixedAnnual) return { ...y, breakEven: 0, netIncome: 0, contributionMargin: 0, safetyMargin: 0 };
      const variableRatio = y.cogs / y.sales;
      const cm = 1 - variableRatio;
      const be = cm > 0 ? totalFixedAnnual / cm : 0;
      const ni = y.sales - y.cogs - totalFixedAnnual;
      const sm = ((y.sales - be) / y.sales) * 100;
      return { ...y, breakEven: Math.round(be), netIncome: Math.round(ni), contributionMargin: cm, safetyMargin: sm };
    });
  }, [years, totalFixedAnnual]);

  const c = computed[selectedYear];
  const monthlyBreakEven = c.breakEven / 12;
  const dailyBE = yr.avgTicket > 0 ? Math.ceil((monthlyBreakEven / 30) / yr.avgTicket) : 0;

  // Alerts
  const alerts = useMemo(() => {
    const list = [];
    if (!c.sales) return list;
    const foodCostPct = (c.cogs / c.sales) * 100;
    const laborPct = (totalLaborAnnual / c.sales) * 100;
    const primeCost = foodCostPct + laborPct;
    if (foodCostPct > 35) list.push({ type: "danger", msg: `Food cost del ${foodCostPct.toFixed(1)}% — lo ideal para restaurantes es < 30%. Revisa precios o proveedores.` });
    if (laborPct > 35) list.push({ type: "warning", msg: `Labor cost del ${laborPct.toFixed(1)}% — demasiado alto. El ideal es < 30% de ventas.` });
    if (primeCost > 65) list.push({ type: "danger", msg: `Prime cost (food + labor) del ${primeCost.toFixed(1)}% — peligro. Debe ser < 65% para ser rentable.` });
    if (c.safetyMargin < 10) list.push({ type: "danger", msg: `Margen de seguridad de solo ${c.safetyMargin.toFixed(1)}% — cualquier caída en ventas genera pérdidas.` });
    else if (c.safetyMargin < 20) list.push({ type: "warning", msg: `Margen de seguridad del ${c.safetyMargin.toFixed(1)}% — aceptable pero frágil. Apunta a > 20%.` });
    if (c.netIncome < 0) list.push({ type: "danger", msg: `Pérdida neta de $${Math.abs(c.netIncome).toLocaleString()} — necesitas vender $${Math.abs(c.netIncome / (c.contributionMargin || 1)).toFixed(0).toLocaleString()} más para breakeven.` });
    if (totalFixedAnnual === 0) list.push({ type: "info", msg: "Ingresa tus costos fijos para calcular el break-even real. Usa el desglose de abajo." });
    if (list.length === 0 && c.safetyMargin >= 20) list.push({ type: "success", msg: `Negocio saludable. Margen de seguridad del ${c.safetyMargin.toFixed(1)}% — puedes aguantar una caída de ventas sin perder dinero.` });
    return list;
  }, [c, totalLaborAnnual]);

  const chartData = buildChartData(c.sales, c.cogs, totalFixedAnnual);

  async function handleAI() {
    if (!c.sales) return;
    setLoadingAI(true); setAiAnalysis("");
    const foodCostPct = c.sales > 0 ? ((c.cogs / c.sales) * 100).toFixed(1) : 0;
    const laborPct = c.sales > 0 ? ((totalLaborAnnual / c.sales) * 100).toFixed(1) : 0;
    const prompt = `Eres un consultor financiero de restaurantes. Analiza estos datos en español simple, máximo 150 palabras. Habla como si fuera al dueño directo:

${c.label}: Ventas=$${(c.sales/1000).toFixed(0)}K | COGS=$${(c.cogs/1000).toFixed(0)}K (${foodCostPct}%) | Labor=$${(totalLaborAnnual/1000).toFixed(0)}K (${laborPct}%) | Costos fijos=$${(totalFixedAnnual/1000).toFixed(0)}K | Break-Even=$${(c.breakEven/1000).toFixed(0)}K | Utilidad=$${(c.netIncome/1000).toFixed(0)}K | Margen seguridad=${c.safetyMargin.toFixed(1)}% | Clientes/día necesarios=${dailyBE}

Dame: 1) Estado del negocio 2) 2 riesgos específicos 3) 1 acción concreta para mejorar.`;
    const result = await base44.integrations.Core.InvokeLLM({ prompt });
    setAiAnalysis(result);
    setLoadingAI(false);
  }

  const foodCostPct = c.sales > 0 ? (c.cogs / c.sales * 100) : 0;
  const laborPct = c.sales > 0 ? (totalLaborAnnual / c.sales * 100) : 0;
  const primeCost = foodCostPct + laborPct;

  return (
    <div className="space-y-5">

      {/* Year selector */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          {computed.map((y, i) => (
            <button key={i} onClick={() => { setSelectedYear(i); setAiAnalysis(""); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedYear === i ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>
              {y.label}
            </button>
          ))}
        </div>
        {opex.length > 0 && (
          <button onClick={() => setShowImport(true)}
            className="text-xs px-3 py-1.5 rounded-lg border border-input bg-background hover:bg-muted transition-colors flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-primary" /> Auto-importar gastos
          </button>
        )}
      </div>

      {/* Import confirm */}
      {showImport && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-3">
            <p className="text-sm font-semibold mb-1">Importar desde Gastos Operativos</p>
            <p className="text-xs text-muted-foreground mb-3">
              Se encontraron {opex.length} gastos. Se importarán como costos fijos anuales (mensual × 12). Labor deberás ingresar manualmente.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={importFromOpex}>Importar</Button>
              <Button size="sm" variant="outline" onClick={() => setShowImport(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── INPUTS ── */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Ventas + COGS */}
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-700">📊 Ventas & COGS — {c.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <NumberInput label="Ventas anuales ($)" value={yr.sales} onChange={v => updateYr("sales", v)} />
            <NumberInput label="COGS ingredientes anuales ($)" value={yr.cogs} onChange={v => updateYr("cogs", v)} hint="Solo ingredientes. Labor va abajo en costos fijos." />
            <NumberInput label="Ticket promedio ($)" value={yr.avgTicket} onChange={v => updateYr("avgTicket", v)} prefix="$" hint="Precio promedio por cliente" />
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2 bg-background rounded-lg border text-center">
                <p className="text-[10px] text-muted-foreground">Break-Even</p>
                <p className="font-bold text-primary text-sm">${(c.breakEven || 0).toLocaleString()}</p>
              </div>
              <div className="p-2 bg-background rounded-lg border text-center">
                <p className="text-[10px] text-muted-foreground">Utilidad Neta</p>
                <p className={`font-bold text-sm ${(c.netIncome || 0) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  ${(c.netIncome || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fixed Costs Breakdown */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-blue-700">🏢 Costos Fijos Anuales — ${totalFixedAnnual.toLocaleString()}</CardTitle>
              <button onClick={() => setShowFixedBreakdown(!showFixedBreakdown)} className="text-muted-foreground">
                {showFixedBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">Ingresa montos anuales (o mensual × 12)</p>
          </CardHeader>
          {showFixedBreakdown && (
            <CardContent>
              <div className="space-y-3">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" /> Operación</p>
                <div className="grid grid-cols-2 gap-2">
                  <NumberInput label="Renta / Comisaría" value={fixed.rent} onChange={v => setFixed(p => ({ ...p, rent: v }))} hint="Anual" />
                  <NumberInput label="Seguros" value={fixed.insurance} onChange={v => setFixed(p => ({ ...p, insurance: v }))} hint="Anual" />
                  <NumberInput label="Electricidad" value={fixed.electricity} onChange={v => setFixed(p => ({ ...p, electricity: v }))} />
                  <NumberInput label="Agua" value={fixed.water} onChange={v => setFixed(p => ({ ...p, water: v }))} />
                  <NumberInput label="Gas" value={fixed.gas} onChange={v => setFixed(p => ({ ...p, gas: v }))} />
                  <NumberInput label="Internet / Otros" value={fixed.internet} onChange={v => setFixed(p => ({ ...p, internet: v }))} />
                  <NumberInput label="Otros gastos" value={fixed.other} onChange={v => setFixed(p => ({ ...p, other: v }))} />
                </div>
                <p className="text-xs font-semibold text-foreground flex items-center gap-1 pt-1"><Users className="w-3 h-3" /> Payroll anual (labor indirecta)</p>
                <div className="grid grid-cols-2 gap-2">
                  <NumberInput label="Cocineros" value={fixed.payrollCooks} onChange={v => setFixed(p => ({ ...p, payrollCooks: v }))} />
                  <NumberInput label="Cajeros / Servicio" value={fixed.payrollFront} onChange={v => setFixed(p => ({ ...p, payrollFront: v }))} />
                  <NumberInput label="Manager / Admin" value={fixed.payrollManager} onChange={v => setFixed(p => ({ ...p, payrollManager: v }))} />
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* ── ALERTS ── */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => <AlertBanner key={i} type={a.type} message={a.msg} />)}
        </div>
      )}

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Break-Even Mensual", value: `$${(monthlyBreakEven / 1000).toFixed(1)}K`, sub: "ventas mínimas/mes", icon: Target, color: "text-amber-600" },
          { label: "Clientes/día mínimos", value: dailyBE || "—", sub: `a $${yr.avgTicket} ticket`, icon: TrendingUp, color: "text-blue-600" },
          { label: "Food Cost %", value: `${foodCostPct.toFixed(1)}%`, sub: foodCostPct > 35 ? "⚠️ Alto (ideal < 30%)" : "✅ Aceptable", icon: CheckCircle2, color: foodCostPct > 35 ? "text-red-500" : "text-emerald-600" },
          { label: "Prime Cost %", value: `${primeCost.toFixed(1)}%`, sub: primeCost > 65 ? "🚨 Peligro > 65%" : primeCost > 55 ? "⚠️ Riesgo" : "✅ Saludable", icon: primeCost > 65 ? AlertTriangle : CheckCircle2, color: primeCost > 65 ? "text-red-500" : primeCost > 55 ? "text-amber-500" : "text-emerald-600" },
        ].map((k, i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start gap-2">
                <k.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${k.color}`} />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground leading-tight">{k.label}</p>
                  <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                  <p className="text-xs text-muted-foreground">{k.sub}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Charts ── */}
      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Gráfica Break-Even — {c.label}</CardTitle>
            <p className="text-xs text-muted-foreground">Donde Ingresos cruza Costos = equilibrio</p>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(160,60%,45%)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(160,60%,45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,10%,90%)" />
                  <XAxis dataKey="revenue" tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="revenue" name="Ingresos" stroke="hsl(160,60%,45%)" fill="url(#gradRev)" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="totalCost" name="Costo Total" stroke="hsl(0,84%,60%)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="fixedCost" name="Costo Fijo" stroke="hsl(220,70%,50%)" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                Ingresa ventas, COGS y costos fijos para ver la gráfica
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Margen de Seguridad — 3 Escenarios</CardTitle>
            <p className="text-xs text-muted-foreground">Rojo = riesgo · Verde = ganancia · ▲ = equilibrio</p>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">
            {computed.map((y, i) => (
              <MarginBar key={i} sales={y.sales || 1} breakEven={y.breakEven || 0} year={y.label} />
            ))}
            <div className="p-3 bg-muted/40 rounded-lg text-xs">
              <p className="font-semibold">¿Cómo leer esto?</p>
              <p className="text-muted-foreground mt-0.5">Margen de seguridad <strong>&gt;20%</strong> = negocio puede aguantar una caída en ventas. &lt;10% = zona de peligro.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost breakdown visual */}
      {totalFixedAnnual > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Desglose de Costos Totales — {c.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
              {[
                { label: "COGS (Ingredientes)", value: c.cogs, pct: c.sales > 0 ? (c.cogs / c.sales * 100).toFixed(1) : 0, color: "bg-orange-100 text-orange-700" },
                { label: "Labor (Payroll)", value: totalLaborAnnual, pct: c.sales > 0 ? (totalLaborAnnual / c.sales * 100).toFixed(1) : 0, color: "bg-blue-100 text-blue-700" },
                { label: "Otros Costos Fijos", value: totalFixedAnnual - totalLaborAnnual, pct: c.sales > 0 ? ((totalFixedAnnual - totalLaborAnnual) / c.sales * 100).toFixed(1) : 0, color: "bg-purple-100 text-purple-700" },
                { label: "Utilidad Neta", value: c.netIncome, pct: c.sales > 0 ? (c.netIncome / c.sales * 100).toFixed(1) : 0, color: c.netIncome >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700" },
              ].map((item, i) => (
                <div key={i} className={`p-3 rounded-lg ${item.color} text-center`}>
                  <p className="text-xs opacity-80 mb-1">{item.label}</p>
                  <p className="text-lg font-bold">${Math.abs(item.value || 0).toLocaleString()}</p>
                  <p className="text-xs font-semibold">{item.pct}% de ventas</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Section */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">AI — Análisis del Negocio</CardTitle>
            </div>
            <Button size="sm" variant="outline" onClick={handleAI} disabled={loadingAI || !c.sales}>
              {loadingAI ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
              Analizar con IA
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {aiAnalysis ? (
            <div className="p-4 bg-background rounded-lg border text-sm leading-relaxed whitespace-pre-wrap">{aiAnalysis}</div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Ingresa tus números y presiona "Analizar con IA" para obtener un diagnóstico personalizado con recomendaciones concretas.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}