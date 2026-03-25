import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Sparkles, Loader2, TrendingUp, AlertTriangle, CheckCircle2, RefreshCw, ArrowRight } from "lucide-react";

const BUSINESS_TYPES = [
  { value: "food_truck", label: "🚚 Food Truck" },
  { value: "restaurant", label: "🍽️ Restaurante" },
  { value: "catering", label: "🎉 Catering" },
  { value: "cafe", label: "☕ Café / Bakery" },
  { value: "ghost_kitchen", label: "👻 Ghost Kitchen" },
];

// Industry benchmark assumptions by business type
const BENCHMARKS = {
  food_truck:     { food: 0.32, labor: 0.22, overhead: 0.20 },
  restaurant:     { food: 0.30, labor: 0.30, overhead: 0.20 },
  catering:       { food: 0.28, labor: 0.35, overhead: 0.15 },
  cafe:           { food: 0.28, labor: 0.28, overhead: 0.22 },
  ghost_kitchen:  { food: 0.30, labor: 0.20, overhead: 0.25 },
};

// 3 scenarios: conservative, average, optimistic
const SCENARIOS = [
  { key: "conservative", label: "Conservador", emoji: "🔴", foodAdj: 0.05, laborAdj: 0.05, overheadAdj: 0.05, desc: "Peor caso — costos más altos, ventas más bajas" },
  { key: "average",      label: "Promedio",    emoji: "🟡", foodAdj: 0,    laborAdj: 0,    overheadAdj: 0,    desc: "Estimación realista del sector" },
  { key: "optimistic",   label: "Optimista",   emoji: "🟢", foodAdj:-0.05, laborAdj:-0.05, overheadAdj:-0.05, desc: "Todo sale bien — operación eficiente" },
];

