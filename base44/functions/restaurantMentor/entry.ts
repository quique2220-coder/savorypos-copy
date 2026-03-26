import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const price = body.price;

    if (!price || price <= 0) {
      return Response.json({ error: 'Invalid price' }, { status: 400 });
    }

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get recipes and operating expenses for context
    const recipes = await base44.entities.Recipe.list();
    const expenses = await base44.entities.OperatingExpense.list();
    const orders = await base44.entities.Order.list();

    // Calculate basic metrics
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const avgDishCost = recipes.length > 0 
      ? recipes.reduce((sum, r) => sum + (r.sale_price || 0), 0) / recipes.length 
      : 0;
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 
      ? orders.reduce((sum, o) => sum + (o.total || 0), 0) / totalOrders 
      : 0;

    // Generate recommendations based on price
    const recommendations = generateRecommendations(
      price,
      avgDishCost,
      totalExpenses,
      avgOrderValue,
      recipes.length
    );

    return Response.json({ recommendations });
  } catch (error) {
    console.error('Error in restaurantMentor:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateRecommendations(price, avgCost, totalExpenses, avgOrder, dishCount) {
  const recommendations = [];
  
  // Recommendation 1: Margin analysis
  if (avgCost > 0) {
    const margin = ((price - avgCost) / price * 100).toFixed(1);
    if (margin < 30) {
      recommendations.push({
        title: "Optimizar margen de ganancia",
        description: `Tu margen actual es ${margin}%. Para restaurantes, el objetivo es 60-70%. Considera aumentar precio o reducir costo de ingredientes.`
      });
    } else if (margin > 75) {
      recommendations.push({
        title: "Precio competitivo",
        description: `Con margen del ${margin}%, estás bien posicionado. Asegúrate de que el precio refleje la calidad y ubicación de tu negocio.`
      });
    } else {
      recommendations.push({
        title: "Margen saludable",
        description: `Tu margen del ${margin}% es sólido. Mantén este balance entre competitividad y rentabilidad.`
      });
    }
  } else {
    recommendations.push({
      title: "Datos incompletos",
      description: "Completa el costo de ingredientes en tus recetas para análisis más precisos."
    });
  }

  // Recommendation 2: Volume and overhead
  if (totalExpenses > 0) {
    const overheadPerDish = dishCount > 0 ? (totalExpenses / 30 / dishCount).toFixed(2) : 0;
    if (dishCount < 20) {
      recommendations.push({
        title: "Expandir catálogo de platillos",
        description: `Tienes ${dishCount} platillos. Con más platillos, distribuyes mejor el overhead ($${overheadPerDish}/platillo) y atraes más clientes.`
      });
    } else {
      recommendations.push({
        title: "Catálogo estratégico",
        description: `Tu catálogo de ${dishCount} platillos es robusto. Enfócate en los 5 más populares para optimizar operaciones.`
      });
    }
  } else {
    recommendations.push({
      title: "Registrar gastos operativos",
      description: "Agrega tus gastos mensuales (renta, servicios, etc.) para mejor análisis de overhead."
    });
  }

  // Recommendation 3: Positioning and strategy
  if (avgOrder > 0) {
    if (price > avgOrder * 0.8) {
      recommendations.push({
        title: "Ticket promedio elevado",
        description: `Precio de $${price} es alto vs promedio ($${avgOrder.toFixed(2)}). Posiciónate en premium o bundlea con complementos.`
      });
    } else if (price < avgOrder * 0.3) {
      recommendations.push({
        title: "Oportunidad de upsell",
        description: `Precio de $${price} es accesible. Complementa con bebidas, postres o combos para aumentar ticket.`
      });
    } else {
      recommendations.push({
        title: "Posición de mercado equilibrada",
        description: `Precio de $${price} es competitivo. Diferenciáte con calidad, presentación o servicio excepcional.`
      });
    }
  } else {
    recommendations.push({
      title: "Comenzar a registrar ventas",
      description: "Registra tus órdenes para que el sistema entienda tu volumen y patrones de venta."
    });
  }

  return recommendations;
}