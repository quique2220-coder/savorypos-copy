import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Store, ShoppingBag } from "lucide-react";
import BreakEvenAnalysis from "@/components/financial/BreakEvenAnalysis";
import StartupMode from "@/components/financial/StartupMode";
import LiveDashboard from "@/components/financial/LiveDashboard";

// Data from the Restaurant Financial Model — Real channel targets:
// On-Premises: $1,696K | Takeaway: $1,668K | Doordash: $145K | Ubereats: $29K | Grubhub: $29K (36 months)
const MONTHLY_DATA = [
  { month: "M1",  year: 1, sales: 36200,  cogs: 9625,  netIncome: -13200, customers: 176, onPremises: 16800,  takeaway: 17200,  doordash: 1800,  ubereats: 200, grubhub: 200 },
  { month: "M2",  year: 1, sales: 72800,  cogs: 19455, netIncome: 9200,   customers: 178, onPremises: 33900,  takeaway: 34700,  doordash: 3600,  ubereats: 300, grubhub: 300 },
  { month: "M3",  year: 1, sales: 74300,  cogs: 19857, netIncome: 9900,   customers: 182, onPremises: 34600,  takeaway: 35400,  doordash: 3700,  ubereats: 300, grubhub: 300 },
  { month: "M4",  year: 1, sales: 75900,  cogs: 20247, netIncome: 10700,  customers: 185, onPremises: 35300,  takeaway: 36200,  doordash: 3800,  ubereats: 300, grubhub: 300 },
  { month: "M5",  year: 1, sales: 77400,  cogs: 20625, netIncome: 11500,  customers: 189, onPremises: 36100,  takeaway: 36900,  doordash: 3800,  ubereats: 300, grubhub: 300 },
  { month: "M6",  year: 1, sales: 94500,  cogs: 25191, netIncome: 18800,  customers: 231, onPremises: 44300,  takeaway: 44800,  doordash: 4600,  ubereats: 400, grubhub: 400 },
  { month: "M7",  year: 1, sales: 104600, cogs: 27869, netIncome: 24200,  customers: 256, onPremises: 49200,  takeaway: 49500,  doordash: 5000,  ubereats: 450, grubhub: 450 },
  { month: "M8",  year: 1, sales: 107000, cogs: 28492, netIncome: 25600,  customers: 261, onPremises: 50400,  takeaway: 50800,  doordash: 5000,  ubereats: 450, grubhub: 450 },
  { month: "M9",  year: 1, sales: 84100,  cogs: 22385, netIncome: 13100,  customers: 206, onPremises: 39500,  takeaway: 39700,  doordash: 3800,  ubereats: 550, grubhub: 550 },
  { month: "M10", year: 1, sales: 85300,  cogs: 22700, netIncome: 13800,  customers: 209, onPremises: 40100,  takeaway: 40200,  doordash: 4100,  ubereats: 450, grubhub: 450 },
  { month: "M11", year: 1, sales: 86500,  cogs: 23004, netIncome: 14500,  customers: 211, onPremises: 40700,  takeaway: 40700,  doordash: 4200,  ubereats: 450, grubhub: 450 },
  { month: "M12", year: 1, sales: 122600, cogs: 32620, netIncome: 34400,  customers: 300, onPremises: 58100,  takeaway: 57400,  doordash: 5400,  ubereats: 850, grubhub: 850 },
  { month: "M13", year: 2, sales: 89500,  cogs: 23786, netIncome: 16200,  customers: 219, onPremises: 42000,  takeaway: 42000,  doordash: 4000,  ubereats: 750, grubhub: 750 },
  { month: "M14", year: 2, sales: 90500,  cogs: 24058, netIncome: 16800,  customers: 221, onPremises: 42500,  takeaway: 42500,  doordash: 4100,  ubereats: 700, grubhub: 700 },
  { month: "M15", year: 2, sales: 91500,  cogs: 24322, netIncome: 17400,  customers: 224, onPremises: 43000,  takeaway: 43000,  doordash: 4100,  ubereats: 700, grubhub: 700 },
  { month: "M16", year: 2, sales: 92500,  cogs: 24578, netIncome: 18000,  customers: 226, onPremises: 43500,  takeaway: 43400,  doordash: 4200,  ubereats: 700, grubhub: 700 },
  { month: "M17", year: 2, sales: 93500,  cogs: 24826, netIncome: 18600,  customers: 229, onPremises: 44000,  takeaway: 43900,  doordash: 4200,  ubereats: 700, grubhub: 700 },
  { month: "M18", year: 2, sales: 113300, cogs: 30081, netIncome: 28500,  customers: 277, onPremises: 53500,  takeaway: 53300,  doordash: 4900,  ubereats: 800, grubhub: 800 },
  { month: "M19", year: 2, sales: 124400, cogs: 33031, netIncome: 33900,  customers: 304, onPremises: 58800,  takeaway: 58600,  doordash: 5100,  ubereats: 950, grubhub: 950 },
  { month: "M20", year: 2, sales: 126300, cogs: 33533, netIncome: 35700,  customers: 309, onPremises: 59700,  takeaway: 59700,  doordash: 5200,  ubereats: 950, grubhub: 950 },
  { month: "M21", year: 2, sales: 98600,  cogs: 26172, netIncome: 20500,  customers: 241, onPremises: 46500,  takeaway: 46500,  doordash: 4200,  ubereats: 700, grubhub: 700 },
  { month: "M22", year: 2, sales: 99400,  cogs: 26373, netIncome: 21000,  customers: 243, onPremises: 46900,  takeaway: 46900,  doordash: 4200,  ubereats: 700, grubhub: 700 },
  { month: "M23", year: 2, sales: 100200, cogs: 26567, netIncome: 21400,  customers: 245, onPremises: 47300,  takeaway: 47200,  doordash: 4200,  ubereats: 750, grubhub: 750 },
  { month: "M24", year: 2, sales: 141200, cogs: 37459, netIncome: 44000,  customers: 346, onPremises: 67000,  takeaway: 66800,  doordash: 5600,  ubereats: 900, grubhub: 900 },
  { month: "M25", year: 3, sales: 101800, cogs: 26986, netIncome: 20400,  customers: 249, onPremises: 48100,  takeaway: 47900,  doordash: 4300,  ubereats: 750, grubhub: 750 },
  { month: "M26", year: 3, sales: 102400, cogs: 27162, netIncome: 20800,  customers: 251, onPremises: 48400,  takeaway: 48200,  doordash: 4300,  ubereats: 750, grubhub: 750 },
  { month: "M27", year: 3, sales: 103100, cogs: 27333, netIncome: 21200,  customers: 252, onPremises: 48700,  takeaway: 48600,  doordash: 4300,  ubereats: 750, grubhub: 750 },
  { month: "M28", year: 3, sales: 103700, cogs: 27498, netIncome: 21600,  customers: 254, onPremises: 49000,  takeaway: 48900,  doordash: 4300,  ubereats: 750, grubhub: 750 },
  { month: "M29", year: 3, sales: 104400, cogs: 27659, netIncome: 22000,  customers: 256, onPremises: 49300,  takeaway: 49200,  doordash: 4400,  ubereats: 750, grubhub: 750 },
  { month: "M30", year: 3, sales: 126000, cogs: 33378, netIncome: 33900,  customers: 308, onPremises: 59500,  takeaway: 59400,  doordash: 5400,  ubereats: 850, grubhub: 850 },
  { month: "M31", year: 3, sales: 137800, cogs: 36511, netIncome: 40500,  customers: 337, onPremises: 65200,  takeaway: 65100,  doordash: 5900,  ubereats: 800, grubhub: 800 },
  { month: "M32", year: 3, sales: 139400, cogs: 36933, netIncome: 41400,  customers: 341, onPremises: 65900,  takeaway: 65900,  doordash: 5900,  ubereats: 800, grubhub: 800 },
  { month: "M33", year: 3, sales: 108500, cogs: 28726, netIncome: 24200,  customers: 266, onPremises: 51200,  takeaway: 51300,  doordash: 4600,  ubereats: 700, grubhub: 700 },
  { month: "M34", year: 3, sales: 109000, cogs: 28850, netIncome: 24500,  customers: 267, onPremises: 51500,  takeaway: 51600,  doordash: 4500,  ubereats: 700, grubhub: 700 },
  { month: "M35", year: 3, sales: 109500, cogs: 28970, netIncome: 24800,  customers: 268, onPremises: 51700,  takeaway: 51800,  doordash: 4600,  ubereats: 700, grubhub: 700 },
  { month: "M36", year: 3, sales: 153800, cogs: 40722, netIncome: 49400,  customers: 377, onPremises: 73000,  takeaway: 73200,  doordash: 5900,  ubereats: 850, grubhub: 850 },
];

