"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, X, Clock, ExternalLink, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils/cn";

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

const typeLabels: Record<string, { label: string; className: string }> = {
  DELIVERY_DEADLINE_APPROACHING: {
    label: "Deadline Pengiriman",
    className: "bg-amber-50 text-amber-700 border-amber-100",
  },
  ORDER_STATUS_CHANGED: {
    label: "Status Pesanan",
    className: "bg-blue-50 text-blue-700 border-blue-100",
  },
  STOCK_ALERT: {
    label: "Stok Menipis",
    className: "bg-red-50 text-red-700 border-red-100",
  },
  PAYMENT_RECEIVED: {
    label: "Pembayaran Masuk",
    className: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
};

export default function NotificationDropdown() {
  const router = useRouter();
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

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const markAllAsRead = async () => {
    const unreads = notifications.filter((n) => !n.isRead);
    if (unreads.length === 0) return;
    
    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    
    try {
      await Promise.all(
        unreads.map((n) =>
          fetch(`/api/notifications/${n.id}`, { method: "PATCH" })
        )
      );
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors"
        title="Notifikasi"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 sm:w-[420px]">
          <div className="rounded-xl border border-gray-100 bg-white shadow-xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900">Notifikasi</h3>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {unreadCount} Baru
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                    title="Tandai semua dibaca"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span>Tandai dibaca</span>
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-primary" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="mx-auto h-8 w-8 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">Tidak ada notifikasi</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((n) => {
                    const targetLink = n.link || (n.relatedOrderId ? `/erp/orders/${n.relatedOrderId}` : null);
                    const typeBadge = typeLabels[n.type] || {
                      label: n.type.replace(/_/g, " "),
                      className: "bg-gray-50 text-gray-600 border-gray-150",
                    };

                    const handleItemClick = async () => {
                      if (!n.isRead) {
                        await markAsRead(n.id);
                      }
                      if (targetLink) {
                        setOpen(false);
                        router.push(targetLink);
                      }
                    };

                    return (
                      <div
                        key={n.id}
                        onClick={handleItemClick}
                        className={cn(
                          "flex items-start gap-3 px-4 py-3.5 transition-all duration-200 cursor-pointer select-none border-l-[3px]",
                          n.isRead
                            ? "bg-white border-transparent hover:bg-gray-50"
                            : "bg-primary/[0.015] border-primary hover:bg-primary/[0.035]"
                        )}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn(
                              "text-sm truncate",
                              n.isRead ? "text-gray-700 font-medium" : "text-gray-900 font-semibold"
                            )}>
                              {n.title}
                            </p>
                            {!n.isRead && (
                              <span className="h-2 w-2 rounded-full bg-primary shrink-0 animate-pulse" />
                            )}
                          </div>
                          <p className={cn(
                            "text-xs line-clamp-2",
                            n.isRead ? "text-gray-500" : "text-gray-600"
                          )}>
                            {n.message}
                          </p>
                          <div className="flex items-center flex-wrap gap-2 text-[10px] text-gray-400 pt-1">
                            <div className="flex items-center gap-1 font-medium">
                              <Clock className="h-3 w-3" />
                              <span>
                                {formatDistanceToNow(new Date(n.createdAt), {
                                  addSuffix: true,
                                  locale: id,
                                })}
                              </span>
                            </div>
                            <span className="text-gray-300">•</span>
                            <span className={cn("rounded border px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase", typeBadge.className)}>
                              {typeBadge.label}
                            </span>
                          </div>
                        </div>

                        {targetLink && (
                          <div className="flex shrink-0 self-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleItemClick();
                              }}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200/50 hover:text-primary transition-colors"
                              title="Buka detail"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t bg-gray-50/50 px-4 py-2.5 text-center">
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/erp/notifications"); // Fallback or direct to all notifications page
                }}
                className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
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
