import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import OrderDetailClient from "@/components/ecommerce/OrderDetailClient";

export const dynamic = "force-dynamic";

async function getOrderFromDb(id: string) {
  const order = await prisma.salesOrder.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: true,
          unit: true,
        },
      },
      customer: true,
      statusHistory: {
        orderBy: {
          changedAt: "asc",
        },
      },
      payments: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  return order;
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rawOrder = await getOrderFromDb(id);

  if (!rawOrder) {
    notFound();
  }

  // Serialize Prisma object cleanly (Decimals & Dates)
  const initialOrder = {
    id: rawOrder.id,
    orderNumber: rawOrder.orderNumber,
    status: rawOrder.status,
    fulfillmentStatus: rawOrder.fulfillmentStatus,
    paymentStatus: rawOrder.paymentStatus,
    deliveryMethod: rawOrder.deliveryMethod,
    deliveryAddressText: rawOrder.deliveryAddressText,
    subtotal: Number(rawOrder.subtotal),
    discountAmount: Number(rawOrder.discountAmount),
    totalAmount: Number(rawOrder.totalAmount),
    createdAt: rawOrder.createdAt.toISOString(),
    updatedAt: rawOrder.updatedAt.toISOString(),
    customer: rawOrder.customer
      ? {
          name: rawOrder.customer.name,
          phone: rawOrder.customer.phone?.startsWith("NO_PHONE_")
            ? ""
            : rawOrder.customer.phone,
          email: rawOrder.customer.email,
        }
      : null,
    items: rawOrder.items.map((item) => ({
      id: item.id,
      qty: Number(item.qty),
      unitSellPrice: Number(item.unitSellPrice),
      subtotalSell: Number(item.subtotalSell),
      product: {
        id: item.product.id,
        name: item.product.name,
        sku: item.product.sku,
        imageUrl: item.product.imageUrl,
      },
      unit: {
        id: item.unit.id,
        name: item.unit.name,
      },
    })),
    statusHistory: rawOrder.statusHistory.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      changedAt: h.changedAt.toISOString(),
      note: h.note,
    })),
    payments: rawOrder.payments.map((p) => ({
      id: p.id,
      method: p.method,
      amount: Number(p.amount),
      status: p.status,
      proofFileUrl: p.proofFileUrl,
      createdAt: p.createdAt.toISOString(),
    })),
  };

  return <OrderDetailClient initialOrder={initialOrder} />;
}