const SUMMARY = {
  year1: { sales: 1020700, cogs: 272072, netIncome: 172500, breakEven: 655772 },
  year2: { sales: 1260900, cogs: 334786, netIncome: 232000, breakEven: 710879 },
  year3: { sales: 1398400, cogs: 370728, netIncome: 264200, breakEven: 743145 },
};

const MARKETING_DATA = Array.from({ length: 12 }, (_, i) => ({
  month: `M${i + 1}`,
  emailList: Math.round(268 * (i + 1) * 0.9),
  socialFollowers: Math.round(268 * (i + 1)),
  emailCustomers: Math.round(35 * (i + 1) * 0.8),
  socialCustomers: Math.round(6 * (i + 1) * 0.85),
  adsCustomers: 5 * 30,
}));

function KPI({ label, value, sub, color = "text-foreground" }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function Proyecciones() {
  const [yearFilter, setYearFilter] = useState("all");

  const chartData = yearFilter === "all" ? MONTHLY_DATA : MONTHLY_DATA.filter(d => d.year === parseInt(yearFilter));

  const yearSummary = [
    { year: "Año 1", ...SUMMARY.year1 },
    { year: "Año 2", ...SUMMARY.year2 },
    { year: "Año 3", ...SUMMARY.year3 },
  ];

  const totalNI = yearSummary.reduce((s, y) => s + y.netIncome, 0);

  return (
    <div className="p-6 min-h-screen bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="w-6 h-6 text-primary" />Proyecciones Financieras</h1>
          <p className="text-muted-foreground text-sm mt-1">Modelo a 36 meses — Canales: On-Premises, Takeaway, Doordash, Ubereats, Grubhub</p>
        </div>

        <Tabs defaultValue="live">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="live">🔴 En Vivo</TabsTrigger>
            <TabsTrigger value="startup">🟢 Estoy empezando</TabsTrigger>
            <TabsTrigger value="overview">Resumen Ejecutivo</TabsTrigger>
            <TabsTrigger value="breakeven">📊 Break-Even</TabsTrigger>
            <TabsTrigger value="monthly">36 Meses</TabsTrigger>
            <TabsTrigger value="channels">Canales de Venta</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
          </TabsList>

          {/* LIVE DASHBOARD */}
          <TabsContent value="live">
            <LiveDashboard />
          </TabsContent>

          {/* STARTUP MODE */}
          <TabsContent value="startup">
            <StartupMode />
          </TabsContent>

          {/* RESUMEN */}
          <TabsContent value="overview">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <KPI label="Ventas Año 1" value="$1.02M" sub="Year 1 Total" color="text-primary" />
              <KPI label="Ventas Año 2" value="$1.26M" sub="+23% vs Año 1" color="text-emerald-600" />
              <KPI label="Ventas Año 3" value="$1.40M" sub="+11% vs Año 2" color="text-emerald-600" />
              <KPI label="Ingreso Neto 3 Años" value={`$${(totalNI / 1000).toFixed(0)}K`} sub="Utilidad acumulada" color="text-blue-600" />
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader><CardTitle className="text-sm">Ventas vs Punto de Equilibrio por Año</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={yearSummary}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                      <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="sales" name="Ventas" fill="hsl(var(--chart-1))" radius={[4,4,0,0]} />
                      <Bar dataKey="breakEven" name="Break-Even" fill="hsl(var(--chart-2))" radius={[4,4,0,0]} />
                      <Bar dataKey="netIncome" name="Utilidad Neta" fill="hsl(var(--chart-3))" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">Resumen por Año</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {yearSummary.map(y => (
                    <div key={y.year} className="p-3 rounded-lg bg-muted/50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold">{y.year}</span>
                        <Badge className="bg-primary/10 text-primary">${(y.sales/1000).toFixed(0)}K ventas</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <div>COGS: ${(y.cogs/1000).toFixed(0)}K</div>
                        <div>Margen: {((1-y.cogs/y.sales)*100).toFixed(1)}%</div>
                        <div className={y.netIncome > 0 ? "text-emerald-600 font-semibold" : "text-red-600"}>NI: ${(y.netIncome/1000).toFixed(0)}K</div>
                      </div>
                      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min((y.netIncome/y.sales)*100*3, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* BREAK-EVEN */}
          <TabsContent value="breakeven">
            <BreakEvenAnalysis />
          </TabsContent>

          {/* 36 MESES */}
          <TabsContent value="monthly">
            <div className="flex gap-2 mb-4">
              {["all","1","2","3"].map(y => (
                <button key={y} onClick={() => setYearFilter(y)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${yearFilter === y ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>
                  {y === "all" ? "Todos" : `Año ${y}`}
                </button>
              ))}
            </div>
            <Card>
              <CardHeader><CardTitle className="text-sm">Ventas Mensuales & Utilidad Neta</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                    <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                    <Legend />
                    <Line type="monotone" dataKey="sales" name="Ventas" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="cogs" name="COGS" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="netIncome" name="Utilidad Neta" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <div className="mt-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Clientes por Día (promedio mensual)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="customers" name="Clientes/día" fill="hsl(var(--chart-4))" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* CANALES */}
          <TabsContent value="channels">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              {[
                { label: "On-Premises", total: MONTHLY_DATA.reduce((s, m) => s + m.onPremises, 0), color: "bg-primary/10 text-primary", icon: Store },
                { label: "Takeaway", total: MONTHLY_DATA.reduce((s, m) => s + m.takeaway, 0), color: "bg-emerald-50 text-emerald-700", icon: ShoppingBag },
                { label: "Doordash", total: MONTHLY_DATA.reduce((s, m) => s + m.doordash, 0), color: "bg-red-50 text-red-700", icon: ShoppingBag },
                { label: "Ubereats", total: MONTHLY_DATA.reduce((s, m) => s + m.ubereats, 0), color: "bg-emerald-50 text-emerald-600", icon: ShoppingBag },
                { label: "Grubhub", total: MONTHLY_DATA.reduce((s, m) => s + m.grubhub, 0), color: "bg-orange-50 text-orange-700", icon: ShoppingBag },
              ].map(c => (
                <div key={c.label} className={`p-3 rounded-lg border ${c.color}`}>
                  <p className="text-xs font-medium">{c.label}</p>
                  <p className="text-lg font-bold">${(c.total/1000).toFixed(0)}K</p>
                  <p className="text-xs opacity-70">36 meses</p>
                </div>
              ))}
            </div>
            <Card>
              <CardHeader><CardTitle className="text-sm">Ventas por Canal — Primeros 12 Meses</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={MONTHLY_DATA.filter(d => d.year === 1)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                    <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="onPremises" name="On-Premises" stackId="a" fill="hsl(var(--chart-1))" />
                    <Bar dataKey="takeaway" name="Takeaway" stackId="a" fill="hsl(var(--chart-2))" />
                    <Bar dataKey="doordash" name="Doordash" stackId="a" fill="hsl(var(--chart-3))" />
                    <Bar dataKey="ubereats" name="Ubereats" stackId="a" fill="hsl(var(--chart-4))" />
                    <Bar dataKey="grubhub" name="Grubhub" stackId="a" fill="hsl(var(--chart-5))" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MARKETING */}
          <TabsContent value="marketing">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <KPI label="Email List (Fin Año 1)" value="5,320" sub="Suscriptores" />
              <KPI label="Seguidores Sociales" value="5,320" sub="Fin Año 1" />
              <KPI label="Ads Budget/día" value="$5" sub="Online Search Ads" />
              <KPI label="CPC Estimado" value="$1.00" sub="Costo por Click" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-sm">Crecimiento Email List & Seguidores Sociales</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={MARKETING_DATA}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="emailList" name="Email List" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                      <Line type="monotone" dataKey="socialFollowers" name="Seguidores" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Clientes por Canal de Marketing</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={MARKETING_DATA}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="emailCustomers" name="Email" fill="hsl(var(--chart-1))" stackId="a" />
                      <Bar dataKey="socialCustomers" name="Social" fill="hsl(var(--chart-2))" stackId="a" />
                      <Bar dataKey="adsCustomers" name="Ads" fill="hsl(var(--chart-3))" stackId="a" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            <Card className="mt-4">
              <CardContent className="pt-4">
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="font-semibold text-blue-700 mb-1">📧 Email Marketing</p>
                    <p className="text-muted-foreground">Opt-in rate: 10% | 20 emails/mes | Churn: 3%/mes</p>
                  </div>
                  <div className="p-3 bg-pink-50 rounded-lg">
                    <p className="font-semibold text-pink-700 mb-1">📱 Social Media</p>
                    <p className="text-muted-foreground">Sub rate: 10% | 20 posts/mes | Engagement orgánico</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <p className="font-semibold text-amber-700 mb-1">🔍 Online Search Ads</p>
                    <p className="text-muted-foreground">$5/día budget | CPC: $1 | 5 clicks/día → 150/mes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}