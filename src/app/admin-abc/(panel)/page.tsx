import type { Metadata } from "next";
import { requirePanelUser } from "@/lib/panel-session";
import { SaDashboard } from "@/components/panel/sa/SaDashboard";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  // The name is already known server-side, so the greeting is in the first
  // paint rather than appearing after a round trip.
  const user = await requirePanelUser("admin");
  return <SaDashboard adminName={user.branchName} />;
}
