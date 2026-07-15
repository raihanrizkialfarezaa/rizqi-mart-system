"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, TimerReset } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { DashboardRange } from "@/lib/services/dashboard.service";

const ranges: Array<{ value: DashboardRange; label: string }> = [
  { value: "7d", label: "7 Hari" },
  { value: "30d", label: "30 Hari" },
  { value: "month", label: "Bulan Ini" },
  { value: "90d", label: "90 Hari" },
];

export default function DashboardControls({ activeRange }: { activeRange: DashboardRange }) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(() => new Date());

  const refresh = () => {
    setIsRefreshing(true);
    setLastRefresh(new Date());
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 700);
  };

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = window.setInterval(refresh, 60000);
    return () => window.clearInterval(interval);
  }, [autoRefresh]);

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-2">
        {ranges.map((range) => (
          <Link
            key={range.value}
            href={`/erp?range=${range.value}`}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
              activeRange === range.value
                ? "bg-primary text-white shadow-sm shadow-primary/20"
                : "border border-gray-200 bg-gray-50 text-gray-600 hover:bg-white hover:text-gray-900"
            )}
          >
            {range.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2.5 py-1.5">
          <TimerReset className="h-3.5 w-3.5" />
          Update terakhir {lastRefresh.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
        </span>
        <button
          onClick={() => setAutoRefresh((prev) => !prev)}
          className={cn(
            "rounded-lg border px-3 py-1.5 font-semibold transition-colors",
            autoRefresh
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          )}
        >
          Auto refresh {autoRefresh ? "ON" : "OFF"}
        </button>
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          Refresh
        </button>
      </div>
    </div>
  );
}
