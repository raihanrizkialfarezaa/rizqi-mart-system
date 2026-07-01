import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { PageHeader, Panel } from "@/components/erp/Panel";

export default function NewOrderPage() {
  return (
    <div>
      <Link
        href="/erp/orders"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Link>

      <PageHeader
        title="Buat Pesanan Manual"
        description="Untuk order B2B via WhatsApp yang diinput admin."
      />

      <Panel>
        <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
          <Info className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Form order builder akan tersedia.</p>
            <p className="mt-1 text-blue-600">
              Alur: pilih institusi &rarr; tambah item (cek pagu harga) &rarr;
              sistem alokasi stok otomatis &rarr; buat SourcingRequest untuk item
              yang tidak ready. Service layer{" "}
              <code className="rounded bg-blue-100 px-1">createSalesOrder()</code>{" "}
              sudah siap dipanggil.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
