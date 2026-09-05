"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_LEFT, NAV_RIGHT, SITE, SOCIALS } from "@/lib/site-config";
import { cx } from "@/components/ui";

/**
 * Fixed two-tier navigation: a dark contact strip that retracts on scroll, and
 * the main bar with the logo centred between two link groups. Below 1000px both
 * groups collapse into a drawer.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Route changes close the drawer; otherwise it stays open over the new page.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const isActive = (href: string) => {
    const base = href.split("?")[0];
    return base === "/" ? pathname === "/" : pathname.startsWith(base);
  };

  return (
    <>
      <header
        className={cx(
          "fixed inset-x-0 top-0 z-50 transition-shadow duration-300",
          scrolled && "shadow-[0_4px_30px_rgba(0,0,0,0.08)]",
        )}
      >
        {/* Contact strip — slides away once you start reading. */}
        <div
          className="hidden overflow-hidden bg-ink text-white transition-[margin] duration-300 1000:block"
          style={{ marginTop: scrolled ? "-34px" : 0 }}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-10 py-1.5 text-xs">
            <div className="flex items-center gap-3.5">
              {SOCIALS.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  aria-label={social.name}
                  className="opacity-85 transition hover:opacity-100"
                >
                  <Image
                    src={social.icon}
                    alt=""
                    width={14}
                    height={14}
                    className="brightness-0 invert"
                  />
                </a>
              ))}
            </div>

            <div className="flex items-center gap-6 whitespace-nowrap">
              <a href={SITE.phoneHref} className="flex items-center gap-1.5 opacity-85 hover:opacity-100">
                <Image src="/assets/icons/phone-small.svg" alt="" width={13} height={13} className="brightness-0 invert" />
                {SITE.phone}
              </a>
              <a href={SITE.emailHref} className="flex items-center gap-1.5 opacity-85 hover:opacity-100">
                <Image src="/assets/icons/mail.svg" alt="" width={13} height={13} className="brightness-0 invert" />
                {SITE.email}
              </a>
              <span className="flex items-center gap-1.5 opacity-85">
                <Image src="/assets/icons/globe.svg" alt="" width={13} height={13} className="brightness-0 invert" />
                {SITE.location}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/branch/login"
                className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-[11px] font-semibold transition hover:bg-white/25"
              >
                Branch Portal
              </Link>
              <Link
                href="/student_info"
                className="rounded-full bg-white px-3.5 py-1 text-[11px] font-semibold text-ink transition hover:bg-neutral-200"
              >
                Student Portal
              </Link>
            </div>
          </div>
        </div>

        <div className="border-b border-black/[0.06] bg-white/92 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-5 1000:h-[72px] 1000:px-10">
            <nav className="hidden items-center gap-1.5 1000:flex">
              {NAV_LEFT.map((item) =>
                "children" in item && item.children ? (
                  <div key={item.label} className="group relative">
                    <Link href={item.href} className={navLinkClass(isActive(item.href))}>
                      {item.label}
                      <Chevron className="ml-0.5 h-3.5 w-3.5 transition group-hover:rotate-180" />
                    </Link>
                    <div className="invisible absolute left-1/2 top-full z-50 w-60 -translate-x-1/2 translate-y-2 rounded-2xl bg-white p-2 opacity-0 shadow-[0_12px_40px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.04)] transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                      {item.children.map((child) => (
                        <Link
                          key={child.label}
                          href={child.href}
                          className="block rounded-lg px-3.5 py-2.5 text-sm text-neutral-700 transition hover:bg-neutral-100 hover:text-ink"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link key={item.label} href={item.href} className={navLinkClass(isActive(item.href))}>
                    {item.label}
                  </Link>
                ),
              )}
            </nav>

            <Link href="/" className="shrink-0" aria-label={SITE.name}>
              <Image
                src="/assets/images/logo/abc_logo.svg"
                alt={SITE.name}
                width={160}
                height={48}
                priority
                className="h-10 w-auto 1000:h-12"
              />
            </Link>

            <nav className="hidden items-center gap-1.5 1000:flex">
              {NAV_RIGHT.map((item) => (
                <Link key={item.label} href={item.href} className={navLinkClass(isActive(item.href))}>
                  {item.label}
                </Link>
              ))}
            </nav>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              aria-expanded={drawerOpen}
              className="rounded-lg p-2 transition hover:bg-neutral-100 1000:hidden"
            >
              <svg className="h-6 w-6" fill="none" stroke="#374151" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        onClick={() => setDrawerOpen(false)}
        className={cx(
          "fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 1000:hidden",
          drawerOpen ? "visible opacity-100" : "invisible opacity-0",
        )}
      />
      <div
        className={cx(
          "fixed inset-y-0 right-0 z-[61] flex w-[300px] max-w-[85vw] flex-col overflow-y-auto bg-white transition-transform duration-300 1000:hidden",
          drawerOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-5">
          <Image src="/assets/images/logo/abc_logo.svg" alt="" width={120} height={36} className="h-9 w-auto" />
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100"
          >
            <svg className="h-4 w-4" fill="none" stroke="#374151" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 p-4">
          {[...NAV_LEFT, ...NAV_RIGHT].map((item) =>
            "children" in item && item.children ? (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenAccordion((current) => (current === item.label ? null : item.label))
                  }
                  className="flex w-full items-center justify-between rounded-xl px-3 py-3.5 text-base text-neutral-700 transition hover:bg-neutral-100"
                >
                  {item.label}
                  <Chevron
                    className={cx(
                      "h-4 w-4 transition-transform",
                      openAccordion === item.label && "rotate-180",
                    )}
                  />
                </button>
                <div
                  className={cx(
                    "overflow-hidden transition-[max-height] duration-300",
                    openAccordion === item.label ? "max-h-52" : "max-h-0",
                  )}
                >
                  {item.children.map((child) => (
                    <Link
                      key={child.label}
                      href={child.href}
                      className="block rounded-lg py-2.5 pl-7 pr-3 text-sm text-neutral-500 transition hover:bg-neutral-50 hover:text-ink"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link
                key={item.label}
                href={item.href}
                className={cx(
                  "block rounded-xl px-3 py-3.5 text-base transition hover:bg-neutral-100",
                  isActive(item.href) ? "bg-neutral-100 font-semibold text-ink" : "text-neutral-700",
                )}
              >
                {item.label}
              </Link>
            ),
          )}
        </div>

        <div className="flex flex-col gap-2.5 border-t border-neutral-100 px-6 py-4">
          <Link
            href="/branch/login"
            className="rounded-xl bg-neutral-100 py-3 text-center text-sm font-semibold text-neutral-700"
          >
            Branch Portal
          </Link>
          <Link
            href="/student_info"
            className="rounded-xl bg-ink py-3 text-center text-sm font-semibold text-white"
          >
            Student Portal
          </Link>
        </div>
      </div>
    </>
  );
}

function navLinkClass(active: boolean) {
  return cx(
    "relative flex items-center rounded-lg px-4 py-2 text-[15px] transition",
    active
      ? "font-bold text-ink after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:rounded-full after:bg-ink"
      : "text-neutral-700 hover:bg-neutral-100 hover:text-ink",
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
