import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePanelUser } from "@/lib/panel-session";
import { findStudent } from "@/lib/students";
import { SaStudentDetail } from "@/components/panel/sa/SaStudentDetail";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const student = await findStudent(Number(id));
  return { title: student ? student.student_name : "Student" };
}

export default async function AdminStudentPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePanelUser("admin");
  const { id } = await params;

  const student = await findStudent(Number(id));
  if (!student) notFound();

  return <SaStudentDetail student={student} />;
}
