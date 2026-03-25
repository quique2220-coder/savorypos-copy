import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const EXPENSE_ACCOUNT_MAP = {
  commissary: { code: '5100', name: 'Food Cost' },
  insurance: { code: '6150', name: 'Insurance' },
  electricity: { code: '6110', name: 'Utilities' },
  water: { code: '6110', name: 'Utilities' },
  gas: { code: '6110', name: 'Utilities' },
  internet: { code: '6110', name: 'Utilities' },
  rent: { code: '6100', name: 'Rent' },
  indirect_labor: { code: '6121', name: 'Indirect Labor (Admin/Cashier)' },
  admin: { code: '6190', name: 'Accounting / Legal' },
  cleaning: { code: '6170', name: 'Repairs & Maintenance' },
  packaging: { code: '5120', name: 'Packaging' },
  card_fees: { code: '6160', name: 'Delivery App Fees' },
  maintenance: { code: '6170', name: 'Repairs & Maintenance' },
  waste: { code: '5120', name: 'Packaging' },
  other: { code: '6190', name: 'Accounting / Legal' },
};

/**
 * Automation function triggered when an OperatingExpense is created.
 * Maps expense category to accounting code and creates journal entry.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (!event || !data) {
      return Response.json({ error: 'Missing event or data' }, { status: 400 });
    }

    console.log(`[syncExpenseAccounting] Processing ${event.type} for Expense: ${data.name}`);

    const today = data.created_date?.split('T')[0] || new Date().toISOString().split('T')[0];
    const amount = parseFloat((data.amount || 0).toFixed(2));

    if (amount <= 0) {
      return Response.json({ success: true, message: 'No expense amount, skipping' });
    }

    // Get accounting code from category
    const acctInfo = EXPENSE_ACCOUNT_MAP[data.category] || EXPENSE_ACCOUNT_MAP.other;

    // Create expense entry
    // Dr: 6xxx Expense  |  Cr: 1100 Cash (assumes paid in cash; could be modified for credit)
    await base44.asServiceRole.entities.JournalEntry.create({
      date: today,
      description: `${data.name}`,
      account_dr: `${acctInfo.code} ${acctInfo.name}`,
      account_dr_type: 'Expense',
      account_cr: '1100 Cash',
      account_cr_type: 'Asset',
      amount_dr: amount,
      amount_cr: amount,
      category: 'Operating Expense',
      reference: data.name,
      payment_method: 'Cash',
      notes: data.notes || '',
      is_irs_deductible: true,
    });

    console.log(`[syncExpenseAccounting] Created expense entry for ${data.name}: $${amount}`);
    return Response.json({ success: true, expense: data.name });
  } catch (error) {
    console.error('[syncExpenseAccounting] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});