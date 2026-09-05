import type { Metadata } from "next";
import { BranchForm } from "@/components/panel/admin/BranchForm";

export const metadata: Metadata = { title: "New Branch" };

export default function NewBranchPage() {
  return <BranchForm />;
}
