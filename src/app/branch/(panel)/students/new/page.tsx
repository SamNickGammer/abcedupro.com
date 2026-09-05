import type { Metadata } from "next";
import { StudentForm } from "@/components/panel/students/StudentForm";

export const metadata: Metadata = { title: "Enrol Student" };

export default function NewStudentPage() {
  return <StudentForm mode="create" />;
}
