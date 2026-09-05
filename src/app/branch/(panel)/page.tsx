import type { Metadata } from "next";
import { BranchDashboardView } from "@/components/panel/branch/BranchDashboardView";

export const metadata: Metadata = { title: "Dashboard" };

export default function BranchDashboardPage() {
  return <BranchDashboardView />;
}
