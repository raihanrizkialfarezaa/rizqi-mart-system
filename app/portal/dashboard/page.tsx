import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DapurDashboardClient from "./client";

export default async function PortalDashboardPage() {
  const cookieStore = cookies();
  const identityId = cookieStore.get("dapur_identity")?.value;

  if (!identityId) {
    redirect("/portal");
  }

  const identity = await prisma.dapurIdentity.findUnique({
    where: { id: identityId, isActive: true },
    include: {
      institution: {
        select: {
          id: true,
          name: true,
          parentInstitution: { select: { id: true, name: true } },
        },
      },
      orders: {
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          customerStatus: true,
          totalAmount: true,
          createdAt: true,
        },
      },
    },
  });

  if (!identity) {
    redirect("/portal");
  }

  const totalOrders = await prisma.salesOrder.count({
    where: { dapurIdentityId: identityId },
  });

  const mappedIdentity = {
    ...identity,
    orders: identity.orders.map((o) => ({
      ...o,
      totalAmount: Number(o.totalAmount),
      createdAt: o.createdAt.toISOString(),
    })),
  };

  return <DapurDashboardClient identity={mappedIdentity as any} totalOrders={totalOrders} />;
}
