"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/client";
import { cx } from "@/components/ui";

export type PanelUser = {
  branch_id: number;
  branchCode: string;
  branchName: string;
  firstName: string;
  lastName: string | null;
  role: string;
  isAdmin: boolean;
  credit: number;
  credit_per_certificate: number;
};

export type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  /** Match only this exact path, for section landing pages. */
  exact?: boolean;
};

/**
 * Sidebar-and-header chrome shared by the branch and head-office panels.
 * The sidebar is permanent from `lg` up and a drawer below it.
 */
export function PanelShell({
  user,
  nav,
  portalLabel,
  children,
  headerExtra,
}: {
  user: PanelUser;
  nav: NavItem[];
  portalLabel: string;
  children: ReactNode;
  headerExtra?: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  async function signOut() {
    setSigningOut(true);
    try {
      await api("/api/auth/logout", { method: "POST", noRedirect: true });
    } finally {
      router.replace(user.isAdmin ? "/admin-abc/login" : "/branch/login");
      router.refresh();
    }
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-white/10 px-5">
        <Image
          src="/assets/images/logo/abc_logo.svg"
          alt=""
          width={110}
          height={34}
          className="h-8 w-auto brightness-0 invert"
        />
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45">
          {portalLabel}
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item) ? "page" : undefined}
            className={cx(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
              isActive(item)
                ? "bg-white/[0.14] font-semibold text-white"
                : "text-white/65 hover:bg-white/[0.07] hover:text-white",
            )}
          >
            <span className="shrink-0 [&>svg]:h-[18px] [&>svg]:w-[18px]">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <div className="rounded-xl bg-white/[0.06] px-3 py-2.5">
          <p className="truncate text-sm font-semibold text-white">{user.branchName}</p>
          <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wider text-white/45">
            {user.branchCode}
          </p>
        </div>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/60 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-50"
        >
          <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.6}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-100">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 bg-[#15171a] lg:block">{sidebar}</aside>

      <div
        onClick={() => setDrawerOpen(false)}
        className={cx(
          "fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden",
          drawerOpen ? "visible opacity-100" : "invisible opacity-0",
        )}
      />
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-50 w-60 bg-[#15171a] transition-transform duration-300 lg:hidden",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {sidebar}
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-black/[0.07] bg-white/90 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="-ml-1 rounded-lg p-2 text-neutral-600 transition hover:bg-neutral-100 lg:hidden"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-800">
            {nav.find((item) => isActive(item))?.label ?? portalLabel}
          </p>

          {headerExtra}
        </header>

        <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </div>
    </div>
  );
}
