import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PortalOrdersClient from "./client";

export default async function PortalOrdersPage() {
  const cookieStore = await cookies();
  const identityId = cookieStore.get("dapur_identity")?.value;
  if (!identityId) redirect("/portal");

  const identity = await prisma.dapurIdentity.findUnique({
    where: { id: identityId, isActive: true },
    select: { displayName: true },
  });
  if (!identity) redirect("/portal");

  const orders = await prisma.salesOrder.findMany({
    where: { dapurIdentityId: identityId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      customerStatus: true,
      totalAmount: true,
      requestedDeliveryDate: true,
      createdAt: true,
      _count: { select: { items: true } },
    },
  });

  const mappedOrders = orders.map((o) => ({
    ...o,
    totalAmount: Number(o.totalAmount),
    requestedDeliveryDate: o.requestedDeliveryDate ? o.requestedDeliveryDate.toISOString() : null,
    createdAt: o.createdAt.toISOString(),
  }));

  return <PortalOrdersClient displayName={identity.displayName} orders={mappedOrders} />;
}
