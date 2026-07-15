"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatCurrency } from "@/lib/utils/decimal";
import { TrendingUp, Percent } from "lucide-react";
import type { SalesTrendPoint } from "@/lib/services/dashboard.service";

type SalesTrendChartProps = {
  data: SalesTrendPoint[];
  periodLabel: string;
};

export default function SalesTrendChart({ data, periodLabel }: SalesTrendChartProps) {
  const [chartMode, setChartMode] = useState<"revenue" | "margin">("revenue");

  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const totalMargin = data.reduce((sum, item) => sum + item.margin, 0);
  const averageMarginRate = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return String(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as SalesTrendPoint;
      return (
        <div className="rounded-lg border border-gray-150 bg-white p-3 shadow-md text-xs space-y-1">
          <p className="font-semibold text-gray-500">{dataPoint.date}</p>
          <p className="text-blue-600 font-medium">
            Omzet: <span className="font-bold">{formatCurrency(dataPoint.revenue)}</span>
          </p>
          <p className="text-emerald-600 font-medium">
            Margin Bersih: <span className="font-bold">{formatCurrency(dataPoint.margin)}</span>
          </p>
          <p className="text-gray-400">
            Rasio Profit: <span className="font-semibold">
              {dataPoint.revenue > 0 ? ((dataPoint.margin / dataPoint.revenue) * 100).toFixed(1) : 0}%
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900 font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Tren Penjualan & Margin
            </h3>
            <p className="text-xs text-gray-500">Visualisasi performa keuangan harian toko ({periodLabel}).</p>
          </div>

          <div className="flex rounded-lg border p-0.5 bg-gray-50 text-xs">
            <button
              onClick={() => setChartMode("revenue")}
              className={`px-3 py-1 font-semibold rounded-md transition-colors ${
                chartMode === "revenue" ? "bg-white text-gray-900 shadow-sm border border-gray-150" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Omzet
            </button>
            <button
              onClick={() => setChartMode("margin")}
              className={`px-3 py-1 font-semibold rounded-md transition-colors ${
                chartMode === "margin" ? "bg-white text-gray-900 shadow-sm border border-gray-150" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Margin Bersih
            </button>
          </div>
        </div>

        {/* Small stats display inside chart widget */}
        <div className="grid grid-cols-3 gap-2 mb-4 bg-gray-50 rounded-lg p-2.5">
          <div>
            <p className="text-[10px] text-gray-400 font-medium">Total Omzet</p>
            <p className="text-sm font-bold text-gray-900 truncate">{formatCurrency(totalRevenue)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-medium">Total Margin</p>
            <p className="text-sm font-bold text-gray-900 truncate">{formatCurrency(totalMargin)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-medium">Rata-rata Margin</p>
            <p className="text-sm font-bold text-emerald-600 flex items-center gap-0.5">
              <Percent className="h-3.5 w-3.5" />
              {averageMarginRate.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Recharts responsive container */}
        <div className="h-[230px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorMargin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                stroke="#9ca3af"
                fontSize={10}
              />
              <YAxis
                tickFormatter={formatYAxis}
                tickLine={false}
                axisLine={false}
                stroke="#9ca3af"
                fontSize={10}
              />
              <Tooltip content={<CustomTooltip />} />
              {chartMode === "revenue" ? (
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              ) : (
                <Area
                  type="monotone"
                  dataKey="margin"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorMargin)"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
