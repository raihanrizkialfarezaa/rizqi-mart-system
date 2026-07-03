"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Trash2, Minus, Info, Loader2, Check, AlertCircle, Building2, Package } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/decimal";

type Institution = {
  id: string;
  name: string;
  type: string;
  address: string | null;
};

type ProductUnit = {
  id: string;
  code: string;
  name: string;
};

type ProductSellPrice = {
  id: string;
  unitId: string;
  price: number;
  unit: ProductUnit;
};

type Product = {
  id: string;
  sku: string;
  name: string;
  baseUnitId: string;
  baseUnit: ProductUnit;
  unitConversions: Array<{
    id: string;
    unitId: string;
    conversionFactor: number;
    unit: ProductUnit;
  }>;
  sellingPrices: ProductSellPrice[];
};

type CartItem = {
  id: string;
  product: Product;
  unitId: string;
  unit: ProductUnit;
  conversionFactor: number;
  qty: number;
  unitSellPrice: number;
  subtotal: number;
  stockAvailable: number | null;
  priceCeiling: number | null;
  priceCeilingExceeded: boolean;
};

export default function OrderBuilder() {
  const router = useRouter();
  const [orderType, setOrderType] = useState<"B2C_ECER" | "B2B_GROSIR">("B2B_GROSIR");
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    fetch("/api/institutions")
      .then((r) => r.json())
      .then((res) => setInstitutions(res.data || []))
      .catch(() => {});
    loadProducts();
  }, []);

  async function loadProducts(q?: string) {
    setSearching(true);
    try {
      const url = q?.trim()
        ? `/api/products/search?q=${encodeURIComponent(q.trim())}`
        : "/api/products/search?q=";
      const res = await fetch(url);
      const json = await res.json();
      setSearchResults(json.data || []);
      setShowProductDropdown(true);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => loadProducts(value), 300);
  }

  function getSellPrice(product: Product, unitId: string): number {
    return product.sellingPrices?.[0]?.price || 0;
  }

  function getConversionFactor(product: Product, unitId: string): number {
    if (unitId === product.baseUnitId) return 1;
    const conv = product.unitConversions?.find((c) => c.unitId === unitId);
    return conv?.conversionFactor || 1;
  }

  async function addToCart(product: Product) {
    const unitId = product.baseUnitId;
    const unit = product.baseUnit;
    const convFactor = getConversionFactor(product, unitId);
    const price = getSellPrice(product, unitId);

    if (cart.find((item) => item.product.id === product.id && item.unitId === unitId)) {
      setCart((prev) =>
        prev.map((item) =>
          item.product.id === product.id && item.unitId === unitId
            ? { ...item, qty: item.qty + 1, subtotal: (item.qty + 1) * item.unitSellPrice }
            : item
        )
      );
      setSearchQuery("");
      setSearchResults([]);
      setShowProductDropdown(false);
      return;
    }

    let stockAvailable: number | null = null;
    try {
      const res = await fetch(`/api/products/${product.id}/stock`);
      const json = await res.json();
      stockAvailable = json.data?.totalAvailable ?? null;
    } catch {}

    let priceCeiling: number | null = null;
    let priceCeilingExceeded = false;
    if (orderType === "B2B_GROSIR" && selectedInstitutionId) {
      try {
        const res = await fetch(`/api/institutions/${selectedInstitutionId}/price-ceiling?productId=${product.id}&unitId=${unitId}`);
        const json = await res.json();
        if (json.data) {
          priceCeiling = json.data.priceCeiling;
          priceCeilingExceeded = price > priceCeiling;
        }
      } catch {}
    }

    setCart((prev) => [
      ...prev,
      {
        id: `${product.id}-${unitId}-${Date.now()}`,
        product,
        unitId,
        unit,
        conversionFactor: convFactor,
        qty: 1,
        unitSellPrice: price,
        subtotal: price,
        stockAvailable,
        priceCeiling,
        priceCeilingExceeded,
      },
    ]);
    setSearchQuery("");
    setSearchResults([]);
    setShowProductDropdown(false);
  }

  function updateQty(itemId: string, delta: number) {
    setCart((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              qty: Math.max(1, item.qty + delta),
              subtotal: Math.max(1, item.qty + delta) * item.unitSellPrice,
            }
          : item
      )
    );
  }

  function removeItem(itemId: string) {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  }

  function updatePrice(itemId: string, newPrice: number) {
    setCart((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              unitSellPrice: newPrice,
              subtotal: item.qty * newPrice,
              priceCeilingExceeded: item.priceCeiling !== null && newPrice > item.priceCeiling,
            }
          : item
      )
    );
  }

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const hasPaguViolations = cart.some((item) => item.priceCeilingExceeded);

  async function handleSubmit() {
    setError(null);
    setSuccess(null);

    if (cart.length === 0) {
      setError("Minimal satu item diperlukan");
      return;
    }
    if (orderType === "B2B_GROSIR" && !selectedInstitutionId) {
      setError("Pilih institusi untuk order B2B");
      return;
    }
    if (hasPaguViolations) {
      setError("Ada item yang melebihi pagu harga. Sesuaikan harga terlebih dahulu.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: orderType === "B2B_GROSIR" ? "WHATSAPP_B2B" : "ECOMMERCE",
          orderType,
          institutionId: orderType === "B2B_GROSIR" ? selectedInstitutionId : undefined,
          deliveryMethod: "DELIVERY",
          deliveryAddressText: "",
          isFreeDelivery: false,
          items: cart.map((item) => ({
            productId: item.product.id,
            unitId: item.unitId,
            qty: item.qty,
            unitSellPrice: item.unitSellPrice,
            baseUnitConversion: item.conversionFactor,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal membuat pesanan");
      }

      setSuccess(`Pesanan ${json.data?.orderNumber || ""} berhasil dibuat!`);
      setCart([]);
      setSelectedInstitutionId("");

      setTimeout(() => {
        router.push("/erp/orders");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat pesanan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Order Type + Institution */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Tipe Pesanan</label>
          <div className="flex overflow-hidden rounded-lg border">
            <button
              type="button"
              onClick={() => setOrderType("B2B_GROSIR")}
              className={cn(
                "px-4 py-2 text-sm font-medium",
                orderType === "B2B_GROSIR"
                  ? "bg-primary text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              )}
            >
              B2B Grosir
            </button>
            <button
              type="button"
              onClick={() => setOrderType("B2C_ECER")}
              className={cn(
                "px-4 py-2 text-sm font-medium",
                orderType === "B2C_ECER"
                  ? "bg-primary text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              )}
            >
              B2C Ecer
            </button>
          </div>
        </div>

        {orderType === "B2B_GROSIR" && (
          <div className="min-w-[250px]">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              <Building2 className="mr-1 inline h-4 w-4" />
              Institusi
            </label>
            <select
              value={selectedInstitutionId}
              onChange={(e) => setSelectedInstitutionId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Pilih institusi...</option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} ({inst.type})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Product Search & List */}
      <div ref={searchRef}>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          <Package className="mr-1 inline h-4 w-4" />
          Cari Produk
        </label>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Cari nama produk atau SKU..."
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
          )}
        </div>

        {searchResults.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {searchResults.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => addToCart(product)}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 text-left hover:border-primary hover:bg-primary/5"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900 truncate">{product.name}</div>
                  <div className="text-xs text-gray-500">{product.sku}</div>
                </div>
                <div className="ml-2 flex shrink-0 items-center gap-2 text-xs text-gray-400">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600">{product.baseUnit.code}</span>
                  {product.sellingPrices?.[0] && (
                    <span className="font-medium text-gray-700">
                      {formatCurrency(product.sellingPrices[0].price)}
                    </span>
                  )}
                  <Plus className="h-4 w-4 text-primary" />
                </div>
              </button>
            ))}
          </div>
        ) : !searching && (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            {searchQuery ? "Tidak ada produk ditemukan" : "Memuat produk..."}
          </div>
        )}
      </div>

      {/* Cart Items */}
      {cart.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="border-b bg-gray-50 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">
              Item Pesanan ({totalItems})
            </h3>
          </div>
          <div className="divide-y">
            {cart.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                  <div className="text-xs text-gray-500">{item.product.sku}</div>
                  {item.stockAvailable !== null && (
                    <div
                      className={cn(
                        "mt-0.5 text-xs",
                        item.qty <= item.stockAvailable ? "text-green-600" : "text-amber-600"
                      )}
                    >
                      Stok: {item.stockAvailable} {item.unit.code}
                      {item.qty > item.stockAvailable && " (tidak cukup)"}
                    </div>
                  )}
                  {item.priceCeiling !== null && (
                    <div
                      className={cn(
                        "mt-0.5 text-xs",
                        item.priceCeilingExceeded ? "text-red-600" : "text-green-600"
                      )}
                    >
                      Pagu: {formatCurrency(item.priceCeiling)}{" "}
                      {item.priceCeilingExceeded ? "(melebihi!)" : "(OK)"}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateQty(item.id, -1)}
                    className="rounded-md border p-1 text-gray-500 hover:bg-gray-100"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-10 text-center text-sm font-medium">{item.qty}</span>
                  <button
                    type="button"
                    onClick={() => updateQty(item.id, 1)}
                    className="rounded-md border p-1 text-gray-500 hover:bg-gray-100"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                <div className="w-24">
                  <input
                    type="number"
                    value={item.unitSellPrice}
                    onChange={(e) => updatePrice(item.id, Number(e.target.value) || 0)}
                    className={cn(
                      "w-full rounded-md border px-2 py-1 text-right text-sm",
                      item.priceCeilingExceeded
                        ? "border-red-300 bg-red-50 text-red-700"
                        : "border-gray-300 text-gray-900"
                    )}
                  />
                </div>

                <div className="w-24 text-right text-sm font-medium text-gray-900">
                  {formatCurrency(item.subtotal)}
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="rounded-md p-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="border-t bg-gray-50 px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Subtotal ({totalItems} item)</span>
              <span className="font-bold text-gray-900">{formatCurrency(subtotal)}</span>
            </div>
            {hasPaguViolations && (
              <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                <span>Beberapa item melebihi pagu harga. Sesuaikan harga sebelum submit.</span>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="border-t px-4 py-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || hasPaguViolations}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white",
                submitting || hasPaguViolations
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-primary hover:bg-primary/90"
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Buat Pesanan"
              )}
            </button>
          </div>
        </div>
      )}

      {cart.length === 0 && !searching && searchResults.length === 0 && (
        <div className="rounded-xl border bg-white p-8 text-center">
          <Package className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">
            Tidak ada produk tersedia
          </p>
        </div>
      )}
    </div>
  );
}
