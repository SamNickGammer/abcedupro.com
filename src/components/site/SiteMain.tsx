"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * The home page's hero deliberately sits under the fixed header; every other
 * page is pushed clear of it. Mirrors welcome.blade.php:
 *   Route::currentRouteName() !== 'home' ? 'pt-[110px]' : ''
 */
export function SiteMain({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return <div style={isHome ? undefined : { paddingTop: 110 }}>{children}</div>;
}
