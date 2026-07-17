import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const targetDate = body.date || new Date().toISOString().split('T')[0];

    // Fetch today's completed orders
    const orders = await base44.asServiceRole.entities.Order.list('-created_date', 500);
    const dayStart = new Date(targetDate + 'T00:00:00');
    const dayEnd = new Date(targetDate + 'T23:59:59.999');

    const todayOrders = orders.filter((o) => {
      if (o.status !== 'completed' || !o.created_date) return false;
      const d = new Date(o.created_date);
      return d >= dayStart && d <= dayEnd;
    });

    // Fetch menu items and ingredients for COGS calculation
    const menuItems = await base44.asServiceRole.entities.MenuItem.list();
    const ingredients = await base44.asServiceRole.entities.Ingredient.list();
    const ingMap = Object.fromEntries(ingredients.map(i => [i.id, i]));

    // Fetch operating expenses (monthly → daily allocation)
    const opExpenses = await base44.asServiceRole.entities.OperatingExpense.list();
    const totalMonthlyOpEx = opExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const dailyOpEx = totalMonthlyOpEx / 30;

    // Calculate revenue and COGS
    let revenue = 0;
    let cogs = 0;
    let totalTips = 0;
    const itemCounts = {};

    todayOrders.forEach((o) => {
      revenue += o.total || 0;
      totalTips += parseFloat(o.tip) || 0;
      o.items?.forEach((item) => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + (item.quantity || 1);
        const menuItem = menuItems.find((m) => m.id === item.menu_item_id);
        if (menuItem?.recipe_ingredients) {
          menuItem.recipe_ingredients.forEach((ri) => {
            const ing = ingMap[ri.ingredient_id];
            if (!ing) return;
            const purchaseQty = ing.purchase_quantity || 1;
            const purchasePrice = ing.purchase_price || 0;
            const yieldPct = (ing.yield_percent || 100) / 100;
            const cpu = purchaseQty > 0 ? (purchasePrice / purchaseQty) / yieldPct : 0;
            cogs += (ri.cost || cpu * (ri.quantity || 0)) * (item.quantity || 1);
          });
        }
      });
    });

    const grossProfit = revenue - cogs;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const netProfit = grossProfit - dailyOpEx;
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    // Payment method breakdown
    const paymentBreakdown = {};
    todayOrders.forEach((o) => {
      const m = o.payment_method || 'cash';
      paymentBreakdown[m] = (paymentBreakdown[m] || 0) + (o.total || 0);
    });

    // Top items
    const topItems = Object.entries(itemCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const summary = {
      date: targetDate,
      orderCount: todayOrders.length,
      revenue,
      cogs,
      grossProfit,
      grossMargin,
      dailyOpEx,
      netProfit,
      netMargin,
      totalTips,
      avgTicket: todayOrders.length > 0 ? revenue / todayOrders.length : 0,
      paymentBreakdown,
      topItems,
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

    // Send email to the current user
    let emailSent = false;
    let emailError = null;
    if (user.email) {
      try {
        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: `📊 Resumen del Turno — ${targetDate} — Ingresos $${revenue.toFixed(2)} · Margen ${netMargin.toFixed(1)}%`,
          body: emailBody,
        });
        emailSent = true;
      } catch (e) {
        emailError = e.message;
      }
    }

    return Response.json({ summary, emailSent, emailError, recipient: user.email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});