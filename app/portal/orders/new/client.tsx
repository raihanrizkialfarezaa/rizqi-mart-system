"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Search, Plus, Minus, Trash2, ShoppingCart,
  Calendar, Clock, Package, Building2, Send, Loader2, AlertCircle,
  Sun, CloudSun, Moon,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/decimal";
import { cn } from "@/lib/utils/cn";

type Identity = {
  id: string;
  displayName: string;
  deliveryAddress: string;
  contactPhone: string;
  institution: { id: string; name: string; parentInstitution: { id: string; name: string } | null };
};

type ProductItem = {
  id: string;
  sku: string;
  name: string;
  baseUnitId: string;
  baseUnit: { id: string; code: string; name: string };
  sellingPrice: { id: string; unitId: string; price: number; unit: { id: string; code: string; name: string } } | null;
};

type CartItem = {
  key: string;
  product: ProductItem;
  qty: number;
  sellPrice: number;
  unitId: string;
  unitCode: string;
};

export default function PortalOrderBuilder({
  identity,
  initialProducts,
}: {
  identity: Identity;
  initialProducts: ProductItem[];
}) {
  const router = useRouter();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState<"PAGI" | "SIANG" | "SORE" | "CUSTOM" | "">("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm] = useState({ name: "", qty: "", unit: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredProducts = initialProducts.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  function addToCart(product: ProductItem) {
    const price = product.sellingPrice;
    if (!price) return;

    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [
        ...prev,
        {
          key: `${product.id}-${Date.now()}`,
          product,
          qty: 1,
          sellPrice: price.price,
          unitId: price.unitId,
          unitCode: price.unit.code,
        },
      ];
    });
  }

  function updateQty(key: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.key === key ? { ...i, qty: Math.max(0, i.qty + delta) } : i))
        .filter((i) => i.qty > 0)
    );
  }

  function removeItem(key: string) {
    setCart((prev) => prev.filter((i) => i.key !== key));
  }

  async function handleSubmit() {
    setError(null);
    if (cart.length === 0) {
      setError("Minimal satu item diperlukan");
      return;
    }
    if (!deliveryDate) {
      setError("Pilih tanggal pengiriman");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/portal/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identityId: identity.id,
          institutionId: identity.institution.id,
          deliveryAddress: identity.deliveryAddress,
          requestedDeliveryDate: new Date(deliveryDate).toISOString(),
          deliveryTimeSlot: deliveryTimeSlot || undefined,
          requestedDeliveryTime: deliveryTimeSlot === "CUSTOM" ? deliveryTime : undefined,
          items: cart.map((i) => ({
            productId: i.product.id,
            unitId: i.unitId,
            qty: i.qty,
            unitSellPrice: i.sellPrice,
          })),
          productRequests: requestForm.name
            ? [
                {
                  productName: requestForm.name,
                  requestedQty: Number(requestForm.qty) || 1,
                  requestedUnit: requestForm.unit || "PCS",
                  notes: requestForm.notes || null,
                },
              ]
            : [],
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal membuat pesanan");

      router.push(`/portal/orders/${json.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat pesanan");
    } finally {
      setSubmitting(false);
    }
  }

  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  const subtotal = cart.reduce((s, i) => s + i.qty * i.sellPrice, 0);

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.push("/portal/dashboard")} className="rounded-lg p-1.5 text-gray-400 active:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Buat Pesanan</h1>
          <p className="text-xs text-gray-500">{identity.displayName}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Delivery Scheduling */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" /> Jadwal Pengiriman
        </h3>

        <label className="mb-1 block text-xs font-medium text-gray-500">Tanggal</label>
        <input
          type="date"
          value={deliveryDate}
          onChange={(e) => setDeliveryDate(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
          className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />

        <label className="mb-1 block text-xs font-medium text-gray-500">Waktu</label>
        <div className="mb-3 grid grid-cols-4 gap-2">
          {[
            { id: "PAGI" as const, label: "Pagi", sub: "08-12", icon: Sun },
            { id: "SIANG" as const, label: "Siang", sub: "12-17", icon: CloudSun },
            { id: "SORE" as const, label: "Sore", sub: "17-20", icon: Moon },
            { id: "CUSTOM" as const, label: "Custom", sub: "", icon: Clock },
          ].map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDeliveryTimeSlot(opt.id)}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border p-2 text-center text-xs transition-all active:scale-[0.97]",
                  deliveryTimeSlot === opt.id
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                )}
              >
                <Icon className={cn("h-4 w-4 mb-1 shrink-0", deliveryTimeSlot === opt.id ? "text-primary" : "text-gray-400")} />
                <div>{opt.label}</div>
                {opt.sub && <div className="text-[10px] text-gray-400 mt-0.5">{opt.sub}</div>}
              </button>
            );
          })}
        </div>

        {deliveryTimeSlot === "CUSTOM" && (
          <input
            type="time"
            value={deliveryTime}
            onChange={(e) => setDeliveryTime(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        )}
      </div>

      {/* Product Search */}
      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk..."
            className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Product Grid */}
      <div className="mb-24 space-y-2">
        {filteredProducts.map((product) => (
          <button
            key={product.id}
            onClick={() => addToCart(product)}
            disabled={!product.sellingPrice}
            className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white p-3 text-left active:scale-[0.98] disabled:opacity-50"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
              <p className="text-xs text-gray-500">{product.sku}</p>
            </div>
            <div className="ml-3 flex items-center gap-2">
              {product.sellingPrice && (
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(product.sellingPrice.price)}
                </span>
              )}
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                /{product.baseUnit.code}
              </span>
              <Plus className="h-4 w-4 text-primary" />
            </div>
          </button>
        ))}
      </div>

      {/* Custom Product Request */}
      <div className="mb-24">
        <button
          onClick={() => setShowRequestForm(!showRequestForm)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 py-3 text-sm font-medium text-primary"
        >
          <Package className="h-4 w-4" />
          {showRequestForm ? "Sembunyikan" : "Produk tidak ada? Tambah baru"}
        </button>

        {showRequestForm && (
          <div className="mt-3 space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Nama produk *"
                value={requestForm.name}
                onChange={(e) => setRequestForm({ ...requestForm, name: e.target.value })}
                className="col-span-2 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="number"
                placeholder="Qty"
                value={requestForm.qty}
                onChange={(e) => setRequestForm({ ...requestForm, qty: e.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="text"
                placeholder="Satuan (Kg/Dus/..."
                value={requestForm.unit}
                onChange={(e) => setRequestForm({ ...requestForm, unit: e.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <textarea
              placeholder="Catatan (opsional)"
              value={requestForm.notes}
              onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}
      </div>

      {/* Cart Bottom Sheet Toggle */}
      {cart.length > 0 && !showCart && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white p-4">
          <div className="mx-auto max-w-lg">
            <button
              onClick={() => setShowCart(true)}
              className="flex w-full items-center justify-between rounded-xl bg-primary p-4 text-white shadow-lg active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5" />
                <div className="text-left">
                  <p className="text-sm font-semibold">{totalItems} item</p>
                  <p className="text-xs text-white/70">{formatCurrency(subtotal)}</p>
                </div>
              </div>
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Cart Bottom Sheet */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-base font-bold">Keranjang ({totalItems} item)</h2>
            <button onClick={() => setShowCart(false)} className="rounded-lg p-1.5 text-gray-400">
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.map((item) => (
              <div key={item.key} className="flex items-center gap-3 border-b border-gray-100 pb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(item.sellPrice)} / {item.unitCode}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty(item.key, -1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-500 active:bg-gray-100"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-8 text-center text-sm font-medium">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.key, 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-500 active:bg-gray-100"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <span className="w-20 text-right text-sm font-semibold">
                  {formatCurrency(item.qty * item.sellPrice)}
                </span>
                <button onClick={() => removeItem(item.key)} className="rounded-lg p-1 text-gray-300 active:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="border-t p-4">
            <div className="mb-3 flex justify-between text-sm">
              <span className="text-gray-500">Total</span>
              <span className="font-bold text-gray-900">{formatCurrency(subtotal)}</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Mengirim...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Kirim Pesanan
                </>
              )}
            </button>
            <button onClick={() => setShowCart(false)} className="mt-2 w-full rounded-xl py-2 text-sm text-gray-500">
              Lanjut Pilih Produk
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
