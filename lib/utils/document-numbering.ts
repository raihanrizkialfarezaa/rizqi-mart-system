import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

/**
 * Generate document numbers dengan format:
 * {PREFIX}/{STORE_CODE}/{YYYY}/{MM}/{NNNN}
 * 
 * Example: SJ/VVS/2026/07/0001
 */

const STORE_CODE = process.env.STORE_CODE || "VVS";

export type DocumentType = 
  | "SALES_ORDER"
  | "SURAT_JALAN"
  | "NOTA"
  | "PURCHASE_ORDER"
  | "PAYMENT";

const PREFIX_MAP: Record<DocumentType, string> = {
  SALES_ORDER: "SO",
  SURAT_JALAN: "SJ",
  NOTA: "NOTA",
  PURCHASE_ORDER: "PO",
  PAYMENT: "PAY",
};

export async function generateDocumentNumber(documentType: DocumentType): Promise<string> {
  const prefix = PREFIX_MAP[documentType];
  const yearMonth = format(new Date(), "yyyy-MM");
  const year = format(new Date(), "yyyy");
  const month = format(new Date(), "MM");

  // Atomic increment menggunakan transaction
  const result = await prisma.$transaction(async (tx) => {
    // Upsert: insert or update
    const sequence = await tx.documentSequence.upsert({
      where: {
        documentType_yearMonth: {
          documentType,
          yearMonth,
        },
      },
      create: {
        documentType,
        yearMonth,
        lastNumber: 1,
      },
      update: {
        lastNumber: {
          increment: 1,
        },
      },
    });

    return sequence.lastNumber;
  });

  // Format: PREFIX/STORE_CODE/YYYY/MM/NNNN
  const sequenceStr = result.toString().padStart(4, "0");
  return `${prefix}/${STORE_CODE}/${year}/${month}/${sequenceStr}`;
}

export async function getNextSequenceNumber(documentType: DocumentType): Promise<number> {
  const yearMonth = format(new Date(), "yyyy-MM");

  const sequence = await prisma.documentSequence.findUnique({
    where: {
      documentType_yearMonth: {
        documentType,
        yearMonth,
      },
    },
  });

  return (sequence?.lastNumber || 0) + 1;
}

export function parseDocumentNumber(documentNumber: string): {
  prefix: string;
  storeCode: string;
  year: string;
  month: string;
  sequence: string;
} | null {
  const parts = documentNumber.split("/");
  
  if (parts.length !== 5) {
    return null;
  }

  return {
    prefix: parts[0],
    storeCode: parts[1],
    year: parts[2],
    month: parts[3],
    sequence: parts[4],
  };
}
