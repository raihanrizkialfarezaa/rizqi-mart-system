import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PortalOrderDetailClient from "./client";

export default async function PortalOrderDetail({
  params,
}: {
  params: { id: string };
}) {
  const identityId = cookies().get("dapur_identity")?.value;
  if (!identityId) redirect("/portal");

  const order = await prisma.salesOrder.findUnique({
    where: { id: params.id },
    include: {
      items: {
        select: {
          id: true,
          qty: true,
          unitSellPrice: true,
          subtotalSell: true,
          product: { select: { name: true, sku: true } },
          unit: { select: { code: true, name: true } },
        },
      },
      statusHistory: {
        where: { isVisibleToCustomer: true },
        orderBy: { changedAt: "asc" },
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          note: true,
          customerNote: true,
          changedAt: true,
        },
      },
      productRequests: {
        select: {
          id: true,
          productName: true,
          requestedQty: true,
          requestedUnit: true,
          status: true,
          notes: true,
        },
      },
    },
  });

  if (!order || order.dapurIdentityId !== identityId) {
    notFound();
  }

  const mappedOrder = {
    ...order,
    totalAmount: Number(order.totalAmount),
    requestedDeliveryDate: order.requestedDeliveryDate ? order.requestedDeliveryDate.toISOString() : null,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((i) => ({
      ...i,
      qty: Number(i.qty),
      unitSellPrice: Number(i.unitSellPrice),
      subtotalSell: Number(i.subtotalSell),
    })),
    statusHistory: order.statusHistory.map((h) => ({
      ...h,
      changedAt: h.changedAt.toISOString(),
    })),
    productRequests: order.productRequests.map((r) => ({
      ...r,
      requestedQty: Number(r.requestedQty),
    })),
  };

  return <PortalOrderDetailClient order={mappedOrder as any} />;
}
