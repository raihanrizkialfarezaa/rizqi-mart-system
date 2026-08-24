import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import Link from "next/link";
import { Package, ArrowLeft, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import OrderHistoryCard from "@/components/ecommerce/OrderHistoryCard";
import OrderSuccessBanner from "@/components/ecommerce/OrderSuccessBanner";

export const dynamic = "force-dynamic";

type SearchParams = { status?: string; orderId?: string };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: SearchParams | Promise<SearchParams>;
}) {
  const user = await getSession();

  if (!user) {
    redirect("/sign-in");
  }

  const sp = (await Promise.resolve(searchParams as any)) as SearchParams;
  const statusParam = sp?.status;
  const orderIdParam = sp?.orderId;

  const dbOrders = await prisma.salesOrder.findMany({
    where: {
      channel: "ECOMMERCE",
    },
    include: {
      items: {
        include: {
          product: true,
          unit: true,
        },
      },
      payments: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  const orders = dbOrders.map((order) => {
    const itemCount = order.items.reduce((sum, item) => sum + Number(item.qty), 0);
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt.toISOString(),
      status: order.status,
      fulfillmentStatus: order.fulfillmentStatus,
      paymentStatus: order.paymentStatus,
      deliveryMethod: order.deliveryMethod,
      deliveryAddressText: order.deliveryAddressText,
      subtotal: Number(order.subtotal),
      discountAmount: Number(order.discountAmount),
      totalAmount: Number(order.totalAmount),
      itemCount,
      items: order.items.map((it) => ({
        id: it.id,
        qty: Number(it.qty),
        unitSellPrice: Number(it.unitSellPrice),
        subtotalSell: Number(it.subtotalSell),
        product: {
          id: it.product.id,
          name: it.product.name,
          sku: it.product.sku,
          imageUrl: it.product.imageUrl,
        },
        unit: {
          id: it.unit.id,
          name: it.unit.name,
        },
      })),
    };
  });

  const highlightedOrder = orderIdParam ? orders.find((o) => o.id === orderIdParam) : null;

  return (
    <div className="min-h-screen bg-slate-50/50 py-10 sm:py-12">
      <div className="page-container max-w-5xl">
        {/* Breadcrumb */}
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Beranda
          </Link>
          <Link href="/products" className="text-sm font-medium text-slate-700 hover:text-slate-900 underline-offset-4 hover:underline">
            Belanja Lagi
          </Link>
        </div>

        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-[26px] font-semibold tracking-tight text-slate-900 sm:text-3xl">Pesanan Saya</h1>
            <p className="text-sm leading-relaxed text-slate-600 sm:text-[15px]">
              Daftar pesanan retail kamu di Rizqi Mart — harga transparan, stok sinkron.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm">
            <span className="h-2 w-2 rounded-full bg-slate-900" />
            <span className="font-semibold text-slate-900">{orders.length}</span>
            <span className="text-slate-600">pesanan</span>
          </div>
        </div>

        {statusParam === "success" && orderIdParam && highlightedOrder && (
          <OrderSuccessBanner orderId={highlightedOrder.id} orderNumber={highlightedOrder.orderNumber} totalAmount={highlightedOrder.totalAmount} />
        )}

        {statusParam === "success" && orderIdParam && !highlightedOrder && (
          <div className="mb-8 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm border-l-4 border-l-emerald-500">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Pesanan berhasil dibuat</p>
              <p className="text-sm text-slate-600">ID {orderIdParam} — sedang diproses, cek daftar di bawah.</p>
            </div>
            <Link href={`/orders/${orderIdParam}`} className="ml-auto rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
              Lihat Detail
            </Link>
          </div>
        )}

        {statusParam === "success" && !orderIdParam && (
          <div className="mb-8 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm border-l-4 border-l-emerald-500">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-slate-900">Pesanan berhasil dibuat — sedang diproses untuk pengiriman.</p>
          </div>
        )}

        {orders.length > 0 ? (
          <div className="space-y-6">
            {orders.map((order) => (
              <OrderHistoryCard key={order.id} order={order} isHighlighted={order.id === orderIdParam} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 sm:p-14 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Package className="h-7 w-7" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-slate-900">Belum ada pesanan</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
              Keranjang belanja Anda kosong atau belum ada pembelian yang terekam. Mulai belanja sembako segar langsung dari gudang Rizqi Mart.
            </p>
            <Link
              href="/products"
              className="mt-6 inline-flex rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Belanja Sekarang
            </Link>
          </div>
        )}

        {orders.length > 0 && (
          <div className="mt-10 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-center">
            <p className="text-sm leading-relaxed text-slate-600">
              Ada kendala?{" "}
              <a href="https://wa.me/6281234567890" target="_blank" className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900">
                Hubungi CS Rizqi Mart via WhatsApp
              </a>{" "}
              <span className="text-slate-400">— 07:00–21:00 WIB</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
