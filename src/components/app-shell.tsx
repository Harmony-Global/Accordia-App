"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CheckCheck, LogOut, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandLockup } from "@/components/brand";
import { useAuth } from "@/hooks/use-auth";
import { getNotifications, markNotificationRead } from "@/services/notification-service";
import type { Notification } from "@/types";

function navClass(isActive: boolean, variant: "default" | "primary" = "default") {
  if (variant === "primary") {
    return `rounded-md px-3 py-2 ${isActive ? "bg-brand text-white shadow-sm" : "bg-brand text-white hover:bg-[#125A73]"}`;
  }

  return `rounded-md px-3 py-2 ${isActive ? "bg-teal-50 font-semibold text-brand" : "text-ink hover:bg-slate-100"}`;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { token, role, profile, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    const authToken = token;

    function loadNotifications() {
      getNotifications(authToken, true)
        .then((data) => {
          if (isMounted) setNotifications(data.notifications);
        })
        .catch(() => {
          if (isMounted) setNotifications([]);
        });
    }

    loadNotifications();
    const timer = window.setInterval(loadNotifications, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, [token]);

  async function markAllRead() {
    if (!token) return;
    const unreadIds = notifications.filter((notification) => !notification.is_read).map((notification) => notification.id);
    setNotifications([]);
    await Promise.allSettled(unreadIds.map((id) => markNotificationRead(token, id, true)));
  }

  return (
    <div className="min-h-screen bg-[#f7f8fb]">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <Link href="/dashboard" className="shrink-0 text-ink">
            <BrandLockup compact />
          </Link>
          <nav className="-mx-1 flex max-w-full flex-1 items-center justify-end gap-2 overflow-x-auto px-1 text-sm sm:flex-none">
            {role === "professional" ? (
              <>
                <Link className={navClass(pathname.startsWith("/professional/jobs"))} href="/professional/jobs">
                  Jobs
                </Link>
                <Link className={navClass(pathname.startsWith("/professional/categories"))} href="/professional/categories">
                  Categories
                </Link>
              </>
            ) : null}
            {role === "client" ? (
              <>
                <Link className={navClass(pathname === "/client/jobs")} href="/client/jobs">
                  My Jobs
                </Link>
                <Link className={navClass(pathname.startsWith("/client/jobs/new"), "primary")} href="/client/jobs/new">
                  Post Job
                </Link>
              </>
            ) : null}
            <div className="relative">
              <button
                aria-label="Notifications"
                className={`relative grid h-10 w-10 place-items-center rounded-full border transition ${notificationsOpen ? "border-brand bg-teal-50 text-brand ring-2 ring-teal-100" : "border-line bg-white text-ink hover:border-brand"}`}
                onClick={() => setNotificationsOpen((open) => !open)}
                type="button"
              >
                <Bell size={18} />
                {notifications.length > 0 ? (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
                    {notifications.length}
                  </span>
                ) : null}
              </button>
              {notificationsOpen ? (
                <div className="fixed right-4 top-20 z-40 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-line bg-white shadow-xl">
                  <div className="flex items-center justify-between gap-3 border-b border-line p-3">
                    <p className="font-semibold text-ink">Notifications</p>
                    {notifications.length > 0 ? (
                      <button className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-brand hover:bg-teal-50" onClick={markAllRead} type="button">
                        <CheckCheck size={14} />
                        Mark read
                      </button>
                    ) : null}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-sm text-muted">No unread notifications.</p>
                    ) : notifications.map((notification) => (
                      <div className="border-b border-line p-3 last:border-b-0" key={notification.id}>
                        <p className="text-sm font-semibold text-ink">{notification.title ?? "Notification"}</p>
                        {notification.body ? <p className="mt-1 text-sm leading-5 text-muted">{notification.body}</p> : null}
                        <p className="mt-2 text-xs text-muted">{new Date(notification.created_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <Link
              aria-label="Profile"
              className={`grid h-10 w-10 place-items-center overflow-hidden rounded-full border transition ${pathname === "/profile" ? "border-brand bg-teal-50 text-brand ring-2 ring-teal-100" : "border-line bg-slate-100 text-brand hover:border-brand"}`}
              href="/profile"
            >
              {profile?.avatar_url ? (
                <img alt="" className="h-full w-full rounded-full object-cover" src={profile.avatar_url} />
              ) : (
                <UserRound size={18} />
              )}
            </Link>
            <button className="inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-muted hover:bg-slate-100" onClick={logout} type="button">
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-5 sm:py-8">{children}</main>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center">
      <UserRound className="mx-auto mb-3 text-muted" size={28} />
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}
