import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Try to get current user (manual call). In scheduled mode, no user context.
    let user = null;
    try {
      user = await base44.auth.me();
    } catch {}

    const body = await req.json().catch(() => ({}));
    const targetDate = body.date || new Date().toISOString().split('T')[0];

    // Fetch all data once (service role) — then filter per user in memory
    const allOrders = await base44.asServiceRole.entities.Order.list('-created_date', 1000);
    const allRecipes = await base44.asServiceRole.entities.Recipe.list();
    const allIngredients = await base44.asServiceRole.entities.Ingredient.list();
    const allOpEx = await base44.asServiceRole.entities.OperatingExpense.list();

    // Manual mode: send current user their own personalized summary
    if (user && !body.all_users) {
      const result = await computeAndSendForUser(
        user.id, user.email, targetDate,
        allOrders, allRecipes, allIngredients, allOpEx, base44
      );
      return Response.json(result);
    }

    // Scheduled mode: each user gets their OWN summary with only their data
    const users = await base44.asServiceRole.entities.User.list();
    const results = [];
    for (const u of users) {
      if (!u.email) continue;
      try {
        const r = await computeAndSendForUser(
          u.id, u.email, targetDate,
          allOrders, allRecipes, allIngredients, allOpEx, base44
        );
        results.push({
          email: u.email,
          sent: r.emailSent,
          orderCount: r.summary?.orderCount || 0,
          revenue: r.summary?.revenue || 0,
        });
      } catch (e) {
        results.push({ email: u.email, error: e.message });
      }
    }
    return Response.json({ results, date: targetDate });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function computeAndSendForUser(userId, email, targetDate, allOrders, allRecipes, allIngredients, allOpEx, base44) {
  // Filter data to only this user's records (multi-tenant isolation)
  const userOrders = allOrders.filter(o => o.created_by_id === userId);
  const userRecipes = allRecipes.filter(r => r.created_by_id === userId);
  const userIngredients = allIngredients.filter(i => i.created_by_id === userId);
  const userOpEx = allOpEx.filter(e => e.created_by_id === userId);

  const ingMap = Object.fromEntries(userIngredients.map(i => [i.id, i]));

  const dayStart = new Date(targetDate + 'T00:00:00');
  const dayEnd = new Date(targetDate + 'T23:59:59.999');

  const todayOrders = userOrders.filter((o) => {
    if (o.status !== 'completed' || !o.created_date) return false;
    const d = new Date(o.created_date);
    return d >= dayStart && d <= dayEnd;
  });

  const totalMonthlyOpEx = userOpEx.reduce((s, e) => s + (e.amount || 0), 0);
  const dailyOpEx = totalMonthlyOpEx / 30;

  let revenue = 0, cogs = 0, totalTips = 0;
  const itemCounts = {};
  const paymentBreakdown = {};

  todayOrders.forEach((o) => {
    revenue += o.total || 0;
    totalTips += parseFloat(o.tip) || 0;
    const m = o.payment_method || 'cash';
    paymentBreakdown[m] = (paymentBreakdown[m] || 0) + (o.total || 0);
    o.items?.forEach((item) => {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + (item.quantity || 1);
      const recipe = userRecipes.find((r) => r.id === item.menu_item_id);
      if (recipe?.recipe_items) {
        recipe.recipe_items.forEach((ri) => {
          const ing = ingMap[ri.ingredient_id];
          if (!ing) return;
          const purchaseQty = ing.purchase_quantity || 1;
          const purchasePrice = ing.purchase_price || 0;
          const yieldPct = (ing.yield_percent || 100) / 100;
          const cpu = purchaseQty > 0 ? (purchasePrice / purchaseQty) / yieldPct : 0;
          cogs += cpu * (ri.quantity || 0) * (item.quantity || 1);
        });
      }
    });
  });

  const grossProfit = revenue - cogs;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netProfit = grossProfit - dailyOpEx;
  const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  const topItems = Object.entries(itemCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const summary = {
    date: targetDate,
    orderCount: todayOrders.length,
    revenue, cogs, grossProfit, grossMargin,
    dailyOpEx, netProfit, netMargin, totalTips,
    avgTicket: todayOrders.length > 0 ? revenue / todayOrders.length : 0,
    paymentBreakdown, topItems,
  };

  // Build email body
  const paymentLines = Object.entries(paymentBreakdown)
    .map(([m, v]) => `  ${m}: $${v.toFixed(2)}`)
    .join('\n') || '  Sin ventas';

  const topItemsLines = topItems
    .map((i, idx) => `  ${idx + 1}. ${i.name} — ${i.count} uds`)
    .join('\n') || '  Sin ventas';

  const emailBody = `📊 RESUMEN DEL TURNO — ${targetDate}
═══════════════════════════════════

VENTAS
  Órdenes completadas: ${summary.orderCount}
  Ingresos totales: $${revenue.toFixed(2)}
  Ticket promedio: $${summary.avgTicket.toFixed(2)}
  Propinas: $${totalTips.toFixed(2)}

COSTOS Y MÁRGENES
  COGS (ingredientes): $${cogs.toFixed(2)}
  Utilidad bruta: $${grossProfit.toFixed(2)}
  Margen bruto: ${grossMargin.toFixed(1)}%
  Gastos operativos (diario): $${dailyOpEx.toFixed(2)}
  Utilidad neta: $${netProfit.toFixed(2)}
  Margen neto: ${netMargin.toFixed(1)}%

MÉTODOS DE PAGO
${paymentLines}

TOP 5 PLATILLOS
${topItemsLines}

═══════════════════════════════════
${netProfit >= 0 ? '✅ Turno rentable' : '⚠️ Revisa tus costos'}
Generado por SavoryPOS`;

  let emailSent = false;
  let emailError = null;
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: `📊 Resumen del Turno — ${targetDate} — Ingresos $${revenue.toFixed(2)} · Margen ${netMargin.toFixed(1)}%`,
      body: emailBody,
    });
    emailSent = true;
  } catch (e) {
    emailError = e.message;
  }

  return { summary, emailSent, emailError, recipient: email };
}