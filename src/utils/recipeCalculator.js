/**
 * Costo por unidad base, ajustado por rendimiento (yield).
 * effective_cost = (price / qty) / (yield_percent / 100)
 */
export function costPerBaseUnit(ingredient) {
  if (!ingredient) return 0;
  const { purchase_price = 0, purchase_quantity = 1, yield_percent = 100 } = ingredient;
  const raw = purchase_quantity > 0 ? purchase_price / purchase_quantity : 0;
  const yf = (yield_percent || 100) / 100;
  return yf > 0 ? raw / yf : raw;
}

/**
 * Calcula costo y macros de una línea de ingrediente.
 * quantity se asume en la misma unidad base del ingrediente.
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
 * Calcula los totales completos de una receta.
 * ingredientsMap: { [id]: ingredient }
 */
export function calcRecipeTotals(recipe, ingredientsMap) {
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

  const costPerServing      = totalCost / servings;
  const caloriesPerServing  = totalCalories / servings;
  const foodCostPercent     = salePrice > 0 ? (costPerServing / salePrice) * 100 : 0;
  const suggestedPrice      = targetFC > 0 ? costPerServing / (targetFC / 100) : 0;
  const grossProfit         = salePrice - costPerServing;
  const grossMargin         = salePrice > 0 ? (grossProfit / salePrice) * 100 : 0;

  return {
    totalCost, totalCalories, totalProtein, totalCarbs, totalFat,
    costPerServing, caloriesPerServing,
    foodCostPercent, suggestedPrice, grossProfit, grossMargin,
  };
}