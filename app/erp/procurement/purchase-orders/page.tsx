import { prisma } from "@/lib/prisma";
import PurchaseOrdersListClient from "@/components/erp/procurement/PurchaseOrdersListClient";

export const dynamic = "force-dynamic";

export default async function PurchaseOrdersPage() {
  // 1. Fetch Purchase Orders
  const rawPos = await prisma.purchaseOrder.findMany({
    include: {
      supplier: { select: { id: true, name: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
          unit: { select: { id: true, code: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const pos = rawPos.map((po) => ({
    id: po.id,
    poNumber: po.poNumber,
    purpose: po.purpose,
    status: po.status,
    paymentStatus: po.paymentStatus,
    paymentMethod: po.paymentMethod,
    paidAt: po.paidAt ? po.paidAt.toISOString() : null,
    paymentNotes: po.paymentNotes,
    paymentProofUrl: po.paymentProofUrl,
    totalAmount: Number(po.totalAmount),
    createdAt: po.createdAt.toISOString(),
    supplier: po.supplier,
    items: po.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      product: i.product,
      unitId: i.unitId,
      unit: i.unit,
      qty: Number(i.qty),
      unitCost: Number(i.unitCost),
      subtotal: Number(i.subtotal),
      sourcingRequestId: i.sourcingRequestId,
    })),
  }));

  // 2. Fetch Decided Sourcing Requests
  const rawRequests = await prisma.sourcingRequest.findMany({
    where: { status: "DIPUTUSKAN" },
    include: {
      product: { select: { name: true, sku: true } },
      unit: { select: { id: true, code: true } },
      chosenSupplierProduct: {
        select: {
          id: true,
          supplierId: true,
          priceQuotes: {
            where: { sourcingRequest: { status: "DIPUTUSKAN" } },
            orderBy: { checkedAt: "desc" },
            take: 1,
            select: { price: true },
          },
        },
      },
    },
    orderBy: { deadline: "asc" },
  });

  const decidedRequests = rawRequests.map((r) => ({
    id: r.id,
    productId: r.productId,
    qtyNeeded: Number(r.qtyNeeded),
    deadline: r.deadline.toISOString(),
    product: r.product,
    unit: r.unit,
    chosenSupplierProduct: r.chosenSupplierProduct
      ? {
          id: r.chosenSupplierProduct.id,
          supplierId: r.chosenSupplierProduct.supplierId,
          priceQuotes: r.chosenSupplierProduct.priceQuotes.map((q) => ({
            price: Number(q.price),
          })),
        }
      : null,
  }));

  // 3. Fetch Suppliers
  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
  });

  // 4. Fetch Stock Levels
  const rawStock = await prisma.stockBatch.groupBy({
    by: ["productId"],
    where: { qtyRemainingBase: { gt: 0 } },
    _sum: {
      qtyRemainingBase: true,
    },
  });

  const stockMap = new Map<string, number>();
  rawStock.forEach((s) => {
    stockMap.set(s.productId, Number(s._sum.qtyRemainingBase || 0));
  });

  // 5. Fetch Categories and Units (for creating new products)
  const categories = await prisma.productCategory.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const allUnits = await prisma.productUnit.findMany({
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

  // 6. Fetch Products and Units
  const rawProducts = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      sku: true,
      baseUnit: {
        select: {
          id: true,
          code: true,
        },
      },
      unitConversions: {
        select: {
          conversionToBase: true,
          unit: {
            select: {
              id: true,
              code: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const products = rawProducts.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    stock: stockMap.get(p.id) || 0,
    baseUnitCode: p.baseUnit.code,
    units: [
      { id: p.baseUnit.id, code: p.baseUnit.code, conversionToBase: 1 },
      ...p.unitConversions.map((uc) => ({
        id: uc.unit.id,
        code: uc.unit.code,
        conversionToBase: Number(uc.conversionToBase),
      })),
    ],
  }));

  return (
    <PurchaseOrdersListClient
      pos={pos as any}
      decidedRequests={decidedRequests as any}
      suppliers={suppliers}
      products={products}
      categories={categories}
      allUnits={allUnits}
    />
  );
}
