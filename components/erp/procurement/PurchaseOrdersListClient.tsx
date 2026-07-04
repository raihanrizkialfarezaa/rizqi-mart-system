"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Truck, Package, Plus, Loader2, Calendar, Clock, CheckCircle2, AlertCircle,
  Eye, FileText, DollarSign, Download, UploadCloud, X, Save
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/decimal";
import { PageHeader } from "@/components/erp/Panel";

type POItem = {
  id: string;
  poNumber: string;
  purpose: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  paidAt: string | null;
  paymentNotes: string | null;
  paymentProofUrl: string | null;
  totalAmount: number;
  createdAt: string;
  supplier: { id: string; name: string };
  items: Array<{
    id: string;
    productId: string;
    product: { name: string; sku: string };
    unitId?: string;
    unit: { id?: string; code: string };
    qty: number;
    unitCost: number;
    subtotal: number;
    sourcingRequestId: string | null;
  }>;
  goodsReceipts?: Array<{
    id: string;
    receivedAt: string;
    notes: string | null;
    stockBatches: Array<{
      productId: string;
      qtyReceivedBase: number;
    }>;
  }>;
};

type DecidedSourcingRequest = {
  id: string;
  productId: string;
  qtyNeeded: number;
  deadline: string;
  product: { name: string; sku: string };
  unit: { id: string; code: string };
  chosenSupplierProduct: {
    id: string;
    supplierId: string;
    priceQuotes: Array<{ price: number }>;
  };
};

type Supplier = {
  id: string;
  name: string;
  type: string;
};

const SUB_NAV = [
  { label: "Sourcing", href: "/erp/procurement", icon: Package, active: false },
  { label: "Purchase Order", href: "/erp/procurement/purchase-orders", icon: Truck, active: true },
];

const PO_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-700 border-gray-200" },
  ORDERED: { label: "Diorder", color: "bg-blue-50 text-blue-700 border-blue-200" },
  RECEIVED: { label: "Diterima", color: "bg-green-50 text-green-700 border-green-200" },
  CANCELLED: { label: "Batal", color: "bg-red-50 text-red-700 border-red-200" },
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  BELUM_BAYAR: { label: "Belum Bayar", color: "bg-red-50 text-red-700 border-red-200" },
  LUNAS: { label: "Lunas", color: "bg-green-50 text-green-700 border-green-200" },
};

type ProductUnitProp = {
  id: string;
  code: string;
  conversionToBase?: number;
};

type ProductProp = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  baseUnitCode: string;
  units: ProductUnitProp[];
};

type CategoryProp = {
  id: string;
  name: string;
};

type UnitProp = {
  id: string;
  code: string;
  name: string;
};

interface SearchableSelectProps<T> {
  options: T[];
  value: string;
  onChange: (value: string) => void;
  getLabel: (option: T) => string;
  getValue: (option: T) => string;
  placeholder: string;
  disabled?: boolean;
  renderOption?: (option: T) => React.ReactNode;
  className?: string;
}

