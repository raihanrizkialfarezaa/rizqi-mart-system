"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  Boxes,
  Truck,
  Wallet,
  Sparkles,
  Store,
  ChevronRight,
  ChevronDown,
  List,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

type SubNavItem = {
  label: string;
  href: string;
  icon: typeof List;
};

type NavGroup = {
  label: string;
  icon: typeof LayoutDashboard;
  children: SubNavItem[];
};

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
};

const navGroups: NavGroup[] = [
  {
    label: "Pesanan",
    icon: ShoppingBag,
    children: [
      { label: "Semua Pesanan", href: "/erp/orders", icon: List },
      { label: "Buat Pesanan", href: "/erp/orders/new", icon: Plus },
    ],
  },
];

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/erp", icon: LayoutDashboard },
  { label: "Inventori", href: "/erp/inventory", icon: Boxes },
  { label: "Pengadaan", href: "/erp/procurement", icon: Truck },
  { label: "Keuangan", href: "/erp/finance", icon: Wallet },
  { label: "AI Assistant", href: "/erp/ai-assistant", icon: Sparkles },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const set = new Set<string>();
    for (const g of navGroups) {
      if (g.children.some((c) => pathname.startsWith(c.href))) {
        set.add(g.label);
      }
    }
    return set;
  });

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

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
        {/* Nav groups with submenu */}
        {navGroups.map((group) => {
          const groupActive = group.children.some((c) => isActive(c.href));
          const isExpanded = expandedGroups.has(group.label);
          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  groupActive
                    ? "bg-primary text-white"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <span className="flex items-center gap-3">
                  <group.icon className="h-5 w-5" />
                  {group.label}
                </span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              {isExpanded && (
                <div className="ml-3 mt-1 space-y-0.5 border-l border-gray-200 pl-3">
                  {group.children.map((child) => {
                    const childActive = isActive(child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          childActive
                            ? "bg-primary/10 text-primary"
                            : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                        )}
                      >
                        <child.icon className="h-4 w-4" />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Single nav items */}
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
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
