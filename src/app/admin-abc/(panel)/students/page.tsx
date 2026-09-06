import type { Metadata } from "next";
import { SaStudents } from "@/components/panel/sa/SaStudents";

export const metadata: Metadata = { title: "All Students" };

export default function AdminStudentsPage() {
  return <SaStudents />;
}
