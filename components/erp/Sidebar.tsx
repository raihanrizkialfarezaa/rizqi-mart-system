"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Boxes,
  Truck,
  Wallet,
  Sparkles,
  Store,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/erp", icon: LayoutDashboard },
  { label: "Pesanan", href: "/erp/orders", icon: ShoppingBag },
  { label: "Inventori", href: "/erp/inventory", icon: Boxes },
  { label: "Pengadaan", href: "/erp/procurement", icon: Truck },
  { label: "Keuangan", href: "/erp/finance", icon: Wallet },
  { label: "AI Assistant", href: "/erp/ai-assistant", icon: Sparkles },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/erp" ? pathname === "/erp" : pathname.startsWith(href);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-white lg:flex">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-white">
          R
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold">Rizqi Mart</p>
          <p className="text-xs text-gray-400">ERP Dashboard</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <span className="flex items-center gap-3">
                <item.icon className="h-5 w-5" />
                {item.label}
              </span>
              {active && <ChevronRight className="h-4 w-4" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          <Store className="h-5 w-5" />
          Lihat Storefront
        </Link>
      </div>
    </aside>
  );
}
