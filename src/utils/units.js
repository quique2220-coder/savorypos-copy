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

// Factores de conversión base: from_code → to_code → factor
export const CONVERSIONS = {
  lb:     { oz: 16 },
  kg:     { g: 1000 },
  l:      { ml: 1000 },
  tbsp:   { tsp: 3 },
  cup:    { tbsp: 16, fl_oz: 8 },
  gallon: { cup: 16, fl_oz: 128 },
};

export const ALLERGENS = [
  'Gluten', 'Lácteos', 'Huevo', 'Nueces', 'Cacahuate',
  'Soya', 'Mariscos', 'Pescado', 'Ajonjolí', 'Mostaza',
];

export const INGREDIENT_CATEGORIES = [
  'Proteínas', 'Lácteos', 'Verduras', 'Frutas', 'Granos',
  'Bebidas', 'Especias', 'Salsas', 'Empaque', 'Otro',
];