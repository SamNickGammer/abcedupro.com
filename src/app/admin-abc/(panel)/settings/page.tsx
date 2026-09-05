import type { Metadata } from "next";
import { requirePanelUser } from "@/lib/panel-session";
import { SettingsView } from "@/components/panel/admin/SettingsView";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requirePanelUser("admin");
  return <SettingsView username={user.branchCode} />;
}