function SearchableSelect<T>({
  options,
  value,
  onChange,
  getLabel,
  getValue,
  placeholder,
  disabled = false,
  renderOption,
  className,
}: SearchableSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const selectedOption = options.find((opt) => getValue(opt) === value);

  const filtered = options.filter((opt) =>
    getLabel(opt).toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".searchable-select-container")) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  return (
    <div className="relative searchable-select-container">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex justify-between items-center rounded border border-gray-300 px-3 py-2 text-sm bg-white text-left disabled:bg-gray-100 disabled:cursor-not-allowed select-none shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary",
          className
        )}
      >
        <span className={selectedOption ? "text-gray-900 font-medium" : "text-gray-400"}>
          {selectedOption ? getLabel(selectedOption) : placeholder}
        </span>
        <span className="text-gray-400 text-xs">▼</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded border border-gray-200 bg-white shadow-xl p-2.5 space-y-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Cari..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded border border-gray-300 pl-3 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              autoFocus
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1">
            {paginated.length === 0 ? (
              <div className="text-xs text-gray-400 p-2.5 italic text-center">Tidak ada hasil.</div>
            ) : (
              paginated.map((opt) => {
                const optVal = getValue(opt);
                const isSelected = optVal === value;
                return (
                  <div
                    key={optVal}
                    onClick={() => {
                      onChange(optVal);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "cursor-pointer px-3 py-2 text-xs rounded hover:bg-gray-100 transition-colors flex items-center justify-between",
                      isSelected ? "bg-primary/5 text-primary font-bold" : "text-gray-700"
                    )}
                  >
                    {renderOption ? renderOption(opt) : <span>{getLabel(opt)}</span>}
                    {isSelected && <span className="text-primary font-bold ml-2">✓</span>}
                  </div>
                );
              })
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center border-t pt-2 text-[10px] text-gray-500 font-semibold px-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="hover:underline disabled:opacity-30 disabled:no-underline text-primary"
              >
                ← Prev
              </button>
              <span className="text-gray-400">
                Hal {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="hover:underline disabled:opacity-30 disabled:no-underline text-primary"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PurchaseOrdersListClient({
  pos: initialPos,
  decidedRequests,
  suppliers: initialSuppliers,
  products = [],
  categories = [],
  allUnits = [],
}: {
  pos: POItem[];
  decidedRequests: DecidedSourcingRequest[];
  suppliers: Supplier[];
  products?: ProductProp[];
  categories?: CategoryProp[];
  allUnits?: UnitProp[];
}) {
  const router = useRouter();
  const [pos, setPos] = useState<POItem[]>(initialPos);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [productList, setProductList] = useState<ProductProp[]>(products);

  useEffect(() => {
    setPos(initialPos);
  }, [initialPos]);

  useEffect(() => {
    setSuppliers(initialSuppliers);
  }, [initialSuppliers]);

  useEffect(() => {
    setProductList(products);
  }, [products]);

  // Modals state
  const [showPoForm, setShowPoForm] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [poForm, setPoForm] = useState({
    newSupplierName: "",
    newSupplierType: "GROSIR",
    newSupplierPhone: "",
    newSupplierAddress: "",
    purpose: "Pengadaan B2B",
  });
  const [checkedRequests, setCheckedRequests] = useState<Record<string, boolean>>({});
  const [submittingPo, setSubmittingPo] = useState(false);

  // Manual items states
  const [manualItems, setManualItems] = useState<Array<{
    productId: string;
    productName: string;
    sku: string;
    unitId: string;
    unitCode: string;
    qty: number;
    unitCost: number;
    conversionToBase: number;
    baseUnitCode: string;
  }>>([]);

  const [manualProductId, setManualProductId] = useState("");
  const [manualUnitId, setManualUnitId] = useState("");
  const [manualQty, setManualQty] = useState("");
  const [manualUnitCost, setManualUnitCost] = useState("");
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  const [showManualItemModal, setShowManualItemModal] = useState(false);
  const [viewingPo, setViewingPo] = useState<POItem | null>(null);

  // Product modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    name: "",
    sku: "",
    categoryId: "",
    baseUnitId: "",
    isPerishable: true,
  });
  const [newProductConversions, setNewProductConversions] = useState<Array<{ unitId: string; conversionToBase: string }>>([]);
  const [savingProduct, setSavingProduct] = useState(false);

  // Inline conversion states
  const [showInlineConversionForm, setShowInlineConversionForm] = useState(false);
  const [inlineConversionUnitId, setInlineConversionUnitId] = useState("");
  const [inlineConversionFactor, setInlineConversionFactor] = useState("");
  const [savingInlineConversion, setSavingInlineConversion] = useState(false);

  // Category modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      alert("Nama kategori wajib diisi.");
      return;
    }

    setSavingCategory(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal membuat kategori.");

      triggerNotification("Kategori baru berhasil dibuat!", "success");

      categories.push({
        id: json.category.id,
        name: json.category.name,
      });

      setNewProductForm((prev) => ({
        ...prev,
        categoryId: json.category.id,
      }));

      setNewCategoryName("");
    } catch (err: any) {
      alert(err.message || "Gagal membuat kategori.");
    } finally {
      setSavingCategory(false);
    }
  }

  // Unit modal states
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [newUnitCode, setNewUnitCode] = useState("");
  const [newUnitName, setNewUnitName] = useState("");
  const [savingUnit, setSavingUnit] = useState(false);

  async function handleCreateSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!poForm.newSupplierName.trim()) {
      alert("Nama supplier wajib diisi.");
      return;
    }

    setSavingSupplier(true);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: poForm.newSupplierName,
          type: poForm.newSupplierType,
          phone: poForm.newSupplierPhone,
          address: poForm.newSupplierAddress,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal membuat supplier.");

      triggerNotification("Supplier baru berhasil terdaftar!", "success");

      setSuppliers((prev) => [...prev, json.supplier]);
      setSelectedSupplierId(json.supplier.id);

      setShowSupplierModal(false);
      setPoForm((prev) => ({
        ...prev,
        newSupplierName: "",
        newSupplierType: "GROSIR",
        newSupplierPhone: "",
        newSupplierAddress: "",
      }));
    } catch (err: any) {
      alert(err.message || "Gagal membuat supplier.");
    } finally {
      setSavingSupplier(false);
    }
  }

  async function handleCreateUnit(e: React.FormEvent) {
    e.preventDefault();
    if (!newUnitCode.trim()) {
      alert("Kode satuan wajib diisi.");
      return;
    }
    if (!newUnitName.trim()) {
      alert("Nama satuan wajib diisi.");
      return;
    }

    setSavingUnit(true);
    try {
      const res = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: newUnitCode, name: newUnitName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal membuat satuan.");

      triggerNotification("Satuan dasar baru berhasil dibuat!", "success");

      allUnits.push({
        id: json.unit.id,
        code: json.unit.code,
        name: json.unit.name,
      });

      if (showProductModal) {
        setNewProductForm((prev) => ({
          ...prev,
          baseUnitId: json.unit.id,
        }));
      } else if (showManualItemModal) {
        setInlineConversionUnitId(json.unit.id);
        setShowInlineConversionForm(true);
      }

      setShowUnitModal(false);
      setNewUnitCode("");
      setNewUnitName("");
    } catch (err: any) {
      alert(err.message || "Gagal membuat satuan.");
    } finally {
      setSavingUnit(false);
    }
  }

  async function handleCreateInlineConversion(e?: React.FormEvent | React.MouseEvent) {
    if (e) e.preventDefault();
    if (!manualProductId) {
      alert("Pilih produk terlebih dahulu.");
      return;
    }
    if (!inlineConversionUnitId) {
      alert("Pilih satuan grosir.");
      return;
    }
    const factorNum = Number(inlineConversionFactor);
    if (isNaN(factorNum) || factorNum <= 1) {
      alert("Faktor konversi harus berupa angka lebih besar dari 1.");
      return;
    }

    setSavingInlineConversion(true);
    try {
      const res = await fetch("/api/conversions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: manualProductId,
          unitId: inlineConversionUnitId,
          conversionToBase: factorNum,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal membuat konversi satuan.");

      triggerNotification("Konversi satuan berhasil disimpan!", "success");

      setProductList((prev) =>
        prev.map((p) => {
          if (p.id === manualProductId) {
            const existingIdx = p.units.findIndex((u) => u.id === json.conversion.unitId);
            const updatedUnits = [...p.units];
            const newConversion = {
              id: json.conversion.unitId,
              code: json.conversion.unit.code,
              conversionToBase: factorNum,
            };
            if (existingIdx > -1) {
              updatedUnits[existingIdx] = newConversion;
            } else {
              updatedUnits.push(newConversion);
            }
            return { ...p, units: updatedUnits };
          }
          return p;
        })
      );

      setManualUnitId(json.conversion.unitId);
      setShowInlineConversionForm(false);
      setInlineConversionUnitId("");
      setInlineConversionFactor("");
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan konversi.");
    } finally {
      setSavingInlineConversion(false);
    }
  }

  // Helper to compute unit conversions dynamically
  function getSmartConversions() {
    if (!manualProductId || !manualQty || isNaN(Number(manualQty))) return [];
    const product = productList.find((p) => p.id === manualProductId);
    if (!product) return [];

    const selectedUnit = product.units.find((u) => u.id === manualUnitId);
    if (!selectedUnit) return [];

    const qtyVal = Number(manualQty);
    const selectedFactor = selectedUnit.conversionToBase || 1;
    const qtyInBase = qtyVal * selectedFactor;

    const baseUnit = product.units.find((u) => u.conversionToBase === 1 || u.id === product.units[0].id);
    const baseCode = baseUnit ? baseUnit.code : product.baseUnitCode;

    return product.units.map((u) => {
      const uFactor = u.conversionToBase || 1;
      const isActive = u.id === manualUnitId;

      if (uFactor === 1) {
        // Base unit
        return {
          unitId: u.id,
          code: u.code,
          isActive,
          factor: 1,
          displayText: `${qtyInBase} ${u.code}`,
          valueDecimal: qtyInBase,
          valueWhole: qtyInBase,
          hasRemainder: false,
        };
      } else {
        // Conversion unit
        const whole = Math.floor(qtyInBase / uFactor);
        const remainder = Math.round((qtyInBase % uFactor) * 10000) / 10000;
        const decimal = Math.round((qtyInBase / uFactor) * 10000) / 10000;

        let displayText = `${whole} ${u.code}`;
        if (remainder > 0) {
          displayText += ` lebih ${remainder} ${baseCode}`;
        }

        return {
          unitId: u.id,
          code: u.code,
          isActive,
          factor: uFactor,
          displayText,
          valueDecimal: decimal,
          valueWhole: whole,
          hasRemainder: remainder > 0,
          remainder,
          baseCode,
        };
      }
    });
  }

  function applySmartConversion(targetUnitId: string, targetQty: number) {
    const product = productList.find((p) => p.id === manualProductId);
    if (!product) return;

    const fromUnit = product.units.find((u) => u.id === manualUnitId);
    const toUnit = product.units.find((u) => u.id === targetUnitId);
    if (!fromUnit || !toUnit) return;

    // Convert Qty
    setManualQty(String(targetQty));

    // Convert Unit Cost (optional scale)
    const costVal = Number(manualUnitCost);
    if (!isNaN(costVal) && costVal > 0) {
      const fromFactor = fromUnit.conversionToBase || 1;
      const toFactor = toUnit.conversionToBase || 1;
      const newCost = costVal * (toFactor / fromFactor);
      setManualUnitCost(String(Math.round(newCost * 100) / 100));
    }

    // Set active unit
    setManualUnitId(targetUnitId);
  }

  const selectedProductObj = productList.find((p) => p.id === manualProductId);

  function handleAddManualItem(): boolean {
    if (!manualProductId) {
      alert("Pilih produk terlebih dahulu.");
      return false;
    }
    if (!manualUnitId) {
      alert("Pilih satuan produk.");
      return false;
    }
    const qtyNum = Number(manualQty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      alert("Jumlah (Qty) harus lebih besar dari 0.");
      return false;
    }
    const costNum = Number(manualUnitCost);
    if (isNaN(costNum) || costNum < 0) {
      alert("Harga beli satuan tidak boleh kurang dari 0.");
      return false;
    }

    const prod = productList.find((p) => p.id === manualProductId);
    if (!prod) return false;

    const unit = prod.units.find((u) => u.id === manualUnitId);
    if (!unit) return false;

    const factor = unit.conversionToBase || 1;

    if (editingItemIndex !== null) {
      const updated = [...manualItems];
      updated[editingItemIndex] = {
        productId: manualProductId,
        productName: prod.name,
        sku: prod.sku,
        unitId: manualUnitId,
        unitCode: unit.code,
        qty: qtyNum,
        unitCost: costNum,
        conversionToBase: factor,
        baseUnitCode: prod.baseUnitCode,
      };
      setManualItems(updated);
      setEditingItemIndex(null);
    } else {
      const existingIndex = manualItems.findIndex(
        (item) => item.productId === manualProductId && item.unitId === manualUnitId
      );

      if (existingIndex > -1) {
        const updated = [...manualItems];
        updated[existingIndex].qty += qtyNum;
        updated[existingIndex].unitCost = costNum;
        setManualItems(updated);
      } else {
        setManualItems([
          ...manualItems,
          {
            productId: manualProductId,
            productName: prod.name,
            sku: prod.sku,
            unitId: manualUnitId,
            unitCode: unit.code,
            qty: qtyNum,
            unitCost: costNum,
            conversionToBase: factor,
            baseUnitCode: prod.baseUnitCode,
          },
        ]);
      }
    }

    // Reset inputs
    setEditingItemIndex(null);
    setManualProductId("");
    setManualUnitId("");
    setManualQty("");
    setManualUnitCost("");
    return true;
  }

  function handleStartEditManualItem(index: number) {
    const item = manualItems[index];
    if (!item) return;

    setEditingItemIndex(index);
    setManualProductId(item.productId);
    setManualUnitId(item.unitId);
    setManualQty(String(item.qty));
    setManualUnitCost(String(item.unitCost));
    setShowInlineConversionForm(false);
    setShowManualItemModal(true);
  }

  function handleRemoveManualItem(index: number) {
    setManualItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!newProductForm.name.trim()) {
      alert("Nama produk wajib diisi.");
      return;
    }
    if (!newProductForm.categoryId) {
      alert("Kategori wajib dipilih.");
      return;
    }
    if (!newProductForm.baseUnitId) {
      alert("Satuan dasar wajib dipilih.");
      return;
    }

    // Validate conversions
    for (const c of newProductConversions) {
      if (!c.unitId) {
        alert("Pilih unit untuk semua baris konversi.");
        return;
      }
      const factorNum = Number(c.conversionToBase);
      if (isNaN(factorNum) || factorNum <= 1) {
        alert("Faktor konversi (multiplier) harus berupa angka lebih besar dari 1.");
        return;
      }
    }

    setSavingProduct(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newProductForm,
          unitConversions: newProductConversions.map((c) => ({
            unitId: c.unitId,
            conversionToBase: Number(c.conversionToBase),
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal membuat produk.");

      triggerNotification("Produk baru berhasil dibuat!", "success");

      const newProd: ProductProp = {
        id: json.product.id,
        name: json.product.name,
        sku: json.product.sku,
        stock: 0,
        baseUnitCode: json.product.baseUnit.code,
        units: [
          { id: json.product.baseUnit.id, code: json.product.baseUnit.code, conversionToBase: 1 },
          ...json.product.unitConversions.map((uc: any) => ({
            id: uc.unit.id,
            code: uc.unit.code,
            conversionToBase: Number(uc.conversionToBase),
          })),
        ],
      };

      setProductList((prev) => [...prev, newProd]);

      setManualProductId(newProd.id);
      if (newProd.units.length > 0) {
        setManualUnitId(newProd.units[0].id);
      }

      setShowProductModal(false);
      setNewProductConversions([]);
      setNewProductForm({
        name: "",
        sku: "",
        categoryId: "",
        baseUnitId: "",
        isPerishable: true,
      });
    } catch (err: any) {
      alert(err.message || "Gagal membuat produk.");
    } finally {
      setSavingProduct(false);
    }
  }

  // Calculate total amounts dynamically
  const checkedSourcingAmount = Object.keys(checkedRequests)
    .filter((id) => checkedRequests[id])
    .reduce((sum, id) => {
      const req = decidedRequests.find((r) => r.id === id);
      if (!req) return sum;
      const price = req.chosenSupplierProduct?.priceQuotes[0]?.price || 0;
      return sum + req.qtyNeeded * price;
    }, 0);

  const manualAmount = manualItems.reduce((sum, item) => sum + item.qty * item.unitCost, 0);
  const totalPoAmount = checkedSourcingAmount + manualAmount;

  // Receive Goods Modal State
  const [receivingPo, setReceivingPo] = useState<POItem | null>(null);
  const [receiveItems, setReceiveItems] = useState<Record<string, { qty: number; batchCode: string; expiryDate: string }>>({});
  const [submittingReceive, setSubmittingReceive] = useState(false);
  const [receiveNotes, setReceiveNotes] = useState("");

  // Edit Goods Receipt Modal States
  const [editingReceipt, setEditingReceipt] = useState<any | null>(null);
  const [editingReceiptItems, setEditingReceiptItems] = useState<Record<string, string>>({});
  const editingReceiptItemsRef = useRef<Record<string, string>>({});
  const [editingReceiptNotes, setEditingReceiptNotes] = useState("");
  const [submittingEditReceipt, setSubmittingEditReceipt] = useState(false);

  // Payment Modal State
  const [payingPo, setPayingPo] = useState<POItem | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: "TRANSFER_BANK",
    notes: "",
    paidAt: new Date().toISOString().split("T")[0],
  });
  const [proofFile, setProofFile] = useState<string | null>(null);
  const [proofFileName, setProofFileName] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  function triggerNotification(message: string, type: "success" | "error" = "success") {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }

  // Filter requests matching selected supplier
  const availableRequests = decidedRequests.filter(
    (r) => r.chosenSupplierProduct?.supplierId === selectedSupplierId
  );

  function processSelectedFile(file: File) {
    if (!file) return;
    setProofFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setProofFile(base64);
    };
    reader.readAsDataURL(file);
  }

  // Handle file upload selection
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processSelectedFile(file);
  }

  function getItemConversionText(productId: string, unitIdentifier: string, qty: number) {
    const prod = productList.find((p) => p.id === productId);
    if (!prod) return { factor: 1, baseCode: "", equivalentQty: qty, hasConversion: false };

    const matchedUnit = prod.units.find((u) => u.id === unitIdentifier || u.code === unitIdentifier);
    const factor = matchedUnit?.conversionToBase || 1;
    const baseCode = prod.baseUnitCode || "";
    const equivalentQty = qty * factor;
    const hasConversion = factor > 1;

    return { factor, baseCode, equivalentQty, hasConversion };
  }

  // Submit new PO
  async function handleCreatePo(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSupplierId) {
      alert("Pilih supplier terlebih dahulu.");
      return;
    }

    const selectedRequestIds = Object.keys(checkedRequests).filter((id) => checkedRequests[id]);
    if (selectedRequestIds.length === 0 && manualItems.length === 0) {
      alert("Tambahkan minimal satu item (sourcing atau manual) ke Purchase Order.");
      return;
    }

    setSubmittingPo(true);
    try {
      const sourcingItemsToSubmit = selectedRequestIds.map((id) => {
        const req = decidedRequests.find((r) => r.id === id)!;
        const price = req.chosenSupplierProduct.priceQuotes[0]?.price || 0;
        return {
          productId: req.productId,
          unitId: req.unit.id,
          qty: req.qtyNeeded,
          unitCost: price,
          sourcingRequestId: req.id,
        };
      });

      const manualItemsToSubmit = manualItems.map((item) => ({
        productId: item.productId,
        unitId: item.unitId,
        qty: item.qty,
        unitCost: item.unitCost,
        sourcingRequestId: undefined,
      }));

      const allItems = [...sourcingItemsToSubmit, ...manualItemsToSubmit];

      const res = await fetch("/api/procurement/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedSupplierId,
          purpose: poForm.purpose,
          items: allItems,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal membuat PO");

      // Refresh page
      router.refresh();
      window.location.reload();
    } catch (err: any) {
      alert(err.message || "Gagal membuat PO");
    } finally {
      setSubmittingPo(false);
    }
  }

  // Open Receive Goods Modal
  function handleOpenReceive(po: POItem) {
    setReceivingPo(po);
    setReceiveNotes(""); // Reset notes
    const initialItems: Record<string, any> = {};
    const today = new Date().toISOString().slice(2, 10).replace(/-/g, "");

    po.items.forEach((item) => {
      // Auto-generate batch code: BATCH-[SKU]-[YYMMDD]
      initialItems[item.id] = {
        qty: item.qty,
        batchCode: `BATCH-${item.product.sku}-${today}`,
        expiryDate: "",
      };
    });
    setReceiveItems(initialItems);
  }

  // Confirm Receive Goods
  async function handleConfirmReceive() {
    if (!receivingPo) return;
    setSubmittingReceive(true);
    try {
      const itemsToSubmit = receivingPo.items.map((item) => {
        const rItem = receiveItems[item.id];
        const conv = getItemConversionText(item.productId, item.unitId || item.unit.code, rItem.qty);
        const factor = conv.factor || 1;
        const qtyReceivedBase = rItem.qty * factor;
        const unitCostBase = item.unitCost / factor;

        return {
          purchaseOrderItemId: item.id,
          batchCode: rItem.batchCode || `BATCH-${item.product.sku}`,
          qtyReceivedBase: qtyReceivedBase,
          unitCostBase: unitCostBase,
          expiryDate: rItem.expiryDate || undefined,
        };
      });

      const res = await fetch(`/api/procurement/purchase-orders/${receivingPo.id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToSubmit, notes: receiveNotes }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memproses penerimaan");

      setOrdersReceivedState(receivingPo.id);
      setReceivingPo(null);
      triggerNotification(`PO ${receivingPo.poNumber} berhasil diterima & stok gudang diperbarui!`);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Gagal memproses penerimaan");
    } finally {
      setSubmittingReceive(false);
    }
  }

  function handleOpenEditReceipt(po: POItem, gr: any) {
    setEditingReceipt({ po, gr });
    setEditingReceiptNotes(gr.notes || "");
    
    const itemsMap: Record<string, string> = {};
    po.items.forEach((item, index) => {
      const prod = productList.find((p) => p.id === item.productId);
      const unitObj = prod?.units.find((u) => u.id === item.unitId || u.code === item.unit.code);
      const factor = unitObj?.conversionToBase || 1;
      
      const sb = gr.stockBatches.find((s: any) => s.productId === item.productId);
      const qtyBase = sb ? sb.qtyReceivedBase : 0;
      itemsMap[String(index)] = String(qtyBase / factor);
    });
    editingReceiptItemsRef.current = itemsMap;
    setEditingReceiptItems(itemsMap);
  }

  async function handleConfirmEditReceipt() {
    if (!editingReceipt) return;
    setSubmittingEditReceipt(true);
    try {
      const po = editingReceipt.po as POItem;
      const gr = editingReceipt.gr;
      
      // Read from ref to always get the latest typed values (immune to HMR/stale state)
      const latestItems = editingReceiptItemsRef.current;

      const itemsToSubmit = po.items.map((item: any, index: number) => {
        const qtyStr = latestItems[String(index)] || "0";
        const qty = parseFloat(qtyStr.replace(/,/g, ".")) || 0;
        const prod = productList.find((p) => p.id === item.productId);
        const unitObj = prod?.units.find((u) => u.id === item.unitId || u.code === item.unit.code);
        const factor = unitObj?.conversionToBase || 1;
        
        return {
          productId: item.productId,
          qtyReceivedBase: qty * factor,
        };
      });
      
      const res = await fetch(`/api/procurement/purchase-orders/${po.id}/receive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goodsReceiptId: gr.id,
          items: itemsToSubmit,
          notes: editingReceiptNotes,
        }),
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memperbarui penerimaan");
      
      setEditingReceipt(null);
      setViewingPo(null);
      triggerNotification(`Penerimaan barang PO ${po.poNumber} berhasil diperbarui!`);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Gagal memperbarui penerimaan");
    } finally {
      setSubmittingEditReceipt(false);
    }
  }

  function setOrdersReceivedState(poId: string) {
    setPos((prev) =>
      prev.map((po) => (po.id === poId ? { ...po, status: "RECEIVED" } : po))
    );
  }

  // Confirm Payment
  async function handleConfirmPayment() {
    if (!payingPo) return;
    setSubmittingPayment(true);
    try {
      const res = await fetch(`/api/procurement/purchase-orders/${payingPo.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paidAt: new Date(paymentForm.paidAt).toISOString(),
          paymentMethod: paymentForm.paymentMethod,
          paymentNotes: paymentForm.notes,
          proofFile,
          proofFileName,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mencatat pembayaran");

      setPos((prev) =>
        prev.map((po) =>
          po.id === payingPo.id
            ? {
                ...po,
                paymentStatus: "LUNAS",
                paymentMethod: paymentForm.paymentMethod,
                paidAt: new Date(paymentForm.paidAt).toISOString(),
                paymentNotes: paymentForm.notes || null,
                paymentProofUrl: json.data.paymentProofUrl || null,
              }
            : po
        )
      );

      setPayingPo(null);
      setProofFile(null);
      setProofFileName("");
      triggerNotification(`Pembayaran PO ${payingPo.poNumber} berhasil dicatat!`);
    } catch (err: any) {
      alert(err.message || "Gagal mencatat pembayaran");
    } finally {
      setSubmittingPayment(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className={cn(
          "fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg transition-all animate-in fade-in slide-in-from-top-4 duration-300",
          notification.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
        )}>
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <PageHeader
          title="Purchase Order (PO)"
          description="Pencatatan order pembelian resmi dan pelacakan pembayaran ke supplier."
        />
        <button
          onClick={() => setShowPoForm(!showPoForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/95 shadow active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" /> Buat Purchase Order
        </button>
      </div>

      {/* Sub Nav */}
      <div className="mb-4 flex flex-wrap gap-2">
        {SUB_NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
              n.active
                ? "bg-primary text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            <n.icon className="h-4 w-4" />
            {n.label}
          </Link>
        ))}
      </div>

      {/* Create PO Form Overlay */}
      {showPoForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="text-sm font-bold text-gray-900">Buat Purchase Order Baru</h3>
            <button onClick={() => setShowPoForm(false)} className="text-gray-400 hover:text-gray-600 text-xs font-semibold">
              Tutup
            </button>
          </div>

          <form onSubmit={handleCreatePo} className="space-y-4 text-sm">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Pilih Supplier *</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <SearchableSelect
                      options={suppliers}
                      value={selectedSupplierId}
                      onChange={(val) => {
                        setSelectedSupplierId(val);
                        setCheckedRequests({});
                      }}
                      getLabel={(opt) => `${opt.name} (${opt.type})`}
                      getValue={(opt) => opt.id}
                      placeholder="Pilih Supplier..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSupplierModal(true)}
                    className="inline-flex items-center justify-center p-2 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 shadow-sm transition-colors mt-0.5 h-[38px] w-[38px] shrink-0"
                    title="Tambah Supplier Baru"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-[10px] text-gray-400 font-medium italic mt-1 block">
                  Pilih supplier untuk PO. Klik tombol (+) di kanan untuk mendaftarkan supplier baru.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tujuan / Keperluan</label>
                <input
                  type="text"
                  placeholder="e.g. Sourcing Dapur Sooko"
                  value={poForm.purpose}
                  onChange={(e) => setPoForm({ ...poForm, purpose: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm h-[38px]"
                />
              </div>
            </div>

            {/* List of decided requests for the selected supplier */}
            {selectedSupplierId && (
              <div className="space-y-2 border p-4 rounded bg-gray-50">
                <h4 className="text-xs font-bold text-gray-700">Pilih Barang untuk Dipesan (Sourcing yang Diputuskan):</h4>
                {availableRequests.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Tidak ada item sourcing yang diputuskan untuk supplier ini.</p>
                ) : (
                  <div className="space-y-2">
                    {availableRequests.map((req) => (
                      <label key={req.id} className="flex items-center gap-3 bg-white p-3 rounded border border-gray-200 cursor-pointer hover:bg-gray-50/50">
                        <input
                          type="checkbox"
                          checked={!!checkedRequests[req.id]}
                          onChange={(e) => setCheckedRequests({ ...checkedRequests, [req.id]: e.target.checked })}
                          className="rounded border-gray-300 text-primary"
                        />
                        <div className="min-w-0 flex-1 text-xs">
                          <p className="font-semibold text-gray-900">{req.product.name}</p>
                          <p className="text-gray-500">{req.qtyNeeded} {req.unit.code} • Harga Penawaran: {formatCurrency(req.chosenSupplierProduct.priceQuotes[0]?.price || 0)}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tombol Tambah Item Manual */}
            <div className="border-t pt-4">
              <button
                type="button"
                onClick={() => setShowManualItemModal(true)}
                disabled={!selectedSupplierId}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gray-50 hover:bg-gray-100/80 border border-dashed border-gray-300 px-6 py-4 text-base font-bold text-gray-700 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-50"
              >
                <Plus className="h-5 w-5 text-gray-500" /> Tambah Item Manual Baru
              </button>
              {!selectedSupplierId && (
                <p className="text-xs text-red-500 font-extrabold mt-2">
                  * Silakan pilih supplier di atas terlebih dahulu untuk bisa menambahkan item manual baru.
                </p>
              )}
            </div>

            {showManualItemModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                <div className="w-full max-w-2xl rounded-2xl border border-gray-100 bg-white p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center border-b pb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {editingItemIndex !== null ? "Edit Detail Item PO" : "Tambah Item Baru"}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">Masukkan detail produk, jumlah, dan harga beli secara manual ke dalam PO.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowManualItemModal(false);
                        setEditingItemIndex(null);
                        setManualProductId("");
                        setManualUnitId("");
                        setManualQty("");
                        setManualUnitCost("");
                      }}
                      className="text-gray-400 hover:text-gray-600 text-lg font-bold p-2"
                    >
                      Tutup
                    </button>
                  </div>

                  <div className="space-y-5 text-left">
                    {/* Pilihan Produk */}
                    <div>
                      <label className="block text-xs font-extrabold text-gray-400 tracking-wider uppercase mb-1.5">1. Pilih Nama Produk *</label>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <SearchableSelect
                            options={productList}
                            value={manualProductId}
                            onChange={(val) => {
                              setManualProductId(val);
                              const prod = productList.find((p) => p.id === val);
                              if (prod && prod.units.length > 0) {
                                setManualUnitId(prod.units[0].id);
                              } else {
                                setManualUnitId("");
                              }
                            }}
                            getLabel={(opt) => `${opt.name} (${opt.sku}) - Stok: ${opt.stock} ${opt.baseUnitCode}`}
                            getValue={(opt) => opt.id}
                            placeholder="Ketik untuk mencari produk..."
                            className="text-base py-3 h-[52px]"
                            renderOption={(opt) => (
                              <div className="flex items-center justify-between w-full py-1.5">
                                <div className="text-left">
                                  <p className="font-bold text-gray-900 text-sm sm:text-base">{opt.name}</p>
                                  <p className="text-xs text-gray-400 font-semibold mt-0.5">SKU: {opt.sku}</p>
                                </div>
                                <span
                                  className={cn(
                                    "px-3 py-1 rounded-full text-xs font-extrabold border shrink-0",
                                    opt.stock > 10
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : opt.stock > 0
                                      ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                      : "bg-red-50 text-red-700 border-red-200"
                                  )}
                                >
                                  {opt.stock > 10
                                    ? `Stok: ${opt.stock} ${opt.baseUnitCode}`
                                    : opt.stock > 0
                                    ? `${opt.stock} ${opt.baseUnitCode}`
                                    : "Stok Habis"}
                                </span>
                              </div>
                            )}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowProductModal(true)}
                          className="inline-flex items-center justify-center rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary shadow-sm transition-all h-[52px] w-[52px] shrink-0"
                          title="Tambah Produk Baru ke Database"
                        >
                          <Plus className="h-6 w-6" />
                        </button>
                      </div>
                      <span className="text-[11px] text-gray-400 font-medium italic mt-1 block">
                        Cari produk yang ingin dibeli. Jika produk belum terdaftar, klik tombol tambah (+) di kanan.
                      </span>
                    </div>

                    {/* Grid Satuan, Jumlah, Harga */}
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                      {/* Satuan */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-xs font-extrabold text-gray-400 tracking-wider uppercase">2. Satuan *</label>
                          {manualProductId && (
                            <button
                              type="button"
                              onClick={() => setShowInlineConversionForm(!showInlineConversionForm)}
                              className="text-[11px] font-extrabold text-primary hover:underline"
                            >
                              ⚙️ Atur Konversi
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <SearchableSelect
                              options={selectedProductObj?.units || []}
                              value={manualUnitId}
                              onChange={(val) => setManualUnitId(val)}
                              getLabel={(opt) => opt.code}
                              getValue={(opt) => opt.id}
                              placeholder="Pilih Satuan..."
                              className="text-base py-3 h-[52px]"
                              disabled={!manualProductId}
                            />
                          </div>
                          {manualProductId && (
                            <button
                              type="button"
                              onClick={() => setShowUnitModal(true)}
                              className="inline-flex items-center justify-center rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary shadow-sm transition-all h-[52px] w-[52px] shrink-0"
                              title="Tambah Satuan Baru"
                            >
                              <Plus className="h-6 w-6" />
                            </button>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400 font-medium italic mt-1 block">
                          Satuan pembelian (misal: PCS, DUS). Klik tombol (+) untuk menambah satuan baru.
                        </span>
                      </div>

                      {/* Jumlah */}
                      <div>
                        <label className="block text-xs font-extrabold text-gray-400 tracking-wider uppercase mb-1.5">3. Jumlah (Qty) *</label>
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          placeholder="e.g. 10"
                          value={manualQty}
                          onChange={(e) => setManualQty(e.target.value)}
                          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-base h-[52px] shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold text-gray-800"
                        />
                        <span className="text-[11px] text-gray-400 font-medium italic mt-1 block">
                          Ketik kuantitas barang yang dipesan.
                        </span>
                      </div>

                      {/* Harga Beli Satuan */}
                      <div>
                        <label className="block text-xs font-extrabold text-gray-400 tracking-wider uppercase mb-1.5">4. Harga Beli (Rp) *</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="e.g. 15000"
                          value={manualUnitCost}
                          onChange={(e) => setManualUnitCost(e.target.value)}
                          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-base h-[52px] shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold text-gray-800"
                        />
                        <span className="text-[11px] text-gray-400 font-medium italic mt-1 block">
                          Harga per satu satuan barang.
                        </span>
                      </div>
                    </div>

                    {/* Inline Conversion Config Form */}
                    {showInlineConversionForm && manualProductId && (
                      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 pb-60 space-y-4 shadow-sm text-left">
                        <div className="flex justify-between items-center border-b pb-2">
                          <div>
                            <h4 className="text-sm font-bold text-gray-900">Atur Konversi Satuan Grosir Baru</h4>
                            <p className="text-[11px] text-gray-500">Persiapkan satuan dus/karton/pack untuk produk terpilih ini.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setShowInlineConversionForm(false);
                              setInlineConversionUnitId("");
                              setInlineConversionFactor("");
                            }}
                            className="text-xs font-bold text-gray-400 hover:text-gray-600"
                          >
                            Batal
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                          <div>
                            <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">Satuan Grosir</label>
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <SearchableSelect
                                  options={(allUnits || []).filter((u) => u.id !== selectedProductObj?.units[0]?.id)}
                                  value={inlineConversionUnitId}
                                  onChange={(val) => setInlineConversionUnitId(val)}
                                  getLabel={(opt) => `${opt.name} (${opt.code})`}
                                  getValue={(opt) => opt.id}
                                  placeholder="Pilih Satuan..."
                                  className="text-sm py-2 h-[42px]"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowUnitModal(true)}
                                className="inline-flex items-center justify-center rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary shadow-sm transition-all h-[42px] w-[42px] shrink-0"
                                title="Tambah Satuan Baru"
                              >
                                <Plus className="h-5 w-5" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">Isi per Satuan</label>
                            <div className="relative">
                              <input
                                type="number"
                                placeholder="e.g. 36"
                                value={inlineConversionFactor}
                                onChange={(e) => setInlineConversionFactor(e.target.value)}
                                className="w-full rounded-xl border border-gray-300 pl-3 pr-12 py-1.5 text-sm h-[42px] font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                required
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                                {selectedProductObj?.units.find((u) => u.id === manualUnitId)?.code || selectedProductObj?.baseUnitCode || ""}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCreateInlineConversion()}
                            disabled={savingInlineConversion}
                            className="w-full rounded-xl bg-primary hover:bg-primary/95 text-white font-bold text-xs h-[42px] shadow-sm transition-all flex items-center justify-center gap-1.5"
                          >
                            {savingInlineConversion && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Simpan & Terapkan
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Smart Unit Converter */}
                    {manualProductId && manualQty && !isNaN(Number(manualQty)) && Number(manualQty) > 0 && selectedProductObj && selectedProductObj.units.length > 1 && (
                      <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-6 space-y-4 shadow-sm text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">💡</span>
                          <div>
                            <h4 className="text-sm font-extrabold text-blue-900">Konverter Satuan Pintar (Smart Unit Converter)</h4>
                            <p className="text-[11px] text-blue-700/80 font-medium">Beralih satuan pembelian grosir (B2B) & ecer (B2C) dengan mudah secara otomatis.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {getSmartConversions().map((conv: any) => {
                            return (
                              <div
                                key={conv.unitId}
                                className={cn(
                                  "flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border transition-all gap-3",
                                  conv.isActive
                                    ? "bg-white border-blue-300 shadow-sm"
                                    : "bg-blue-50/30 border-blue-100 hover:bg-white/50"
                                )}
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-extrabold text-blue-800 bg-blue-100/70 px-2.5 py-0.5 rounded-full uppercase">
                                      Satuan {conv.code}
                                    </span>
                                    {conv.factor > 1 && (
                                      <span className="text-[10px] text-blue-600/80 font-semibold italic">
                                        (1 {conv.code} = {conv.factor} {conv.baseCode})
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-base font-bold text-gray-800 mt-1.5">
                                    Setara: <span className="text-blue-950 underline decoration-blue-300 decoration-2">{conv.displayText}</span>
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                                  {conv.isActive ? (
                                    <span className="text-xs font-bold text-blue-700 bg-blue-100 px-3 py-1.5 rounded-lg w-full text-center sm:w-auto">
                                      ✓ Sedang Digunakan
                                    </span>
                                  ) : (
                                    <div className="flex gap-2 w-full sm:w-auto">
                                      {conv.hasRemainder ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => applySmartConversion(conv.unitId, conv.valueWhole)}
                                            className="text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors flex-1 sm:flex-none"
                                            title={`Konversi ke ${conv.valueWhole} ${conv.code} (sisa ${conv.remainder} ${conv.baseCode} diabaikan)`}
                                          >
                                            Pakai Bulat ({conv.valueWhole} {conv.code})
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => applySmartConversion(conv.unitId, conv.valueDecimal)}
                                            className="text-xs font-extrabold border border-blue-300 bg-white hover:bg-blue-50 text-blue-700 px-3 py-2 rounded-lg transition-colors flex-1 sm:flex-none"
                                            title={`Konversi ke ${conv.valueDecimal} ${conv.code}`}
                                          >
                                            Pakai Desimal ({conv.valueDecimal} {conv.code})
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => applySmartConversion(conv.unitId, conv.valueWhole)}
                                          className="text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors w-full sm:w-auto"
                                        >
                                          Ganti ke {conv.code} ({conv.valueWhole} {conv.code})
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 border-t pt-5 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const success = handleAddManualItem();
                        if (success) {
                          setShowManualItemModal(false);
                        }
                      }}
                      className="rounded-xl bg-primary hover:bg-primary/95 text-white px-8 py-3 text-base font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 h-[52px]"
                    >
                      {editingItemIndex !== null ? (
                        <>Simpan Perubahan</>
                      ) : (
                        <>
                          <Plus className="h-5 w-5" /> Tambahkan ke PO
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowManualItemModal(false);
                        setEditingItemIndex(null);
                        setManualProductId("");
                        setManualUnitId("");
                        setManualQty("");
                        setManualUnitCost("");
                      }}
                      className="rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-8 py-3 text-base font-bold shadow-sm active:scale-[0.98] transition-all h-[52px]"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Daftar Item PO Summary */}
            {((Object.keys(checkedRequests).filter((id) => checkedRequests[id]).length > 0) || manualItems.length > 0) && (
              <div className="space-y-2 border p-4 rounded bg-gray-50/50">
                <h4 className="text-xs font-bold text-gray-700">Daftar Item Purchase Order:</h4>
                <div className="overflow-x-auto rounded border border-gray-200 bg-white">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left text-gray-500 font-semibold">
                        <th className="px-3 py-2">Nama Barang</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2">Satuan</th>
                        <th className="px-3 py-2 text-right">Harga Satuan</th>
                        <th className="px-3 py-2 text-right">Subtotal</th>
                        <th className="px-3 py-2 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {/* Sourcing Items */}
                      {Object.keys(checkedRequests)
                        .filter((id) => checkedRequests[id])
                        .map((id) => {
                          const req = decidedRequests.find((r) => r.id === id);
                          if (!req) return null;
                          const price = req.chosenSupplierProduct?.priceQuotes[0]?.price || 0;
                          const subtotal = req.qtyNeeded * price;
                          return (
                            <tr key={req.id} className="hover:bg-gray-50/30">
                              <td className="px-3 py-2">
                                <p className="font-semibold text-gray-900">{req.product.name}</p>
                                <p className="text-[10px] text-gray-400">SKU: {req.product.sku} • <span className="text-blue-600 font-medium font-semibold">Sourcing</span></p>
                              </td>
                              <td className="px-3 py-2 text-right font-medium">{req.qtyNeeded}</td>
                              <td className="px-3 py-2">{req.unit.code}</td>
                              <td className="px-3 py-2 text-right">{formatCurrency(price)}</td>
                              <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatCurrency(subtotal)}</td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => setCheckedRequests({ ...checkedRequests, [req.id]: false })}
                                  className="text-red-500 hover:text-red-700 font-semibold"
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          );
                        })}

                      {/* Manual Items */}
                      {manualItems.map((item, idx) => {
                        const subtotal = item.qty * item.unitCost;
                        const hasConversion = item.conversionToBase && item.conversionToBase > 1;

                        return (
                          <tr key={`manual-${idx}`} className="hover:bg-gray-50/30">
                            <td className="px-3 py-2">
                              <p className="font-semibold text-gray-900">{item.productName}</p>
                              <p className="text-[10px] text-gray-400">SKU: {item.sku} • <span className="text-green-600 font-medium font-semibold">Manual</span></p>
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                              <div>{item.qty}</div>
                              {hasConversion && (
                                <p className="text-[10px] text-gray-400 font-semibold italic mt-0.5">
                                  (setara {item.qty * item.conversionToBase} {item.baseUnitCode})
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <div>{item.unitCode}</div>
                              {hasConversion && (
                                <p className="text-[10px] text-gray-400 font-semibold italic mt-0.5">
                                  (1 {item.unitCode} = {item.conversionToBase} {item.baseUnitCode})
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">{formatCurrency(item.unitCost)}</td>
                            <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatCurrency(subtotal)}</td>
                            <td className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditManualItem(idx)}
                                  className="text-primary hover:text-primary/80 font-bold"
                                >
                                  Edit
                                </button>
                                <span className="text-gray-300">|</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveManualItem(idx)}
                                  className="text-red-500 hover:text-red-700 font-bold"
                                >
                                  Hapus
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-gray-50 font-bold text-gray-900">
                        <td colSpan={4} className="px-3 py-2 text-right">Total:</td>
                        <td className="px-3 py-2 text-right text-sm text-primary font-extrabold">{formatCurrency(totalPoAmount)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-2 border-t pt-3">
              <button
                type="submit"
                disabled={submittingPo}
                className="rounded bg-primary text-white px-4 py-2 text-xs font-semibold hover:bg-primary/95 flex items-center gap-1.5 disabled:opacity-50"
              >
                {submittingPo && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Buat Purchase Order
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPoForm(false);
                  setSelectedSupplierId("");
                  setCheckedRequests({});
                  setManualItems([]);
                }}
                className="rounded border border-gray-300 bg-white text-gray-700 px-4 py-2 text-xs font-semibold hover:bg-gray-50"
              >
                Batal
              </button>
            </div>
          </form>

          {/* Create Product Modal Overlay */}
          {showProductModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-xl rounded-2xl border border-gray-100 bg-white p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center border-b pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Tambah Produk Baru</h3>
                    <p className="text-xs text-gray-500 mt-1">Daftarkan produk baru ke dalam database sistem.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowProductModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-lg font-bold p-2"
                  >
                    Tutup
                  </button>
                </div>

                <form onSubmit={handleCreateProduct} className="space-y-5 text-left">
                  {/* Nama Produk */}
                  <div>
                    <label className="block text-xs font-extrabold text-gray-400 tracking-wider uppercase mb-1.5">Nama Produk *</label>
                    <input
                      type="text"
                      placeholder="Nama Produk (e.g. Susu Bear Brand)"
                      value={newProductForm.name}
                      onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-base h-[52px] shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold text-gray-800"
                      required
                    />
                    <span className="text-[11px] text-gray-400 font-medium italic mt-1 block">
                      Tulis nama barang dengan lengkap dan jelas.
                    </span>
                  </div>

                  {/* SKU */}
                  <div>
                    <label className="block text-xs font-extrabold text-gray-400 tracking-wider uppercase mb-1.5">SKU (Opsional)</label>
                    <input
                      type="text"
                      placeholder="Kode SKU (Kosongkan jika ingin dibuat otomatis)"
                      value={newProductForm.sku}
                      onChange={(e) => setNewProductForm({ ...newProductForm, sku: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-base h-[52px] shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold text-gray-800"
                    />
                    <span className="text-[11px] text-gray-400 font-medium italic mt-1 block">
                      Kode unik untuk stok. Kosongkan saja jika ingin dibuatkan otomatis oleh komputer.
                    </span>
                  </div>

                  {/* Grid Kategori & Satuan Dasar */}
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {/* Kategori */}
                    <div>
                      <label className="block text-xs font-extrabold text-gray-400 tracking-wider uppercase mb-1.5">Kategori *</label>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <SearchableSelect
                            options={categories}
                            value={newProductForm.categoryId}
                            onChange={(val) => setNewProductForm({ ...newProductForm, categoryId: val })}
                            getLabel={(opt) => opt.name}
                            getValue={(opt) => opt.id}
                            placeholder="Pilih Kategori..."
                            className="text-base py-3 h-[52px]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowCategoryModal(true)}
                          className="inline-flex items-center justify-center rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary shadow-sm transition-all h-[52px] w-[52px] shrink-0"
                          title="Tambah Kategori Baru"
                        >
                          <Plus className="h-6 w-6" />
                        </button>
                      </div>
                      <span className="text-[11px] text-gray-400 font-medium italic mt-1 block">
                        Kelompok jenis barang. Jika kategori belum ada, klik tombol (+) di kanan.
                      </span>
                    </div>

                    {/* Satuan Dasar */}
                    <div>
                      <label className="block text-xs font-extrabold text-gray-400 tracking-wider uppercase mb-1.5">Satuan Dasar *</label>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <SearchableSelect
                            options={allUnits}
                            value={newProductForm.baseUnitId}
                            onChange={(val) => setNewProductForm({ ...newProductForm, baseUnitId: val })}
                            getLabel={(opt) => `${opt.name} (${opt.code})`}
                            getValue={(opt) => opt.id}
                            placeholder="Pilih Satuan..."
                            className="text-base py-3 h-[52px]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowUnitModal(true)}
                          className="inline-flex items-center justify-center rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary shadow-sm transition-all h-[52px] w-[52px] shrink-0"
                          title="Tambah Satuan Baru"
                        >
                          <Plus className="h-6 w-6" />
                        </button>
                      </div>
                      <span className="text-[11px] text-gray-400 font-medium italic mt-1 block">
                        Satuan terkecil (e.g. PCS, PACK). Jika satuan belum ada, klik tombol (+) di kanan.
                      </span>
                    </div>
                  </div>

                  {/* Konversi Satuan (Grosir) Section */}
                  {newProductForm.baseUnitId && (
                    <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50/50 space-y-4 text-left">
                      <div className="flex justify-between items-center border-b pb-3">
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">Konversi Satuan Grosir (Opsional)</h4>
                          <p className="text-[11px] text-gray-500">Definisikan satuan dus/karton/pack untuk mempermudah Smart Converter.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewProductConversions([...newProductConversions, { unitId: "", conversionToBase: "" }])}
                          className="rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 text-xs font-bold transition-all"
                        >
                          + Tambah Konversi
                        </button>
                      </div>

                      {newProductConversions.length === 0 ? (
                        <p className="text-xs text-gray-400 font-medium italic text-center py-2">
                          Belum ada konversi yang dibuat. Klik tombol di kanan atas untuk menambahkan.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {newProductConversions.map((conv, idx) => {
                            const selectedBaseUnit = allUnits.find((u) => u.id === newProductForm.baseUnitId);
                            const baseUnitCode = selectedBaseUnit ? selectedBaseUnit.code : "";

                            return (
                              <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 border bg-white p-4 rounded-xl shadow-sm">
                                <div className="flex-1 w-full">
                                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">Satuan Grosir</label>
                                  <SearchableSelect
                                    options={allUnits.filter((u) => u.id !== newProductForm.baseUnitId)}
                                    value={conv.unitId}
                                    onChange={(val) => {
                                      const updated = [...newProductConversions];
                                      updated[idx].unitId = val;
                                      setNewProductConversions(updated);
                                    }}
                                    getLabel={(opt) => `${opt.name} (${opt.code})`}
                                    getValue={(opt) => opt.id}
                                    placeholder="Pilih Satuan..."
                                    className="text-sm py-2 h-[42px]"
                                  />
                                </div>

                                <div className="w-full sm:w-32">
                                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">Isi per Satuan</label>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      placeholder="e.g. 36"
                                      value={conv.conversionToBase}
                                      onChange={(e) => {
                                        const updated = [...newProductConversions];
                                        updated[idx].conversionToBase = e.target.value;
                                        setNewProductConversions(updated);
                                      }}
                                      className="w-full rounded-xl border border-gray-300 pl-3 pr-12 py-1.5 text-sm h-[42px] font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                                      {baseUnitCode}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewProductConversions(newProductConversions.filter((_, i) => i !== idx));
                                  }}
                                  className="text-red-500 hover:text-red-700 text-xs font-bold self-end sm:self-center h-[42px] flex items-center justify-center px-2 border border-red-100 bg-red-50 hover:bg-red-100 rounded-xl transition-all"
                                >
                                  Hapus
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Perishable Checkbox */}
                  <div className="flex items-center gap-3 py-2 border rounded-xl px-4 bg-gray-50/50">
                    <input
                      type="checkbox"
                      id="isPerishable"
                      checked={newProductForm.isPerishable}
                      onChange={(e) => setNewProductForm({ ...newProductForm, isPerishable: e.target.checked })}
                      className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer"
                    />
                    <label htmlFor="isPerishable" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                      Barang mudah rusak / bisa kadaluwarsa?
                    </label>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 border-t pt-5 justify-end">
                    <button
                      type="submit"
                      disabled={savingProduct}
                      className="rounded-xl bg-primary hover:bg-primary/95 text-white px-8 py-3 text-base font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 h-[52px]"
                    >
                      {savingProduct && <Loader2 className="h-5 w-5 animate-spin" />}
                      Simpan Produk
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowProductModal(false)}
                      className="rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-8 py-3 text-base font-bold shadow-sm active:scale-[0.98] transition-all h-[52px]"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Create Category Modal Overlay */}
          {showCategoryModal && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center border-b pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Tambah Kategori Baru</h3>
                    <p className="text-xs text-gray-500 mt-1">Tambahkan kategori kelompok produk baru ke database.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCategoryModal(false);
                      setNewCategoryName("");
                    }}
                    className="text-gray-400 hover:text-gray-600 text-lg font-bold p-2"
                  >
                    Tutup
                  </button>
                </div>

                <form onSubmit={handleCreateCategory} className="space-y-5 text-left">
                  <div>
                    <label className="block text-xs font-extrabold text-gray-400 tracking-wider uppercase mb-1.5">Nama Kategori *</label>
                    <input
                      type="text"
                      placeholder="Nama Kategori (e.g. Sembako)"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-base h-[52px] shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold text-gray-800"
                      required
                      autoFocus
                    />
                    <span className="text-[11px] text-gray-400 font-medium italic mt-1 block">
                      Tuliskan nama kategori baru dengan jelas dan ringkas.
                    </span>
                  </div>

                  <div className="flex gap-3 border-t pt-5 justify-end">
                    <button
                      type="submit"
                      disabled={savingCategory}
                      className="rounded-xl bg-primary hover:bg-primary/95 text-white px-6 py-3 text-base font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 h-[52px]"
                    >
                      {savingCategory && <Loader2 className="h-5 w-5 animate-spin" />}
                      Simpan Kategori
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCategoryModal(false);
                        setNewCategoryName("");
                      }}
                      className="rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-6 py-3 text-base font-bold shadow-sm active:scale-[0.98] transition-all h-[52px]"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Create Unit Modal Overlay */}
          {showUnitModal && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center border-b pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Tambah Satuan Baru</h3>
                    <p className="text-xs text-gray-500 mt-1">Tambahkan unit satuan dasar produk baru ke database.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUnitModal(false);
                      setNewUnitCode("");
                      setNewUnitName("");
                    }}
                    className="text-gray-400 hover:text-gray-600 text-lg font-bold p-2"
                  >
                    Tutup
                  </button>
                </div>

                <form onSubmit={handleCreateUnit} className="space-y-5 text-left">
                  {/* Nama Satuan */}
                  <div>
                    <label className="block text-xs font-extrabold text-gray-400 tracking-wider uppercase mb-1.5">Nama Satuan *</label>
                    <input
                      type="text"
                      placeholder="Nama Satuan (e.g. Karton)"
                      value={newUnitName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewUnitName(val);
                        setNewUnitCode(val.trim().toUpperCase());
                      }}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-base h-[52px] shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold text-gray-800"
                      required
                      autoFocus
                    />
                    <span className="text-[11px] text-gray-400 font-medium italic mt-1 block">
                      Nama lengkap dari satuan tersebut (e.g. Karton / Box).
                    </span>
                  </div>

                  {/* Kode Satuan */}
                  <div>
                    <label className="block text-xs font-extrabold text-gray-400 tracking-wider uppercase mb-1.5">Kode Satuan *</label>
                    <input
                      type="text"
                      placeholder="Kode Satuan (e.g. PCS, DUS, KG)"
                      value={newUnitCode}
                      onChange={(e) => setNewUnitCode(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-base h-[52px] shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold text-gray-800"
                      required
                    />
                    <span className="text-[11px] text-gray-400 font-medium italic mt-1 block">
                      Singkatan kode satuan dalam huruf kapital (e.g. DUS). Terisi otomatis dari nama satuan.
                    </span>
                  </div>

                  <div className="flex gap-3 border-t pt-5 justify-end">
                    <button
                      type="submit"
                      disabled={savingUnit}
                      className="rounded-xl bg-primary hover:bg-primary/95 text-white px-6 py-3 text-base font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 h-[52px]"
                    >
                      {savingUnit && <Loader2 className="h-5 w-5 animate-spin" />}
                      Simpan Satuan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowUnitModal(false);
                        setNewUnitCode("");
                        setNewUnitName("");
                      }}
                      className="rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-6 py-3 text-base font-bold shadow-sm active:scale-[0.98] transition-all h-[52px]"
                    >
                      Batal
                    </button>
                  </div>
                </form>
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
                      value={poForm.newSupplierName}
                      onChange={(e) => setPoForm((prev) => ({ ...prev, newSupplierName: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-base h-[52px] shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold text-gray-800"
                      required
                    />
                    <span className="text-[11px] text-gray-400 font-medium italic mt-1 block">
                      Tuliskan nama lengkap supplier atau agen grosir.
                    </span>
                  </div>

                  {/* Grid Tipe & Telepon */}
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {/* Tipe Supplier */}
                    <div>
                      <label className="block text-xs font-extrabold text-gray-400 tracking-wider uppercase mb-1.5">Tipe Supplier *</label>
                      <select
                        value={poForm.newSupplierType}
                        onChange={(e) => setPoForm((prev) => ({ ...prev, newSupplierType: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-base h-[52px] bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold text-gray-800"
                      >
                        <option value="GROSIR">Grosir / Supplier Utama</option>
                        <option value="RETAIL_PROMO">Indomaret / Alfamart Promo</option>
                      </select>
                      <span className="text-[11px] text-gray-400 font-medium italic mt-1 block">
                        Pilih jenis operasional supplier.
                      </span>
                    </div>

                    {/* Nomor Telepon */}
                    <div>
                      <label className="block text-xs font-extrabold text-gray-400 tracking-wider uppercase mb-1.5">Nomor Telepon</label>
                      <input
                        type="text"
                        placeholder="Nomor Telepon (e.g. 08123456789)"
                        value={poForm.newSupplierPhone}
                        onChange={(e) => setPoForm((prev) => ({ ...prev, newSupplierPhone: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-base h-[52px] shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold text-gray-800"
                      />
                      <span className="text-[11px] text-gray-400 font-medium italic mt-1 block">
                        Nomor kontak supplier untuk pemesanan (opsional).
                      </span>
                    </div>
                  </div>

                  {/* Alamat */}
                  <div>
                    <label className="block text-xs font-extrabold text-gray-400 tracking-wider uppercase mb-1.5">Alamat Supplier</label>
                    <input
                      type="text"
                      placeholder="Alamat Lengkap Supplier"
                      value={poForm.newSupplierAddress}
                      onChange={(e) => setPoForm((prev) => ({ ...prev, newSupplierAddress: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-base h-[52px] shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold text-gray-800"
                    />
                    <span className="text-[11px] text-gray-400 font-medium italic mt-1 block">
                      Alamat fisik kantor, toko, atau gudang supplier (opsional).
                    </span>
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
      )}

      {/* Main PO Table */}
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50 text-left text-gray-500 font-semibold">
                <th className="px-4 py-3">No. PO</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Tujuan</th>
                <th className="px-4 py-3 text-center">Item</th>
                <th className="px-4 py-3 text-right">Total Amount</th>
                <th className="px-4 py-3">Pembayaran</th>
                <th className="px-4 py-3">Status PO</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pos.map((po) => {
                const status = PO_STATUS_LABELS[po.status] || { label: po.status, color: "bg-gray-100 text-gray-700" };
                const payment = PAYMENT_STATUS_LABELS[po.paymentStatus] || { label: po.paymentStatus, color: "bg-gray-100 text-gray-700" };

                // Detect if received PO has any minus/shortage
                const isReceived = po.status === "RECEIVED";
                let hasDiscrepancy = false;
                
                if (isReceived && po.goodsReceipts && po.goodsReceipts.length > 0) {
                  po.items.forEach((item) => {
                    const prod = productList.find((p) => p.id === item.productId);
                    const unitObj = prod?.units.find((u) => u.id === item.unitId || u.code === item.unit.code);
                    const factor = unitObj?.conversionToBase || 1;
                    
                    const receivedBase = po.goodsReceipts
                      ?.flatMap((gr) => gr.stockBatches)
                      .filter((sb) => sb.productId === item.productId)
                      .reduce((sum, sb) => sum + sb.qtyReceivedBase, 0) || 0;
                    
                    const orderedBase = item.qty * factor;
                    if (receivedBase < orderedBase) {
                      hasDiscrepancy = true;
                    }
                  });
                }

                return (
                  <tr key={po.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{po.poNumber}</div>
                      {hasDiscrepancy && (
                        <div className="mt-1 inline-flex items-center gap-0.5 rounded bg-red-100 border border-red-300 px-1.5 py-0.5 text-[10px] font-black text-red-800 uppercase tracking-wider animate-pulse shadow-sm">
                          <span>⚠️</span> Ada Minus
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{po.supplier.name}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{po.purpose}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{po.items.length}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-950">{formatCurrency(po.totalAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-relaxed", payment.color)}>
                        {payment.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-relaxed", status.color)}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewingPo(po)}
                          className="rounded bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 p-1 text-xs font-bold transition-all"
                          title="Detail PO"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {po.status === "ORDERED" && (
                          <button
                            onClick={() => handleOpenReceive(po)}
                            disabled={po.paymentStatus !== "LUNAS"}
                            className="rounded bg-green-50 border border-green-200 text-green-700 hover:bg-green-600 hover:text-white px-2 py-1 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-green-50 disabled:hover:text-green-700"
                            title={po.paymentStatus !== "LUNAS" ? "Bayar PO terlebih dahulu sebelum menerima barang" : "Terima Barang"}
                          >
                            Terima Barang
                          </button>
                        )}
                        {po.paymentStatus === "BELUM_BAYAR" ? (
                          <button
                            onClick={() => setPayingPo(po)}
                            className="rounded bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-600 hover:text-white px-2 py-1 text-xs font-bold transition-all"
                          >
                            Bayar PO
                          </button>
                        ) : (
                          po.paymentProofUrl && (
                            <a
                              href={po.paymentProofUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white p-1 text-xs font-bold transition-all"
                              title="Lihat Bukti Transfer"
                            >
                              <FileText className="h-4 w-4" />
                            </a>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pos.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 font-medium bg-gray-50/50">
                    Belum ada Purchase Order
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receive Goods Modal */}
      {receivingPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-gray-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-base font-bold text-gray-950">Konfirmasi Penerimaan Barang (GR)</h3>
              <button onClick={() => setReceivingPo(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Konfirmasikan jumlah barang yang benar-benar diterima untuk PO <span className="font-semibold text-gray-800">{receivingPo.poNumber}</span>. Stok fisik gudang akan bertambah otomatis.
            </p>

            {/* Ringkasan Detail Order */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 mb-4 text-xs text-left">
              <h4 className="font-extrabold text-blue-900 mb-1.5 uppercase tracking-wider">Ringkasan Order</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-6">
                <div className="flex justify-between border-b pb-1 sm:border-none sm:pb-0">
                  <span className="text-gray-500">Supplier:</span>
                  <span className="font-bold text-gray-800">{receivingPo.supplier?.name || "-"}</span>
                </div>
                <div className="flex justify-between border-b pb-1 sm:border-none sm:pb-0">
                  <span className="text-gray-500">Total Macam Produk:</span>
                  <span className="font-bold text-gray-800">{receivingPo.items.length} Item</span>
                </div>
                <div className="flex justify-between border-b pb-1 sm:border-none sm:pb-0">
                  <span className="text-gray-500">Tujuan / Keperluan:</span>
                  <span className="font-bold text-gray-800 truncate max-w-[150px]" title={receivingPo.purpose}>{receivingPo.purpose || "-"}</span>
                </div>
                <div className="flex justify-between border-b pb-1 sm:border-none sm:pb-0">
                  <span className="text-gray-500">Total Qty Dipesan:</span>
                  <span className="font-bold text-gray-800">
                    {receivingPo.items.reduce((sum, item) => sum + item.qty, 0)} Unit
                  </span>
                </div>
              </div>
            </div>

            {/* Scrollable Items Container */}
            <div className="max-h-[380px] overflow-y-auto pr-2 space-y-4 mb-4 text-left border rounded-xl p-3 bg-gray-50/20">
              {receivingPo.items.map((item) => {
                const rItem = receiveItems[item.id] || { qty: item.qty, batchCode: "", expiryDate: "" };
                const conv = getItemConversionText(item.productId, item.unitId || item.unit.code, item.qty);

                return (
                  <div key={item.id} className="border p-4 rounded-lg bg-gray-50/50 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{item.product.name}</h4>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <p className="text-sm font-extrabold text-gray-600">{item.qty} {item.unit.code} dipesan</p>
                        </div>
                        {conv.hasConversion && (
                          <div className="mt-2.5 bg-amber-50 border-2 border-amber-300 rounded-xl p-3 flex items-start gap-2.5 shadow-sm">
                            <span className="text-2xl mt-0.5 leading-none">📦</span>
                            <div>
                              <p className="text-[10px] text-amber-800 font-extrabold uppercase tracking-wider">
                                Konversi Satuan Grosir (Elder-Friendly)
                              </p>
                              <p className="text-sm font-bold text-gray-800 mt-1">
                                <span className="text-amber-950 font-black underline decoration-amber-400 decoration-2 text-base">
                                  {item.qty} {item.unit.code}
                                </span>{" "}
                                itu sama dengan:
                              </p>
                              <p className="text-lg font-black text-amber-950 mt-1 bg-amber-200/90 px-3 py-1.5 rounded-lg border border-amber-300 inline-block">
                                {conv.equivalentQty} {conv.baseCode} (Ecer)
                              </p>
                              <p className="text-[11px] text-amber-700/80 font-bold mt-1.5 leading-tight">
                                * Keterangan: 1 {item.unit.code} berisi {conv.factor} {conv.baseCode}.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider">
                            Qty Diterima
                          </label>
                          {rItem.qty < item.qty && (
                            <span className="inline-flex items-center gap-0.5 bg-red-100 border border-red-300 text-[10px] font-black text-red-700 px-1.5 py-0.5 rounded-full shrink-0 animate-pulse">
                              ⚠️ Kurang {item.qty - rItem.qty} {item.unit.code}
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            value={rItem.qty}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setReceiveItems({
                                ...receiveItems,
                                [item.id]: { ...rItem, qty: isNaN(val) ? 0 : val }
                              });
                            }}
                            className={cn(
                              "w-full rounded-xl border-2 pl-4 pr-16 py-2.5 text-base font-extrabold transition-all h-[52px]",
                              rItem.qty < item.qty
                                ? "border-red-300 bg-red-50/30 text-red-900 focus:border-red-500"
                                : "border-gray-300 text-gray-800 focus:border-primary"
                            )}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-gray-500 bg-gray-100 px-2 py-1 rounded-md border border-gray-200 uppercase">
                            {item.unit.code}
                          </span>
                        </div>
                        {conv.hasConversion && (
                          <div className="mt-2 text-xs font-black text-green-800 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5 flex items-center justify-between shadow-sm">
                            <span>Eceran:</span>
                            <span className="text-sm bg-green-200 px-1.5 py-0.5 rounded font-black text-green-950">
                              {rItem.qty * conv.factor} {conv.baseCode}
                            </span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1.5">
                          Kode Batch *
                        </label>
                        <input
                          type="text"
                          value={rItem.batchCode}
                          onChange={(e) => setReceiveItems({
                            ...receiveItems,
                            [item.id]: { ...rItem, batchCode: e.target.value }
                          })}
                          className="w-full rounded-xl border-2 border-gray-300 px-4 py-2.5 text-base font-extrabold text-gray-800 focus:outline-none focus:border-primary transition-all h-[52px]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1.5">
                          Tanggal Kadaluwarsa
                        </label>
                        <input
                          type="date"
                          value={rItem.expiryDate}
                          onChange={(e) => setReceiveItems({
                            ...receiveItems,
                            [item.id]: { ...rItem, expiryDate: e.target.value }
                          })}
                          className="w-full rounded-xl border-2 border-gray-300 px-4 py-2.5 text-base font-extrabold text-gray-800 focus:outline-none focus:border-primary transition-all h-[52px]"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Catatan Selisih / Penerimaan Barang */}
            <div className="text-left space-y-1.5 mb-4">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Catatan Penerimaan / Penagihan Selisih (Discrepancy Notes)
              </label>
              <textarea
                placeholder="Tulis jika ada barang yang kurang/minus, misalnya: 'Susu kurang 2 pack, sudah ditagih ke toko dan dijanjikan dikirim besok.'"
                value={receiveNotes}
                onChange={(e) => setReceiveNotes(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-gray-800 font-semibold bg-gray-50/50"
              />
            </div>

            <div className="flex gap-3 mt-6 border-t pt-4">
              <button
                type="button"
                onClick={handleConfirmReceive}
                disabled={submittingReceive}
                className="flex-1 rounded bg-green-600 text-white py-2.5 text-xs font-semibold hover:bg-green-700 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {submittingReceive && <Loader2 className="h-4.5 w-4.5 animate-spin" />}
                Konfirmasi Terima Barang
              </button>
              <button
                type="button"
                onClick={() => setReceivingPo(null)}
                className="flex-1 rounded border border-gray-300 bg-white text-gray-700 py-2.5 text-xs font-semibold hover:bg-gray-50"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay PO Modal */}
      {payingPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-gray-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-base font-bold text-gray-950">Catat Pembayaran PO</h3>
              <button onClick={() => setPayingPo(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">No. PO</span>
                  <span className="font-semibold text-gray-900">{payingPo.poNumber}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-500">Supplier</span>
                  <span className="font-semibold text-gray-900">{payingPo.supplier.name}</span>
                </div>
                <div className="flex justify-between mt-1 border-t pt-1 font-bold">
                  <span className="text-gray-600">Total Nominal</span>
                  <span className="text-primary">{formatCurrency(payingPo.totalAmount)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tanggal Bayar *</label>
                <input
                  type="date"
                  value={paymentForm.paidAt}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paidAt: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Metode Pembayaran *</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-xs focus:outline-none"
                >
                  <option value="TRANSFER_BANK">Transfer Bank</option>
                  <option value="CASH">Cash / Kas Tunai</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Upload Bukti Transfer (Screenshot)</label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) processSelectedFile(file);
                  }}
                  className={cn(
                    "mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg bg-gray-50/50 transition-colors",
                    isDragging ? "border-primary bg-primary/5 bg-blue-50/30" : "border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <div className="space-y-1 text-center">
                    <UploadCloud className={cn("mx-auto h-10 w-10 transition-colors", isDragging ? "text-primary animate-bounce" : "text-gray-400")} />
                    <div className="flex text-xs text-gray-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-semibold text-primary hover:text-primary/90 focus-within:outline-none">
                        <span>Pilih File</span>
                        <input type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
                      </label>
                      <p className="pl-1">atau drag and drop</p>
                    </div>
                    <p className="text-[10px] text-gray-400">PNG, JPG, GIF up to 5MB</p>
                    {proofFileName && (
                      <p className="text-xs font-semibold text-green-600 mt-1">✓ {proofFileName}</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Catatan / Ref Transaksi</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Catatan transfer, bank tujuan, dsb..."
                  rows={2}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 border-t pt-4">
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={submittingPayment}
                className="flex-1 rounded bg-primary text-white py-2.5 text-xs font-semibold hover:bg-primary/95 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {submittingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
                Catat Lunas
              </button>
              <button
                type="button"
                onClick={() => {
                  setPayingPo(null);
                  setProofFile(null);
                  setProofFileName("");
                }}
                className="flex-1 rounded border border-gray-300 bg-white text-gray-700 py-2.5 text-xs font-semibold hover:bg-gray-50"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Detail Purchase Order Modal */}
      {viewingPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-gray-100 bg-white p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Detail Purchase Order</h3>
                <p className="text-xs text-gray-500 mt-1">Status dan rincian transaksi resmi ke supplier.</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingPo(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-2"
              >
                Tutup
              </button>
            </div>

            {/* Header Ringkasan PO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl text-left text-sm">
              <div className="space-y-1">
                <p className="text-gray-500">No. Purchase Order (PO)</p>
                <p className="font-bold text-gray-900 text-base">{viewingPo.poNumber}</p>
                
                <p className="text-gray-500 pt-2">Supplier</p>
                <p className="font-semibold text-gray-800">{viewingPo.supplier.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-gray-500">Tujuan Pengadaan</p>
                <p className="font-semibold text-gray-800">{viewingPo.purpose}</p>

                <p className="text-gray-500 pt-2">Tanggal Dibuat</p>
                <p className="font-semibold text-gray-800">
                  {new Date(viewingPo.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                  })}
                </p>
              </div>
            </div>

            {/* Status Status */}
            <div className="flex flex-wrap gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-medium">Status PO:</span>
                <span className={cn("rounded-full border px-2.5 py-0.5 leading-relaxed", PO_STATUS_LABELS[viewingPo.status]?.color || "bg-gray-100 text-gray-700")}>
                  {PO_STATUS_LABELS[viewingPo.status]?.label || viewingPo.status}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-medium">Status Pembayaran:</span>
                <span className={cn("rounded-full border px-2.5 py-0.5 leading-relaxed", PAYMENT_STATUS_LABELS[viewingPo.paymentStatus]?.color || "bg-gray-100 text-gray-700")}>
                  {PAYMENT_STATUS_LABELS[viewingPo.paymentStatus]?.label || viewingPo.paymentStatus}
                </span>
              </div>
            </div>

            {/* Daftar Item PO */}
            <div className="space-y-2 text-left">
              <h4 className="text-sm font-bold text-gray-900">Rincian Barang yang Dipesan</h4>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b bg-gray-50 text-gray-500 font-bold">
                      <th className="px-4 py-3">Nama Produk</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3">Satuan</th>
                      <th className="px-4 py-3 text-right">Harga Satuan</th>
                      <th className="px-4 py-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {viewingPo.items.map((item) => {
                      const prod = productList.find((p) => p.id === item.productId);
                      const unitObj = prod?.units.find((u) => u.id === item.unitId || u.code === item.unit.code);
                      const factor = unitObj?.conversionToBase || 1;
                      const baseUnitCode = prod?.baseUnitCode || "PCS";
                      const hasConversion = factor > 1;

                      const receivedBase = viewingPo.goodsReceipts
                        ?.flatMap((gr) => gr.stockBatches)
                        .filter((sb) => sb.productId === item.productId)
                        .reduce((sum, sb) => sum + sb.qtyReceivedBase, 0) || 0;
                      
                      const isPoReceived = viewingPo.status === "RECEIVED";
                      const orderedBase = item.qty * factor;
                      const isMinus = isPoReceived && (receivedBase < orderedBase);
                      const qtyReceivedUnit = receivedBase / factor;
                      const minusQtyUnit = item.qty - qtyReceivedUnit;

                      return (
                        <tr key={item.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">{item.product.name}</p>
                            <p className="text-[10px] text-gray-400">SKU: {item.product.sku}</p>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-xs sm:text-sm">
                            <div className="font-bold text-gray-900">{item.qty}</div>
                            {hasConversion && (
                              <div className="mt-1 inline-block rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-xs font-black text-amber-900 whitespace-nowrap shadow-sm">
                                Setara {item.qty * factor} {baseUnitCode}
                              </div>
                            )}
                            {isMinus && (
                              <div className="mt-1 block rounded-md bg-red-100 border border-red-300 px-2 py-0.5 text-[11px] font-black text-red-700 whitespace-nowrap shadow-sm">
                                ⚠️ Kurang {minusQtyUnit} {item.unit?.code || "PCS"} (Datang {qtyReceivedUnit})
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-left">
                            <div className="font-bold text-gray-950">{item.unit?.code || "PCS"}</div>
                            {hasConversion && (
                              <div className="mt-1 inline-block rounded bg-gray-100 border border-gray-200 px-1.5 py-0.5 text-[10px] font-extrabold text-gray-600 whitespace-nowrap">
                                1 {item.unit?.code} = {factor} {baseUnitCode}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">{formatCurrency(item.unitCost)}</td>
                          <td className="px-4 py-3 text-right font-bold text-gray-950">{formatCurrency(item.subtotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bukti & Catatan Pembayaran */}
            {(viewingPo.paymentNotes || viewingPo.paymentProofUrl) && (
              <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/30 text-left space-y-2 text-xs">
                <h4 className="font-bold text-gray-900">Detail Pembayaran Supplier</h4>
                {viewingPo.paymentNotes && (
                  <p className="text-gray-600"><span className="font-bold">Catatan:</span> {viewingPo.paymentNotes}</p>
                )}
                {viewingPo.paymentProofUrl && (
                  <div className="pt-1">
                    <a
                      href={viewingPo.paymentProofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline border border-primary/20 bg-primary/5 rounded px-2.5 py-1"
                    >
                      <FileText className="h-3.5 w-3.5" /> Lihat Bukti Transfer Resmi
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Log Penerimaan Barang & Selisih */}
            {viewingPo.goodsReceipts && viewingPo.goodsReceipts.length > 0 && (
              <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/30 text-left space-y-3 text-xs">
                <h4 className="font-bold text-gray-900 flex items-center gap-1.5">
                  <span>📦</span> Log Penerimaan Barang & Selisih Gudang
                </h4>
                <div className="divide-y divide-gray-100 bg-white border rounded-xl overflow-hidden shadow-sm">
                  {viewingPo.goodsReceipts.map((gr) => (
                    <div key={gr.id} className="p-3.5 space-y-2">
                      <div className="flex justify-between items-center text-gray-500 font-medium">
                        <span>Tanggal Penerimaan:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 font-bold bg-gray-100 px-2 py-0.5 rounded border">
                            {new Date(gr.receivedAt).toLocaleDateString("id-ID", {
                              day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                            })}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenEditReceipt(viewingPo, gr)}
                            className="text-primary hover:text-primary/80 font-bold text-xs underline cursor-pointer"
                          >
                            Edit Log Penerimaan
                          </button>
                        </div>
                      </div>
                      {gr.notes ? (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-950">
                          <p className="font-black flex items-center gap-1">
                            <span>⚠️</span> Catatan Selisih & Penagihan:
                          </p>
                          <p className="font-bold text-red-800 mt-1 leading-relaxed text-[11px] sm:text-xs">
                            "{gr.notes}"
                          </p>
                        </div>
                      ) : (
                        <p className="text-green-700 font-bold flex items-center gap-1">
                          <span>✓</span> Diterima lengkap sesuai PO (tidak ada minus).
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total Footer */}
            <div className="flex justify-between items-center border-t pt-4 font-bold text-base">
              <span className="text-gray-700">Total Keseluruhan PO</span>
              <span className="text-primary text-lg">{formatCurrency(viewingPo.totalAmount)}</span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewingPo(null)}
                className="rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-6 py-2.5 text-sm font-bold shadow-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Goods Receipt Modal */}
      {editingReceipt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-gray-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-base font-bold text-gray-950">Koreksi &amp; Edit Penerimaan Barang</h3>
              <button onClick={() => setEditingReceipt(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Sesuaikan kuantitas barang yang benar-benar diterima jika ada kesalahan input sebelumnya. Stok fisik gudang akan disesuaikan secara otomatis.
            </p>

            <form
              id="editReceiptForm"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const formData = new FormData(form);
                const po = editingReceipt.po;
                const gr = editingReceipt.gr;

                const itemsToSubmit = po.items.map((item: any, index: number) => {
                  const qtyStr = (formData.get(`qty_${index}`) as string) || "0";
                  const qty = parseFloat(qtyStr.replace(/,/g, ".")) || 0;
                  const prod = productList.find((p) => p.id === item.productId);
                  const unitObj = prod?.units.find((u: any) => u.id === item.unitId || u.code === item.unit.code);
                  const factor = unitObj?.conversionToBase || 1;
                  return {
                    productId: item.productId,
                    qtyReceivedBase: qty * factor,
                  };
                });

                const notesVal = (formData.get("receipt_notes") as string) || "";

                setSubmittingEditReceipt(true);
                try {
                  const res = await fetch(`/api/procurement/purchase-orders/${po.id}/receive`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      goodsReceiptId: gr.id,
                      items: itemsToSubmit,
                      notes: notesVal,
                    }),
                  });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json.error || "Gagal memperbarui penerimaan");

                  // Directly update local pos state to ensure immediate UI feedback
                  setPos((prevPos) =>
                    prevPos.map((itemPo) => {
                      if (itemPo.id !== po.id) return itemPo;
                      return {
                        ...itemPo,
                        goodsReceipts: (itemPo.goodsReceipts || []).map((itemGr) => {
                          if (itemGr.id !== gr.id) return itemGr;
                          return {
                            ...itemGr,
                            notes: notesVal || null,
                            stockBatches: itemGr.stockBatches.map((sb) => {
                              const match = itemsToSubmit.find((i: any) => i.productId === sb.productId);
                              if (match) {
                                return {
                                  ...sb,
                                  qtyReceivedBase: match.qtyReceivedBase,
                                };
                              }
                              return sb;
                            }),
                          };
                        }),
                      };
                    })
                  );

                  setEditingReceipt(null);
                  setViewingPo(null);
                  triggerNotification(`Penerimaan barang PO ${po.poNumber} berhasil diperbarui!`);
                  router.refresh();
                } catch (err: any) {
                  alert(err.message || "Gagal memperbarui penerimaan");
                } finally {
                  setSubmittingEditReceipt(false);
                }
              }}
            >
              {/* Scrollable Items Container */}
              <div className="max-h-[380px] overflow-y-auto pr-2 space-y-4 mb-4 text-left border rounded-xl p-3 bg-gray-50/20">
                {editingReceipt.po.items.map((item: any, index: number) => {
                  const prod = productList.find((p) => p.id === item.productId);
                  const unitObj = prod?.units.find((u: any) => u.id === item.unitId || u.code === item.unit.code);
                  const factor = unitObj?.conversionToBase || 1;

                  const sb = editingReceipt.gr.stockBatches.find((s: any) => s.productId === item.productId);
                  const qtyBase = sb ? sb.qtyReceivedBase : 0;
                  const initialQty = qtyBase / factor;

                  return (
                    <div key={String(index)} className="border p-4 rounded-lg bg-gray-50/50 space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{item.product.name}</h4>
                        <p className="text-xs font-extrabold text-gray-500 mt-0.5">
                          Qty PO Dipesan: {item.qty} {item.unit.code}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider">
                              Qty Diterima (Koreksi)
                            </label>
                            {/* Warning badge - updated via JS */}
                            <span
                              id={`warn_${index}`}
                              className={cn(
                                "inline-flex items-center gap-0.5 bg-red-100 border border-red-300 text-[10px] font-black text-red-700 px-1.5 py-0.5 rounded-full shrink-0 animate-pulse",
                                initialQty < item.qty ? "" : "hidden"
                              )}
                            >
                              ⚠️ Kurang {item.qty - initialQty} {item.unit.code}
                            </span>
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              name={`qty_${index}`}
                              defaultValue={String(initialQty)}
                              onInput={(e) => {
                                const raw = (e.target as HTMLInputElement).value;
                                const qty = parseFloat(raw.replace(/,/g, ".")) || 0;

                                // Update conversion display
                                const convEl = document.getElementById(`conv_${index}`);
                                if (convEl) convEl.textContent = `${qty * factor} ${prod?.baseUnitCode || "PCS"}`;

                                // Update warning badge
                                const warnEl = document.getElementById(`warn_${index}`);
                                if (warnEl) {
                                  if (qty < item.qty) {
                                    warnEl.textContent = `⚠️ Kurang ${item.qty - qty} ${item.unit.code}`;
                                    warnEl.classList.remove("hidden");
                                  } else {
                                    warnEl.classList.add("hidden");
                                  }
                                }

                                // Update input border color
                                const inputEl = e.target as HTMLInputElement;
                                if (qty < item.qty) {
                                  inputEl.className = inputEl.className.replace("border-gray-300 text-gray-800 focus:border-primary", "border-red-300 bg-red-50/30 text-red-900 focus:border-red-500");
                                } else {
                                  inputEl.className = inputEl.className.replace("border-red-300 bg-red-50/30 text-red-900 focus:border-red-500", "border-gray-300 text-gray-800 focus:border-primary");
                                }
                              }}
                              className={cn(
                                "w-full rounded-xl border-2 pl-4 pr-16 py-2.5 text-base font-extrabold transition-all h-[52px]",
                                initialQty < item.qty
                                  ? "border-red-300 bg-red-50/30 text-red-900 focus:border-red-500"
                                  : "border-gray-300 text-gray-800 focus:border-primary"
                              )}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-gray-500 bg-gray-100 px-2 py-1 rounded-md border border-gray-200 uppercase">
                              {item.unit.code}
                            </span>
                          </div>
                        </div>

                        {factor > 1 && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col justify-center">
                            <p className="text-[10px] text-amber-800 font-extrabold uppercase">
                              Konversi Eceran Setara:
                            </p>
                            <p id={`conv_${index}`} className="text-base font-black text-amber-950 mt-1">
                              {initialQty * factor} {prod?.baseUnitCode || "PCS"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Catatan Selisih */}
              <div className="text-left space-y-1.5 mb-4">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Catatan Penerimaan / Penagihan Selisih (Koreksi)
                </label>
                <textarea
                  name="receipt_notes"
                  placeholder="Tulis alasan koreksi selisih..."
                  defaultValue={editingReceipt.gr.notes || ""}
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-gray-800 font-semibold bg-gray-50/50"
                />
              </div>

              <div className="flex gap-3 mt-6 border-t pt-4">
                <button
                  type="submit"
                  disabled={submittingEditReceipt}
                  className="flex-1 rounded bg-primary text-white py-2.5 text-xs font-semibold hover:bg-primary/95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {submittingEditReceipt && <Loader2 className="h-4 w-4 animate-spin" />}
                  Simpan Koreksi Penerimaan
                </button>
                <button
                  type="button"
                  onClick={() => setEditingReceipt(null)}
                  className="flex-1 rounded border border-gray-300 bg-white text-gray-700 py-2.5 text-xs font-semibold hover:bg-gray-50"
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
