import type { Metadata } from "next";
import { AdminDashboardView } from "@/components/panel/admin/AdminDashboardView";

export const metadata: Metadata = { title: "Dashboard" };

export default function AdminDashboardPage() {
  return <AdminDashboardView />;
}
