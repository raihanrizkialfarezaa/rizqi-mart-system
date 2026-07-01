import { prisma } from "@/lib/prisma";
import { DocumentStatus } from "@prisma/client";
import { generateDocumentNumber } from "@/lib/utils/document-numbering";
import { Decimal } from "decimal.js";
import { toDecimal } from "@/lib/utils/decimal";

/**
 * Invoice Service
 * Handles nota generation and disbursement workflow
 * Per spec Section 10: Nota DENGAN harga, butuh TTD kantor pusat untuk pencairan dana
 */

export type InvoiceWithDetails = {
  id: string;
  documentNumber: string;
  salesOrderId: string;
  status: DocumentStatus;
  totalAmount: number;
  headOfficeSignatoryName: string | null;
  headOfficeSignedAt: Date | null;
  disbursementStatus: string;
  disbursedAt: Date | null;
  disbursementBankRef: string | null;
  createdAt: Date;
  salesOrder: any;
};

/**
 * Generate invoice dari sales order
 * Nota berisi harga, terpisah dari surat jalan
 */
export async function generateInvoice(
  salesOrderId: string
): Promise<InvoiceWithDetails> {
  const order = await prisma.salesOrder.findUniqueOrThrow({
    where: { id: salesOrderId },
    include: {
      items: {
        include: {
          product: true,
          unit: true,
        },
      },
    },
  });

  // Generate document number
  const documentNumber = await generateDocumentNumber("NOTA");

  const invoice = await prisma.invoice.create({
    data: {
      documentNumber,
      salesOrderId,
      status: DocumentStatus.DITERBITKAN,
      totalAmount: toDecimal(order.totalAmount).toNumber(),
      disbursementStatus: "BELUM_CAIR",
    },
  });

  return prisma.invoice.findUniqueOrThrow({
    where: { id: invoice.id },
    include: {
      salesOrder: {
        include: {
          items: {
            include: {
              product: true,
              unit: true,
            },
          },
          institution: true,
        },
      },
    },
  }) as any;
}

/**
 * Sign invoice by head office (kantor pusat)
 * Ditandatangani bersamaan dengan surat jalan asli
 */
export async function signInvoiceByHeadOffice(input: {
  invoiceId: string;
  signatoryName: string;
  notes?: string;
}): Promise<void> {
  const { invoiceId, signatoryName, notes } = input;

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: DocumentStatus.SELESAI,
      headOfficeSignatoryName: signatoryName,
      headOfficeSignedAt: new Date(),
    },
  });
}

/**
 * Record disbursement (pencairan dana)
 * Setelah TTD lengkap, dana bisa dicairkan
 */
export async function recordDisbursement(input: {
  invoiceId: string;
  bankRef: string;
  disbursedAt?: Date;
}): Promise<void> {
  const { invoiceId, bankRef, disbursedAt } = input;

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      disbursementStatus: "SUDAH_CAIR",
      disbursedAt: disbursedAt || new Date(),
      disbursementBankRef: bankRef,
    },
  });
}

/**
 * Get invoice by ID
 */
export async function getInvoiceById(
  invoiceId: string
): Promise<InvoiceWithDetails | null> {
  return prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      salesOrder: {
        include: {
          items: {
            include: {
              product: true,
              unit: true,
            },
          },
          institution: true,
          customer: true,
        },
      },
    },
  }) as any;
}

/**
 * Get invoice by sales order
 */
export async function getInvoiceBySalesOrder(
  salesOrderId: string
): Promise<InvoiceWithDetails | null> {
  return prisma.invoice.findUnique({
    where: { salesOrderId },
    include: {
      salesOrder: {
        include: {
          items: {
            include: {
              product: true,
              unit: true,
            },
          },
          institution: true,
        },
      },
    },
  }) as any;
}

/**
 * Get pending disbursements (sudah TTD tapi belum cair)
 */
export async function getPendingDisbursements() {
  return prisma.invoice.findMany({
    where: {
      status: DocumentStatus.SELESAI,
      disbursementStatus: "BELUM_CAIR",
    },
    include: {
      salesOrder: {
        include: {
          institution: {
            select: {
              name: true,
              type: true,
            },
          },
        },
      },
    },
    orderBy: {
      headOfficeSignedAt: "asc",
    },
  });
}

/**
 * Cancel invoice
 */
export async function cancelInvoice(
  invoiceId: string,
  reason: string
): Promise<void> {
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: DocumentStatus.DIBATALKAN,
    },
  });
}
