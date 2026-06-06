"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";
import { BrandLockup } from "@/components/brand";
import { useAuth } from "@/hooks/use-auth";

function navClass(isActive: boolean, variant: "default" | "primary" = "default") {
  if (variant === "primary") {
    return `rounded-md px-3 py-2 ${isActive ? "bg-brand text-white shadow-sm" : "bg-brand text-white hover:bg-[#125A73]"}`;
  }

  return `rounded-md px-3 py-2 ${isActive ? "bg-teal-50 font-semibold text-brand" : "text-ink hover:bg-slate-100"}`;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { role, profile, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#f7f8fb]">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/dashboard" className="text-ink">
            <BrandLockup compact />
          </Link>
          <nav className="flex items-center gap-2 text-sm">
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
            <Link className={`inline-flex items-center gap-2 rounded-md px-3 py-2 ${pathname === "/profile" ? "bg-teal-50 font-semibold text-brand" : "text-ink hover:bg-slate-100"}`} href="/profile">
              <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-slate-100 text-xs font-bold text-brand">
                {profile?.avatar_url ? (
                  <img alt="" className="h-full w-full object-cover" src={profile.avatar_url} />
                ) : (
                  <UserRound size={16} />
                )}
              </span>
              Profile
            </Link>
            <button className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-muted hover:bg-slate-100" onClick={logout} type="button">
              <LogOut size={16} />
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
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
