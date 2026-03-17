import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, FlameIcon, TrendingUp, DollarSign, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const UNITS = ["pcs", "oz", "g", "lb", "kg", "cup", "tbsp", "tsp", "fl oz", "ml", "liter", "gallon", "slice", "bunch"];

function calcRecipe(ingredients, recipeServings, targetFoodCostPct, actualPrice) {
  const recipeCost = ingredients.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.price_per_unit) || 0), 0);
  const totalCalories = ingredients.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.calories_per_unit) || 0), 0);
  const servings = parseFloat(recipeServings) || 1;
  const foodCostPct = parseFloat(targetFoodCostPct) || 0.3;
  const costPerServing = recipeCost / servings;
  const targetMenuPrice = foodCostPct > 0 ? costPerServing / foodCostPct : 0;
  const targetGrossProfit = targetMenuPrice - costPerServing;
  const targetGPPct = targetMenuPrice > 0 ? targetGrossProfit / targetMenuPrice : 0;
  const actualFoodCostPct = actualPrice > 0 ? costPerServing / actualPrice : 0;
  const actualGrossProfit = actualPrice - costPerServing;
  const actualGPPct = actualPrice > 0 ? actualGrossProfit / actualPrice : 0;
  const caloriesPerServing = totalCalories / servings;
  return { recipeCost, costPerServing, targetMenuPrice, targetGrossProfit, targetGPPct, actualFoodCostPct, actualGrossProfit, actualGPPct, caloriesPerServing };
}

