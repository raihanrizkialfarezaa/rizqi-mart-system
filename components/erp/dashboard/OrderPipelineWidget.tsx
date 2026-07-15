import Link from "next/link";
import { Route } from "lucide-react";
import type { OrderStatusPipelineRow } from "@/lib/services/dashboard.service";

export default function OrderPipelineWidget({ rows = [] }: { rows?: OrderStatusPipelineRow[] }) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const maxCount = Math.max(1, ...safeRows.map((row) => row.count));
  const total = safeRows.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-gray-900">
            <Route className="h-5 w-5 text-primary" />
            Pipeline Pesanan
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">Bottleneck operasional per status aktif.</p>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
          {total} aktif
        </span>
      </div>

      <div className="space-y-3">
        {safeRows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
            Pipeline pesanan belum tersedia.
          </div>
        ) : safeRows.map((row) => {
          const percent = (row.count / maxCount) * 100;
          return (
            <Link key={row.status} href={row.href} className="block rounded-lg p-2 transition-colors hover:bg-gray-50">
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-gray-700">{row.label}</span>
                <span className="font-bold text-gray-900">{row.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
