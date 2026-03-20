import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Store, ShoppingBag } from "lucide-react";

// Data from the Restaurant Financial Model Excel
const MONTHLY_DATA = [
  { month: "M1", year: 1, sales: 34918, cogs: 9625, netIncome: -13679, customers: 176, onPremises: 15208, takeaway: 17119, doordash: 1851, ubereats: 370, grubhub: 370 },
  { month: "M2", year: 1, sales: 70595, cogs: 19455, netIncome: 8524, customers: 178, onPremises: 30876, takeaway: 34537, doordash: 3702, ubereats: 740, grubhub: 740 },
  { month: "M3", year: 1, sales: 72091, cogs: 19857, netIncome: 9377, customers: 182, onPremises: 31781, takeaway: 35127, doordash: 3702, ubereats: 740, grubhub: 740 },
  { month: "M4", year: 1, sales: 73542, cogs: 20247, netIncome: 10205, customers: 185, onPremises: 32660, takeaway: 35699, doordash: 3702, ubereats: 740, grubhub: 740 },
  { month: "M5", year: 1, sales: 74949, cogs: 20625, netIncome: 11008, customers: 189, onPremises: 33512, takeaway: 36254, doordash: 3702, ubereats: 740, grubhub: 740 },
  { month: "M6", year: 1, sales: 91577, cogs: 25191, netIncome: 18053, customers: 231, onPremises: 41206, takeaway: 44151, doordash: 4443, ubereats: 889, grubhub: 889 },
  { month: "M7", year: 1, sales: 101362, cogs: 27869, netIncome: 23451, customers: 256, onPremises: 45944, takeaway: 48680, doordash: 4813, ubereats: 963, grubhub: 963 },
  { month: "M8", year: 1, sales: 103681, cogs: 28492, netIncome: 24770, customers: 261, onPremises: 47348, takeaway: 49594, doordash: 4813, ubereats: 963, grubhub: 963 },
  { month: "M9", year: 1, sales: 81496, cogs: 22385, netIncome: 12661, customers: 206, onPremises: 37477, takeaway: 38837, doordash: 3702, ubereats: 740, grubhub: 740 },
  { month: "M10", year: 1, sales: 82665, cogs: 22700, netIncome: 13330, customers: 209, onPremises: 38184, takeaway: 39298, doordash: 3702, ubereats: 740, grubhub: 740 },
  { month: "M11", year: 1, sales: 83798, cogs: 23004, netIncome: 13978, customers: 211, onPremises: 38871, takeaway: 39745, doordash: 3702, ubereats: 740, grubhub: 740 },
  { month: "M12", year: 1, sales: 118857, cogs: 32620, netIncome: 33241, customers: 300, onPremises: 55351, takeaway: 56250, doordash: 5183, ubereats: 1037, grubhub: 1037 },
  { month: "M13", year: 2, sales: 86705, cogs: 23786, netIncome: 15637, customers: 219, onPremises: 40630, takeaway: 40891, doordash: 3702, ubereats: 740, grubhub: 740 },
  { month: "M14", year: 2, sales: 87717, cogs: 24058, netIncome: 16217, customers: 221, onPremises: 41243, takeaway: 41290, doordash: 3702, ubereats: 740, grubhub: 740 },
  { month: "M15", year: 2, sales: 88699, cogs: 24322, netIncome: 16781, customers: 224, onPremises: 41838, takeaway: 41678, doordash: 3702, ubereats: 740, grubhub: 740 },
  { month: "M16", year: 2, sales: 89652, cogs: 24578, netIncome: 17327, customers: 226, onPremises: 42415, takeaway: 42054, doordash: 3702, ubereats: 740, grubhub: 740 },
  { month: "M17", year: 2, sales: 90576, cogs: 24826, netIncome: 17858, customers: 229, onPremises: 42974, takeaway: 42418, doordash: 3702, ubereats: 740, grubhub: 740 },
  { month: "M18", year: 2, sales: 109766, cogs: 30081, netIncome: 27473, customers: 277, onPremises: 52221, takeaway: 51326, doordash: 4443, ubereats: 889, grubhub: 889 },
  { month: "M19", year: 2, sales: 120562, cogs: 33031, netIncome: 23043, customers: 304, onPremises: 57571, takeaway: 56253, doordash: 4813, ubereats: 963, grubhub: 963 },
  { month: "M20", year: 2, sales: 122432, cogs: 33533, netIncome: 34509, customers: 309, onPremises: 58703, takeaway: 56991, doordash: 4813, ubereats: 963, grubhub: 963 },
  { month: "M21", year: 2, sales: 95583, cogs: 26172, netIncome: 19761, customers: 241, onPremises: 46006, takeaway: 44393, doordash: 3702, ubereats: 740, grubhub: 740 },
  { month: "M22", year: 2, sales: 96329, cogs: 26373, netIncome: 20191, customers: 243, onPremises: 46458, takeaway: 44687, doordash: 3702, ubereats: 740, grubhub: 740 },
  { month: "M23", year: 2, sales: 97052, cogs: 26567, netIncome: 20609, customers: 245, onPremises: 46896, takeaway: 44973, doordash: 3702, ubereats: 740, grubhub: 740 },
  { month: "M24", year: 2, sales: 136856, cogs: 37459, netIncome: 42556, customers: 346, onPremises: 66250, takeaway: 63350, doordash: 5183, ubereats: 1037, grubhub: 1037 },
  { month: "M25", year: 3, sales: 98611, cogs: 26986, netIncome: 19667, customers: 249, onPremises: 47866, takeaway: 45563, doordash: 3702, ubereats: 740, grubhub: 740 },
  { month: "M26", year: 3, sales: 99266, cogs: 27162, netIncome: 20046, customers: 251, onPremises: 48262, takeaway: 45822, doordash: 3702, ubereats: 740, grubhub: 740 },
  { month: "M27", year: 3, sales: 99902, cogs: 27333, netIncome: 20414, customers: 252, onPremises: 48646, takeaway: 46073, doordash: 3702, ubereats: 740, grubhub: 740 },
  { month: "M28", year: 3, sales: 100518, cogs: 27498, netIncome: 20771, customers: 254, onPremises: 49018, takeaway: 46317, doordash: 3702, ubereats: 740, grubhub: 740 },
  { month: "M29", year: 3, sales: 101116, cogs: 27659, netIncome: 21117, customers: 256, onPremises: 49380, takeaway: 46554, doordash: 3702, ubereats: 740, grubhub: 740 },
  { month: "M30", year: 3, sales: 122036, cogs: 33378, netIncome: 32671, customers: 308, onPremises: 59676, takeaway: 56140, doordash: 4443, ubereats: 889, grubhub: 889 },
  { month: "M31", year: 3, sales: 133514, cogs: 36511, netIncome: 39028, customers: 337, onPremises: 65441, takeaway: 61335, doordash: 4813, ubereats: 963, grubhub: 963 },
  { month: "M32", year: 3, sales: 135080, cogs: 36933, netIncome: 39923, customers: 341, onPremises: 66389, takeaway: 61954, doordash: 4813, ubereats: 963, grubhub: 963 },
  { month: "M33", year: 3, sales: 105085, cogs: 28726, netIncome: 23396, customers: 266, onPremises: 51780, takeaway: 48122, doordash: 3702, ubereats: 740, grubhub: 740 },
  { month: "M34", year: 3, sales: 105546, cogs: 28850, netIncome: 23665, customers: 267, onPremises: 52059, takeaway: 48304, doordash: 3702, ubereats: 740, grubhub: 740 },
  { month: "M35", year: 3, sales: 105993, cogs: 28970, netIncome: 23927, customers: 268, onPremises: 52329, takeaway: 48481, doordash: 3702, ubereats: 740, grubhub: 740 },
  { month: "M36", year: 3, sales: 148997, cogs: 40722, netIncome: 47686, customers: 377, onPremises: 73627, takeaway: 68114, doordash: 5183, ubereats: 1037, grubhub: 1037 },
];

