import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader, Panel } from "@/components/erp/Panel";
import OrderBuilder from "@/components/erp/orders/OrderBuilder";

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
        <OrderBuilder />
      </Panel>
    </div>
  );
}
