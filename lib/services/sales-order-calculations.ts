import { prisma } from "@/lib/prisma";
import { Decimal } from "decimal.js";
import {
  toDecimal,
  addDecimal,
  subtractDecimal,
  multiplyDecimal,
  divideDecimal,
  compareDecimal,
} from "@/lib/utils/decimal";

/**
 * Sales Order Calculations Service
 * Handles margin calculations, price ceiling validation, and order totals
 */

export type MarginCalculationResult = {
  subtotalSell: Decimal;
  subtotalCost: Decimal;
  marginAmount: Decimal;
  marginPercentage: Decimal;
  operationalCosts: Decimal;
  netMargin: Decimal;
  netMarginPercentage: Decimal;
};

/**
 * Calculate comprehensive margins untuk sales order
 * Includes operational costs (bensin, dll) per spec Section 9
 */
export async function calculateOrderMargins(
  orderId: string
): Promise<MarginCalculationResult> {
  const order = await prisma.salesOrder.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      items: true,
      operationalCosts: true,
    },
  });

  // Sum dari items
  const subtotalSell = order.items.reduce(
    (sum, item) => addDecimal(sum, item.subtotalSell),
    toDecimal(0)
  );

  const subtotalCost = order.items.reduce(
    (sum, item) => addDecimal(sum, item.subtotalCost),
    toDecimal(0)
  );

  // Margin kotor (sebelum operational costs)
  const marginAmount = subtractDecimal(subtotalSell, subtotalCost);
  const marginPercentage = subtotalCost.gt(0)
    ? divideDecimal(marginAmount, subtotalSell).times(100)
    : toDecimal(0);

  // Operational costs
  const operationalCosts = order.operationalCosts.reduce(
    (sum, cost) => addDecimal(sum, cost.amount),
    toDecimal(0)
  );

  // Margin bersih (setelah operational costs)
  const netMargin = subtractDecimal(marginAmount, operationalCosts);
  const netMarginPercentage = subtotalSell.gt(0)
    ? divideDecimal(netMargin, subtotalSell).times(100)
    : toDecimal(0);

  return {
    subtotalSell,
    subtotalCost,
    marginAmount,
    marginPercentage,
    operationalCosts,
    netMargin,
    netMarginPercentage,
  };
}

/**
 * Validate price ceiling untuk order item B2B
 * Per spec Section 4 point 7: pagu harga maksimal per produk per institusi
 */
export async function validatePriceCeiling(
  institutionId: string,
  productId: string,
  unitId: string,
  proposedPrice: Decimal | number,
  effectiveDate: Date = new Date()
): Promise<{
  isValid: boolean;
  priceCeiling?: Decimal;
  exceedsBy?: Decimal;
  agreementId?: string;
}> {
  const agreement = await prisma.customerProductAgreement.findFirst({
    where: {
      institutionId,
      productId,
      unitId,
      effectiveFrom: { lte: effectiveDate },
      OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: effectiveDate } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });

  if (!agreement) {
    // No agreement found - tidak ada batasan harga
    return { isValid: true };
  }

  const priceCeiling = toDecimal(agreement.priceCeiling);
  const proposedPriceDecimal = toDecimal(proposedPrice);

  const isValid = compareDecimal(proposedPriceDecimal, priceCeiling) <= 0;
  const exceedsBy = isValid
    ? toDecimal(0)
    : subtractDecimal(proposedPriceDecimal, priceCeiling);

  return {
    isValid,
    priceCeiling,
    exceedsBy,
    agreementId: agreement.id,
  };
}

/**
 * Get active price ceiling untuk institution & product
 */
export async function getActivePriceCeiling(
  institutionId: string,
  productId: string,
  unitId: string
) {
  return prisma.customerProductAgreement.findFirst({
    where: {
      institutionId,
      productId,
      unitId,
      effectiveFrom: { lte: new Date() },
      OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: new Date() } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });
}

/**
 * Recalculate order totals (untuk update setelah perubahan items)
 */
export async function recalculateOrderTotals(orderId: string): Promise<void> {
  const order = await prisma.salesOrder.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      items: true,
      operationalCosts: true,
    },
  });

  const subtotal = order.items.reduce(
    (sum, item) => addDecimal(sum, item.subtotalSell),
    toDecimal(0)
  );

  const totalCostAmount = order.items.reduce(
    (sum, item) => addDecimal(sum, item.subtotalCost),
    toDecimal(0)
  );

  const operationalCosts = order.operationalCosts.reduce(
    (sum, cost) => addDecimal(sum, cost.amount),
    toDecimal(0)
  );

  const marginBeforeOps = subtractDecimal(subtotal, totalCostAmount);
  const totalMarginAmount = subtractDecimal(marginBeforeOps, operationalCosts);

  // Assuming no discount for now
  const totalAmount = subtractDecimal(subtotal, order.discountAmount);

  await prisma.salesOrder.update({
    where: { id: orderId },
    data: {
      subtotal: subtotal.toNumber(),
      totalAmount: totalAmount.toNumber(),
      totalCostAmount: totalCostAmount.toNumber(),
      totalMarginAmount: totalMarginAmount.toNumber(),
    },
  });
}

/**
 * Add operational cost ke order
 */
export async function addOperationalCost(input: {
  salesOrderId: string;
  category: string;
  amount: Decimal | number;
  notes?: string;
}): Promise<string> {
  const { salesOrderId, category, amount, notes } = input;

  const cost = await prisma.operationalCost.create({
    data: {
      salesOrderId,
      category: category as any,
      amount: toDecimal(amount).toNumber(),
      notes,
    },
  });

  // Recalculate order margins
  await recalculateOrderTotals(salesOrderId);

  return cost.id;
}
