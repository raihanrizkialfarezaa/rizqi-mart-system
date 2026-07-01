import { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Primitif tabel ringan untuk halaman ERP.
 * Bukan komponen data-fetching; hanya presentational.
 */

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
      {children}
    </thead>
  );
}

export function TH({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <th className={cn("px-4 py-3 font-medium", className)}>{children}</th>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y">{children}</tbody>;
}

export function TR({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr className={cn("hover:bg-gray-50", className)}>{children}</tr>
  );
}

export function TD({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={cn("px-4 py-3 text-gray-700", className)}>{children}</td>;
}

export function EmptyRow({
  colSpan,
  message = "Tidak ada data",
}: {
  colSpan: number;
  message?: string;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-10 text-center text-sm text-gray-400"
      >
        {message}
      </td>
    </tr>
  );
}
