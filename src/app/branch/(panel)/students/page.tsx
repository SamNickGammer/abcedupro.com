import type { Metadata } from "next";
import { StudentsBrowser } from "@/components/panel/students/StudentsBrowser";

export const metadata: Metadata = { title: "All Students" };

export default function BranchStudentsPage() {
  return (
    <StudentsBrowser
      basePath="/branch/students"
      title="All Students"
      description="Everyone enrolled at this centre."
    />
  );
}
