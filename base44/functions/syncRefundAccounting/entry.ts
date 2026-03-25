import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Automation function triggered when a Refund is processed.
 * Creates accounting entries for refunds:
 * Dr: 4150 Sales Returns & Allowances (contra-revenue)
 * Cr: Cash/Bank (reduction in assets)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (!event || !data) {
      return Response.json({ error: 'Missing event or data' }, { status: 400 });
    }

    console.log(`[syncRefundAccounting] Processing ${event.type} for Refund ${data.order_number}`);

    // Only process when refund is marked processed
    if (data.status !== 'processed') {
      return Response.json({ success: true, message: 'Refund not processed, skipping' });
    }

    const today = data.created_date?.split('T')[0] || new Date().toISOString().split('T')[0];
    const refundAmount = parseFloat((data.amount || 0).toFixed(2));

    if (refundAmount <= 0) {
      return Response.json({ success: true, message: 'No refund amount, skipping' });
    }

    // Determine payment account based on refund method
    let crAccount = '1100 Cash';
    if (data.refund_method === 'card') crAccount = '1110 Bank Account';
    if (data.refund_method === 'store_credit') crAccount = '1120 Accounts Receivable';

    // Create refund entry
    // Dr: 4150 Sales Returns (contra-revenue, reduces income)
    // Cr: Cash/Bank/Receivable
    await base44.asServiceRole.entities.JournalEntry.create({
      date: today,
      description: `Refund — ${data.order_number}`,
      account_dr: '4150 Sales Returns & Allowances',
      account_dr_type: 'Income',
      account_cr: crAccount,
      account_cr_type: 'Asset',
      amount_dr: refundAmount,
      amount_cr: refundAmount,
      category: 'Revenue',
      reference: data.order_number,
      payment_method: data.refund_method || 'Cash',
      notes: `${data.reason || 'Refund'} - ${data.notes || ''}`,
    });

    console.log(`[syncRefundAccounting] Created refund entry for ${data.order_number}: $${refundAmount}`);
    return Response.json({ success: true, refund: data.order_number });
  } catch (error) {
    console.error('[syncRefundAccounting] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});