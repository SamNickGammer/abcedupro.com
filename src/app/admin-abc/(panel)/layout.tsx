import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requirePanelUser } from "@/lib/panel-session";
import { SaShell } from "@/components/panel/sa/SaShell";
import "@/components/panel/sa/sa.css";

export const metadata: Metadata = {
  title: { default: "Admin Panel - Institute of ABC", template: "%s - Institute of ABC" },
  robots: { index: false, follow: false },
};

/**
 * A route group, so `/admin-abc/login` sits at the same URL depth but outside
 * this layout — a signed-out visitor never renders the panel.
 */
export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const user = await requirePanelUser("admin");
  return <SaShell user={user}>{children}</SaShell>;
}
