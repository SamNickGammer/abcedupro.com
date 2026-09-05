import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePanelUser } from "@/lib/panel-session";
import { findStudent } from "@/lib/students";
import { StudentDetail } from "@/components/panel/students/StudentDetail";

export const metadata: Metadata = { title: "Student" };
export const dynamic = "force-dynamic";

export default async function BranchStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePanelUser("branch");
  const { id } = await params;

  const student = await findStudent(Number(id));

  // A branch only ever sees its own roll; anything else reads as "not found"
  // rather than confirming that a student id exists elsewhere.
  if (!student || student.branch_id !== user.branch_id) notFound();

  return <StudentDetail student={student} scope="branch" />;
}
