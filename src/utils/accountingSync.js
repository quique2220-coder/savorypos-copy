import { base44 } from "@/api/base44Client";

/**
 * Crea asientos contables automáticos al completar una venta en POS.
 * Dr: 1100 Caja  |  Cr: 4100 Ventas de Alimentos
 * Dr: 5100 Costo de Alimentos  |  Cr: 1130 Inventario  (si hay costo calculado)
 */
export async function postSaleEntry({ orderNumber, total, tax, subtotal, paymentMethod, costOfGoods = 0 }) {
  const today = new Date().toISOString().split("T")[0];

  const drAccount = paymentMethod === "card" ? "1110 Banco" : "1100 Caja / Efectivo";
  const drType = "Asset";

  // Asiento 1: Ingresos
  await base44.entities.JournalEntry.create({
    date: today,
    description: `Venta POS — ${orderNumber}`,
    account_dr: drAccount,
    account_dr_type: drType,
    account_cr: "4100 Ventas de Alimentos",
    account_cr_type: "Income",
    amount_dr: total,
    amount_cr: total,
    category: "Revenue",
    reference: orderNumber,
    payment_method: paymentMethod === "card" ? "Card" : paymentMethod === "mobile" ? "App" : "Cash",
    notes: `Subtotal $${subtotal?.toFixed(2)} | Tax $${tax?.toFixed(2)}`,
  });

  // Asiento 2: Costo de ventas (solo si hay costo calculado)
  if (costOfGoods > 0) {
    await base44.entities.JournalEntry.create({
      date: today,
      description: `COGS POS — ${orderNumber}`,
      account_dr: "5100 Costo de Alimentos",
      account_dr_type: "Expense",
      account_cr: "1130 Inventario",
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