const SUMMARY = {
  year1: { sales: 989532, cogs: 272072, netIncome: 164920, breakEven: 655772 },
  year2: { sales: 1221926, cogs: 334786, netIncome: 213962, breakEven: 710879 },
  year3: { sales: 1355665, cogs: 370728, netIncome: 253334, breakEven: 743145 },
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

  const totalSales = yearSummary.reduce((s, y) => s + y.sales, 0);
  const totalNI = yearSummary.reduce((s, y) => s + y.netIncome, 0);

  return (
    <div className="p-6 min-h-screen bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="w-6 h-6 text-primary" />Proyecciones Financieras</h1>
          <p className="text-muted-foreground text-sm mt-1">Modelo a 36 meses — Canales: On-Premises, Takeaway, Doordash, Ubereats, Grubhub</p>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Resumen Ejecutivo</TabsTrigger>
            <TabsTrigger value="monthly">36 Meses</TabsTrigger>
            <TabsTrigger value="channels">Canales de Venta</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
          </TabsList>

          {/* RESUMEN */}
          <TabsContent value="overview">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <KPI label="Ventas Año 1" value="$989K" sub="Year 1 Total" color="text-primary" />
              <KPI label="Ventas Año 2" value="$1.22M" sub="+23% vs Año 1" color="text-emerald-600" />
              <KPI label="Ventas Año 3" value="$1.36M" sub="+11% vs Año 2" color="text-emerald-600" />
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