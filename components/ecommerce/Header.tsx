"use client";

import Link from "next/link";
import { ShoppingCart, User, Search, Menu, X, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useState } from "react";
import { useCart } from "./CartContext";
import { useRouter } from "next/navigation";

export default function Header() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { cartCount } = useCart();
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      {/* Top bar */}
      <div className="border-b border-slate-100 bg-slate-50 py-1.5">
        <div className="page-container flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Gratis ongkir wilayah Mojokerto · Min. belanja Rp 50.000
          </span>
          <span className="text-[11px] text-slate-500">
            Layanan: 0812-3456-7890
          </span>
        </div>
      </div>

      {/* Main header */}
      <div className="page-container">
        <div className="flex h-16 items-center gap-6 md:h-18">
          {/* Logo */}
          <Link href="/" className="flex flex-shrink-0 items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
              R
            </div>
            <span className="text-[15px] font-semibold text-slate-900 tracking-tight">
              Rizqi Mart
            </span>
          </Link>

          {/* Search Bar — Desktop */}
          <form
            onSubmit={handleSearch}
            className="hidden flex-1 md:flex"
          >
            <div className="relative flex w-full max-w-xl items-center rounded-lg border border-slate-200 bg-slate-50 pr-1 transition-colors focus-within:border-slate-400 focus-within:bg-white focus-within:shadow-sm">
              <Search className="ml-3.5 h-4 w-4 flex-shrink-0 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari produk sembako..."
                className="flex-1 bg-transparent py-2.5 pl-2.5 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-md bg-slate-900 px-4 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-slate-700 active:scale-95"
              >
                Cari
              </button>
            </div>
          </form>

          {/* Actions — Desktop */}
          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/cart"
              className="relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <ShoppingCart className="h-[18px] w-[18px]" />
              <span>Keranjang</span>
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>

            {user ? (
              <>
                <Link
                  href="/orders"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  <User className="h-[18px] w-[18px]" />
                  <span>Pesanan</span>
                </Link>
                <div className="ml-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                  <div className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[13px] font-medium text-slate-700 max-w-[100px] truncate">
                    {user.name}
                  </span>
                  <button
                    onClick={() => logout()}
                    className="rounded p-0.5 text-slate-400 hover:text-slate-700 transition-colors"
                    title="Keluar"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <Link
                href="/erp"
                className="ml-1 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-slate-700 active:scale-95"
              >
                Admin Toko
              </Link>
            )}
          </nav>

          {/* Mobile: cart + hamburger */}
          <div className="ml-auto flex items-center gap-2 md:hidden">
            <Link href="/cart" className="relative p-2 text-slate-700">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute right-0 top-0 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-1 ring-white">
                  {cartCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-slate-700 transition-colors hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        <form onSubmit={handleSearch} className="pb-3 md:hidden">
          <div className="relative flex items-center rounded-lg border border-slate-200 bg-slate-50 pr-1 focus-within:border-slate-400 focus-within:bg-white">
            <Search className="ml-3 h-4 w-4 flex-shrink-0 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari produk..."
              className="flex-1 bg-transparent py-2 pl-2 pr-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white"
            >
              Cari
            </button>
          </div>
        </form>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-100 bg-white md:hidden">
          <nav className="page-container flex flex-col gap-1 py-4">
            <Link
              href="/products"
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              Katalog Produk
            </Link>
            <Link
              href="/cart"
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span>Keranjang Belanja</span>
              {cartCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
            {user ? (
              <>
                <Link
                  href="/orders"
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Pesanan Saya
                </Link>
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Keluar
                </button>
              </>
            ) : (
              <Link
                href="/erp"
                className="mt-2 rounded-lg bg-slate-900 px-4 py-2.5 text-center text-sm font-medium text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                Admin Toko
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
