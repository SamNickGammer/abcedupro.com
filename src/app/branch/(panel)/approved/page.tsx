import type { Metadata } from "next";
import { StudentsBrowser } from "@/components/panel/students/StudentsBrowser";

export const metadata: Metadata = { title: "Approved" };

export default function BranchApprovedPage() {
  return (
    <StudentsBrowser
      basePath="/branch/students"
      title="Approved certificates"
      description="Students whose certificates head office has approved. Their documents are ready to print."
    />
  );
}
