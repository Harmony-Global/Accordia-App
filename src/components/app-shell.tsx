"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, BriefcaseBusiness, CalendarDays, CheckCheck, Home, LogOut, Menu, Plus, Search, Send, Tags, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { BrandLockup } from "@/components/brand";
import { useAuth } from "@/hooks/use-auth";
import { getNotifications, markNotificationRead } from "@/services/notification-service";
import type { Notification } from "@/types";

let cachedUnreadNotifications: Notification[] = [];
const accordiaLogo = "/images/auth/figma/accordia-logo.png";

function navClass(isActive: boolean, variant: "default" | "primary" = "default") {
  if (variant === "primary") {
    return `rounded-md px-3 py-2 ${isActive ? "bg-brand text-white shadow-sm" : "bg-brand text-white hover:bg-[#125A73]"}`;
  }

  return `rounded-md px-3 py-2 ${isActive ? "bg-teal-50 font-semibold text-brand" : "text-ink hover:bg-slate-100"}`;
}

function withQuery(path: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function AppShell({
  children,
  variant = "default"
}: {
  children: React.ReactNode;
  variant?: "default" | "client-home";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, role, profile, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>(cachedUnreadNotifications);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuNotificationButtonRef = useRef<HTMLButtonElement>(null);
  const [notificationAnchor, setNotificationAnchor] = useState<"nav" | "menu">("nav");
  const [notificationPanelStyle, setNotificationPanelStyle] = useState<CSSProperties>({ right: 16, top: 88 });

  useEffect(() => {
    if (!token) {
      cachedUnreadNotifications = [];
      setNotifications([]);
      return;
    }

    let isMounted = true;
    const authToken = token;

    function loadNotifications() {
      getNotifications(authToken, true)
        .then((data) => {
          cachedUnreadNotifications = data.notifications;
          if (isMounted) setNotifications(data.notifications);
        })
        .catch(() => undefined);
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
    cachedUnreadNotifications = [];
    setNotifications([]);
    await Promise.allSettled(unreadIds.map((id) => markNotificationRead(token, id, true)));
  }

  function notificationHref(notification: Notification) {
    const jobId = typeof notification.data?.job_id === "string" ? notification.data.job_id : "";
    const conversationId = typeof notification.data?.conversation_id === "string" ? notification.data.conversation_id : "";
    const inquiryId = typeof notification.data?.inquiry_id === "string" ? notification.data.inquiry_id : "";
    const appointmentId = typeof notification.data?.appointment_id === "string" ? notification.data.appointment_id : "";
    const params = new URLSearchParams();

    if (jobId) params.set("job_id", jobId);
    if (conversationId) params.set("conversation_id", conversationId);
    if (inquiryId) params.set("inquiry_id", inquiryId);
    if (appointmentId) params.set("appointment_id", appointmentId);

    if (appointmentId && role === "client") {
      return withQuery("/client/appointments", params);
    }

    if (appointmentId && role === "professional") {
      return `/professional/appointments?${params.toString()}`;
    }

    if (inquiryId && role === "client") {
      return withQuery("/client/find-professionals", params);
    }

    if (inquiryId && role === "professional") {
      return `/professional/jobs?${params.toString()}`;
    }

    if (role === "client" && (conversationId || jobId)) {
      return withQuery("/client/my-requests", params);
    }

    if (role === "professional") {
      return conversationId ? `/professional/jobs?${params.toString()}` : "/professional/jobs";
    }

    return "/dashboard";
  }

  async function openNotification(notification: Notification) {
    if (token && !notification.is_read) {
      markNotificationRead(token, notification.id, true).catch(() => undefined);
      cachedUnreadNotifications = cachedUnreadNotifications.filter((item) => item.id !== notification.id);
      setNotifications((current) => current.filter((item) => item.id !== notification.id));
    }

    setNotificationsOpen(false);
    router.push(notificationHref(notification));
  }

  function updateNotificationPanelPosition(anchor = notificationAnchor) {
    const button = anchor === "menu" ? mobileMenuNotificationButtonRef.current : notificationButtonRef.current;
    const rect = button?.getBoundingClientRect();

    if (anchor === "menu" && window.innerWidth < 1024) {
      const top = 104;
      setNotificationPanelStyle({
        left: 16,
        right: 16,
        top,
        maxHeight: `calc(100vh - ${top + 16}px)`
      });
      return;
    }

    if (!rect || (rect.width === 0 && rect.height === 0)) {
      const top = 88;
      setNotificationPanelStyle({ left: 16, right: 16, top, maxHeight: `calc(100vh - ${top + 16}px)` });
      return;
    }

    const panelWidth = Math.min(380, window.innerWidth - 32);
    const top = rect.bottom + 8;
    const left = Math.min(Math.max(16, rect.right - panelWidth), window.innerWidth - panelWidth - 16);

    setNotificationPanelStyle({ left, top, width: panelWidth, maxHeight: `calc(100vh - ${top + 16}px)` });
  }

  function toggleNotifications() {
    if (notificationsOpen) {
      setNotificationsOpen(false);
      return;
    }

    setNotificationAnchor("nav");
    updateNotificationPanelPosition("nav");
    setNotificationsOpen(true);
  }

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!notificationsOpen) return;

    function handleResize() {
      updateNotificationPanelPosition();
    }

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [notificationsOpen]);

  const isClientShell = role === "client";
  const isProfessionalShell = role === "professional";
  const isModernShell = isClientShell || isProfessionalShell;
  const isClientHome = isClientShell && variant === "client-home";
  const displayName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : "Profile";
  const phoneStatus = profile?.phone_verified ? "Phone Verified" : "Phone Not Verified";

  const roleLinks = (
    <>
      {role === "professional" ? (
        <>
          <Link className={navClass(pathname.startsWith("/professional/jobs"))} href="/professional/jobs">
            Jobs
          </Link>
          <Link className={navClass(pathname.startsWith("/professional/appointments"))} href="/professional/appointments">
            Appointments
          </Link>
          <Link className={navClass(pathname.startsWith("/professional/categories"))} href="/professional/categories">
            Categories
          </Link>
        </>
      ) : null}
      {role === "client" ? (
        <>
          <Link className={navClass(pathname.startsWith("/client/my-requests"))} href="/client/my-requests">
            My Jobs
          </Link>
          <Link className={navClass(pathname.startsWith("/client/find-professionals"))} href="/client/find-professionals">
            Find Pros
          </Link>
          <Link className={navClass(pathname.startsWith("/client/appointments"))} href="/client/appointments">
            Appointments
          </Link>
          <Link className={navClass(pathname.startsWith("/client/create-request"), "primary")} href="/client/create-request">
            Post Job
          </Link>
        </>
      ) : null}
    </>
  );

  const notificationButton = (
    <button
      aria-label="Notifications"
      className={`relative grid h-10 w-10 shrink-0 place-items-center overflow-visible rounded-full border transition ${notificationsOpen ? "border-brand bg-teal-50 text-brand ring-2 ring-teal-100" : "border-line bg-white text-ink hover:border-brand"}`}
      onClick={toggleNotifications}
      ref={notificationButtonRef}
      type="button"
    >
      <Bell size={18} />
      {notifications.length > 0 ? (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white">
          {notifications.length > 9 ? "9+" : notifications.length}
        </span>
      ) : null}
    </button>
  );

  const profileButton = (
    <Link
      aria-label="Profile"
      className={`grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border transition ${pathname === "/profile" ? "border-brand bg-teal-50 text-brand ring-2 ring-teal-100" : "border-line bg-slate-100 text-brand hover:border-brand"}`}
      href="/profile"
    >
      {profile?.avatar_url ? (
        <img alt="" className="h-full w-full rounded-full object-cover" decoding="async" src={profile.avatar_url} />
      ) : (
        <UserRound size={18} />
      )}
    </Link>
  );

  function openNotificationsFromMenu() {
    setNotificationAnchor("menu");
    updateNotificationPanelPosition("menu");
    setNotificationsOpen(true);
  }

  const clientMenuLinks = [
    { href: "/dashboard", label: "Home", icon: Home, active: pathname === "/dashboard" },
    { href: "/client/my-requests", label: "My Requests", icon: Send, active: pathname.startsWith("/client/my-requests") },
    { href: "/client/find-professionals", label: "Find Professionals", icon: Search, active: pathname.startsWith("/client/find-professionals") },
    { href: "/client/appointments", label: "Appointments", icon: CalendarDays, active: pathname.startsWith("/client/appointments") }
  ];

  const professionalMenuLinks = [
    { href: "/dashboard", label: "Home", icon: Home, active: pathname === "/dashboard" },
    { href: "/professional/jobs", label: "Jobs", icon: BriefcaseBusiness, active: pathname.startsWith("/professional/jobs") },
    { href: "/professional/appointments", label: "Appointments", icon: CalendarDays, active: pathname.startsWith("/professional/appointments") },
    { href: "/professional/categories", label: "Categories", icon: Tags, active: pathname.startsWith("/professional/categories") }
  ];

  const modernMenuLinks = isProfessionalShell ? professionalMenuLinks : clientMenuLinks;
  const modernDesktopLinks = isProfessionalShell
    ? [
        { href: "/professional/jobs", label: "Jobs", active: pathname.startsWith("/professional/jobs") },
        { href: "/professional/appointments", label: "Appointments", active: pathname.startsWith("/professional/appointments") },
        { href: "/professional/categories", label: "Categories", active: pathname.startsWith("/professional/categories") }
      ]
    : [
        { href: "/client/my-requests", label: "My request", active: pathname.startsWith("/client/my-requests") },
        { href: "/client/find-professionals", label: "Find professionals", active: pathname.startsWith("/client/find-professionals") },
        { href: "/client/appointments", label: "Appointments", active: pathname.startsWith("/client/appointments") }
      ];

  const modernNav = isModernShell ? (
    <header className="relative z-40 bg-white shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-5 md:h-20 md:px-8 lg:h-20 lg:px-10 xl:px-0">
        <Link aria-label="Accordia home" className="relative block h-[42px] w-[115px] shrink-0 md:h-[48px] md:w-[132px]" href="/dashboard">
          <Image alt="Accordia" className="object-contain" fill priority sizes="132px" src={accordiaLogo} />
        </Link>

        <div className="flex items-center gap-2 lg:hidden">
          <button
            aria-expanded={mobileMenuOpen}
            aria-label="Open menu"
            className="grid h-11 w-11 place-items-center text-black"
            onClick={() => setMobileMenuOpen(true)}
            type="button"
          >
            <Menu size={24} strokeWidth={2.2} />
          </button>
        </div>

        <nav className="hidden items-center gap-6 text-[15px] leading-[1.5] text-[#5e5e5e] lg:flex">
          {modernDesktopLinks.map((item) => (
            <Link className={`transition hover:text-[#196c88] ${item.active ? "text-[#196c88]" : ""}`} href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
          <span className="inline-flex items-center justify-center">{notificationButton}</span>
          {isClientShell ? (
            <Link className="inline-flex h-11 items-center justify-center rounded-[5px] bg-[#196c88] px-4 text-[15px] leading-[1.5] text-white transition hover:bg-[#14566d]" href="/client/create-request">
              Create Request
            </Link>
          ) : null}
          <button className="inline-flex items-center gap-2 px-3 py-2 text-[#196c88] transition hover:text-[#14566d]" onClick={logout} type="button">
            <LogOut size={18} />
            Logout
          </button>
          {profileButton}
        </nav>
      </div>
    </header>
  ) : null;

  const modernMobileMenu = isModernShell && mobileMenuOpen ? (
    <div className="fixed inset-0 z-[70] bg-black/25 lg:hidden">
      <aside className="flex h-full w-full flex-col overflow-y-auto bg-white p-6 shadow-xl md:max-w-[520px]">
        <div className="flex items-center justify-between gap-4 px-2">
          <Link className="flex min-w-0 items-center gap-4" href="/profile">
            <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f2f6f8] text-[#196c88] md:h-[88px] md:w-[88px]">
              {profile?.avatar_url ? <img alt="" className="h-full w-full rounded-full object-cover" decoding="async" src={profile.avatar_url} /> : <UserRound size={34} strokeWidth={1.5} />}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[16px] leading-[1.5] text-[#5e5e5e]">{displayName}</span>
              <span className="block truncate text-[14px] font-medium leading-[1.5] text-[#a4a4a4]">{phoneStatus}</span>
            </span>
          </Link>
          <button aria-label="Close menu" className="grid h-11 w-11 shrink-0 place-items-center text-black" onClick={() => setMobileMenuOpen(false)} type="button">
            <X size={26} strokeWidth={1.8} />
          </button>
        </div>

        <div className="mt-6 h-px bg-[#a4a4a4]" />

        <nav className="mt-8 grid gap-6 px-2 text-[16px] leading-[1.5]">
          {modernMenuLinks.map((item) => {
            const Icon = item.icon;

            return (
              <Link className={`flex items-center gap-3 ${item.active ? "text-[#14566d]" : "text-[#5e5e5e]"}`} href={item.href} key={item.href}>
                {item.active ? <span className="h-5 w-1.5 bg-[#196c88]" /> : null}
                <Icon className="text-[#196c88]" size={24} strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
          <button className="flex items-center gap-3 text-left text-[#5e5e5e]" onClick={openNotificationsFromMenu} ref={mobileMenuNotificationButtonRef} type="button">
            <span className="flex items-center gap-3">
              <Bell className="text-[#196c88]" size={24} strokeWidth={1.5} />
              Notifications
              {notifications.length > 0 ? (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white">
                  {notifications.length > 9 ? "9+" : notifications.length}
                </span>
              ) : null}
            </span>
          </button>
        </nav>

        <div className="mt-auto grid gap-4 px-2 pb-4 text-[16px] leading-[1.5] text-[#5e5e5e]">
          {isClientShell ? (
            <>
              <Link className="flex items-center gap-3" href="/client/create-request">
                <Plus className="text-[#196c88]" size={24} strokeWidth={1.7} />
                Create Request
              </Link>
              <div className="h-px bg-[#a4a4a4]" />
            </>
          ) : null}
          <Link className="flex items-center gap-3" href="/profile">
            <UserRound className="text-[#196c88]" size={24} strokeWidth={1.5} />
            Profile
          </Link>
          <button className="flex items-center gap-3 text-left" onClick={logout} type="button">
            <LogOut className="text-[#196c88]" size={24} strokeWidth={1.5} />
            Logout
          </button>
        </div>
      </aside>
    </div>
  ) : null;

  if (isModernShell) {
    return (
      <div className="min-h-screen bg-[#fcfdfd]">
        {modernNav}
        {modernMobileMenu}
        {notificationsOpen ? (
          <>
            <button aria-label="Close notifications" className="fixed inset-0 z-[75] cursor-default bg-transparent" onClick={() => setNotificationsOpen(false)} type="button" />
            <div className="fixed z-[80] flex flex-col overflow-hidden rounded-lg border border-line bg-white shadow-xl" style={notificationPanelStyle}>
              <div className="flex items-center justify-between gap-3 border-b border-line p-3">
                <p className="font-semibold text-ink">Notifications</p>
                {notifications.length > 0 ? (
                  <button className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-brand hover:bg-teal-50" onClick={markAllRead} type="button">
                    <CheckCheck size={14} />
                    Mark read
                  </button>
                ) : null}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="p-4 text-sm text-muted">No unread notifications.</p>
                ) : notifications.map((notification) => (
                  <button
                    className="block w-full border-b border-line p-3 text-left transition hover:bg-slate-50 last:border-b-0"
                    key={notification.id}
                    onClick={() => openNotification(notification)}
                    type="button"
                  >
                    <p className="text-sm font-semibold text-ink">{notification.title ?? "Notification"}</p>
                    {notification.body ? <p className="mt-1 text-sm leading-5 text-muted">{notification.body}</p> : null}
                    <p className="mt-2 text-xs text-muted">{new Date(notification.created_at).toLocaleDateString()}</p>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : null}
        <main className={isClientHome ? "" : "mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 xl:px-0"}>{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fb]">
      <header className="relative z-40 border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <Link href="/dashboard" className="shrink-0 text-ink">
            <BrandLockup compact />
          </Link>
          <nav className="hidden items-center justify-end gap-2 overflow-visible text-sm md:flex">
            {roleLinks}
            {notificationButton}
            {profileButton}
            <button className="inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-muted hover:bg-slate-100" onClick={logout} type="button">
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            {notificationButton}
            {profileButton}
            <button
              aria-expanded={mobileMenuOpen}
              aria-label="Open menu"
              className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-ink hover:border-brand"
              onClick={() => setMobileMenuOpen((open) => !open)}
              type="button"
            >
              {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
        {mobileMenuOpen ? (
          <div className="mobile-menu-panel border-t border-line bg-white px-4 py-3 shadow-sm md:hidden">
            <nav className="mx-auto grid max-w-6xl gap-2 text-sm">
              {roleLinks}
              <button className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-left text-muted hover:bg-slate-100" onClick={logout} type="button">
                <LogOut size={16} />
                Logout
              </button>
            </nav>
          </div>
        ) : null}
      </header>
      {notificationsOpen ? (
        <>
          <button aria-label="Close notifications" className="fixed inset-0 z-[30] cursor-default bg-transparent" onClick={() => setNotificationsOpen(false)} type="button" />
          <div className="fixed z-[60] flex flex-col overflow-hidden rounded-lg border border-line bg-white shadow-xl" style={notificationPanelStyle}>
            <div className="flex items-center justify-between gap-3 border-b border-line p-3">
              <p className="font-semibold text-ink">Notifications</p>
              {notifications.length > 0 ? (
                <button className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-brand hover:bg-teal-50" onClick={markAllRead} type="button">
                  <CheckCheck size={14} />
                  Mark read
                </button>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="p-4 text-sm text-muted">No unread notifications.</p>
              ) : notifications.map((notification) => (
                <button
                  className="block w-full border-b border-line p-3 text-left transition hover:bg-slate-50 last:border-b-0"
                  key={notification.id}
                  onClick={() => openNotification(notification)}
                  type="button"
                >
                  <p className="text-sm font-semibold text-ink">{notification.title ?? "Notification"}</p>
                  {notification.body ? <p className="mt-1 text-sm leading-5 text-muted">{notification.body}</p> : null}
                  <p className="mt-2 text-xs text-muted">{new Date(notification.created_at).toLocaleDateString()}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
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


