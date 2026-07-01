import { prisma } from "@/lib/prisma";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { Decimal } from "decimal.js";
import { toDecimal, compareDecimal } from "@/lib/utils/decimal";
import { generateDocumentNumber } from "@/lib/utils/document-numbering";

/**
 * Payment Service
 * Handles payment creation, validation, and approval workflow
 * Per spec Section 11: Cashless < Rp500k butuh validasi admin
 */

const CASHLESS_VALIDATION_THRESHOLD = parseFloat(
  process.env.CASHLESS_VALIDATION_THRESHOLD || "500000"
);

export type PaymentWithDetails = {
  id: string;
  paymentNumber: string;
  salesOrderId: string;
  invoiceId: string | null;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  requiresValidation: boolean;
  paidAt: Date | null;
  proofFileUrl: string | null;
  createdAt: Date;
  validation?: {
    id: string;
    isApproved: boolean;
    reason: string | null;
    validatedAt: Date;
    validatedBy: {
      id: string;
      name: string;
    };
  } | null;
};

/**
 * Create payment
 * Automatically determines if validation is required based on method and amount
 */
export async function createPayment(input: {
  salesOrderId: string;
  invoiceId?: string;
  method: PaymentMethod;
  amount: Decimal | number;
  proofFileUrl?: string;
  paidAt?: Date;
}): Promise<string> {
  const { salesOrderId, invoiceId, method, amount, proofFileUrl, paidAt } = input;

  const amountDecimal = toDecimal(amount);
  const paymentNumber = await generateDocumentNumber("PAYMENT");

  // Determine if validation is required
  // Per spec Section 11: TRANSFER_BANK & QRIS dengan nominal < Rp500k butuh validasi
  const requiresValidation =
    (method === PaymentMethod.TRANSFER_BANK || method === PaymentMethod.QRIS) &&
    amountDecimal.lt(CASHLESS_VALIDATION_THRESHOLD);

  // Determine initial status
  let initialStatus: PaymentStatus;
  if (method === PaymentMethod.CASH) {
    initialStatus = PaymentStatus.LUNAS;
  } else if (requiresValidation) {
    initialStatus = PaymentStatus.MENUNGGU_VALIDASI;
  } else {
    // Cashless >= threshold, langsung lunas jika bukti ada
    initialStatus = proofFileUrl ? PaymentStatus.LUNAS : PaymentStatus.BELUM_BAYAR;
  }

  const payment = await prisma.$transaction(async (tx) => {
    // Create payment
    const newPayment = await tx.payment.create({
      data: {
        paymentNumber,
        salesOrderId,
        invoiceId,
        method,
        amount: amountDecimal.toNumber(),
        status: initialStatus,
        requiresValidation,
        paidAt: paidAt || (initialStatus === PaymentStatus.LUNAS ? new Date() : null),
        proofFileUrl,
      },
    });

    // Update sales order payment status
    await tx.salesOrder.update({
      where: { id: salesOrderId },
      data: {
        paymentStatus: initialStatus,
      },
    });

    return newPayment;
  });

  return payment.id;
}

/**
 * Validate payment (admin approval/rejection)
 * Only applicable for payments with requiresValidation = true
 */
export async function validatePayment(input: {
  paymentId: string;
  validatedById: string;
  isApproved: boolean;
  reason?: string;
}): Promise<void> {
  const { paymentId, validatedById, isApproved, reason } = input;

  const payment = await prisma.payment.findUniqueOrThrow({
    where: { id: paymentId },
  });

  if (!payment.requiresValidation) {
    throw new Error("Payment does not require validation");
  }

  if (payment.status !== PaymentStatus.MENUNGGU_VALIDASI) {
    throw new Error(`Cannot validate payment with status: ${payment.status}`);
  }

  await prisma.$transaction(async (tx) => {
    // Create validation record
    await tx.paymentValidation.create({
      data: {
        paymentId,
        validatedById,
        isApproved,
        reason,
      },
    });

    // Update payment status
    const newStatus = isApproved ? PaymentStatus.LUNAS : PaymentStatus.DITOLAK;
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: newStatus,
        paidAt: isApproved ? new Date() : null,
      },
    });

    // Update sales order payment status
    await tx.salesOrder.update({
      where: { id: payment.salesOrderId },
      data: {
        paymentStatus: newStatus,
      },
    });
  });
}

/**
 * Update payment proof (upload bukti transfer/QRIS)
 */
export async function updatePaymentProof(
  paymentId: string,
  proofFileUrl: string
): Promise<void> {
  const payment = await prisma.payment.findUniqueOrThrow({
    where: { id: paymentId },
  });

  // If cashless without validation requirement, mark as lunas
  const shouldMarkLunas =
    !payment.requiresValidation &&
    (payment.method === PaymentMethod.TRANSFER_BANK ||
      payment.method === PaymentMethod.QRIS) &&
    payment.status === PaymentStatus.BELUM_BAYAR;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        proofFileUrl,
        status: shouldMarkLunas ? PaymentStatus.LUNAS : payment.status,
        paidAt: shouldMarkLunas ? new Date() : payment.paidAt,
      },
    });

    if (shouldMarkLunas) {
      await tx.salesOrder.update({
        where: { id: payment.salesOrderId },
        data: {
          paymentStatus: PaymentStatus.LUNAS,
        },
      });
    }
  });
}

/**
 * Get payment by ID
 */
export async function getPaymentById(
  paymentId: string
): Promise<PaymentWithDetails | null> {
  return prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      validation: {
        include: {
          validatedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      salesOrder: {
        include: {
          customer: true,
          institution: true,
        },
      },
    },
  }) as any;
}

/**
 * Get payments by sales order
 */
export async function getPaymentsBySalesOrder(salesOrderId: string) {
  return prisma.payment.findMany({
    where: { salesOrderId },
    include: {
      validation: {
        include: {
          validatedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get pending validations (payments needing admin approval)
 */
export async function getPendingValidations() {
  return prisma.payment.findMany({
    where: {
      status: PaymentStatus.MENUNGGU_VALIDASI,
      requiresValidation: true,
    },
    include: {
      salesOrder: {
        include: {
          customer: {
            select: {
              name: true,
              phone: true,
            },
          },
          institution: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Check if payment requires validation based on method and amount
 */
export function checkIfValidationRequired(
  method: PaymentMethod,
  amount: Decimal | number
): boolean {
  if (method === PaymentMethod.CASH) return false;

  const amountDecimal = toDecimal(amount);
  return (
    (method === PaymentMethod.TRANSFER_BANK || method === PaymentMethod.QRIS) &&
    amountDecimal.lt(CASHLESS_VALIDATION_THRESHOLD)
  );
}
