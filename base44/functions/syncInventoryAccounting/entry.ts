import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Automation function triggered when InventoryItem is updated.
 * If stock increased significantly (indicating a purchase), create a journal entry.
 * Dr: 1130/1131/1132 Inventory (based on type)
 * Cr: 2100 Accounts Payable
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    if (!event || !data) {
      return Response.json({ error: 'Missing event or data' }, { status: 400 });
    }

    // Only process updates (detecting stock increases as purchases)
    if (event.type !== 'update' || !old_data) {
      return Response.json({ success: true, message: 'Not an update, skipping' });
    }

    const oldStock = parseFloat(old_data.current_stock || 0);
    const newStock = parseFloat(data.current_stock || 0);
    const stockIncrease = newStock - oldStock;

    // Only create entry if stock increased (new purchase detected)
    if (stockIncrease <= 0) {
      return Response.json({ success: true, message: 'Stock decreased or same, skipping' });
    }

    console.log(`[syncInventoryAccounting] Stock increase detected for ${data.name}: +${stockIncrease}`);

    const today = data.updated_date?.split('T')[0] || new Date().toISOString().split('T')[0];
    const costPerUnit = parseFloat((data.cost_per_unit || 0).toFixed(2));
    const purchaseCost = (stockIncrease * costPerUnit).toFixed(2);

    if (parseFloat(purchaseCost) <= 0) {
      return Response.json({ success: true, message: 'No cost calculated, skipping' });
    }

    // Determine inventory account based on category
    let invAccount = '1130 Food Inventory';
    if (data.category?.toLowerCase().includes('beverage')) invAccount = '1131 Beverage Inventory';
    if (data.category?.toLowerCase().includes('packaging')) invAccount = '1132 Packaging Inventory';

    // Create purchase entry
    // Dr: Inventory  |  Cr: Accounts Payable (can be modified to Cash if paid immediately)
    await base44.asServiceRole.entities.JournalEntry.create({
      date: today,
      description: `Inventory Purchase — ${data.name}`,
      account_dr: invAccount,
      account_dr_type: 'Asset',
      account_cr: '2100 Accounts Payable',
      account_cr_type: 'Liability',
      amount_dr: parseFloat(purchaseCost),
      amount_cr: parseFloat(purchaseCost),
      category: 'Cost of Sales',
      reference: data.name,
      payment_method: 'Other',
      notes: `${data.supplier || 'Supplier'} - ${stockIncrease} units @ $${costPerUnit}`,
      is_irs_deductible: true,
    });

    console.log(`[syncInventoryAccounting] Created purchase entry for ${data.name}: $${purchaseCost}`);
    return Response.json({ success: true, inventory: data.name, amount: purchaseCost });
  } catch (error) {
    console.error('[syncInventoryAccounting] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});