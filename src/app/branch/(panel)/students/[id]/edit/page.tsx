import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePanelUser } from "@/lib/panel-session";
import { findStudent } from "@/lib/students";
import { StudentForm } from "@/components/panel/students/StudentForm";

export const metadata: Metadata = { title: "Edit Student" };
export const dynamic = "force-dynamic";

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePanelUser("branch");
  const { id } = await params;

  const student = await findStudent(Number(id));
  if (!student || student.branch_id !== user.branch_id) notFound();

  return <StudentForm mode="edit" student={student} />;
}
