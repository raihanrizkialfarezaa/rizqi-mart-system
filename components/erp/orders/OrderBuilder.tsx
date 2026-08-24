"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Trash2, Minus, Info, Loader2, Check, AlertCircle, Building2, Package, CalendarDays, Clock, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/decimal";

type Institution = {
  id: string;
  name: string;
  type: string;
  address: string;
  parentInstitution?: {
    id: string;
    name: string;
    type: string;
    address: string;
  } | null;
  contacts?: Array<{
    id: string;
    name: string;
    phone: string;
    role: string;
  }>;
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
    conversionFactor?: number;
    conversionToBase?: number | string;
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
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState<"PAGI" | "SIANG" | "SORE" | "CUSTOM" | "">("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [productRequests, setProductRequests] = useState<Array<{
    productName: string;
    requestedQty: number;
    requestedUnit: string;
    notes?: string;
  }>>([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm] = useState({ name: "", qty: "", unit: "", notes: "" });
  const [existingProductMatch, setExistingProductMatch] = useState<Product | null>(null);

  useEffect(() => {
    if (!requestForm.name.trim()) {
      setExistingProductMatch(null);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(requestForm.name.trim())}`);
        const json = await res.json();
        const found = json.data?.find((p: Product) => p.name.toLowerCase() === requestForm.name.trim().toLowerCase());
        setExistingProductMatch(found || null);
      } catch {
        setExistingProductMatch(null);
      }
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [requestForm.name]);

  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

  function getProductUnits(product: Product) {
    const list = [{ id: product.baseUnitId, code: product.baseUnit.code, conversionFactor: 1 }];
    if (product.unitConversions) {
      product.unitConversions.forEach((uc) => {
        list.push({
          id: uc.unitId,
          code: uc.unit.code,
          conversionFactor: Number(uc.conversionToBase || uc.conversionFactor || 1)
        });
      });
    }
    return list;
  }

  function getSellPrice(product: Product, unitId: string): number {
    // Try to find price matching the specific unitId
    const specificPrice = product.sellingPrices?.find((sp) => sp.unitId === unitId);
    if (specificPrice) return Number(specificPrice.price);

    // Fallback: get base unit price and multiply by conversion factor
    const basePriceObj = product.sellingPrices?.find((sp) => sp.unitId === product.baseUnitId) || product.sellingPrices?.[0];
    const basePrice = basePriceObj ? Number(basePriceObj.price) : 0;
    
    if (unitId === product.baseUnitId) return basePrice;

    const conv = product.unitConversions?.find((c) => c.unitId === unitId);
    const factor = conv ? Number(conv.conversionToBase || conv.conversionFactor || 1) : 1;
    return basePrice * factor;
  }

  function getConversionFactor(product: Product, unitId: string): number {
    if (unitId === product.baseUnitId) return 1;
    const conv = product.unitConversions?.find((c) => c.unitId === unitId);
    return Number(conv?.conversionToBase || conv?.conversionFactor || 1);
  }

  async function updateUnit(cartItemId: string, newUnitId: string) {
    let itemToUpdate = cart.find((i) => i.id === cartItemId);
    if (!itemToUpdate) return;

    const product = itemToUpdate.product;
    const allUnits = getProductUnits(product);
    const selectedUnit = allUnits.find((u) => u.id === newUnitId);
    if (!selectedUnit) return;

    const conversionFactor = selectedUnit.conversionFactor;
    const unitSellPrice = getSellPrice(product, newUnitId);

    let priceCeiling: number | null = null;
    let priceCeilingExceeded = false;
    if (orderType === "B2B_GROSIR" && selectedInstitutionId) {
      try {
        const res = await fetch(`/api/institutions/${selectedInstitutionId}/price-ceiling?productId=${product.id}&unitId=${newUnitId}`);
        const json = await res.json();
        if (json.data) {
          priceCeiling = json.data.priceCeiling;
          priceCeilingExceeded = priceCeiling !== null && unitSellPrice > priceCeiling;
        }
      } catch {}
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== cartItemId) return item;
        return {
          ...item,
          unitId: newUnitId,
          unit: { id: newUnitId, code: selectedUnit.code, name: selectedUnit.code },
          conversionFactor,
          unitSellPrice,
          subtotal: item.qty * unitSellPrice,
          priceCeiling,
          priceCeilingExceeded,
        };
      })
    );
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
      loadProducts("");
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
          priceCeilingExceeded = priceCeiling !== null && price > priceCeiling;
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
    loadProducts("");
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

  function updateQtyDirectly(itemId: string, val: number) {
    const qty = Math.max(1, val);
    setCart((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              qty,
              subtotal: qty * item.unitSellPrice,
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
      const body: Record<string, unknown> = {
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
      };

      if (orderType === "B2B_GROSIR" && deliveryDate) {
        body.requestedDeliveryDate = new Date(deliveryDate).toISOString();
        body.deliveryTimeSlot = deliveryTimeSlot || undefined;
        body.requestedDeliveryTime = deliveryTimeSlot === "CUSTOM" ? deliveryTime : undefined;
      }

      if (orderType === "B2B_GROSIR" && productRequests.length > 0) {
        body.productRequests = productRequests;
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal membuat pesanan");
      }

      setSuccess(`Pesanan ${json.data?.orderNumber || ""} berhasil dibuat!`);
      setCreatedOrder(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat pesanan");
    } finally {
      setSubmitting(false);
    }
  }

  function handleResetForm() {
    setCart([]);
    setSelectedInstitutionId("");
    setDeliveryDate("");
    setDeliveryTimeSlot("");
    setDeliveryTime("");
    setProductRequests([]);
    setError(null);
    setSuccess(null);
    setCreatedOrder(null);
    loadProducts("");
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
          <div className="min-w-[400px] space-y-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              <Building2 className="mr-1 inline h-4 w-4" />
              Dapur SPPG
            </label>
            <select
              value={selectedInstitutionId}
              onChange={(e) => setSelectedInstitutionId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Pilih dapur...</option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} • {inst.parentInstitution?.name || "N/A"} • {inst.address}
                </option>
              ))}
            </select>
            {selectedInstitutionId && (() => {
              const selected = institutions.find((i) => i.id === selectedInstitutionId);
              if (!selected) return null;
              return (
                <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs leading-relaxed text-blue-800 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                    <span>
                      <span className="font-medium">Yayasan:</span>{" "}
                      {selected.parentInstitution?.name || (
                        <span className="italic">-</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-600 mt-0.5" />
                    <span>
                      <span className="font-medium">Alamat:</span> {selected.address}
                    </span>
                  </div>
                  {selected.contacts && selected.contacts.length > 0 && (
                    <div className="flex items-start gap-1.5">
                      <User className="h-3.5 w-3.5 shrink-0 text-blue-600 mt-0.5" />
                      <span>
                        <span className="font-medium">Kontak:</span>{" "}
                        {selected.contacts.map((c, i) => (
                          <span key={c.id}>
                            {i > 0 && ", "}
                            {c.name} ({c.phone})
                          </span>
                        ))}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Delivery Scheduling (B2B only) */}
      {orderType === "B2B_GROSIR" && (
        <div className="flex flex-wrap gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="min-w-[200px]">
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <CalendarDays className="h-4 w-4 text-gray-500" />
              Tanggal Pengiriman
            </label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <Clock className="h-4 w-4 text-gray-500" />
              Waktu Pengiriman
            </label>
            <div className="flex flex-wrap gap-1">
              {[
                { id: "PAGI" as const, label: "Pagi", sub: "08-12" },
                { id: "SIANG" as const, label: "Siang", sub: "12-17" },
                { id: "SORE" as const, label: "Sore", sub: "17-20" },
                { id: "CUSTOM" as const, label: "Custom", sub: "" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDeliveryTimeSlot(opt.id)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-medium",
                    deliveryTimeSlot === opt.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {opt.label}
                  {opt.sub && <span className="ml-1 text-gray-400">{opt.sub}</span>}
                </button>
              ))}
            </div>
            {deliveryTimeSlot === "CUSTOM" && (
              <input
                type="time"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            )}
          </div>
        </div>
      )}

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

      {/* Custom Product Request for B2B */}
      {orderType === "B2B_GROSIR" && (
        <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
          <button
            type="button"
            onClick={() => setShowRequestForm(!showRequestForm)}
            className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <Package className="h-4 w-4" />
            {showRequestForm ? "Tutup Form Produk Baru" : "Tambah Produk Baru (Tidak Terdaftar)"}
          </button>

          {showRequestForm && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 items-end bg-gray-50 p-4 rounded-lg border">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Nama Produk *</label>
                <input
                  type="text"
                  placeholder="Nama produk baru..."
                  value={requestForm.name}
                  onChange={(e) => setRequestForm({ ...requestForm, name: e.target.value })}
                  className="w-full rounded border px-3 py-1.5 text-sm"
                />
                {existingProductMatch && (
                  <div className="mt-1.5 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <span>⚠️</span> Produk sudah terdaftar di database!
                    </p>
                    <p className="text-[10px] text-amber-700 leading-relaxed">
                      Produk <strong className="font-bold">{existingProductMatch.name} ({existingProductMatch.sku})</strong> sudah ada. Gunakan pencarian di atas atau klik tombol di bawah untuk langsung menambahkan produk resmi ini.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        addToCart(existingProductMatch);
                        setRequestForm({ name: "", qty: "", unit: "", notes: "" });
                        setExistingProductMatch(null);
                      }}
                      className="mt-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-extrabold text-[10px] uppercase tracking-wider transition-colors inline-block"
                    >
                      Masukkan Keranjang Resmi
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Jumlah</label>
                <input
                  type="number"
                  placeholder="Qty"
                  value={requestForm.qty}
                  onChange={(e) => setRequestForm({ ...requestForm, qty: e.target.value })}
                  className="w-full rounded border px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Satuan</label>
                <input
                  type="text"
                  placeholder="Satuan (e.g. Kg, Dus)"
                  value={requestForm.unit}
                  onChange={(e) => setRequestForm({ ...requestForm, unit: e.target.value })}
                  className="w-full rounded border px-3 py-1.5 text-sm"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">Catatan</label>
                <input
                  type="text"
                  placeholder="Catatan tambahan..."
                  value={requestForm.notes}
                  onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                  className="w-full rounded border px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    if (!requestForm.name.trim()) return;
                    setProductRequests((prev) => [
                      ...prev,
                      {
                        productName: requestForm.name.trim(),
                        requestedQty: Number(requestForm.qty) || 1,
                        requestedUnit: requestForm.unit.trim() || "PCS",
                        notes: requestForm.notes.trim() || undefined,
                      },
                    ]);
                    setRequestForm({ name: "", qty: "", unit: "", notes: "" });
                  }}
                  className="w-full rounded bg-primary text-white py-1.5 text-sm font-semibold hover:bg-primary/95"
                >
                  Tambahkan
                </button>
              </div>
            </div>
          )}

          {/* List of custom requests */}
          {productRequests.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-gray-700">Daftar Produk Baru yang Diminta:</h4>
              <div className="divide-y border rounded bg-gray-50">
                {productRequests.map((req, idx) => (
                  <div key={idx} className="flex justify-between items-center px-3 py-2 text-sm">
                    <div>
                      <span className="font-semibold">{req.productName}</span> ({req.requestedQty} {req.requestedUnit})
                      {req.notes && <p className="text-xs text-gray-500 italic mt-0.5">Catatan: {req.notes}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => setProductRequests((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
                  <input
                    type="number"
                    min={1}
                    value={item.qty}
                    onChange={(e) => updateQtyDirectly(item.id, Number(e.target.value) || 1)}
                    className="w-12 rounded-md border border-gray-300 py-0.5 text-center text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => updateQty(item.id, 1)}
                    className="rounded-md border p-1 text-gray-500 hover:bg-gray-100"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <select
                    value={item.unitId}
                    onChange={(e) => updateUnit(item.id, e.target.value)}
                    className="ml-1 rounded border border-gray-300 px-2 py-0.5 text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-primary h-[26px]"
                  >
                    {getProductUnits(item.product).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={cn(
                  "w-24 text-right text-sm font-semibold",
                  item.priceCeilingExceeded ? "text-red-600 font-bold" : "text-gray-700"
                )}>
                  {formatCurrency(item.unitSellPrice)}
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

      {/* Success Summary Modal */}
      {createdOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-gray-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                <Check className="h-8 w-8 stroke-[3]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Pesanan Berhasil Dibuat!</h3>
              <p className="text-sm text-gray-500 mt-1">Order baru telah sukses masuk ke sistem.</p>
            </div>

            {/* Order Details Card */}
            <div className="rounded-xl bg-gray-50 p-4 border border-gray-100 mb-6 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-gray-400 block uppercase font-semibold tracking-wider">No. Order</span>
                  <span className="font-bold text-gray-900">{createdOrder.orderNumber}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block uppercase font-semibold tracking-wider">Pelanggan / Dapur</span>
                  <span className="font-semibold text-gray-900">
                    {createdOrder.institution?.name || createdOrder.customer?.name || "Walk-in"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block uppercase font-semibold tracking-wider">Tipe Pesanan</span>
                  <span className="font-medium text-gray-700">
                    {createdOrder.orderType === "B2B_GROSIR" ? "B2B Grosir" : "B2C Ecer"}
                  </span>
                </div>
                {createdOrder.requestedDeliveryDate && (
                  <div>
                    <span className="text-xs text-gray-400 block uppercase font-semibold tracking-wider">Jadwal Pengiriman</span>
                    <span className="font-medium text-gray-700">
                      {new Date(createdOrder.requestedDeliveryDate).toLocaleDateString("id-ID", {
                        weekday: "long", day: "numeric", month: "long"
                      })}
                      {createdOrder.requestedDeliveryTime && ` • ${createdOrder.requestedDeliveryTime}`}
                      {createdOrder.deliveryTimeSlot && ` (${createdOrder.deliveryTimeSlot})`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="border rounded-lg overflow-hidden mb-6">
              <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-700 border-b">Daftar Item Pesanan</div>
              <div className="divide-y max-h-40 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center px-4 py-2 text-sm">
                    <div className="min-w-0 flex-1 pr-4">
                      <p className="font-medium text-gray-900 truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-500">{item.product.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(item.subtotal)}</p>
                      <p className="text-xs text-gray-400">{item.qty} {item.unit.code} x {formatCurrency(item.unitSellPrice)}</p>
                    </div>
                  </div>
                ))}

                {/* Custom requests */}
                {productRequests.map((req, idx) => (
                  <div key={idx} className="flex justify-between items-center px-4 py-2 text-sm bg-amber-50/50">
                    <div className="min-w-0 flex-1 pr-4">
                      <p className="font-medium text-amber-900 truncate">⭐ [Produk Baru] {req.productName}</p>
                      {req.notes && <p className="text-xs text-amber-700 italic">Catatan: {req.notes}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-amber-800">Menunggu Review</p>
                      <p className="text-xs text-amber-600">{req.requestedQty} {req.requestedUnit}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 px-4 py-3 flex justify-between items-center text-sm font-bold text-gray-900 border-t">
                <span>Total</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.push(`/erp/orders/${createdOrder.id}`)}
                className="flex-1 rounded-lg bg-primary text-white py-2.5 text-sm font-semibold hover:bg-primary/95 text-center transition-all shadow-md active:scale-[0.98]"
              >
                Lihat Detail Pesanan
              </button>
              <button
                type="button"
                onClick={handleResetForm}
                className="flex-1 rounded-lg border border-gray-300 bg-white text-gray-700 py-2.5 text-sm font-semibold hover:bg-gray-50 text-center transition-all active:scale-[0.98]"
              >
                Buat Pesanan Lain
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
