import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requirePanelUser } from "@/lib/panel-session";
import { BranchShell } from "@/components/panel/BranchShell";

export const metadata: Metadata = {
  title: { default: "Branch Panel", template: "%s · Branch Panel" },
  robots: { index: false, follow: false },
};

/**
 * A route group, so `/branch/login` sits at the same URL depth but outside this
 * layout — a signed-out visitor never renders the shell.
 */
export default async function BranchPanelLayout({ children }: { children: ReactNode }) {
  const user = await requirePanelUser("branch");
  return <BranchShell user={user}>{children}</BranchShell>;
}
