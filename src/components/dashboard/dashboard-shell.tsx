"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/shared/wordmark";
import { navForRole } from "@/components/dashboard/nav-items";
import { signOut } from "@/lib/auth/actions";
import type { UserRole } from "@/types/database";

type StaffSummary = {
  fullName: string;
  role: UserRole;
};

export function DashboardShell({
  profile,
  children,
}: {
  profile: StaffSummary;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = navForRole(profile.role);

  return (
    <div className="flex min-h-full">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <SidebarBody profile={profile} nav={nav} />
      </aside>

      {/* Mobile slide-over */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-border bg-card shadow-xl">
            <div className="flex items-center justify-between px-5 py-4">
              <Wordmark size="sm" href="/dashboard" />
              <button
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarBody
              profile={profile}
              nav={nav}
              onNavigate={() => setMobileOpen(false)}
              hideHeader
            />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 lg:hidden">
          <button
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Wordmark size="sm" href="/dashboard" />
        </header>

        <main className="flex-1 px-5 py-8 sm:px-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

function SidebarBody({
  profile,
  nav,
  onNavigate,
  hideHeader,
}: {
  profile: StaffSummary;
  nav: ReturnType<typeof navForRole>;
  onNavigate?: () => void;
  hideHeader?: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      {!hideHeader ? (
        <div className="px-5 py-5">
          <Wordmark size="sm" href="/dashboard" />
        </div>
      ) : null}

      <nav aria-label="Dashboard" className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="flex flex-col gap-1">
          {nav.map((item) => {
            const active = item.available && pathname === item.href;
            const Icon = item.icon;

            if (!item.available) {
              return (
                <li key={item.href}>
                  <span className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/60">
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    <span className="flex-1">{item.label}</span>
                    <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-taupe">
                      Soon
                    </span>
                  </span>
                </li>
              );
            }

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-secondary",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary font-serif text-sm font-semibold text-primary">
            {initials(profile.fullName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{profile.fullName}</p>
            <p className="text-xs capitalize text-muted-foreground">{profile.role}</p>
          </div>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
