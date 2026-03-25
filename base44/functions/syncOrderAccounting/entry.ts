import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Automation function triggered when an Order is created or updated.
 * Generates accounting entries for sales, COGS, and inventory impact.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (!event || !data) {
      return Response.json({ error: 'Missing event or data' }, { status: 400 });
    }

    console.log(`[syncOrderAccounting] Processing ${event.type} for Order ${data.order_number}`);

    // Only process completed orders
    if (data.status !== 'completed') {
      return Response.json({ success: true, message: 'Order not completed, skipping' });
    }

    // Fetch full order data if needed
    const order = await base44.entities.Order.read(event.entity_id);
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    const today = order.created_date?.split('T')[0] || new Date().toISOString().split('T')[0];

    // Determine payment account
    const paymentMethod = order.payment_method || 'cash';
    const drAccount = paymentMethod === 'card' ? '1110 Bank Account' : '1100 Cash';
    const drType = 'Asset';
    const pmLabel = paymentMethod === 'card' ? 'Card' : paymentMethod === 'mobile' ? 'App' : 'Cash';

    // Parse amounts
    const subtotal = parseFloat((order.subtotal || 0).toFixed(2));
    const tax = parseFloat((order.tax || 0).toFixed(2));
    const tip = parseFloat((order.tip || 0).toFixed(2));

    // Revenue entry: Cash/Bank -> Sales
    await base44.asServiceRole.entities.JournalEntry.create({
      date: today,
      description: `Order Sale — ${order.order_number}`,
      account_dr: drAccount,
      account_dr_type: drType,
      account_cr: '4100 Food Sales',
      account_cr_type: 'Income',
      amount_dr: subtotal,
      amount_cr: subtotal,
      category: 'Revenue',
      reference: order.order_number,
      payment_method: pmLabel,
      notes: `Order total: $${order.total?.toFixed(2)}`,
    });

    // Sales Tax entry if applicable
    if (tax > 0) {
      await base44.asServiceRole.entities.JournalEntry.create({
        date: today,
        description: `Sales Tax — ${order.order_number}`,
        account_dr: drAccount,
        account_dr_type: drType,
        account_cr: '2120 Sales Tax Payable',
        account_cr_type: 'Liability',
        amount_dr: tax,
        amount_cr: tax,
        category: 'Liability',
        reference: order.order_number,
        payment_method: pmLabel,
      });
    }

    // Tip entry if present
    if (tip > 0) {
      await base44.asServiceRole.entities.JournalEntry.create({
        date: today,
        description: `Tip — ${order.order_number}`,
        account_dr: drAccount,
        account_dr_type: drType,
        account_cr: '2100 Accounts Payable',
        account_cr_type: 'Liability',
        amount_dr: tip,
        amount_cr: tip,
        category: 'Liability',
        reference: order.order_number,
        payment_method: pmLabel,
      });
    }

    console.log(`[syncOrderAccounting] Created entries for ${order.order_number}`);
    return Response.json({ success: true, order: order.order_number });
  } catch (error) {
    console.error('[syncOrderAccounting] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});