"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { api } from "@/lib/client";
import type { PanelUser } from "@/components/panel/PanelShell";

/**
 * Head-office chrome — the fixed dark bar and 240px sidebar from
 * resources/views/superadmin/layout/{header,content}.blade.php, section
 * headings, ordering and icons unchanged.
 */

const OVERVIEW = [
  {
    href: "/admin-abc",
    label: "Dashboard",
    exact: true,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z"
      />
    ),
  },
  {
    href: "/admin-abc/students",
    label: "All Students",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
      />
    ),
  },
  {
    href: "/admin-abc/library",
    label: "Library",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 17A2.5 2.5 0 004 19.5v0A2.5 2.5 0 006.5 22H20V4H6.5A2.5 2.5 0 004 6.5v13z"
      />
    ),
  },
];

const MANAGE = [
  {
    href: "/admin-abc/approvals",
    label: "Certificate Approvals",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
      />
    ),
  },
  {
    href: "/admin-abc/branches",
    label: "Branches",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    ),
  },
  {
    href: "/admin-abc/courses",
    label: "Courses",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    ),
  },
  {
    href: "/admin-abc/settings",
    label: "Settings",
    icon: (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M11.983 5.25c.687-1.35 2.347-1.35 3.034 0l.23.453a1.7 1.7 0 001.938.89l.5-.11c1.49-.328 2.664.846 2.336 2.336l-.11.5a1.7 1.7 0 00.89 1.938l.453.23c1.35.687 1.35 2.347 0 3.034l-.453.23a1.7 1.7 0 00-.89 1.938l.11.5c.328 1.49-.846 2.664-2.336 2.336l-.5-.11a1.7 1.7 0 00-1.938.89l-.23.453c-.687 1.35-2.347 1.35-3.034 0l-.23-.453a1.7 1.7 0 00-1.938-.89l-.5.11c-1.49.328-2.664-.846-2.336-2.336l.11-.5a1.7 1.7 0 00-.89-1.938l-.453-.23c-1.35-.687-1.35-2.347 0-3.034l.453-.23a1.7 1.7 0 00.89-1.938l-.11-.5c-.328-1.49.846-2.664 2.336-2.336l.5.11a1.7 1.7 0 001.938-.89l.23-.453z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </>
    ),
  },
];

export function SaShell({ user, children }: { user: PanelUser; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  async function logout() {
    setSigningOut(true);
    try {
      await api("/api/auth/logout", { method: "POST", noRedirect: true });
    } finally {
      router.replace("/admin-abc/login");
      router.refresh();
    }
  }

  const renderLink = (item: (typeof OVERVIEW)[number]) => (
    <Link
      key={item.href}
      href={item.href}
      className={`sa-link${isActive(item.href, item.exact) ? " active" : ""}`}
    >
      <svg className="sa-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {item.icon}
      </svg>
      {item.label}
    </Link>
  );

  return (
    <div className="sa-body">
      {/* The Blade panel refused to render below 768px; same here. */}
      <div className="sa-not-supported">
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1f2937" }}>Mobile Not Supported</h1>
        <p style={{ color: "#4b5563", marginTop: 8 }}>Please use a desktop browser.</p>
      </div>

      <div className="sa-header">
        <div className="sa-header-left">
          <Link href="/admin-abc" className="sa-header-logo">
            <Image
              src="/assets/images/logo/abc_logo.svg"
              alt="Institute of ABC"
              width={120}
              height={34}
              priority
            />
          </Link>
          <span className="sa-header-tag">Admin Panel</span>
        </div>

        <div className="sa-header-right">
          <span className="sa-header-name">{user.branchName}</span>
          <button type="button" className="sa-logout-btn" onClick={logout} disabled={signingOut}>
            <svg
              width={14}
              height={14}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            {signingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </div>

      <div style={{ paddingTop: 60 }}>
        <div style={{ display: "flex" }}>
          <aside className="sa-sidebar">
            <nav>
              <div className="sa-section-label">Overview</div>
              {OVERVIEW.map(renderLink)}

              <div className="sa-section-label">Manage</div>
              {MANAGE.map(renderLink)}
            </nav>
          </aside>

          <main className="sa-main-wrapper">
            <div className="sa-main-scroll">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
