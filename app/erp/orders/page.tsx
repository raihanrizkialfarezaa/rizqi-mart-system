import { prisma } from "@/lib/prisma";
import OrdersListClient from "@/components/erp/orders/OrdersListClient";
import { PageHeader } from "@/components/erp/Panel";
import Link from "next/link";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ErpOrdersPage() {
  let orders: any[] = [];
  let error = false;

  try {
    const rawOrders = await prisma.salesOrder.findMany({
      include: {
        customer: { select: { name: true } },
        institution: {
          select: {
            name: true,
            parentInstitution: { select: { name: true } },
          },
        },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    orders = rawOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      orderType: o.orderType,
      channel: o.channel,
      status: o.status,
      paymentStatus: o.paymentStatus,
      totalAmount: Number(o.totalAmount),
      deliveryAddressText: o.deliveryAddressText,
      requestedDeliveryDate: o.requestedDeliveryDate ? o.requestedDeliveryDate.toISOString() : null,
      requestedDeliveryTime: o.requestedDeliveryTime,
      deliveryTimeSlot: o.deliveryTimeSlot,
      customerNote: o.customerNote,
      createdAt: o.createdAt.toISOString(),
      customerName: o.customer?.name || "",
      institutionName: o.institution?.name || "",
      parentInstitutionName: o.institution?.parentInstitution?.name || "",
      itemCount: o._count.items,
    }));
  } catch (err) {
    console.error("Failed to load orders:", err);
    error = true;
  }

  return (
    <div>
      <PageHeader
        title="Manajemen Pesanan"
        description={`${orders.length} total pesanan di sistem`}
        action={
          <Link
            href="/erp/orders/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Buat Pesanan
          </Link>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Database belum terhubung — daftar pesanan kosong.
        </div>
      )}

      <OrdersListClient initialOrders={orders} />
    </div>
  );
}
