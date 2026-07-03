"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, X, Clock, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  priority: string;
  isRead: boolean;
  createdAt: string;
  relatedOrderId: string | null;
};

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((json) => setNotifications(json.data || []))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100"
        title="Notifikasi"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 sm:w-96">
          <div className="rounded-xl border bg-white shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Notifikasi</h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell className="mx-auto h-8 w-8 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">Tidak ada notifikasi</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {notifications.map((n) => {
                    const targetLink = n.link || (n.relatedOrderId ? `/erp/orders/${n.relatedOrderId}` : null);
                    return (
                      <li key={n.id} className="px-4 py-3 transition-colors hover:bg-gray-50">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {n.title}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                              {n.message}
                            </p>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400">
                              <Clock className="h-3 w-3" />
                              <span>
                                {formatDistanceToNow(new Date(n.createdAt), {
                                  addSuffix: true,
                                  locale: id,
                                })}
                              </span>
                              <span className="text-gray-300">|</span>
                              <span>{n.type}</span>
                            </div>
                          </div>
                          {targetLink && (
                            <a
                              href={targetLink}
                              className="mt-0.5 shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-primary"
                              title="Buka tautan"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="border-t px-4 py-2.5 text-center">
              <button
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-primary hover:text-primary/80"
              >
                Lihat semua notifikasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
