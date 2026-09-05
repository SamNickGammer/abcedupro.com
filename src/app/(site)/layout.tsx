import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteMain } from "@/components/site/SiteMain";

/**
 * The public site shell, matching welcome.blade.php: a fixed header, the page,
 * then the footer. Every route except the home page is offset by 110px to
 * clear the header — the same `pt-[110px]` the Blade layout applied.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <SiteMain>{children}</SiteMain>
      <SiteFooter />
    </>
  );
}
