"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Award, Plus, Calendar, Loader2, Save, CheckCircle2, AlertCircle, Building2, User
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/decimal";

type SupplierQuote = {
  id: string;
  price: number;
  isPromo: boolean;
  checkedAt: string;
  validUntil: string | null;
  notes: string | null;
  supplierProduct: {
    id: string;
    supplier: { id: string; name: string };
    unit: { id: string; code: string; name: string };
  };
};

type SourcingRequestData = {
  id: string;
  productId: string;
  qtyNeeded: number;
  deadline: string;
  status: string;
  product: {
    id: string;
    name: string;
    sku: string;
    baseUnitCode: string;
    units: Array<{ id: string; code: string; conversionToBase: number }>;
  };
  unit: { id: string; code: string; name: string };
  salesOrderItem: {
    salesOrder: { id: string; orderNumber: string; institution: { name: string } | null };
  };
  chosenSupplierProduct: {
    supplier: { name: string };
  } | null;
  decisionReason: string | null;
  decidedAt: string | null;
  priceQuotes: SupplierQuote[];
};

type Supplier = {
  id: string;
  name: string;
  type: string;
};

export default function SourcingDetailClient({
  sourcingRequest,
  suppliers: initialSuppliers,
}: {
  sourcingRequest: SourcingRequestData;
  suppliers: Supplier[];
}) {
  const router = useRouter();
  const [request, setRequest] = useState<SourcingRequestData>(sourcingRequest);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);

  // Quote Form State
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState({
    supplierId: "",
    price: "",
    unitId: request.unit.id,
    isPromo: false,
    validUntil: "",
    notes: "",
  });
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Supplier Modal State
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierType, setNewSupplierType] = useState("GROSIR");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [newSupplierAddress, setNewSupplierAddress] = useState("");

  // Decision Modal State
  const [decidingQuote, setDecidingQuote] = useState<SupplierQuote | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // Conversion calculations
  const reqUnitConv = request.product.units.find((u) => u.id === request.unit.id || u.code === request.unit.code);
  const reqFactor = reqUnitConv?.conversionToBase || 1;

  const selectedUnitConv = request.product.units.find((u) => u.id === quoteForm.unitId || u.code === quoteForm.unitId);
  const selectedFactor = selectedUnitConv?.conversionToBase || 1;

  // Sorted quotes by equivalent price per request unit
  const sortedQuotes = [...request.priceQuotes].sort((a, b) => {
    const aUnit = request.product.units.find((u) => u.id === a.supplierProduct.unit.id || u.code === a.supplierProduct.unit.code);
    const aFactor = aUnit?.conversionToBase || 1;
    const aEquivalent = (a.price / aFactor) * reqFactor;

    const bUnit = request.product.units.find((u) => u.id === b.supplierProduct.unit.id || u.code === b.supplierProduct.unit.code);
    const bFactor = bUnit?.conversionToBase || 1;
    const bEquivalent = (b.price / bFactor) * reqFactor;

    return aEquivalent - bEquivalent;
  });

  const cheapestEquivalent = sortedQuotes.length > 0 ? (() => {
    const q = sortedQuotes[0];
    const qUnit = request.product.units.find((u) => u.id === q.supplierProduct.unit.id || u.code === q.supplierProduct.unit.code);
    const qFactor = qUnit?.conversionToBase || 1;
    return (q.price / qFactor) * reqFactor;
  })() : null;

  // Filter out suppliers that already have a quote, except the one being edited
  const usedSupplierIds = request.priceQuotes
    .filter((q) => q.id !== editingQuoteId)
    .map((q) => q.supplierProduct.supplier.id);
  const filteredSuppliers = suppliers.filter((s) => !usedSupplierIds.includes(s.id));

  function handleStartEditQuote(quote: SupplierQuote) {
    setEditingQuoteId(quote.id);
    setQuoteForm({
      supplierId: quote.supplierProduct.supplier.id,
      price: String(quote.price),
      unitId: quote.supplierProduct.unit.id,
      isPromo: quote.isPromo,
      validUntil: quote.validUntil ? quote.validUntil.split("T")[0] : "",
      notes: quote.notes || "",
    });
    setShowQuoteForm(true);
  }

  function handleCancelQuoteForm() {
    setShowQuoteForm(false);
    setEditingQuoteId(null);
    setQuoteForm({
      supplierId: "",
      price: "",
      unitId: request.unit.id,
      isPromo: false,
      validUntil: "",
      notes: "",
    });
  }

  async function handleDeleteQuote(quoteId: string) {
    if (!confirm("Apakah Anda yakin ingin menghapus penawaran harga ini?")) {
      return;
    }
    try {
      const res = await fetch(`/api/procurement/price-quotes?id=${quoteId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menghapus penawaran harga");

      window.location.reload();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus penawaran harga");
    }
  }

  async function handleCreateSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!newSupplierName.trim()) {
      alert("Nama supplier wajib diisi.");
      return;
    }
    setSavingSupplier(true);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSupplierName,
          type: newSupplierType,
          phone: newSupplierPhone,
          address: newSupplierAddress,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal membuat supplier");

      setSuppliers((prev) => [...prev, json.supplier]);
      setQuoteForm((prev) => ({ ...prev, supplierId: json.supplier.id }));
      setShowSupplierModal(false);

      setNewSupplierName("");
      setNewSupplierType("GROSIR");
      setNewSupplierPhone("");
      setNewSupplierAddress("");
    } catch (err: any) {
      alert(err.message || "Gagal membuat supplier.");
    } finally {
      setSavingSupplier(false);
    }
  }

  async function handleAddQuote(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!quoteForm.supplierId || !quoteForm.price) {
      setError("Pilih supplier dan masukkan harga penawaran.");
      return;
    }

    setSubmittingQuote(true);
    try {
      const url = "/api/procurement/price-quotes";
      const method = editingQuoteId ? "PUT" : "POST";
      const payload = editingQuoteId
        ? {
            id: editingQuoteId,
            price: Number(quoteForm.price),
            isPromo: quoteForm.isPromo,
            validUntil: quoteForm.validUntil || undefined,
            notes: quoteForm.notes || undefined,
          }
        : {
            productId: request.productId,
            unitId: quoteForm.unitId || null,
            supplierId: quoteForm.supplierId,
            price: Number(quoteForm.price),
            isPromo: quoteForm.isPromo,
            validUntil: quoteForm.validUntil || undefined,
            sourcingRequestId: request.id,
            notes: quoteForm.notes || undefined,
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mencatat harga");

      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Gagal mencatat harga");
    } finally {
      setSubmittingQuote(false);
    }
  }

  async function handleConfirmDecision() {
    if (!decidingQuote) return;
    setSubmittingDecision(true);
    try {
      const res = await fetch("/api/procurement/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcingRequestId: request.id,
          chosenSupplierProductId: decidingQuote.supplierProduct.id,
          decisionReason: decisionReason || "Harga termurah/terbaik",
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Gagal memilih supplier");
      }

      // Reload details
      const detailRes = await fetch(`/api/procurement/sourcing-requests/${request.id}`);
      const detailJson = await detailRes.json();
      if (detailRes.ok && detailJson.data) {
        setRequest(detailJson.data);
      }

      setDecidingQuote(null);
      setDecisionReason("");
    } catch (err: any) {
      alert(err.message || "Gagal memilih supplier");
    } finally {
      setSubmittingDecision(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/erp/procurement"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke daftar sourcing
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900">{request.product.name}</h2>
          <span className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-relaxed",
            request.status === "DIBUTUHKAN" ? "bg-yellow-50 border-yellow-200 text-yellow-700" :
            request.status === "SEDANG_DIBANDINGKAN" ? "bg-purple-50 border-purple-200 text-purple-700" :
            request.status === "DIPUTUSKAN" ? "bg-blue-50 border-blue-200 text-blue-700" :
            "bg-green-50 border-green-200 text-green-700"
          )}>
            {request.status === "DIBUTUHKAN" ? "Dibutuhkan" :
             request.status === "SEDANG_DIBANDINGKAN" ? "Dibandingkan" :
             request.status === "DIPUTUSKAN" ? "Diputuskan" : "Dibeli"}
          </span>
        </div>

        {request.status !== "DIPUTUSKAN" && request.status !== "DIBELI" && (
          <button
            onClick={() => setShowQuoteForm(!showQuoteForm)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/95 shadow active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> Catat Harga Baru
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Comparison Table */}
        <div className="lg:col-span-2 space-y-6">
          {showQuoteForm && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 border-b pb-2">
                {editingQuoteId ? "Edit Penawaran Harga" : "Catat Penawaran Harga Baru"}
              </h3>
              <form onSubmit={handleAddQuote} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Supplier *</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <select
                          value={quoteForm.supplierId}
                          onChange={(e) => setQuoteForm({ ...quoteForm, supplierId: e.target.value })}
                          disabled={!!editingQuoteId}
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none disabled:bg-gray-100 disabled:text-gray-500 font-semibold"
                        >
                          <option value="">Pilih Supplier...</option>
                          {filteredSuppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.type})
                            </option>
                          ))}
                        </select>
                      </div>
                      {!editingQuoteId && (
                        <button
                          type="button"
                          onClick={() => setShowSupplierModal(true)}
                          className="inline-flex items-center justify-center rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 shadow-sm transition-colors h-[38px] w-[38px] shrink-0"
                          title="Tambah Supplier Baru"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Satuan Harga *</label>
                    <select
                      value={quoteForm.unitId}
                      onChange={(e) => setQuoteForm({ ...quoteForm, unitId: e.target.value })}
                      disabled={!!editingQuoteId}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none disabled:bg-gray-100 disabled:text-gray-500 font-semibold"
                    >
                      {request.product.units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.code}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Harga Penawaran (per {request.product.units.find((u) => u.id === quoteForm.unitId)?.code || ""}) *
                    </label>
                    <input
                      type="number"
                      placeholder="Harga Rp..."
                      value={quoteForm.price}
                      onChange={(e) => setQuoteForm({ ...quoteForm, price: e.target.value })}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Berlaku Sampai</label>
                    <input
                      type="date"
                      value={quoteForm.validUntil}
                      onChange={(e) => setQuoteForm({ ...quoteForm, validUntil: e.target.value })}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Catatan Tambahan</label>
                    <input
                      type="text"
                      placeholder="Catatan promo, minimal order, dsb..."
                      value={quoteForm.notes}
                      onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={quoteForm.isPromo}
                        onChange={(e) => setQuoteForm({ ...quoteForm, isPromo: e.target.checked })}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-xs font-medium text-gray-700">Harga Promo / Diskon Terbatas</span>
                    </label>
                  </div>

                  {/* Equivalent Price conversion helper */}
                  {quoteForm.unitId !== request.unit.id && Number(quoteForm.price) > 0 && (
                    <div className="sm:col-span-2 bg-amber-50 border-2 border-amber-300 rounded-xl p-3.5 shadow-sm">
                      <p className="text-[10px] text-amber-800 font-extrabold uppercase tracking-wider">Kalkulator Konversi Satuan (Elder-Friendly)</p>
                      <p className="text-sm font-bold text-gray-800 mt-1">
                        Harga <span className="text-amber-950 underline decoration-amber-400 font-black">{formatCurrency(Number(quoteForm.price))} / {request.product.units.find((u) => u.id === quoteForm.unitId)?.code}</span> setara dengan:
                      </p>
                      <p className="text-lg font-black text-amber-950 mt-1.5 bg-amber-200 px-3.5 py-1.5 rounded-lg border border-amber-300 inline-block font-sans">
                        {formatCurrency((Number(quoteForm.price) / selectedFactor) * reqFactor)} / {request.unit.code} (Satuan Sourcing PO)
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 border-t pt-3">
                  <button
                    type="submit"
                    disabled={submittingQuote}
                    className="rounded bg-primary text-white px-4 py-2 text-xs font-semibold hover:bg-primary/95 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {submittingQuote && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {editingQuoteId ? "Simpan Perubahan" : "Simpan Penawaran"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelQuoteForm}
                    className="rounded border border-gray-300 bg-white text-gray-700 px-4 py-2 text-xs font-semibold hover:bg-gray-50"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-gray-900">Perbandingan Harga Supplier</h3>
              <span className="text-xs text-gray-500">Harga Terendah Muncul Paling Atas</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500 font-semibold">
                    <th className="pb-2">Supplier</th>
                    <th className="pb-2 text-right">Harga Jual</th>
                    <th className="pb-2 text-center">Promo</th>
                    <th className="pb-2 text-center">Berlaku s/d</th>
                    {request.status !== "DIPUTUSKAN" && request.status !== "DIBELI" && (
                      <th className="pb-2 text-center text-xs">Aksi</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedQuotes.map((q, idx) => {
                    const quoteUnitConv = request.product.units.find((u) => u.id === q.supplierProduct.unit.id || u.code === q.supplierProduct.unit.code);
                    const quoteFactor = quoteUnitConv?.conversionToBase || 1;
                    const quoteEquivalentPrice = (q.price / quoteFactor) * reqFactor;
                    const hasDifferentUnit = q.supplierProduct.unit.id !== request.unit.id && q.supplierProduct.unit.code !== request.unit.code;

                    return (
                      <tr key={q.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              {q.supplierProduct.supplier.name}
                            </span>
                            {idx === 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 border border-green-200 text-[10px] font-bold text-green-700">
                                <Award className="h-3 w-3" /> Termurah
                              </span>
                            )}
                          </div>
                          {q.notes && <p className="text-[10px] text-gray-400 italic">{q.notes}</p>}
                        </td>
                        <td className="py-3 text-right font-bold text-gray-950 text-xs sm:text-sm">
                          <div>{formatCurrency(q.price)} / {q.supplierProduct.unit.code}</div>
                          {hasDifferentUnit && (
                            <div className="text-[10px] text-amber-700 font-extrabold mt-0.5">
                              (setara {formatCurrency(quoteEquivalentPrice)} / {request.unit.code})
                            </div>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          {q.isPromo ? (
                            <span className="rounded bg-purple-50 px-1.5 py-0.5 border border-purple-100 text-[10px] font-bold text-purple-700">
                              PROMO
                            </span>
                          ) : "—"}
                        </td>
                        <td className="py-3 text-center text-xs text-gray-500">
                          {q.validUntil ? new Date(q.validUntil).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "Selamanya"}
                        </td>
                        {request.status !== "DIPUTUSKAN" && request.status !== "DIBELI" && (
                          <td className="py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setDecidingQuote(q)}
                                className="rounded bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-white px-2 py-1 text-xs font-bold transition-all active:scale-[0.98]"
                              >
                                Pilih
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                type="button"
                                onClick={() => handleStartEditQuote(q)}
                                className="text-blue-600 hover:text-blue-800 font-extrabold text-xs transition-colors"
                              >
                                Edit
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuote(q.id)}
                                className="text-red-500 hover:text-red-700 font-extrabold text-xs transition-colors"
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {sortedQuotes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400 font-medium">
                        Belum ada penawaran harga. Silakan tambahkan quote harga terlebih dahulu.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Details & Info Panel */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3 text-sm">
            <h3 className="font-bold text-gray-900 border-b pb-2">Detail Permintaan</h3>
            <div className="flex justify-between">
              <span className="text-gray-500">Qty Dibutuhkan</span>
              <span className="font-semibold text-gray-900">{request.qtyNeeded} {request.unit.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Deadline Sourcing</span>
              <span className="font-semibold text-gray-900">
                {new Date(request.deadline).toLocaleDateString("id-ID", {
                  weekday: "long", day: "numeric", month: "long"
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">No. Order B2B</span>
              <span className="font-semibold text-primary hover:underline">
                <Link href={`/erp/orders/${request.salesOrderItem.salesOrder.id}`}>
                  {request.salesOrderItem.salesOrder.orderNumber}
                </Link>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Dapur</span>
              <span className="font-semibold text-gray-900">
                {request.salesOrderItem.salesOrder.institution?.name || "—"}
              </span>
            </div>
            {cheapestEquivalent && (
              <div className="flex justify-between border-t pt-2 font-bold">
                <span className="text-gray-600">Harga Termurah (Setara)</span>
                <span className="text-green-600">{formatCurrency(cheapestEquivalent)} / {request.unit.code}</span>
              </div>
            )}
          </div>

          {request.chosenSupplierProduct && (
            <div className="rounded-xl border border-green-200 bg-green-50/50 p-5 shadow-sm space-y-2 text-sm text-green-900">
              <h3 className="font-bold border-b border-green-200 pb-2">Keputusan Sourcing</h3>
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
                <div>
                  <p className="font-bold">{request.chosenSupplierProduct.supplier.name}</p>
                  {request.decisionReason && (
                    <p className="text-xs text-green-700 italic mt-0.5">Catatan: {request.decisionReason}</p>
                  )}
                  {request.decidedAt && (
                    <p className="text-[10px] text-green-600/80 mt-1">
                      Diputuskan {new Date(request.decidedAt).toLocaleString("id-ID")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sourcing Choice Modal */}
      {decidingQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-gray-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-primary mb-3">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-gray-950">Pilih Supplier Penawaran?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Apakah Anda yakin ingin menggunakan supplier <span className="font-semibold text-gray-800">{decidingQuote.supplierProduct.supplier.name}</span> dengan harga <span className="font-bold text-gray-900">{formatCurrency(decidingQuote.price)}</span>?
              </p>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Alasan Pemilihan (Opsional)</label>
              <textarea
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder="Harga termurah / supplier terpercaya / ketersediaan cepat..."
                rows={2}
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex gap-3 mt-6 border-t pt-4">
              <button
                type="button"
                onClick={handleConfirmDecision}
                disabled={submittingDecision}
                className="flex-1 rounded bg-primary text-white py-2 text-xs font-semibold hover:bg-primary/95 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {submittingDecision && <Loader2 className="h-4.5 w-4.5 animate-spin" />}
                Konfirmasi
              </button>
              <button
                type="button"
                onClick={() => {
                  setDecidingQuote(null);
                  setDecisionReason("");
                }}
                className="flex-1 rounded border border-gray-300 bg-white text-gray-700 py-2 text-xs font-semibold hover:bg-gray-50"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Supplier Modal Overlay */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-gray-100 bg-white p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Tambah Supplier Baru</h3>
                <p className="text-xs text-gray-500 mt-1">Daftarkan supplier baru ke dalam database sistem.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSupplierModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-2"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-5 text-left">
              {/* Nama Supplier */}
              <div>
                <label className="block text-xs font-extrabold text-gray-400 tracking-wider uppercase mb-1.5">Nama Supplier *</label>
                <input
                  type="text"
                  placeholder="Nama Supplier (e.g. PT Sembako Jaya)"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-base h-[52px] shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold text-gray-800"
                  required
                />
              </div>

              {/* Grid Tipe & Telepon */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* Tipe Supplier */}
                <div>
                  <label className="block text-xs font-extrabold text-gray-400 tracking-wider uppercase mb-1.5">Tipe Supplier *</label>
                  <select
                    value={newSupplierType}
                    onChange={(e) => setNewSupplierType(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-base h-[52px] bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold text-gray-800"
                  >
                    <option value="GROSIR">Grosir / Supplier Utama</option>
                    <option value="RETAIL_PROMO">Indomaret / Alfamart Promo</option>
                  </select>
                </div>

                {/* Nomor Telepon */}
                <div>
                  <label className="block text-xs font-extrabold text-gray-400 tracking-wider uppercase mb-1.5">Nomor Telepon</label>
                  <input
                    type="text"
                    placeholder="Nomor Telepon"
                    value={newSupplierPhone}
                    onChange={(e) => setNewSupplierPhone(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-base h-[52px] shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold text-gray-800"
                  />
                </div>
              </div>

              {/* Alamat */}
              <div>
                <label className="block text-xs font-extrabold text-gray-400 tracking-wider uppercase mb-1.5">Alamat Supplier</label>
                <input
                  type="text"
                  placeholder="Alamat Lengkap Supplier"
                  value={newSupplierAddress}
                  onChange={(e) => setNewSupplierAddress(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-base h-[52px] shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold text-gray-800"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 border-t pt-5 justify-end">
                <button
                  type="submit"
                  disabled={savingSupplier}
                  className="rounded-xl bg-primary hover:bg-primary/95 text-white px-8 py-3 text-base font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 h-[52px]"
                >
                  {savingSupplier && <Loader2 className="h-5 w-5 animate-spin" />}
                  Simpan Supplier
                </button>
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-8 py-3 text-base font-bold shadow-sm active:scale-[0.98] transition-all h-[52px]"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
