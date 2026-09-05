import type { Metadata } from "next";
import { ApprovalsView } from "@/components/panel/admin/ApprovalsView";

export const metadata: Metadata = { title: "Certificate Approvals" };

export default function ApprovalsPage() {
  return <ApprovalsView />;
}
