"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, AlertCircle, Clock, Package, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatNotificationText } from "@/lib/utils/notification";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  priority: string;
  isRead: boolean;
  createdAt: string;
};

const PRIORITY_TAGS: Record<string, { label: string; textClass: string; bgClass: string }> = {
  URGENT: { label: "Urgent", textClass: "text-red-700 border-red-200 bg-red-50", bgClass: "border-red-200 bg-red-50" },
  HIGH: { label: "Tinggi", textClass: "text-amber-700 border-amber-200 bg-amber-50", bgClass: "border-amber-200 bg-amber-50" },
  MEDIUM: { label: "Medium", textClass: "text-primary border-primary/20 bg-primary/5", bgClass: "border-primary/20 bg-primary/5" },
  LOW: { label: "Rendah", textClass: "text-gray-500 border-gray-200 bg-gray-50", bgClass: "border-gray-200 bg-gray-50" },
};

const ICONS: Record<string, React.ElementType> = {
  ORDER_STATUS_CHANGED: Package,
  SOURCING_DEADLINE_APPROACHING: Clock,
  DELIVERY_DEADLINE_APPROACHING: Clock,
  SOURCING_DEADLINE_PASSED: AlertCircle,
  DELIVERY_DEADLINE_PASSED: AlertCircle,
};

export default function PortalNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?dapurIdentityId=current");
      const json = await res.json();
      setNotifications(json.data || []);
    } catch {}
    setLoading(false);
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }

  async function handleClick(notification: Notification) {
    if (!notification.isRead) {
      await markRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.push("/portal/dashboard")} className="rounded-lg p-1.5 text-gray-400 active:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Notifikasi</h1>
          {unreadCount > 0 && (
            <p className="text-xs text-gray-500">{unreadCount} belum dibaca</p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-2 h-4 w-3/4 rounded bg-gray-200" />
              <div className="h-3 w-1/2 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center">
          <Bell className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-400">Belum ada notifikasi</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const Icon = ICONS[notification.type] || Bell;
            const tag = PRIORITY_TAGS[notification.priority] || PRIORITY_TAGS.MEDIUM;
            const { title: displayTitle, message: displayMessage } = formatNotificationText(notification.title, notification.message);
            return (
              <button
                key={notification.id}
                onClick={() => handleClick(notification)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:bg-gray-50/50",
                  !notification.isRead && "border-primary/30 bg-primary/[0.02]"
                )}
              >
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-500",
                  !notification.isRead && "bg-primary/5 border-primary/10 text-primary"
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <p className={cn(
                        "text-sm font-semibold",
                        notification.isRead ? "text-gray-600" : "text-gray-900"
                      )}>
                        {displayTitle}
                      </p>
                      {!notification.isRead && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider",
                      tag.textClass
                    )}>
                      {tag.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-600 leading-relaxed">{displayMessage}</p>
                  <p className="mt-2 text-[10px] text-gray-400 font-medium">
                    {new Date(notification.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-lg">
          <button onClick={() => router.push("/portal/dashboard")} className="flex flex-1 flex-col items-center py-2 text-gray-400">
            <Package className="h-5 w-5" />
            <span className="mt-0.5 text-xs">Beranda</span>
          </button>
          <button onClick={() => router.push("/portal/orders")} className="flex flex-1 flex-col items-center py-2 text-gray-400">
            <CheckCircle className="h-5 w-5" />
            <span className="mt-0.5 text-xs">Pesanan</span>
          </button>
          <button className="flex flex-1 flex-col items-center py-2 text-primary">
            <Bell className="h-5 w-5" />
            <span className="mt-0.5 text-xs font-medium">Notif</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