function NumInput({ label, value, onChange, prefix = "$", suffix, hint, min = 0 }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative flex items-center">
        {prefix && <span className="absolute left-2.5 text-xs text-muted-foreground pointer-events-none">{prefix}</span>}
        <input
          type="number" min={min} step="0.5"
          className="w-full h-9 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          style={{ paddingLeft: prefix ? "1.5rem" : "0.75rem", paddingRight: suffix ? "2.5rem" : "0.5rem" }}
          value={value === 0 ? "" : value}
          placeholder="0"
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
        />
        {suffix && <span className="absolute right-2.5 text-xs text-muted-foreground pointer-events-none">{suffix}</span>}
      </div>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ScenarioCard({ scenario, bench, price, daysOpen, salesPerDay, selected, onSelect }) {
  const food     = bench.food     + scenario.foodAdj;
  const labor    = bench.labor    + scenario.laborAdj;
  const overhead = bench.overhead + scenario.overheadAdj;
  const totalCostPct = food + labor + overhead;

  const foodCost     = price * food;
  const laborCost    = price * labor;
  const overheadCost = price * overhead;
  const totalCost    = price * totalCostPct;
  const unitProfit   = price - totalCost;
  const margin       = price > 0 ? (unitProfit / price) * 100 : 0;

  const monthlySales  = salesPerDay * daysOpen;
  const monthlyRev    = monthlySales * price;
  const monthlyProfit = monthlySales * unitProfit;

  // Break-even in units (monthly)
  const monthlyFixed = monthlyRev * (overhead);
  const breakEvenUnits = unitProfit > 0 ? Math.ceil(monthlyFixed / unitProfit) : 0;

  const isHealthy = margin >= 20;
  const isRisk    = margin < 10;

  return (
    <div
      onClick={onSelect}
      className={`relative rounded-2xl border-2 cursor-pointer transition-all p-4 space-y-3 ${
        selected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border hover:border-primary/40 bg-card"
      }`}
    >
      {selected && (
        <span className="absolute top-3 right-3 text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full">Seleccionado</span>
      )}
      <div>
        <p className="text-base font-bold">{scenario.emoji} {scenario.label}</p>
        <p className="text-xs text-muted-foreground">{scenario.desc}</p>
      </div>

      {/* Unit economics */}
      <div className="space-y-1.5 text-xs">
        {[
          { label: "Ingredientes", value: foodCost, pct: food * 100, color: "text-orange-600" },
          { label: "Mano de obra", value: laborCost, pct: labor * 100, color: "text-blue-600" },
          { label: "Overhead", value: overheadCost, pct: overhead * 100, color: "text-purple-600" },
        ].map(r => (
          <div key={r.label} className="flex justify-between items-center">
            <span className="text-muted-foreground">{r.label}</span>
            <span className={`font-semibold ${r.color}`}>${r.value.toFixed(2)} <span className="text-muted-foreground font-normal">({r.pct.toFixed(0)}%)</span></span>
          </div>
        ))}
        <div className="border-t pt-1.5 flex justify-between font-bold">
          <span>Costo total</span>
          <span className="text-foreground">${totalCost.toFixed(2)} ({(totalCostPct * 100).toFixed(0)}%)</span>
        </div>
        <div className="flex justify-between font-bold text-sm">
          <span>Utilidad por platillo</span>
          <span className={isRisk ? "text-red-500" : isHealthy ? "text-emerald-600" : "text-amber-600"}>
            ${unitProfit.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Margin pill */}
      <div className={`text-center py-2 rounded-xl font-bold text-sm ${
        isRisk ? "bg-red-50 text-red-600" : isHealthy ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
      }`}>
        Margen: {margin.toFixed(1)}%
        {isRisk && " 🚨 Riesgo"}
        {!isRisk && isHealthy && " ✅ Saludable"}
        {!isRisk && !isHealthy && " ⚠️ Ajustable"}
      </div>

      {/* Monthly summary */}
      {price > 0 && salesPerDay > 0 && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <p className="text-muted-foreground">Ingresos/mes</p>
            <p className="font-bold">${monthlyRev.toLocaleString()}</p>
          </div>
          <div className={`rounded-lg p-2 text-center ${monthlyProfit >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
            <p className="text-muted-foreground">Utilidad/mes</p>
            <p className={`font-bold ${monthlyProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
              ${monthlyProfit.toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StartupMode() {
  const [businessType, setBusinessType] = useState("restaurant");
  const [price, setPrice] = useState(0);
  const [salesPerDay, setSalesPerDay] = useState(0);
  const [daysOpen, setDaysOpen] = useState(26);
  const [selectedScenario, setSelectedScenario] = useState("average");
  const [aiTip, setAiTip] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [showAdvancedHint, setShowAdvancedHint] = useState(false);

  const bench = BENCHMARKS[businessType];

  // Target costing breakdown (for the selected scenario)
  const selScenario = SCENARIOS.find(s => s.key === selectedScenario);
  const food     = bench.food     + selScenario.foodAdj;
  const labor    = bench.labor    + selScenario.laborAdj;
  const overhead = bench.overhead + selScenario.overheadAdj;

  const targetFoodBudget = price * food;
  const unitProfit       = price * (1 - food - labor - overhead);
  const monthlySales     = salesPerDay * daysOpen;
  const monthlyRev       = monthlySales * price;
  const monthlyProfit    = monthlySales * unitProfit;
  const margin           = price > 0 ? (unitProfit / price) * 100 : 0;

  // Break-even (units per month)
  const monthlyOverhead  = monthlyRev * overhead;
  const breakEvenUnits   = unitProfit > 0 ? Math.ceil(monthlyOverhead / unitProfit) : 0;
  const breakEvenDays    = daysOpen > 0 ? Math.ceil(breakEvenUnits / daysOpen) : 0;

  async function getAITip() {
    if (!price) return;
    setLoadingAI(true); setAiTip("");
    const bt = BUSINESS_TYPES.find(b => b.value === businessType)?.label || businessType;
    const prompt = `Soy dueño de un ${bt}, acabo de empezar. Precio de venta: $${price}. Ventas estimadas/día: ${salesPerDay}. Margen estimado: ${margin.toFixed(1)}%. Utilidad mensual estimada: $${monthlyProfit.toFixed(0)}.

Necesito 3 consejos MUY concretos y prácticos en español para empezar bien mi negocio. Máximo 120 palabras. Habla como mentor de restauranteros, no como contador. Sé directo y motivador.`;
    const result = await base44.integrations.Core.InvokeLLM({ prompt });
    setAiTip(result);
    setLoadingAI(false);
  }

  const hasData = price > 0;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-foreground flex items-center gap-2">
              🟢 Modo: Estoy empezando
              <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Sin datos exactos</Badge>
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Empieza con el <strong>precio de mercado</strong>, no con tus costos. El sistema estima todo lo demás usando benchmarks del sector.
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground bg-white/60 rounded-lg px-3 py-2">
          <span className="text-amber-500 font-semibold">💡</span>
          <span>Estos son tus <strong>mejores estimados para empezar</strong>, no números exactos. Iterar es parte del proceso.</span>
        </div>
      </div>

      {/* Step 1: Business type + price */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Paso 1 — Precio de mercado</CardTitle>
            <p className="text-xs text-muted-foreground">¿Cuánto pagan por un platillo similar en tu zona?</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Business type */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Tipo de negocio</label>
              <div className="flex flex-wrap gap-2">
                {BUSINESS_TYPES.map(bt => (
                  <button
                    key={bt.value}
                    onClick={() => setBusinessType(bt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      businessType === bt.value
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-muted border-transparent hover:border-primary/30"
                    }`}
                  >
                    {bt.label}
                  </button>
                ))}
              </div>
            </div>

            <NumInput
              label="Precio promedio de venta por platillo ($)"
              value={price}
              onChange={setPrice}
              hint="Busca cuánto cobran negocios similares en tu área"
            />

            {/* Target costing result */}
            {price > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <p className="text-xs font-bold text-amber-700">🎯 Tu presupuesto por platillo (Target Costing)</p>
                <div className="space-y-1 text-xs">
                  {[
                    { label: `Ingredientes (${(food*100).toFixed(0)}%)`, val: price * food, color: "text-orange-600" },
                    { label: `Mano de obra (${(labor*100).toFixed(0)}%)`, val: price * labor, color: "text-blue-600" },
                    { label: `Overhead (${(overhead*100).toFixed(0)}%)`, val: price * overhead, color: "text-purple-600" },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between">
                      <span className="text-muted-foreground">{r.label}</span>
                      <span className={`font-bold ${r.color}`}>${r.val.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t border-amber-200 pt-1 flex justify-between font-bold text-amber-800">
                    <span>Utilidad estimada</span>
                    <span>${unitProfit.toFixed(2)} ({margin.toFixed(1)}%)</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Paso 2 — Operación estimada</CardTitle>
            <p className="text-xs text-muted-foreground">¿Cuánto planeas vender?</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <NumInput
              label="Platillos vendidos por día"
              value={salesPerDay}
              onChange={setSalesPerDay}
              prefix=""
              hint="Estimado conservador para empezar"
            />
            <NumInput
              label="Días abierto por mes"
              value={daysOpen}
              onChange={setDaysOpen}
              prefix=""
              hint="Promedio: 26 días (6 días/semana)"
              min={1}
            />

            {/* Monthly summary */}
            {price > 0 && salesPerDay > 0 && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-3 bg-muted/50 rounded-xl text-center">
                  <p className="text-[10px] text-muted-foreground">Ingresos/mes</p>
                  <p className="text-lg font-bold text-foreground">${monthlyRev.toLocaleString()}</p>
                </div>
                <div className={`p-3 rounded-xl text-center ${monthlyProfit >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
                  <p className="text-[10px] text-muted-foreground">Utilidad/mes est.</p>
                  <p className={`text-lg font-bold ${monthlyProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    ${Math.round(monthlyProfit).toLocaleString()}
                  </p>
                </div>
                {breakEvenUnits > 0 && (
                  <div className="col-span-2 p-2 bg-blue-50 rounded-xl text-center">
                    <p className="text-[10px] text-blue-600">Para cubrir overhead necesitas vender</p>
                    <p className="text-sm font-bold text-blue-700">
                      {breakEvenUnits} platillos/mes · {breakEvenDays} por día
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Step 3: 3 Scenarios */}
      <div>
        <div className="mb-3">
          <h3 className="font-bold text-sm">Paso 3 — Elige tu escenario</h3>
          <p className="text-xs text-muted-foreground">Basado en benchmarks de {BUSINESS_TYPES.find(b => b.value === businessType)?.label}. Selecciona el que más refleja tu situación.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {SCENARIOS.map(sc => (
            <ScenarioCard
              key={sc.key}
              scenario={sc}
              bench={bench}
              price={price}
              daysOpen={daysOpen}
              salesPerDay={salesPerDay}
              selected={selectedScenario === sc.key}
              onSelect={() => setSelectedScenario(sc.key)}
            />
          ))}
        </div>
      </div>

      {/* Step 4: Iteration reminder */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <RefreshCw className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-blue-700">Paso 4 — Itera con datos reales (2–4 semanas)</p>
              <p className="text-xs text-muted-foreground mt-1">
                Una vez operando, usa el módulo <strong>Break-Even avanzado</strong> con tus costos reales de ingredientes, recetas y payroll. El sistema conectará automáticamente todo.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {["✅ Registra ventas diarias en el POS", "✅ Carga tus recetas con ingredientes reales", "✅ Ingresa tus gastos operativos", "✅ El sistema calculará food cost real"].map(item => (
                  <span key={item} className="text-[11px] bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">{item}</span>
                ))}
              </div>
              <button
                onClick={() => setShowAdvancedHint(!showAdvancedHint)}
                className="mt-3 text-xs text-primary font-semibold flex items-center gap-1 hover:underline"
              >
                Ver cómo pasar al modo avanzado <ArrowRight className="w-3 h-3" />
              </button>
              {showAdvancedHint && (
                <div className="mt-3 p-3 bg-white rounded-xl border text-xs space-y-1 text-muted-foreground">
                  <p>1. Ve a <strong>Ingredientes</strong> → agrega tus insumos con precios reales</p>
                  <p>2. Ve a <strong>Recetas</strong> → crea tus platillos con sus ingredientes</p>
                  <p>3. Ve a <strong>Configuración → Gastos Operativos</strong> → ingresa renta, payroll, utilities</p>
                  <p>4. Regresa a <strong>Break-Even</strong> → usa "Auto-importar gastos" para llenar todo automáticamente</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Mentor */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">Mentor IA — Consejos para tu negocio</CardTitle>
            </div>
            <Button size="sm" variant="outline" onClick={getAITip} disabled={loadingAI || !price}>
              {loadingAI ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
              Pedir consejo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {aiTip ? (
            <div className="p-4 bg-background rounded-lg border text-sm leading-relaxed whitespace-pre-wrap">{aiTip}</div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Ingresa tu precio de venta y presiona "Pedir consejo" para recibir 3 recomendaciones concretas de un mentor virtual especializado en restaurantes.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}