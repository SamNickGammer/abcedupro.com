import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requirePanelUser } from "@/lib/panel-session";
import { AdminShell } from "@/components/panel/AdminShell";

export const metadata: Metadata = {
  title: { default: "Head Office", template: "%s · Head Office" },
  robots: { index: false, follow: false },
};

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const user = await requirePanelUser("admin");
  return <AdminShell user={user}>{children}</AdminShell>;
}
