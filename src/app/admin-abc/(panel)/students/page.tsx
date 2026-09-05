import type { Metadata } from "next";
import { StudentsBrowser } from "@/components/panel/students/StudentsBrowser";

export const metadata: Metadata = { title: "All Students" };

export default function AdminStudentsPage() {
  return (
    <StudentsBrowser
      basePath="/admin-abc/students"
      showBranch
      title="All Students"
      description="Every student across every branch."
    />
  );
}
