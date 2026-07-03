"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle, XCircle, Package, ShoppingCart } from "lucide-react";
import { PageHeader, Panel } from "@/components/erp/Panel";

type ProductRequest = {
  id: string;
  productName: string;
  productSku: string | null;
  description: string | null;
  requestedQty: number;
  requestedUnit: string;
  estimatedPrice: number | null;
  notes: string | null;
  status: string;
  createdAt: string;
  dapurIdentity: {
    id: string;
    displayName: string;
    primaryContact: string;
  } | null;
  salesOrder: {
    id: string;
    orderNumber: string;
  } | null;
  createdProduct: {
    id: string;
    name: string;
    sku: string;
  } | null;
};

const STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-700" },
  APPROVED: { label: "Disetujui", color: "bg-blue-100 text-blue-700" },
  REJECTED: { label: "Ditolak", color: "bg-red-100 text-red-700" },
  CONVERTED_TO_PRODUCT: { label: "Jadi Produk", color: "bg-green-100 text-green-700" },
};

export default function ProductRequestsPage() {
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/product-requests")
      .then((r) => r.json())
      .then((res) => setRequests(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleAction(id: string, action: string) {
    setProcessing(id);
    try {
      const res = await fetch(`/api/product-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewNotes: reviewNote[id] || null }),
      });

      if (res.ok) {
        const json = await res.json();
        setRequests((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, status: json.data.status, createdProduct: json.data.product || r.createdProduct }
              : r
          )
        );
      }
    } catch {}
    setProcessing(null);
  }

  const pending = requests.filter((r) => r.status === "PENDING");
  const processed = requests.filter((r) => r.status !== "PENDING");

  return (
    <div>
      <Link href="/erp" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Link>

      <PageHeader title="Permintaan Produk Baru" description="Produk yang diminta oleh dapur via portal customer atau admin." />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending Requests */}
          <Panel>
            <h3 className="mb-4 text-base font-semibold text-gray-900">
              Menunggu Review ({pending.length})
            </h3>
            {pending.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">Tidak ada permintaan baru</p>
            ) : (
              <div className="space-y-3">
                {pending.map((req) => (
                  <div key={req.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{req.productName}</p>
                        <p className="text-xs text-gray-500">
                          {req.requestedQty} {req.requestedUnit}
                          {req.estimatedPrice && <> • Estimasi: Rp {Number(req.estimatedPrice).toLocaleString()}</>}
                        </p>
                      </div>
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Pending</span>
                    </div>

                    <div className="mb-2 flex items-center gap-4 text-xs text-gray-500">
                      {req.dapurIdentity && (
                        <span>
                          <Package className="mr-1 inline h-3 w-3" />
                          {req.dapurIdentity.displayName}
                        </span>
                      )}
                      {req.salesOrder && (
                        <Link href={`/erp/orders/${req.salesOrder.id}`} className="text-primary hover:underline">
                          <ShoppingCart className="mr-1 inline h-3 w-3" />
                          {req.salesOrder.orderNumber}
                        </Link>
                      )}
                    </div>

                    {req.notes && (
                      <p className="mb-2 text-xs text-gray-500 italic">Catatan: {req.notes}</p>
                    )}

                    <input
                      type="text"
                      placeholder="Catatan review (opsional)"
                      value={reviewNote[req.id] || ""}
                      onChange={(e) => setReviewNote({ ...reviewNote, [req.id]: e.target.value })}
                      className="mb-2 w-full rounded border border-gray-200 px-2 py-1 text-xs"
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(req.id, "CONVERT")}
                        disabled={processing === req.id}
                        className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {processing === req.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3 w-3" />
                        )}
                        Setujui & Buat Produk
                      </button>
                      <button
                        onClick={() => handleAction(req.id, "REJECT")}
                        disabled={processing === req.id}
                        className="flex items-center gap-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        <XCircle className="h-3 w-3" /> Tolak
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Processed */}
          {processed.length > 0 && (
            <Panel>
              <h3 className="mb-4 text-base font-semibold text-gray-500">Diproses ({processed.length})</h3>
              <div className="space-y-2">
                {processed.map((req) => (
                  <div key={req.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{req.productName}</p>
                        <p className="text-xs text-gray-500">
                          {req.requestedQty} {req.requestedUnit}
                          {req.createdProduct && (
                            <span className="ml-2 text-green-600">
                              → Produk: {req.createdProduct.name} ({req.createdProduct.sku})
                            </span>
                          )}
                        </p>
                      </div>
                      <span className={STATUS[req.status]?.color + " rounded-full px-2 py-0.5 text-xs font-medium"}>
                        {STATUS[req.status]?.label || req.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
