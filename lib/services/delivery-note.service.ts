import { prisma } from "@/lib/prisma";
import { DocumentStatus } from "@prisma/client";
import { generateDocumentNumber } from "@/lib/utils/document-numbering";

/**
 * Delivery Note Service
 * Handles surat jalan generation and signature workflow
 * Per spec Section 10: Surat jalan TANPA harga, butuh 2 tanda tangan berlapis
 */

export type DeliveryNoteWithItems = {
  id: string;
  documentNumber: string;
  salesOrderId: string;
  status: DocumentStatus;
  issuedAt: Date | null;
  kitchenSignatoryName: string | null;
  kitchenSignedAt: Date | null;
  kitchenCopyScanUrl: string | null;
  headOfficeSignatoryName: string | null;
  headOfficeSignedAt: Date | null;
  originalScanUrl: string | null;
  notes: string | null;
  createdAt: Date;
  items: Array<{
    id: string;
    productName: string;
    qty: number;
    unitName: string;
  }>;
};

/**
 * Generate delivery note dari sales order
 * PENTING: DeliveryNoteItem TIDAK menyimpan harga (per spec Section 4 point 8)
 */
export async function generateDeliveryNote(
  salesOrderId: string
): Promise<DeliveryNoteWithItems> {
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
  const documentNumber = await generateDocumentNumber("SURAT_JALAN");

  const deliveryNote = await prisma.$transaction(async (tx) => {
    // Create delivery note
    const note = await tx.deliveryNote.create({
      data: {
        documentNumber,
        salesOrderId,
        status: DocumentStatus.DITERBITKAN,
        issuedAt: new Date(),
      },
    });

    // Create delivery note items (WITHOUT prices)
    for (const item of order.items) {
      await tx.deliveryNoteItem.create({
        data: {
          deliveryNoteId: note.id,
          productName: item.product.name,
          qty: item.qty,
          unitName: item.unit.name,
        },
      });
    }

    // Return with items
    return tx.deliveryNote.findUniqueOrThrow({
      where: { id: note.id },
      include: {
        items: true,
      },
    });
  });

  return deliveryNote as any;
}

/**
 * Record kitchen signature (kepala dapur)
 * Tembusan ungu tinggal di dapur
 */
export async function signDeliveryNoteByKitchen(input: {
  deliveryNoteId: string;
  signatoryName: string;
  kitchenCopyScanUrl?: string;
  notes?: string;
}): Promise<void> {
  const { deliveryNoteId, signatoryName, kitchenCopyScanUrl, notes } = input;

  await prisma.deliveryNote.update({
    where: { id: deliveryNoteId },
    data: {
      status: DocumentStatus.DITANDATANGANI_DAPUR,
      kitchenSignatoryName: signatoryName,
      kitchenSignedAt: new Date(),
      kitchenCopyScanUrl,
      notes,
    },
  });

  // Update sales order status
  const deliveryNote = await prisma.deliveryNote.findUniqueOrThrow({
    where: { id: deliveryNoteId },
    select: { salesOrderId: true },
  });

  await prisma.salesOrder.update({
    where: { id: deliveryNote.salesOrderId },
    data: {
      status: "TERKIRIM_MENUNGGU_TTD" as any,
    },
  });
}

/**
 * Record head office signature (kantor pusat SPPG)
 * Surat jalan asli + nota ditandatangani sekaligus
 */
export async function signDeliveryNoteByHeadOffice(input: {
  deliveryNoteId: string;
  signatoryName: string;
  originalScanUrl?: string;
  notes?: string;
}): Promise<void> {
  const { deliveryNoteId, signatoryName, originalScanUrl, notes } = input;

  await prisma.$transaction(async (tx) => {
    // Update delivery note
    await tx.deliveryNote.update({
      where: { id: deliveryNoteId },
      data: {
        status: DocumentStatus.DITANDATANGANI_KANTOR_PUSAT,
        headOfficeSignatoryName: signatoryName,
        headOfficeSignedAt: new Date(),
        originalScanUrl,
        notes,
      },
    });

    // Get sales order
    const deliveryNote = await tx.deliveryNote.findUniqueOrThrow({
      where: { id: deliveryNoteId },
      select: { salesOrderId: true },
    });

    // Update sales order status to SELESAI
    await tx.salesOrder.update({
      where: { id: deliveryNote.salesOrderId },
      data: {
        status: "SELESAI" as any,
        fulfillmentStatus: "LENGKAP" as any,
      },
    });

    // Create status history
    await tx.salesOrderStatusHistory.create({
      data: {
        salesOrderId: deliveryNote.salesOrderId,
        fromStatus: "TERKIRIM_MENUNGGU_TTD" as any,
        toStatus: "SELESAI" as any,
        changedById: "SYSTEM", // Bisa diganti dengan actual user ID
        note: `Surat jalan ditandatangani kantor pusat oleh ${signatoryName}`,
      },
    });
  });
}

/**
 * Get delivery note by ID
 */
export async function getDeliveryNoteById(
  deliveryNoteId: string
): Promise<DeliveryNoteWithItems | null> {
  return prisma.deliveryNote.findUnique({
    where: { id: deliveryNoteId },
    include: {
      items: true,
      salesOrder: {
        include: {
          institution: {
            include: {
              contacts: true,
            },
          },
        },
      },
    },
  }) as any;
}

/**
 * Get delivery notes by sales order
 */
export async function getDeliveryNoteBySalesOrder(
  salesOrderId: string
): Promise<DeliveryNoteWithItems | null> {
  return prisma.deliveryNote.findUnique({
    where: { salesOrderId },
    include: {
      items: true,
    },
  }) as any;
}

/**
 * Get pending signatures (belum ditandatangani lengkap)
 */
export async function getPendingSignatures() {
  return prisma.deliveryNote.findMany({
    where: {
      status: {
        in: [
          DocumentStatus.DITERBITKAN,
          DocumentStatus.DITANDATANGANI_DAPUR,
        ],
      },
    },
    include: {
      items: true,
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
      issuedAt: "asc",
    },
  });
}

/**
 * Cancel delivery note (jika order dibatalkan)
 */
export async function cancelDeliveryNote(
  deliveryNoteId: string,
  reason: string
): Promise<void> {
  await prisma.deliveryNote.update({
    where: { id: deliveryNoteId },
    data: {
      status: DocumentStatus.DIBATALKAN,
      notes: reason,
    },
  });
}
