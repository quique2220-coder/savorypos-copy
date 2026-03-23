/**
 * Costo por unidad base, ajustado por rendimiento (yield).
 */
import { getConversionFactor } from './units';

export function costPerBaseUnit(ingredient) {
  if (!ingredient) return 0;
  const { purchase_price = 0, purchase_quantity = 1, purchase_unit, base_unit, yield_percent = 100 } = ingredient;
  
  const conversionFactor = getConversionFactor(purchase_unit, base_unit);
  
  // Si no hay conversión, asumir que son unidades iguales (fallback seguro)
  const factor = conversionFactor !== null ? conversionFactor : 1;
  const quantityInBase = purchase_quantity * factor;
  const raw = quantityInBase > 0 ? purchase_price / quantityInBase : 0;
  const yf = (yield_percent || 100) / 100;
  return yf > 0 ? raw / yf : raw;
}

/**
 * Calcula costo y macros de una línea de ingrediente.
 */
export function calcIngredientLine(ingredient, quantity) {
  if (!ingredient || !quantity) return { cost: 0, calories: 0, protein: 0, carbs: 0, fat: 0 };
  const cpu = costPerBaseUnit(ingredient);
  return {
    cost:     quantity * cpu,
    calories: quantity * (ingredient.calories_per_base_unit || 0),
    protein:  quantity * (ingredient.protein_per_base_unit  || 0),
    carbs:    quantity * (ingredient.carbs_per_base_unit    || 0),
    fat:      quantity * (ingredient.fat_per_base_unit      || 0),
  };
}

/**
 * Calcula los totales completos de una receta incluyendo las 3 capas de costo:
 *   Nivel 1 — Food Cost (ingredientes)
 *   Nivel 2 — Prime Cost (+ mano de obra directa)
 *   Nivel 3 — Full Cost (+ empaque + overhead asignado)
 *
 * @param {object} recipe
 * @param {object} ingredientsMap  { [id]: ingredient }
 * @param {object} [overrides]     { overhead_per_dish, packaging_cost, labor_minutes, labor_rate_per_hour }
 */
export function calcRecipeTotals(recipe, ingredientsMap, overrides = {}) {
  const items = recipe?.recipe_items || [];
  let totalCost = 0, totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;

  for (const item of items) {
    const ing = ingredientsMap?.[item.ingredient_id];
    if (!ing) continue;
    const line = calcIngredientLine(ing, Number(item.quantity) || 0);
    totalCost     += line.cost;
    totalCalories += line.calories;
    totalProtein  += line.protein;
    totalCarbs    += line.carbs;
    totalFat      += line.fat;
  }

  const servings    = Number(recipe?.servings) || 1;
  const salePrice   = Number(recipe?.sale_price) || 0;
  const targetFC    = Number(recipe?.target_food_cost_percent) || 30;

  // Costo de ingredientes por porción (Nivel 1)
  const foodCostPerServing = totalCost / servings;

  // Mano de obra directa (Nivel 2)
  const laborMinutes   = Number(overrides.labor_minutes ?? recipe?.prep_time_minutes ?? 0);
  const laborRateHr    = Number(overrides.labor_rate_per_hour ?? recipe?.labor_rate_per_hour ?? 0);
  const laborCost      = laborRateHr > 0 ? (laborMinutes / 60) * laborRateHr : 0;

  // Empaque (Nivel 3)
  const packagingCost  = Number(overrides.packaging_cost ?? recipe?.packaging_cost ?? 0);

  // Overhead asignado (Nivel 3)
  const overheadPerDish = Number(overrides.overhead_per_dish ?? recipe?.overhead_per_dish ?? 0);

  // Full cost por porción
  const primeCostPerServing = foodCostPerServing + laborCost;
  const fullCostPerServing  = primeCostPerServing + packagingCost + overheadPerDish;

  // Precio sugerido basado en Full Cost y margen deseado
  // Si target_margin_percent > 0: suggestedPrice = fullCost / (1 - margin%)
  // Si no: suggestedPrice = foodCost / (targetFC%)
  const targetMargin    = Number(recipe?.target_margin_percent ?? 0);
  let suggestedPrice = 0;
  
  if (targetMargin > 0 && targetMargin < 100 && fullCostPerServing > 0) {
    // Usa Full Cost: Precio = Costo Total / (1 - Margen%)
    suggestedPrice = fullCostPerServing / (1 - targetMargin / 100);
  } else if (targetFC > 0) {
    // Usa Food Cost: Precio = Costo Ingredientes / Food Cost%
    suggestedPrice = foodCostPerServing / (targetFC / 100);
  }

  const caloriesPerServing  = totalCalories / servings;
  const foodCostPercent     = salePrice > 0 ? (foodCostPerServing / salePrice) * 100 : 0;
  const fullCostPercent     = salePrice > 0 ? (fullCostPerServing / salePrice) * 100 : 0;
  const grossProfit         = salePrice - foodCostPerServing;
  const netProfit           = salePrice - fullCostPerServing;
  const grossMargin         = salePrice > 0 ? (grossProfit / salePrice) * 100 : 0;
  const netMargin           = salePrice > 0 ? (netProfit / salePrice) * 100 : 0;

  return {
    // Nivel 1
    totalCost, foodCostPerServing, foodCostPercent,
    // Nivel 2
    laborCost, primeCostPerServing,
    // Nivel 3
    packagingCost, overheadPerDish, fullCostPerServing, fullCostPercent,
    // Legacy alias para compatibilidad
    costPerServing: foodCostPerServing,
    // Nutrition
    totalCalories, totalProtein, totalCarbs, totalFat, caloriesPerServing,
    // Pricing
    suggestedPrice, grossProfit, netProfit, grossMargin, netMargin,
  };
}