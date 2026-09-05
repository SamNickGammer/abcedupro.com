import type { Metadata } from "next";
import { BranchesView } from "@/components/panel/admin/BranchesView";

export const metadata: Metadata = { title: "Branches" };

export default function BranchesPage() {
  return <BranchesView />;
}
