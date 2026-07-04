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
  BrainCircuit,
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
  {
    label: "Pengadaan",
    icon: Truck,
    children: [
      { label: "Sourcing Barang", href: "/erp/procurement", icon: List },
      { label: "Purchase Order (PO)", href: "/erp/procurement/purchase-orders", icon: List },
    ],
  },
];

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/erp", icon: LayoutDashboard },
  { label: "Inventori", href: "/erp/inventory", icon: Boxes },
  { label: "Keuangan", href: "/erp/finance", icon: Wallet },
  { label: "AI Assistant", href: "/erp/ai-assistant", icon: BrainCircuit },
];

function getIsActive(pathname: string, href: string): boolean {
  if (href === "/erp") {
    return pathname === "/erp";
  }
  if (pathname === href) {
    return true;
  }
  if (pathname.startsWith(href)) {
    // Check if there is a more specific menu matching the current pathname
    const isMoreSpecificMatch = navGroups
      .flatMap((g) => g.children)
      .concat(navItems)
      .some(
        (item) =>
          item.href !== href &&
          item.href.startsWith(href) &&
          pathname.startsWith(item.href)
      );
    return !isMoreSpecificMatch;
  }
  return false;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const set = new Set<string>();
    for (const g of navGroups) {
      if (g.children.some((c) => getIsActive(pathname, c.href))) {
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

  const isActive = (href: string) => getIsActive(pathname, href);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-white lg:flex">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-white shadow-sm shadow-primary/30">
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
            <div key={group.label} className="space-y-1">
              <button
                onClick={() => toggleGroup(group.label)}
                className={cn(
                  "group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  groupActive
                    ? "bg-gray-50 text-gray-900 font-semibold"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <span className="flex items-center gap-3">
                  <group.icon
                    className={cn(
                      "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
                      groupActive ? "text-primary" : "text-gray-400 group-hover:text-gray-600"
                    )}
                  />
                  {group.label}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-gray-400 transition-transform duration-250 ease-in-out",
                    isExpanded ? "rotate-0" : "-rotate-90"
                  )}
                />
              </button>
              
              <div
                className={cn(
                  "grid transition-all duration-300 ease-in-out overflow-hidden",
                  isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"
                )}
              >
                <div className="overflow-hidden">
                  <div className="ml-3 mt-0.5 space-y-0.5 border-l border-gray-200 pl-3 pb-1">
                    {group.children.map((child) => {
                      const childActive = isActive(child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                            childActive
                              ? "bg-primary text-white shadow-sm shadow-primary/20"
                              : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                          )}
                        >
                          <child.icon
                            className={cn(
                              "h-4 w-4 transition-transform duration-200 group-hover:scale-110",
                              childActive ? "text-white" : "text-gray-400 group-hover:text-gray-600"
                            )}
                          />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
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
                "group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-primary text-white shadow-sm shadow-primary/20"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <span className="flex items-center gap-3">
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
                    active ? "text-white" : "text-gray-400 group-hover:text-gray-600"
                  )}
                />
                {item.label}
              </span>
              {active && (
                <ChevronRight className="h-4 w-4 text-white/80 transition-transform duration-200 group-hover:translate-x-0.5" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <Link
          href="/"
          className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
        >
          <Store className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-transform duration-200 group-hover:scale-110" />
          Lihat Storefront
        </Link>
      </div>
    </aside>
  );
}
