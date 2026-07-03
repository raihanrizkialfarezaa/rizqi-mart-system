"use client";

import { useAuth } from "@/lib/auth/AuthProvider";
import { Search, LogOut } from "lucide-react";
import NotificationDropdown from "./NotificationDropdown";

export default function Topbar({ title }: { title?: string }) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-gray-900">
          {title ?? "Dashboard"}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <input
            type="text"
            placeholder="Cari pesanan, produk..."
            className="w-64 rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>

        <NotificationDropdown />

        {user && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">{user.name}</span>
            <button
              onClick={() => logout()}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
