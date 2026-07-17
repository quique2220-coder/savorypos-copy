/**
 * Calcula el costo real de un MenuItem desde sus recipe_ingredients,
 * usando datos live del Ingredient maestro (purchase_price, yield, conversión de unidades).
 * Esto asegura consistencia total entre Reports, OpportunityFinder y Recipes.
 */
import { costPerBaseUnit } from './recipeCalculator';
import { getConversionFactor } from './units';

const round = (n, d = 4) => {
  const p = Math.pow(10, d);
  return Math.round((n + Number.EPSILON) * p) / p;
};

/**
 * Construye un lookup map de ingredientes por nombre (lowercase).
 */
export function buildIngredientsMap(ingredients = []) {
  const map = {};
  ingredients.forEach(ing => {
    if (ing.name) map[ing.name.toLowerCase().trim()] = ing;
  });
  return map;
}

/**
 * Calcula el costo real de ingredientes por porción para un MenuItem.
 * Prioriza datos live del Ingredient maestro; fallback al `cost` almacenado por línea.
 *
 * @param {object} menuItem
 * @param {object} ingredientsMap  mapa nombre→ingredient (de buildIngredientsMap)
 * @returns {{ costPerServing: number, totalIngredientCost: number, matchedLines: number, totalLines: number }}
 */
export function calcMenuItemCost(menuItem, ingredientsMap = {}) {
  if (!menuItem) return { costPerServing: 0, totalIngredientCost: 0, matchedLines: 0, totalLines: 0 };

  const recipeIngredients = menuItem.recipe_ingredients || [];
  const servings = menuItem.recipe_servings || 1;

  if (recipeIngredients.length === 0) {
    const stored = menuItem.cost || 0;
    return {
      costPerServing: round(stored, 4),
      totalIngredientCost: round(stored * servings, 4),
      matchedLines: 0,
      totalLines: 0,
    };
  }

  let totalCost = 0;
  let matchedLines = 0;

  for (const line of recipeIngredients) {
    const ing = ingredientsMap[line.name?.toLowerCase().trim()];
    if (ing && ing.base_unit && line.unit) {
      const cpu = costPerBaseUnit(ing);
      const factor = getConversionFactor(line.unit, ing.base_unit);
      if (factor !== null && factor > 0 && cpu > 0) {
        totalCost += (line.quantity || 0) * factor * cpu;
        matchedLines++;
        continue;
      }
    }
    // Fallback al costo almacenado en la línea
    totalCost += line.cost || 0;
  }

  return {
    totalIngredientCost: round(totalCost, 4),
    costPerServing: round(totalCost / servings, 4),
    matchedLines,
    totalLines: recipeIngredients.length,
  };
}