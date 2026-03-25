import { base44 } from "@/api/base44Client";

/**
 * Crea asientos contables automáticos al completar una venta en POS.
 * Dr: 1100 Caja  |  Cr: 4100 Ventas de Alimentos
 * Dr: 5100 Costo de Alimentos  |  Cr: 1130 Inventario  (si hay costo calculado)
 */
export async function postSaleEntry({ orderNumber, total, tax, subtotal, paymentMethod, costOfGoods = 0, tip = 0 }) {
  const today = new Date().toISOString().split("T")[0];

  const drAccount = paymentMethod === "card" ? "1110 Banco" : "1100 Caja / Efectivo";
  const drType = "Asset";

  const pmLabel = paymentMethod === "card" ? "Card" : paymentMethod === "mobile" ? "App" : "Cash";
  const taxAmt = parseFloat((tax || 0).toFixed(2));
  const subAmt = parseFloat((subtotal || total).toFixed(2));

  // Asiento 1a: Ventas netas  Dr: Caja  |  Cr: 4100 Ventas
  await base44.entities.JournalEntry.create({
    date: today,
    description: `Venta POS — ${orderNumber}`,
    account_dr: drAccount,
    account_dr_type: drType,
    account_cr: "4100 Ventas de Alimentos",
    account_cr_type: "Income",
    amount_dr: subAmt,
    amount_cr: subAmt,
    category: "Revenue",
    reference: orderNumber,
    payment_method: pmLabel,
    notes: `Subtotal $${subAmt.toFixed(2)}`,
  });

  // Asiento 1b: Sales Tax  Dr: Caja  |  Cr: 2120 Sales Tax Payable
  if (taxAmt > 0) {
    await base44.entities.JournalEntry.create({
      date: today,
      description: `Sales Tax POS — ${orderNumber}`,
      account_dr: drAccount,
      account_dr_type: drType,
      account_cr: "2120 Sales Tax Payable",
      account_cr_type: "Liability",
      amount_dr: taxAmt,
      amount_cr: taxAmt,
      category: "Liability",
      reference: orderNumber,
      payment_method: pmLabel,
      notes: `Sales Tax sobre venta $${subAmt.toFixed(2)}`,
    });
  }

  // Asiento 1c: Tip  Dr: Caja  |  Cr: 2300 Tips por Pagar
  const tipAmt = parseFloat((tip || 0).toFixed(2));
  if (tipAmt > 0) {
    await base44.entities.JournalEntry.create({
      date: today,
      description: `Tip POS — ${orderNumber}`,
      account_dr: drAccount,
      account_dr_type: drType,
      account_cr: "2300 Tips por Pagar",
      account_cr_type: "Liability",
      amount_dr: tipAmt,
      amount_cr: tipAmt,
      category: "Liability",
      reference: orderNumber,
      payment_method: pmLabel,
      notes: `Propina $${tipAmt.toFixed(2)}`,
    });
  }

  // Asiento 2: Costo de ventas (solo si hay costo calculado)
  // Debit desglosado por tipo de inventario
  if (costOfGoods > 0) {
    await base44.entities.JournalEntry.create({
      date: today,
      description: `COGS POS — ${orderNumber}`,
      account_dr: "5100 Costo de Alimentos",
      account_dr_type: "Expense",
      account_cr: "1130 Food Inventory",
      account_cr_type: "Asset",
      amount_dr: costOfGoods,
      amount_cr: costOfGoods,
      category: "Cost of Sales",
      reference: orderNumber,
      payment_method: "Cash",
    });
  }
}

/**
 * Crea asientos para gastos operativos (utilities, rent, etc.)
 * Dr: 6xxx (Expense)  |  Cr: 1100 Caja o 2100 Cuentas por Pagar
 */
export async function postOperatingExpenseEntry({ description, accountCode, accountName, amount, payWithCash = true, reference = "" }) {
  const today = new Date().toISOString().split("T")[0];

  await base44.entities.JournalEntry.create({
    date: today,
    description: `${accountName} — ${description}`,
    account_dr: `${accountCode} ${accountName}`,
    account_dr_type: "Expense",
    account_cr: payWithCash ? "1100 Caja / Efectivo" : "2100 Cuentas por Pagar",
    account_cr_type: payWithCash ? "Asset" : "Liability",
    amount_dr: amount,
    amount_cr: amount,
    category: "Operating Expense",
    reference,
    payment_method: payWithCash ? "Cash" : "Other",
    is_irs_deductible: true,
  });
}

/**
 * Crea asientos de nómina
 * Dr: 6120 (Direct Labor) + 6121 (Indirect Labor)  |  Cr: 2100 (A/P) o 1100 (Caja)
 */
export async function postPayrollEntry({ employeeName, directLaborAmount = 0, indirectLaborAmount = 0, payWithCash = true, reference = "" }) {
  const today = new Date().toISOString().split("T")[0];

  if (directLaborAmount > 0) {
    await base44.entities.JournalEntry.create({
      date: today,
      description: `Direct Labor — ${employeeName}`,
      account_dr: "6120 Direct Labor (Kitchen)",
      account_dr_type: "Expense",
      account_cr: payWithCash ? "1100 Caja / Efectivo" : "2100 Cuentas por Pagar",
      account_cr_type: payWithCash ? "Asset" : "Liability",
      amount_dr: directLaborAmount,
      amount_cr: directLaborAmount,
      category: "Operating Expense",
      reference,
      payment_method: payWithCash ? "Cash" : "Other",
      is_irs_deductible: true,
    });
  }

  if (indirectLaborAmount > 0) {
    await base44.entities.JournalEntry.create({
      date: today,
      description: `Indirect Labor — ${employeeName}`,
      account_dr: "6121 Indirect Labor (Admin/Cashier)",
      account_dr_type: "Expense",
      account_cr: payWithCash ? "1100 Caja / Efectivo" : "2100 Cuentas por Pagar",
      account_cr_type: payWithCash ? "Asset" : "Liability",
      amount_dr: indirectLaborAmount,
      amount_cr: indirectLaborAmount,
      category: "Operating Expense",
      reference,
      payment_method: payWithCash ? "Cash" : "Other",
      is_irs_deductible: true,
    });
  }
}

/**
 * Crea asiento contable al registrar una compra / reabastecimiento de inventario.
 * Dr: 1130 Inventario  |  Cr: 2100 Cuentas por Pagar  (o Caja si es contado)
 */
export async function postPurchaseEntry({ description, amount, reference = "", payWithCash = false }) {
  const today = new Date().toISOString().split("T")[0];

  await base44.entities.JournalEntry.create({
    date: today,
    description: `Compra Inventario — ${description}`,
    account_dr: "1130 Inventario",
    account_dr_type: "Asset",
    account_cr: payWithCash ? "1100 Caja / Efectivo" : "2100 Cuentas por Pagar",
    account_cr_type: payWithCash ? "Asset" : "Liability",
    amount_dr: amount,
    amount_cr: amount,
    category: "Cost of Sales",
    reference,
    payment_method: payWithCash ? "Cash" : "Other",
    is_irs_deductible: true,
  });
}