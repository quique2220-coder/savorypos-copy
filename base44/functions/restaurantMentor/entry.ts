import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // 1. Obtenemos los datos clave para el análisis
    const [recipes, ingredients, orders] = await Promise.all([
      base44.entities.Recipe.list(),
      base44.entities.Ingredient.list(),
      base44.entities.Order.list()
    ]);

    // 2. Lógica de Mentoría: Buscamos anomalías
    const lowMarginRecipes = recipes.filter(r => {
      const margin = ((r.sale_price - r.cost_per_unit) / r.sale_price) * 100;
      return margin < 20; // Alertar si el margen es menor al 20%
    });

    const missingCosts = recipes.filter(r => !r.cost_per_unit || r.cost_per_unit === 0);

    // 3. Construimos el consejo del mentor
    let advice = "Tu mentoría de hoy: ";
    
    if (missingCosts.length > 0) {
      advice += `Tienes ${missingCosts.length} platillos sin costo calculado. Revisa las unidades en Ingredients para que el POS pueda darte datos reales. `;
    }

    if (lowMarginRecipes.length > 0) {
      advice += `¡Atención! Tienes ${lowMarginRecipes.length} platillos con márgenes muy bajos. Considera revisar precios. `;
    } else {
      advice += "Tus márgenes están saludables. Buen trabajo manteniendo los costos bajo control. ";
    }

    return Response.json({ 
      mentor_advice: advice,
      stats: {
        total_recipes: recipes.length,
        at_risk: lowMarginRecipes.length
      }
    });

  } catch (error) {
    console.error('Error en Mentoría:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});