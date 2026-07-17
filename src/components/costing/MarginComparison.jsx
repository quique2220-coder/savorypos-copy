import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp, TrendingDown, AlertTriangle, ArrowUpDown, Save } from "lucide-react";
import { calcRecipeTotals } from "@/utils/recipeCalculator";
import { base44 } from "@/api/base44Client";

const STATUS = {
  healthy: { label: "Saludable", color: "bg-emerald-100 text-emerald-700 border-emerald-300", icon: TrendingUp },
  close: { label: "Cerca", color: "bg-amber-100 text-amber-700 border-amber-300", icon: AlertTriangle },
  underpriced: { label: "Subvaluado", color: "bg-red-100 text-red-700 border-red-300", icon: TrendingDown },
};

function getStatus(salePrice, suggestedPrice) {
  if (suggestedPrice <= 0 || salePrice <= 0) return STATUS.underpriced;
  const ratio = salePrice / suggestedPrice;
  if (ratio >= 0.95) return STATUS.healthy;
  if (ratio >= 0.80) return STATUS.close;
  return STATUS.underpriced;
}

export default function MarginComparison({ recipes, ingredients, overheadPerDish, onPriceUpdate }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("marginPct");
  const [sortDir, setSortDir] = useState("asc"); // asc = worst margins first
  const [editingPrice, setEditingPrice] = useState({}); // recipeId → value

  const ingMap = useMemo(() => Object.fromEntries((ingredients || []).map(i => [i.id, i])), [ingredients]);

  const rows = useMemo(() => {
    return recipes
      .filter(r => r.name?.toLowerCase().includes(search.toLowerCase()))
      .filter(r => r.recipe_type !== "subrecipe")
      .map(r => {
        const totals = calcRecipeTotals(r, ingMap, { overhead_per_dish: r.overhead_per_dish || overheadPerDish });
        const salePrice = r.sale_price || 0;
        const suggested = totals.suggestedPrice || 0;
        const marginPct = salePrice > 0 ? ((salePrice - totals.fullCostPerServing) / salePrice) * 100 : 0;
        const foodCostPct = salePrice > 0 ? (totals.foodCostPerServing / salePrice) * 100 : 0;
        const gap = salePrice - suggested;
        const status = getStatus(salePrice, suggested);
        return {
          id: r.id,
          name: r.name,
          category: r.category || "—",
          servings: r.servings || 1,
          foodCost: totals.foodCostPerServing,
          fullCost: totals.fullCostPerServing,
          laborCost: totals.laborCost,
          packagingCost: totals.packagingCost,
          overhead: totals.overheadPerDish,
          salePrice,
          suggested,
          gap,
          marginPct,
          foodCostPct,
          status,
          targetFC: r.target_food_cost_percent || 30,
          targetMargin: r.target_margin_percent || 0,
        };
      });
  }, [recipes, ingMap, overheadPerDish, search]);

  const sorted = useMemo(() => {
    const sortedRows = [...rows].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      const cmp = av > bv ? 1 : av < bv ? -1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sortedRows;
  }, [rows, sortKey, sortDir]);

  const summary = useMemo(() => {
    const underpriced = rows.filter(r => r.status === STATUS.underpriced).length;
    const close = rows.filter(r => r.status === STATUS.close).length;
    const healthy = rows.filter(r => r.status === STATUS.healthy).length;
    const avgMargin = rows.length > 0 ? rows.reduce((s, r) => s + r.marginPct, 0) / rows.length : 0;
    const totalGap = rows.filter(r => r.gap < 0).reduce((s, r) => s + Math.abs(r.gap), 0);
    return { underpriced, close, healthy, avgMargin, totalGap, total: rows.length };
  }, [rows]);

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function savePrice(recipeId) {
    const newPrice = parseFloat(editingPrice[recipeId]);
    if (isNaN(newPrice) || newPrice <= 0) return;
    try {
      await base44.entities.Recipe.update(recipeId, { sale_price: newPrice });
      onPriceUpdate?.();
      setEditingPrice(prev => { const next = { ...prev }; delete next[recipeId]; return next; });
    } catch (e) {
      console.error("Error updating price:", e);
    }
  }

  const SortHeader = ({ label, keyName, className = "" }) => (
    <th className={`px-3 py-2 font-medium cursor-pointer select-none hover:bg-muted/50 ${className}`} onClick={() => toggleSort(keyName)}>
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${sortKey === keyName ? "text-primary" : "text-muted-foreground/40"}`} />
      </span>
    </th>
  );

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Recetas</p>
            <p className="text-xl font-bold">{summary.total}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Saludables</p>
            <p className="text-xl font-bold text-emerald-600">{summary.healthy}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Cerca del sugerido</p>
            <p className="text-xl font-bold text-amber-600">{summary.close}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Subvaluadas</p>
            <p className="text-xl font-bold text-red-600">{summary.underpriced}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Margen promedio</p>
            <p className={`text-xl font-bold ${summary.avgMargin >= 60 ? "text-emerald-600" : summary.avgMargin >= 40 ? "text-amber-600" : "text-red-600"}`}>
              {summary.avgMargin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {summary.totalGap > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
          <AlertTriangle className="w-4 h-4" />
          <span>Si subes las recetas subvaluadas al precio sugerido, ganarás <strong>${summary.totalGap.toFixed(2)} más por platillo</strong> en promedio.</span>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar receta..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Comparison table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <SortHeader label="Receta" keyName="name" className="text-left" />
                <SortHeader label="Food Cost" keyName="foodCost" className="text-right" />
                <SortHeader label="Full Cost" keyName="fullCost" className="text-right" />
                <SortHeader label="Precio actual" keyName="salePrice" className="text-right" />
                <SortHeader label="Sugerido" keyName="suggested" className="text-right" />
                <SortHeader label="Brecha" keyName="gap" className="text-right" />
                <SortHeader label="Margen %" keyName="marginPct" className="text-right" />
                <th className="text-center px-3 py-2 font-medium">Estado</th>
                <th className="text-right px-3 py-2 font-medium">Ajustar precio</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    No hay recetas para comparar.
                  </td>
                </tr>
              ) : sorted.map(r => {
                const isEditing = editingPrice[r.id] !== undefined;
                const editValue = isEditing ? editingPrice[r.id] : r.salePrice.toFixed(2);
                return (
                  <tr key={r.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.category} · {r.servings} porciones</p>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <p className="font-mono">${r.foodCost.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{r.foodCostPct.toFixed(0)}% FC</p>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <p className="font-mono">${r.fullCost.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.laborCost > 0 && `L:${r.laborCost.toFixed(2)} `}
                        {r.packagingCost > 0 && `E:${r.packagingCost.toFixed(2)} `}
                        {r.overhead > 0 && `O:${r.overhead.toFixed(2)}`}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold">${r.salePrice.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-emerald-600 font-semibold">${r.suggested.toFixed(2)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono ${r.gap < 0 ? "text-red-600 font-semibold" : "text-emerald-600"}`}>
                      {r.gap >= 0 ? "+" : ""}${r.gap.toFixed(2)}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono font-bold ${r.marginPct >= 60 ? "text-emerald-600" : r.marginPct >= 40 ? "text-amber-600" : "text-red-600"}`}>
                      {r.marginPct.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${r.status.color}`}>
                        <r.status.icon className="w-3 h-3" />{r.status.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 justify-end">
                        <Input
                          type="number"
                          step="0.50"
                          className="h-7 w-20 text-xs text-right"
                          value={editValue}
                          onChange={e => setEditingPrice(prev => ({ ...prev, [r.id]: e.target.value }))}
                          placeholder={r.salePrice.toFixed(2)}
                        />
                        {isEditing && (
                          <Button size="icon" className="h-7 w-7" onClick={() => savePrice(r.id)}>
                            <Save className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="font-semibold">Cómo leer:</span>
        <span><strong className="text-emerald-600">Saludable</strong>: precio ≥ 95% del sugerido</span>
        <span><strong className="text-amber-600">Cerca</strong>: 80–95% del sugerido</span>
        <span><strong className="text-red-600">Subvaluado</strong>: &lt; 80% del sugerido — sube el precio o reduce costos</span>
      </div>
    </div>
  );
}