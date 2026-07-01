import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export type FilterTab = {
  label: string;
  value: string;
};

/**
 * Tab filter berbasis URL query param (Server Component friendly).
 */
export default function FilterTabs({
  tabs,
  activeValue,
  paramName,
  basePath,
}: {
  tabs: FilterTab[];
  activeValue: string;
  paramName: string;
  basePath: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = activeValue === tab.value;
        const href =
          tab.value === "ALL"
            ? basePath
            : `${basePath}?${paramName}=${tab.value}`;
        return (
          <Link
            key={tab.value}
            href={href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
