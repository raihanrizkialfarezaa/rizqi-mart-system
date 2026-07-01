"use client";

import Link from "next/link";
import { ShoppingCart, User, Search, Menu, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useState } from "react";

export default function Header() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-bold">
              R
            </div>
            <span className="text-xl font-bold">Rizqi Mart</span>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Cari produk sembako..."
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-primary focus:outline-none"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Actions - Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/cart"
              className="flex items-center space-x-1 rounded-lg px-3 py-2 hover:bg-gray-100"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="text-sm font-medium">Keranjang</span>
            </Link>

            {user ? (
              <>
                <Link
                  href="/orders"
                  className="flex items-center space-x-1 rounded-lg px-3 py-2 hover:bg-gray-100"
                >
                  <User className="h-5 w-5" />
                  <span className="text-sm font-medium">Pesanan</span>
                </Link>
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                  <span className="text-sm font-medium">{user.name}</span>
                  <button
                    onClick={() => logout()}
                    className="rounded p-1 hover:bg-gray-100"
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/erp"
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  Masuk (Testing)
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden rounded-lg p-2 hover:bg-gray-100"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden py-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Cari produk..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-primary focus:outline-none"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-white px-4 py-4">
          <nav className="flex flex-col space-y-2">
            <Link
              href="/cart"
              className="flex items-center space-x-2 rounded-lg px-3 py-2 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(false)}
            >
              <ShoppingCart className="h-5 w-5" />
              <span>Keranjang</span>
            </Link>

            {user ? (
              <>
                <Link
                  href="/orders"
                  className="flex items-center space-x-2 rounded-lg px-3 py-2 hover:bg-gray-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-5 w-5" />
                  <span>Pesanan Saya</span>
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center space-x-2 rounded-lg px-3 py-2 text-left hover:bg-gray-100"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <Link
                href="/erp"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Masuk (Testing)
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
