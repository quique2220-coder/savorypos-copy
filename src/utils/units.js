export const UNITS = [
  { code: 'pcs',    name: 'Piezas',       type: 'count' },
  { code: 'g',      name: 'Gramo',        type: 'weight' },
  { code: 'kg',     name: 'Kilogramo',    type: 'weight' },
  { code: 'oz',     name: 'Onza',         type: 'weight' },
  { code: 'lb',     name: 'Libra',        type: 'weight' },
  { code: 'ml',     name: 'Mililitro',    type: 'volume' },
  { code: 'l',      name: 'Litro',        type: 'volume' },
  { code: 'tsp',    name: 'Cucharadita',  type: 'volume' },
  { code: 'tbsp',   name: 'Cucharada',    type: 'volume' },
  { code: 'cup',    name: 'Taza',         type: 'volume' },
  { code: 'fl_oz',  name: 'Fl. Onza',     type: 'volume' },
  { code: 'gallon', name: 'Galón',        type: 'volume' },
];

export const UNIT_LABEL = Object.fromEntries(UNITS.map(u => [u.code, `${u.name} (${u.code})`]));

export const UNIT_TYPES = Object.fromEntries(UNITS.map(u => [u.code, u.type]));

// Factores de conversión base: from_code → to_code → factor
export const CONVERSIONS = {
  lb:     { oz: 16 },
  kg:     { g: 1000 },
  l:      { ml: 1000 },
  tbsp:   { tsp: 3 },
  cup:    { tbsp: 16, fl_oz: 8 },
  gallon: { cup: 16, fl_oz: 128 },
};

export function getConversionFactor(fromUnit, toUnit) {
  if (fromUnit === toUnit) {
    return 1;
  }

  const fromType = UNIT_TYPES[fromUnit];
  const toType = UNIT_TYPES[toUnit];

  if (!fromType || !toType || fromType !== toType) {
    return null;
  }

  if (CONVERSIONS[fromUnit] && CONVERSIONS[fromUnit][toUnit]) {
    return CONVERSIONS[fromUnit][toUnit];
  }

  if (CONVERSIONS[toUnit] && CONVERSIONS[toUnit][fromUnit]) {
    return 1 / CONVERSIONS[toUnit][fromUnit];
  }

  return null;
}

export const ALLERGENS = [
  'Gluten', 'Lácteos', 'Huevo', 'Nueces', 'Cacahuate',
  'Soya', 'Mariscos', 'Pescado', 'Ajonjolí', 'Mostaza',
];

export const INGREDIENT_CATEGORIES = [
  'Proteínas', 'Lácteos', 'Verduras', 'Frutas', 'Granos',
  'Bebidas', 'Especias', 'Salsas', 'Empaque', 'Otro',
];