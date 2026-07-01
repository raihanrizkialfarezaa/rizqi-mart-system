import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type StatCardProps = {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  accent?: "blue" | "green" | "amber" | "red" | "purple";
  subtitle?: string;
};

const accentStyles: Record<NonNullable<StatCardProps["accent"]>, string> = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
  purple: "bg-purple-50 text-purple-600",
};

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  accent = "blue",
  subtitle,
}: StatCardProps) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-lg",
            accentStyles[accent]
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          <span
            className={cn(
              "font-semibold",
              trend.positive ? "text-green-600" : "text-red-600"
            )}
          >
            {trend.positive ? "▲" : "▼"} {trend.value}
          </span>
          <span className="text-gray-400">vs periode lalu</span>
        </div>
      )}
    </div>
  );
}
