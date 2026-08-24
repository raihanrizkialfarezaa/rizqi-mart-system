import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PortalOrderBuilder from "./client";

export default async function PortalNewOrderPage() {
  const cookieStore = await cookies();
  const identityId = cookieStore.get("dapur_identity")?.value;
  if (!identityId) redirect("/portal");

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
    },
  });
  if (!identity) redirect("/portal");

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      sku: true,
      name: true,
      baseUnitId: true,
      baseUnit: { select: { id: true, code: true, name: true } },
      sellingPrices: {
        where: { customerType: "INSTITUSI", isActive: true },
        orderBy: { effectiveFrom: "desc" },
        take: 1,
        select: {
          id: true,
          unitId: true,
          price: true,
          unit: { select: { id: true, code: true, name: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const initialProducts = products.map((p) => ({
    ...p,
    sellingPrice: p.sellingPrices[0] || null,
    sellingPrices: undefined,
  }));

  return (
    <PortalOrderBuilder
      identity={{
        id: identity.id,
        displayName: identity.displayName,
        deliveryAddress: identity.deliveryAddress,
        contactPhone: identity.contactPhone,
        institution: identity.institution,
      }}
      initialProducts={initialProducts as never}
    />
  );
}
