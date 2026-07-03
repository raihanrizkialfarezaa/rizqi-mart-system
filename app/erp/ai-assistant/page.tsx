import { BrainCircuit } from "lucide-react";
import { PageHeader, Panel } from "@/components/erp/Panel";

const exampleQueries = [
  "Berapa margin bersih minggu ini?",
  "Produk apa yang paling sering butuh sourcing?",
  "Supplier mana yang paling murah untuk susu UHT?",
  "Ada barang yang mau kadaluwarsa?",
  "Siapa yang belum bayar?",
];

export default function AIAssistantPage() {
  return (
    <div>
      <PageHeader
        title="AI Assistant"
        description="Analitik & decision support berbasis Claude (Fase 5)."
      />

      <Panel>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BrainCircuit className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            Segera Hadir
          </h3>
          <p className="mt-1 max-w-md text-sm text-gray-500">
            Natural language query dengan function calling & text-to-SQL
            (read-only, whitelisted). Endpoint & guardrails akan dibangun di
            Fase 5 setelah data historis cukup.
          </p>

          <div className="mt-6 w-full max-w-md space-y-2">
            <p className="text-left text-xs font-medium uppercase tracking-wide text-gray-400">
              Contoh pertanyaan
            </p>
            {exampleQueries.map((q) => (
              <div
                key={q}
                className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-left text-sm text-gray-600"
              >
                {q}
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}