function MetricBox({ label, value, sub, green, red, yellow }) {
  return (
    <div className={cn(
      "rounded-xl p-3 text-center border",
      green && "bg-emerald-50 border-emerald-200",
      red && "bg-red-50 border-red-200",
      yellow && "bg-amber-50 border-amber-200",
      !green && !red && !yellow && "bg-secondary border-border"
    )}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
      <p className={cn("text-base font-bold mt-0.5", green && "text-emerald-700", red && "text-red-600", yellow && "text-amber-700")}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function RecipeCalculator({ ingredients, recipeServings, targetFoodCostPct, actualPrice, calories, onUpdate }) {
  const calc = calcRecipe(ingredients, recipeServings, targetFoodCostPct, actualPrice);

  const updateIngredient = (idx, field, value) => {
    const updated = ingredients.map((ing, i) => {
      if (i !== idx) return ing;
      const newIng = { ...ing, [field]: value };
      // auto-calc cost when qty or price changes
      newIng.cost = (parseFloat(newIng.quantity) || 0) * (parseFloat(newIng.price_per_unit) || 0);
      return newIng;
    });
    onUpdate({ ingredients: updated, calculatedCost: calcRecipe(updated, recipeServings, targetFoodCostPct, actualPrice).costPerServing });
  };

  const addIngredient = () => {
    onUpdate({ ingredients: [...ingredients, { name: "", quantity: 1, unit: "pcs", price_per_unit: 0, cost: 0, calories_per_unit: 0 }] });
  };

  const removeIngredient = (idx) => {
    const updated = ingredients.filter((_, i) => i !== idx);
    onUpdate({ ingredients: updated, calculatedCost: calcRecipe(updated, recipeServings, targetFoodCostPct, actualPrice).costPerServing });
  };

  const isGoodFoodCost = calc.actualFoodCostPct > 0 && calc.actualFoodCostPct <= parseFloat(targetFoodCostPct);

  return (
    <div className="space-y-4">
      {/* Recipe Config */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Recipe Servings</label>
          <Input
            type="number" min="1" step="1"
            value={recipeServings}
            onChange={(e) => onUpdate({ recipeServings: e.target.value, calculatedCost: calcRecipe(ingredients, e.target.value, targetFoodCostPct, actualPrice).costPerServing })}
            className="mt-1 h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Target Food Cost %</label>
          <div className="relative mt-1">
            <Input
              type="number" min="1" max="100" step="1"
              value={Math.round((parseFloat(targetFoodCostPct) || 0.3) * 100)}
              onChange={(e) => onUpdate({ targetFoodCostPct: (parseFloat(e.target.value) || 30) / 100 })}
              className="h-8 text-sm pr-6"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Calories (total)</label>
          <Input
            type="number" min="0"
            value={calories}
            onChange={(e) => onUpdate({ calories: e.target.value })}
            className="mt-1 h-8 text-sm"
            placeholder="auto-calc or manual"
          />
        </div>
      </div>

      {/* Ingredients Table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Recipe Ingredients</label>
          <Button type="button" variant="outline" size="sm" onClick={addIngredient} className="h-7 text-xs gap-1">
            <Plus className="w-3 h-3" /> Add Ingredient
          </Button>
        </div>

        {ingredients.length === 0 ? (
          <div className="border-2 border-dashed rounded-xl p-6 text-center text-muted-foreground text-sm">
            Add ingredients to calculate recipe cost
          </div>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 gap-0 bg-muted px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              <div className="col-span-3">Ingredient</div>
              <div className="col-span-1">Qty</div>
              <div className="col-span-2">Unit</div>
              <div className="col-span-2">$/Unit</div>
              <div className="col-span-2">Cal/Unit</div>
              <div className="col-span-1">Cost</div>
              <div className="col-span-1"></div>
            </div>
            {ingredients.map((ing, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-1 px-2 py-1.5 border-t items-center">
                <div className="col-span-3">
                  <Input value={ing.name} onChange={(e) => updateIngredient(idx, "name", e.target.value)} className="h-7 text-xs" placeholder="Name" />
                </div>
                <div className="col-span-1">
                  <Input type="number" min="0" step="0.01" value={ing.quantity} onChange={(e) => updateIngredient(idx, "quantity", e.target.value)} className="h-7 text-xs" />
                </div>
                <div className="col-span-2">
                  <select
                    value={ing.unit}
                    onChange={(e) => updateIngredient(idx, "unit", e.target.value)}
                    className="w-full h-7 text-xs border border-input rounded-md bg-background px-1"
                  >
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <Input type="number" min="0" step="0.01" value={ing.price_per_unit} onChange={(e) => updateIngredient(idx, "price_per_unit", e.target.value)} className="h-7 text-xs" placeholder="$" />
                </div>
                <div className="col-span-2">
                  <Input type="number" min="0" step="1" value={ing.calories_per_unit || ""} onChange={(e) => updateIngredient(idx, "calories_per_unit", e.target.value)} className="h-7 text-xs" placeholder="kcal" />
                </div>
                <div className="col-span-1">
                  <span className="text-xs font-semibold text-primary">${ing.cost?.toFixed(2) || "0.00"}</span>
                </div>
                <div className="col-span-1">
                  <button onClick={() => removeIngredient(idx)} className="w-6 h-6 flex items-center justify-center rounded text-destructive/50 hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
            <div className="grid grid-cols-12 gap-1 px-2 py-1.5 border-t bg-muted/50">
              <div className="col-span-3 text-xs font-bold pl-1">Recipe Total</div>
              <div className="col-span-8"></div>
              <div className="col-span-1 text-xs font-bold text-primary">${calc.recipeCost.toFixed(2)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Calculated Results */}
      {ingredients.length > 0 && (
        <div className="bg-muted/40 rounded-xl p-3 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Calculated Analysis</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MetricBox label="Cost / Serving" value={`$${calc.costPerServing.toFixed(2)}`} />
            <MetricBox label="Target Price" value={`$${calc.targetMenuPrice.toFixed(2)}`} sub={`at ${Math.round((parseFloat(targetFoodCostPct) || 0.3) * 100)}% food cost`} yellow />
            <MetricBox
              label="Actual Food Cost %"
              value={`${(calc.actualFoodCostPct * 100).toFixed(1)}%`}
              sub={`target: ${Math.round((parseFloat(targetFoodCostPct) || 0.3) * 100)}%`}
              green={isGoodFoodCost}
              red={calc.actualFoodCostPct > 0 && !isGoodFoodCost}
            />
            <MetricBox
              label="Gross Profit"
              value={`$${calc.actualGrossProfit.toFixed(2)}`}
              sub={`${(calc.actualGPPct * 100).toFixed(1)}% GP`}
              green={calc.actualGrossProfit > 0}
              red={calc.actualGrossProfit <= 0}
            />
          </div>
          {calc.caloriesPerServing > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
              <FlameIcon className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-semibold text-orange-700">{Math.round(calc.caloriesPerServing)} kcal per serving</span>
              <span className="text-xs text-muted-foreground ml-1">(from ingredients)</span>
            </div>
          )}
          {actualPrice > 0 && calc.actualFoodCostPct > parseFloat(targetFoodCostPct) && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              Price should be at least <strong>${calc.targetMenuPrice.toFixed(2)}</strong> to hit your {Math.round((parseFloat(targetFoodCostPct) || 0.3) * 100)}% food cost target.
            </div>
          )}
        </div>
      )}
    </div>
  );
}