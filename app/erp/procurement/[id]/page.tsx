import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SourcingDetailClient from "@/components/erp/procurement/SourcingDetailClient";

export const dynamic = "force-dynamic";

async function getSourcingRequestData(id: string) {
  const req = await prisma.sourcingRequest.findUnique({
    where: { id },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          baseUnit: { select: { id: true, code: true } },
          unitConversions: {
            select: {
              conversionToBase: true,
              unit: { select: { id: true, code: true } }
            }
          }
        }
      },
      unit: { select: { id: true, code: true, name: true } },
      salesOrderItem: {
        include: {
          salesOrder: {
            select: {
              id: true,
              orderNumber: true,
              institution: { select: { name: true } },
            },
          },
        },
      },
      chosenSupplierProduct: {
        include: {
          supplier: { select: { name: true } },
        },
      },
      priceQuotes: {
        include: {
          supplierProduct: {
            include: {
              supplier: { select: { id: true, name: true } },
              unit: { select: { id: true, code: true, name: true } },
            },
          },
        },
        orderBy: { price: "asc" },
      },
    },
  });

  if (!req) return null;

  return {
    id: req.id,
    productId: req.productId,
    qtyNeeded: Number(req.qtyNeeded),
    deadline: req.deadline.toISOString(),
    status: req.status,
    product: {
      id: req.product.id,
      name: req.product.name,
      sku: req.product.sku,
      baseUnitCode: req.product.baseUnit.code,
      units: [
        { id: req.product.baseUnit.id, code: req.product.baseUnit.code, conversionToBase: 1 },
        ...req.product.unitConversions.map((uc) => ({
          id: uc.unit.id,
          code: uc.unit.code,
          conversionToBase: Number(uc.conversionToBase),
        })),
      ],
    },
    unit: req.unit,
    salesOrderItem: {
      salesOrder: {
        id: req.salesOrderItem.salesOrder.id,
        orderNumber: req.salesOrderItem.salesOrder.orderNumber,
        institution: req.salesOrderItem.salesOrder.institution,
      },
    },
    chosenSupplierProduct: req.chosenSupplierProduct
      ? {
          supplier: { name: req.chosenSupplierProduct.supplier.name },
        }
      : null,
    decisionReason: req.decisionReason,
    decidedAt: req.decidedAt ? req.decidedAt.toISOString() : null,
    priceQuotes: req.priceQuotes.map((q) => ({
      id: q.id,
      price: Number(q.price),
      isPromo: q.isPromo,
      checkedAt: q.checkedAt.toISOString(),
      validUntil: q.validUntil ? q.validUntil.toISOString() : null,
      notes: q.notes,
      supplierProduct: {
        id: q.supplierProduct.id,
        supplier: q.supplierProduct.supplier,
        unit: q.supplierProduct.unit,
      },
    })),
  };
}

export default async function SourcingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const req = await getSourcingRequestData(params.id);
  if (!req) notFound();

  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
  });

  return (
    <SourcingDetailClient
      sourcingRequest={req as any}
      suppliers={suppliers}
    />
  );
}
