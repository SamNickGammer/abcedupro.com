import type { Metadata } from "next";
import { SaBranches } from "@/components/panel/sa/SaBranches";

export const metadata: Metadata = { title: "Branches" };

export default function BranchesPage() {
  return <SaBranches />;
}
