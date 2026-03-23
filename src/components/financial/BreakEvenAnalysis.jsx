import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from "recharts";
import { TrendingUp, Target, AlertTriangle, CheckCircle2, Sparkles, Volume2, Loader2 } from "lucide-react";

// ── Financial assumptions (editable defaults) ─────────────────
const DEFAULT_YEARLY = [
  { year: "Actual", sales: 0, cogs: 0, fixedCosts: 0, netIncome: 0, breakEven: 0 },
  { year: "Meta Año 1", sales: 0, cogs: 0, fixedCosts: 0, netIncome: 0, breakEven: 0 },
  { year: "Meta Año 2", sales: 0, cogs: 0, fixedCosts: 0, netIncome: 0, breakEven: 0 },
];

// Generates the break-even chart data (monthly ramp)
function buildChartData(yearData) {
  const variableRatio = yearData.cogs / yearData.sales;
  const monthlyFixed = yearData.fixedCosts / 12;
  const points = [];
  for (let s = 0; s <= yearData.sales / 12 * 1.1; s += yearData.sales / 12 / 10) {
    const totalCost = monthlyFixed + s * variableRatio;
    points.push({
      revenue: Math.round(s),
      totalCost: Math.round(totalCost),
      fixedCost: Math.round(monthlyFixed),
    });
  }
  return points;
}

function MarginBar({ sales, breakEven, year }) {
  const safetyPct = Math.min(((sales - breakEven) / sales) * 100, 100);
  const bePct = (breakEven / sales) * 100;
  const isHealthy = safetyPct > 20;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{year}</span>
        <span className={isHealthy ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>
          Margen de seguridad: {safetyPct.toFixed(1)}%
        </span>
      </div>
      <div className="h-4 w-full bg-muted rounded-full overflow-hidden relative flex">
        <div className="h-full bg-red-400/70 rounded-l-full" style={{ width: `${bePct}%` }} />
        <div className="h-full bg-emerald-400" style={{ width: `${safetyPct}%` }} />
        <div
          className="absolute top-0 h-full w-0.5 bg-white"
          style={{ left: `${bePct}%` }}
          title="Break-Even"
        />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-red-500">Costos fijos</span>
        <span className="text-muted-foreground">▲ Break-Even ${(breakEven / 1000).toFixed(0)}K</span>
        <span className="text-emerald-600">Ganancia</span>
      </div>
    </div>
  );
}

