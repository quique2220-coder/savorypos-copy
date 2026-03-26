import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Edit2, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function MarginAnalysisVisual({ recipes, onNavigate }) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!recipes || recipes.length === 0) {
    return <div className="text-center text-muted-foreground p-8">No hay platillos para analizar</div>;
  }

  const handleEditPrice = (recipe) => {
    setEditingId(recipe.id);
    setEditPrice(recipe.sale_price || "");
  };

  const handleSavePrice = async (recipeId) => {
    if (!editPrice || parseFloat(editPrice) <= 0) {
      toast.error("Ingresa un precio válido");
      return;
    }
    setIsSaving(true);
    try {
      await base44.entities.Recipe.update(recipeId, { sale_price: parseFloat(editPrice) });
      qc.invalidateQueries({ queryKey: ["recipes"] });
      setEditingId(null);
      toast.success("Precio actualizado");
    } catch (err) {
      console.error("Error:", err);
      toast.error("Error al actualizar precio");
    } finally {
      setIsSaving(false);
    }
  };

  // Calcular márgenes
  const analyzed = recipes
    .filter(r => r.sale_price > 0)
    .map(r => {
      const cost = r.cost || 0;
      const margin = r.sale_price > 0 ? ((r.sale_price - cost) / r.sale_price) * 100 : 0;
      const profit = r.sale_price - cost;
      return { ...r, margin: Math.max(0, margin), profit: Math.max(0, profit) };
    })
    .sort((a, b) => b.margin - a.margin);

  const top3 = analyzed.slice(0, 3);
  const bottom3 = analyzed.slice(-3).reverse();

  const getMarginColor = (margin) => {
    if (margin >= 50) return "bg-green-500/20 border-green-500/50";
    if (margin >= 30) return "bg-blue-500/20 border-blue-500/50";
    if (margin >= 15) return "bg-yellow-500/20 border-yellow-500/50";
    return "bg-red-500/20 border-red-500/50";
  };

  const getMarginBadgeColor = (margin) => {
    if (margin >= 50) return "bg-green-600 text-white";
    if (margin >= 30) return "bg-blue-600 text-white";
    if (margin >= 15) return "bg-yellow-600 text-white";
    return "bg-red-600 text-white";
  };

  const chartData = analyzed.map(r => ({
    name: r.name.substring(0, 12),
    margin: parseFloat(r.margin.toFixed(1)),
    profit: parseFloat(r.profit.toFixed(2)),
  }));

  const topData = top3.map(r => ({
    name: r.name,
    value: parseFloat(r.margin.toFixed(1)),
  }));

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b"];

  return (
    <div className="w-full space-y-6">
      {/* Resumen de top 3 */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <CardTitle>Platillos Más Rentables</CardTitle>
          </div>
          <CardDescription>Los 3 con mejor margen</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {top3.map((dish, idx) => (
            <div key={idx} className={`p-4 rounded-lg border-2 ${getMarginColor(dish.margin)}`}>
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-sm">{dish.name}</h4>
                <Badge className={getMarginBadgeColor(dish.margin)}>{dish.margin.toFixed(1)}%</Badge>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Precio:</span>
                  {editingId === dish.id ? (
                    <Input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="h-6 w-20 text-xs"
                      placeholder="0.00"
                      step="0.01"
                    />
                  ) : (
                    <span className="font-medium">${dish.sale_price?.toFixed(2) || "0.00"}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Costo:</span>
                  <span className="font-medium">${dish.cost?.toFixed(2) || "0.00"}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border">
                  <span className="text-muted-foreground font-medium">Ganancia:</span>
                  <span className="font-bold text-green-600">${dish.profit.toFixed(2)}</span>
                </div>
                {editingId === dish.id ? (
                  <div className="flex gap-1 mt-2">
                    <Button
                      size="sm"
                      className="h-6 px-2 text-xs flex-1"
                      onClick={() => handleSavePrice(dish.id)}
                      disabled={isSaving}
                    >
                      <Save className="w-3 h-3 mr-1" />
                      Guardar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-xs"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs w-full mt-2"
                    onClick={() => handleEditPrice(dish)}
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Editar precio
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Gráfico de márgenes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comparativa de Márgenes</CardTitle>
          <CardDescription>Margen de ganancia por platillo</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
              <YAxis />
              <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
              <Bar dataKey="margin" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de distribución top 3 */}
      {top3.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribución de Márgenes (Top 3)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={topData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                  {topData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Bottom 3 */}
      <Card className="border-2 border-destructive/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <CardTitle>Platillos con Margen Bajo</CardTitle>
          </div>
          <CardDescription>Los 3 con menor rentabilidad - considera ajustar precios</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {bottom3.map((dish, idx) => (
            <div key={idx} className={`p-4 rounded-lg border-2 ${getMarginColor(dish.margin)}`}>
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-sm">{dish.name}</h4>
                <Badge className={getMarginBadgeColor(dish.margin)}>{dish.margin.toFixed(1)}%</Badge>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Precio:</span>
                  {editingId === dish.id ? (
                    <Input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="h-6 w-20 text-xs"
                      placeholder="0.00"
                      step="0.01"
                    />
                  ) : (
                    <span className="font-medium">${dish.sale_price?.toFixed(2) || "0.00"}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Costo:</span>
                  <span className="font-medium">${dish.cost?.toFixed(2) || "0.00"}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border">
                  <span className="text-muted-foreground font-medium">Ganancia:</span>
                  <span className="font-semibold text-red-600">${dish.profit.toFixed(2)}</span>
                </div>
                {editingId === dish.id ? (
                  <div className="flex gap-1 mt-2">
                    <Button
                      size="sm"
                      className="h-6 px-2 text-xs flex-1"
                      onClick={() => handleSavePrice(dish.id)}
                      disabled={isSaving}
                    >
                      <Save className="w-3 h-3 mr-1" />
                      Guardar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-xs"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs w-full mt-2"
                    onClick={() => handleEditPrice(dish)}
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Editar precio
                  </Button>
                )}
              </div>
              {dish.margin < 15 && (
                <div className="flex items-center gap-1 mt-2 text-xs text-red-600">
                  <AlertCircle className="w-3 h-3" />
                  <span>Margen muy bajo</span>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tabla completa */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Análisis Completo</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr className="text-muted-foreground">
                <th className="text-left p-2">Platillo</th>
                <th className="text-right p-2">Precio</th>
                <th className="text-right p-2">Costo</th>
                <th className="text-right p-2">Margen %</th>
                <th className="text-right p-2">Ganancia</th>
              </tr>
            </thead>
            <tbody>
              {analyzed.map((dish, idx) => (
                <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-2">{dish.name}</td>
                  <td className="text-right p-2 font-medium">${dish.sale_price?.toFixed(2) || "0.00"}</td>
                  <td className="text-right p-2">${dish.cost?.toFixed(2) || "0.00"}</td>
                  <td className="text-right p-2">
                    <Badge className={getMarginBadgeColor(dish.margin)}>{dish.margin.toFixed(1)}%</Badge>
                  </td>
                  <td className="text-right p-2 font-semibold text-green-600">${dish.profit.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Links a Secciones */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center justify-center gap-2"
          onClick={() => onNavigate?.("/Recipes")}
        >
          <span className="text-2xl">📋</span>
          <span className="text-sm font-semibold">Ver Recetas</span>
          <span className="text-xs text-muted-foreground">Editar platillos e ingredientes</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center justify-center gap-2"
          onClick={() => onNavigate?.("/Ingredients")}
        >
          <span className="text-2xl">🥘</span>
          <span className="text-sm font-semibold">Ingredientes</span>
          <span className="text-xs text-muted-foreground">Gestionar costos de ingredientes</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center justify-center gap-2"
          onClick={() => onNavigate?.("/Orders")}
        >
          <span className="text-2xl">📦</span>
          <span className="text-sm font-semibold">Órdenes</span>
          <span className="text-xs text-muted-foreground">Ver ventas y pedidos</span>
        </Button>
      </div>

      {/* Recomendaciones */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Recomendaciones</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {bottom3.some(d => d.margin < 15) && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="font-semibold text-sm mb-1">⚠️ Márgenes Críticos</p>
              <p className="text-sm text-foreground">
                Algunos platillos tienen márgenes menores al 15%. Considera aumentar los precios o negociar mejores costos con proveedores.
              </p>
            </div>
          )}
          {top3.some(d => d.margin >= 50) && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="font-semibold text-sm mb-1">✓ Oportunidad de Venta</p>
              <p className="text-sm text-foreground">
                Los platillos con margen superior al 50% tienen alta rentabilidad. Promociona estos items en tu menú.
              </p>
            </div>
          )}
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="font-semibold text-sm mb-1">💡 Estrategia</p>
            <p className="text-sm text-foreground">
              Enfócate en vender los platillos con mayor margen y considera revisar la fijación de precios en los artículos de bajo margen.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}