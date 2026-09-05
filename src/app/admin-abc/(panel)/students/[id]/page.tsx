import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePanelUser } from "@/lib/panel-session";
import { findStudent } from "@/lib/students";
import { StudentDetail } from "@/components/panel/students/StudentDetail";

export const metadata: Metadata = { title: "Student" };
export const dynamic = "force-dynamic";

export default async function AdminStudentPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePanelUser("admin");
  const { id } = await params;

  const student = await findStudent(Number(id));
  if (!student) notFound();

  return <StudentDetail student={student} scope="admin" />;
}