export default function BreakEvenAnalysis() {
  const [selectedYear, setSelectedYear] = useState(0);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [elevenLabsKey, setElevenLabsKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);

  const yr = YEARLY[selectedYear];
  const monthlySales = yr.sales / 12;
  const monthlyBreakEven = yr.breakEven / 12;
  const variableRatio = yr.cogs / yr.sales;
  const contributionMargin = 1 - variableRatio;
  const safetyMargin = ((yr.sales - yr.breakEven) / yr.sales * 100).toFixed(1);
  const avgTicket = 18.5;
  const dailyBreakEvenCustomers = Math.ceil((monthlyBreakEven / 30) / avgTicket);
  const chartData = buildChartData(yr);

  async function handleAIAnalysis() {
    setLoadingAI(true);
    setAiAnalysis("");
    const prompt = `Eres un analista financiero de restaurantes. Analiza este punto de equilibrio de forma clara y amigable en español:
    
    ${yr.year}: Ventas = $${(yr.sales/1000).toFixed(0)}K | Break-Even = $${(yr.breakEven/1000).toFixed(0)}K | 
    Costos Fijos = $${(yr.fixedCosts/1000).toFixed(0)}K | Margen Contribución = ${(contributionMargin*100).toFixed(1)}% | 
    Margen de Seguridad = ${safetyMargin}% | Clientes/día necesarios = ${dailyBreakEvenCustomers}
    
    Dame: 1) Qué significa este resultado en términos simples 2) Si es saludable o hay riesgo 3) 2 recomendaciones concretas.
    Sé breve, máximo 150 palabras, usa lenguaje de dueño de restaurante, no de contador.`;

    const result = await base44.integrations.Core.InvokeLLM({ prompt });
    setAiAnalysis(result);
    setLoadingAI(false);
  }

  async function handleElevenLabs() {
    if (!aiAnalysis) await handleAIAnalysis();
    if (!elevenLabsKey) { setShowKeyInput(true); return; }
    setLoadingAudio(true);
    try {
      const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL", {
        method: "POST",
        headers: { "xi-api-key": elevenLabsKey, "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiAnalysis || `El punto de equilibrio del ${yr.year} es de $${(yr.breakEven/1000).toFixed(0)} mil dólares, con un margen de seguridad de ${safetyMargin}%.`, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
      });
      const blob = await response.blob();
      setAudioUrl(URL.createObjectURL(blob));
    } catch (e) { console.error(e); }
    setLoadingAudio(false);
  }

  return (
    <div className="space-y-6">
      {/* Year selector */}
      <div className="flex gap-2">
        {YEARLY.map((y, i) => (
          <button key={i} onClick={() => { setSelectedYear(i); setAiAnalysis(""); setAudioUrl(null); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedYear === i ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>
            {y.year}
          </button>
        ))}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Break-Even Mensual", value: `$${(monthlyBreakEven/1000).toFixed(1)}K`, sub: "ventas mínimas/mes", icon: Target, color: "text-amber-600" },
          { label: "Clientes/día mínimos", value: dailyBreakEvenCustomers, sub: `a $${avgTicket} ticket promedio`, icon: TrendingUp, color: "text-blue-600" },
          { label: "Margen Contribución", value: `${(contributionMargin*100).toFixed(1)}%`, sub: "de cada $1 vendido", icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Margen de Seguridad", value: `${safetyMargin}%`, sub: "cuánto puedes caer", icon: parseFloat(safetyMargin) > 20 ? CheckCircle2 : AlertTriangle, color: parseFloat(safetyMargin) > 20 ? "text-emerald-600" : "text-amber-500" },
        ].map((k, i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start gap-2">
                <k.icon className={`w-4 h-4 mt-0.5 ${k.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground leading-tight">{k.label}</p>
                  <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                  <p className="text-xs text-muted-foreground">{k.sub}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart + Explanation side by side */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Gráfica Break-Even — {yr.year}</CardTitle>
            <p className="text-xs text-muted-foreground">Donde la línea de ingresos cruza los costos totales = punto de equilibrio</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160,60%,45%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(160,60%,45%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0,84%,60%)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(0,84%,60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,10%,90%)" />
                <XAxis dataKey="revenue" tickFormatter={v => `$${(v/1000).toFixed(0)}K`} tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}K`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="revenue" name="Ingresos" stroke="hsl(160,60%,45%)" fill="url(#gradRev)" strokeWidth={2.5} dot={false} />
                <Area type="monotone" dataKey="totalCost" name="Costo Total" stroke="hsl(0,84%,60%)" fill="url(#gradCost)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="fixedCost" name="Costo Fijo" stroke="hsl(220,70%,50%)" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Safety margin visual for all 3 years */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Margen de Seguridad — 3 Años</CardTitle>
            <p className="text-xs text-muted-foreground">Rojo = zona de riesgo · Verde = ganancia real · ▲ = punto de equilibrio</p>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">
            {YEARLY.map((y, i) => (
              <MarginBar key={i} sales={y.sales} breakEven={y.breakEven} year={y.year} />
            ))}
            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
              <p className="font-semibold text-foreground">¿Cómo leer esto?</p>
              <p className="text-muted-foreground">Un margen de seguridad <strong>&gt;20%</strong> significa que las ventas pueden caer ese porcentaje antes de perder dinero. Ideal para un restaurante nuevo.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Simple formula breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">¿Cómo se calcula? — Fórmula paso a paso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-1">1. Costos Fijos Anuales</p>
              <p className="text-xl font-bold text-blue-700">${(yr.fixedCosts/1000).toFixed(0)}K</p>
              <p className="text-xs text-muted-foreground">Renta, sueldos fijos, seguros, servicios</p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-1">2. Margen de Contribución</p>
              <p className="text-xl font-bold text-amber-700">{(contributionMargin*100).toFixed(1)}¢ por $1</p>
              <p className="text-xs text-muted-foreground">De cada dólar vendido, esto queda para pagar fijos</p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-1">3. Break-Even = ① ÷ ②</p>
              <p className="text-xl font-bold text-emerald-700">${(yr.breakEven/1000).toFixed(0)}K</p>
              <p className="text-xs text-muted-foreground">Ventas necesarias para cubrir todo sin ganar ni perder</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI + ElevenLabs Section */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">AI Intelligence — Análisis Personalizado</CardTitle>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={handleAIAnalysis} disabled={loadingAI}>
                {loadingAI ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                Analizar con IA
              </Button>
              <Button size="sm" variant="outline" onClick={handleElevenLabs} disabled={loadingAudio || (!aiAnalysis && loadingAI)}>
                {loadingAudio ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Volume2 className="w-3 h-3 mr-1" />}
                🔊 Escuchar (ElevenLabs)
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {showKeyInput && (
            <div className="flex gap-2 items-center">
              <input
                className="flex-1 h-8 px-3 text-xs rounded-md border border-input bg-background"
                placeholder="Pega tu ElevenLabs API Key aquí..."
                value={elevenLabsKey}
                onChange={e => setElevenLabsKey(e.target.value)}
              />
              <Button size="sm" onClick={() => { setShowKeyInput(false); handleElevenLabs(); }}>
                Guardar y Escuchar
              </Button>
            </div>
          )}
          {aiAnalysis ? (
            <div className="p-4 bg-background rounded-lg border text-sm leading-relaxed whitespace-pre-wrap">
              {aiAnalysis}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Presiona "Analizar con IA" para obtener una interpretación en lenguaje simple del punto de equilibrio del {yr.year}. Luego puedes escucharla con ElevenLabs.
            </p>
          )}
          {audioUrl && (
            <audio controls src={audioUrl} className="w-full mt-2" />
          )}
          <div className="text-xs text-muted-foreground border-t pt-2">
            💡 <strong>ElevenLabs Setup:</strong> Necesitas una API key de <a href="https://elevenlabs.io" target="_blank" className="underline text-primary">elevenlabs.io</a> (plan gratuito incluye 10K caracteres/mes). Haz click en "Escuchar" y pega tu key.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}