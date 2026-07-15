"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils/decimal";
import { Sparkles, Trophy, Flame } from "lucide-react";
import type { TopProductRow } from "@/lib/services/dashboard.service";

type TopProductsWidgetProps = {
  initialProducts: TopProductRow[];
  periodLabel: string;
};

export default function TopProductsWidget({ initialProducts, periodLabel }: TopProductsWidgetProps) {
  const [sortBy, setSortBy] = useState<"revenue" | "qtySold">("revenue");

  const sortedProducts = [...initialProducts].sort((a, b) => {
    const valA = Number(a[sortBy]);
    const valB = Number(b[sortBy]);
    return valB - valA;
  });

  const maxVal = sortedProducts.length > 0 ? Number(sortedProducts[0][sortBy]) : 1;

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h3 className="text-base font-semibold text-gray-900 font-bold">Produk Terlaris</h3>
          </div>
          <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
            {periodLabel}
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-4">Urutkan produk berdasarkan performa kuantitas atau nominal omzet.</p>

        {/* Sort Controls */}
        <div className="flex rounded-lg border p-0.5 bg-gray-50 mb-4">
          <button
            onClick={() => setSortBy("revenue")}
            className={`flex-1 py-1 text-center text-xs font-semibold rounded-md transition-colors ${
              sortBy === "revenue" ? "bg-white text-gray-900 shadow-sm border border-gray-150" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Berdasarkan Omzet (Rp)
          </button>
          <button
            onClick={() => setSortBy("qtySold")}
            className={`flex-1 py-1 text-center text-xs font-semibold rounded-md transition-colors ${
              sortBy === "qtySold" ? "bg-white text-gray-900 shadow-sm border border-gray-150" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Berdasarkan Kuantitas
          </button>
        </div>

        {/* List & Progress Bars */}
        <div className="space-y-4">
          {sortedProducts.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-400">Belum ada data penjualan.</p>
          ) : (
            sortedProducts.map((p, i) => {
              const currentVal = Number(p[sortBy]);
              const percent = maxVal > 0 ? (currentVal / maxVal) * 100 : 0;

              return (
                <div key={p.productId} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
                        i === 0 ? "bg-amber-100 text-amber-800" :
                        i === 1 ? "bg-gray-150 text-gray-700" :
                        i === 2 ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-500"
                      }`}>
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900 leading-tight">{p.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{p.sku}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-gray-900">
                        {sortBy === "revenue" ? formatCurrency(p.revenue) : `${p.qtySold} terjual`}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {sortBy === "revenue" ? `${p.qtySold} terjual` : formatCurrency(p.revenue)}
                      </p>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        i === 0 ? "bg-gradient-to-r from-amber-400 to-amber-500 animate-pulse" :
                        i === 1 ? "bg-gradient-to-r from-blue-400 to-blue-500" :
                        i === 2 ? "bg-gradient-to-r from-orange-400 to-orange-500" : "bg-gradient-to-r from-gray-400 to-gray-500"
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {sortedProducts.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
          <span className="flex items-center gap-1">
            <Flame className="h-3 w-3 text-red-500" />
            Top performer: {sortedProducts[0].name}
          </span>
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-500 animate-spin" style={{ animationDuration: "3s" }} />
            Live data
          </span>
        </div>
      )}
    </div>
  );
}
