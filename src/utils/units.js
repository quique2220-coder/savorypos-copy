export const UNITS = [
  { code: 'pcs',    name: 'Piezas',       type: 'count' },
  { code: 'bunch',  name: 'Manojo',       type: 'count' },
  { code: 'g',      name: 'Gramo',        type: 'weight' },
  { code: 'kg',     name: 'Kilogramo',    type: 'weight' },
  { code: 'oz',     name: 'Onza',         type: 'weight' },
  { code: 'lb',     name: 'Libra',        type: 'weight' },
  { code: 'ml',     name: 'Mililitro',     type: 'volume' },
  { code: 'l',      name: 'Litro',        type: 'volume' },
  { code: 'tsp',    name: 'Cucharadita',  type: 'volume' },
  { code: 'tbsp',   name: 'Cucharada',    type: 'volume' },
  { code: 'cup',    name: 'Taza',         type: 'volume' },
  { code: 'fl_oz',  name: 'Fl. Onza',     type: 'volume' },
  { code: 'gallon', name: 'Galón',        type: 'volume' },
];

export const UNIT_LABEL = Object.fromEntries(UNITS.map(u => [u.code, `${u.name} (${u.code})`]));

export const UNIT_TYPES = Object.fromEntries(UNITS.map(u => [u.code, u.type]));

// ── Canonical conversion system ──
// Each unit maps to a base quantity (grams for weight, ml for volume).
// getConversionFactor(from, to) = TO_BASE[from] / TO_BASE[to]
// This guarantees exact, complete conversions between ANY two units of the same type.
export const TO_BASE = {
  // weight → grams
  g: 1,
  kg: 1000,
  oz: 28.349523125,
  lb: 453.59237,
  // volume → milliliters
  ml: 1,
  l: 1000,
  tsp: 4.92892159375,
  tbsp: 14.78676478125,
  cup: 236.5882365,
  fl_oz: 29.5735295625,
  gallon: 3785.411784,
  // count → each (no cross-conversion)
  pcs: 1,
  bunch: 1,
};

/**
 * Returns how many `toUnit` are in 1 `fromUnit`.
 * Example: getConversionFactor('kg', 'g') → 1000
 *          getConversionFactor('lb', 'oz') → 16
 *          getConversionFactor('cup', 'tbsp') → 16
 * Returns null if units are different types (e.g. weight vs volume).
 */
export function getConversionFactor(fromUnit, toUnit) {
  if (fromUnit === toUnit) return 1;

  const fromType = UNIT_TYPES[fromUnit];
  const toType = UNIT_TYPES[toUnit];

  if (!fromType || !toType || fromType !== toType) return null;

  // Count units only convert to themselves (handled above)
  if (fromType === 'count') return null;

  const fromBase = TO_BASE[fromUnit];
  const toBase = TO_BASE[toUnit];

  if (!fromBase || !toBase) return null;

  return fromBase / toBase;
}

export const ALLERGENS = [
  'Gluten', 'Lácteos', 'Huevo', 'Nueces', 'Cacahuate',
  'Soya', 'Mariscos', 'Pescado', 'Ajonjolí', 'Mostaza',
];

export const INGREDIENT_CATEGORIES = [
  'Proteínas', 'Lácteos', 'Verduras', 'Frutas', 'Granos',
  'Bebidas', 'Especias', 'Salsas', 'Empaque', 'Otro',
];