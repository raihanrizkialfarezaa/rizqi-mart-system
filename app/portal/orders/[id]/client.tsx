"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Clock, Truck, XCircle, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils/decimal";
import { cn } from "@/lib/utils/cn";

type OrderData = {
  id: string;
  orderNumber: string;
  status: string;
  customerStatus: string | null;
  customerNote: string | null;
  totalAmount: number;
  requestedDeliveryDate: string | null;
  requestedDeliveryTime: string | null;
  deliveryTimeSlot: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    qty: number;
    unitSellPrice: number;
    subtotalSell: number;
    product: { name: string; sku: string };
    unit: { code: string; name: string };
  }>;
  statusHistory: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    customerNote: string | null;
    changedAt: string;
  }>;
  productRequests: Array<{
    id: string;
    productName: string;
    requestedQty: number;
    requestedUnit: string;
    status: string;
    notes: string | null;
  }>;
};

const STEP_ICONS: Record<number, { icon: React.ElementType }> = {
  0: { icon: Clock },
  1: { icon: Package },
  2: { icon: Truck },
  3: { icon: Check },
};

const STEPS = ["Pesanan Dibuat", "Dicari Barang", "Dalam Pengiriman", "Diterima"];

function getCurrentStep(order: OrderData) {
  const status = order.customerStatus || order.status;
  if (status === "DRAFT" || status === "PENDING_REVIEW") return 0;
  if (status === "CONFIRMED" || status === "SOURCING" || status === "MENUNGGU_PENGADAAN") return 1;
  if (status === "READY_TO_SHIP" || status === "ON_DELIVERY" || status === "DALAM_PENGIRIMAN") return 2;
  if (status === "DELIVERED" || status === "SELESAI") return 3;
  return 0;
}

export default function PortalOrderDetailClient({ order }: { order: OrderData }) {
  const router = useRouter();
  const currentStep = getCurrentStep(order);
  const isCancelled = order.status === "DIBATALKAN" || order.customerStatus === "CANCELLED";

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.push("/portal/orders")} className="rounded-lg p-1.5 text-gray-400 active:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">{order.orderNumber}</h1>
          <p className="text-xs text-gray-500">
            Dibuat {new Date(order.createdAt).toLocaleDateString("id-ID", {
              day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* Status Steps */}
      {isCancelled ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <XCircle className="mx-auto mb-2 h-8 w-8 text-red-400" />
          <p className="text-sm font-medium text-red-700">Pesanan Dibatalkan</p>
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
          <div className="relative flex items-center justify-between w-full">
            {/* Connecting line backgrounds */}
            <div className="absolute left-0 right-0 top-5 h-0.5 -translate-y-1/2 bg-gray-100 z-0" />
            <div 
              className="absolute left-0 top-5 h-0.5 -translate-y-1/2 bg-primary transition-all duration-500 z-0" 
              style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
            />

            {STEPS.map((step, idx) => {
              const Icon = STEP_ICONS[idx].icon;
              const isCompleted = idx < currentStep;
              const isCurrent = idx === currentStep;
              const isActive = idx <= currentStep;

              return (
                <div key={idx} className="relative flex flex-col items-center z-10 flex-1">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                    isCompleted ? "border-primary bg-primary text-white" : 
                    isCurrent ? "border-primary bg-white text-primary ring-4 ring-primary/10" : 
                    "border-gray-200 bg-gray-50 text-gray-400"
                  )}>
                    {isCompleted ? (
                      <Check className="h-5 w-5 stroke-[3]" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <p className={cn(
                    "mt-2 text-center text-[10px] font-bold tracking-wide uppercase leading-tight",
                    isCurrent ? "text-primary" : isActive ? "text-gray-800" : "text-gray-400"
                  )}>
                    {step}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Delivery info */}
          {order.requestedDeliveryDate && (
            <div className="mt-6 border-t pt-3 text-center">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/5 border border-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <span>📅</span>
                <span>
                  Pengiriman: {new Date(order.requestedDeliveryDate).toLocaleDateString("id-ID", {
                    weekday: "long", day: "numeric", month: "long",
                  })}
                  {order.requestedDeliveryTime && ` • ${order.requestedDeliveryTime}`}
                  {order.deliveryTimeSlot && ` (${order.deliveryTimeSlot})`}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Items */}
      <div className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Item Pesanan</h2>
        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                  <p className="text-xs text-gray-500">{item.product.sku} • {item.unit.code}</p>
                </div>
                <div className="ml-3 text-right">
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(item.subtotalSell)}</p>
                  <p className="text-xs text-gray-500">{item.qty} x {formatCurrency(item.unitSellPrice)}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Custom product requests */}
          {order.productRequests.length > 0 && (
            <>
              <h3 className="mt-4 mb-2 text-sm font-semibold text-gray-700">Produk Baru yang Diminta</h3>
              {order.productRequests.map((req) => (
                <div key={req.id} className="rounded-xl border border-dashed border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{req.productName}</p>
                      <p className="text-xs text-gray-500">
                        {req.requestedQty} {req.requestedUnit} • Status: {req.status}
                      </p>
                      {req.notes && <p className="mt-1 text-xs text-gray-400">Catatan: {req.notes}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Admin Notes */}
      {order.customerNote && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-medium text-blue-700">Catatan dari Admin</p>
          <p className="mt-1 text-sm text-blue-600">{order.customerNote}</p>
        </div>
      )}

      {/* Status History */}
      {order.statusHistory.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Riwayat Status</h2>
          <div className="space-y-1">
            {order.statusHistory.map((h) => (
              <div key={h.id} className="flex items-start gap-3 rounded-lg px-3 py-2">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">{h.customerNote || h.note || `Status: ${h.toStatus}`}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(h.changedAt).toLocaleDateString("id-ID", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-lg">
          <button onClick={() => router.push("/portal/dashboard")} className="flex flex-1 flex-col items-center py-2 text-gray-400">
            <ArrowLeft className="h-5 w-5" />
            <span className="mt-0.5 text-xs">Beranda</span>
          </button>
          <button onClick={() => router.push("/portal/orders")} className="flex flex-1 flex-col items-center py-2 text-primary">
            <Package className="h-5 w-5" />
            <span className="mt-0.5 text-xs font-medium">Pesanan</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
