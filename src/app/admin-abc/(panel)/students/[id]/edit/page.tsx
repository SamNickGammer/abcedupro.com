import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePanelUser } from "@/lib/panel-session";
import { findStudent } from "@/lib/students";
import { SaEditStudent } from "@/components/panel/sa/SaEditStudent";

export const metadata: Metadata = { title: "Edit Student" };
export const dynamic = "force-dynamic";

export default async function AdminEditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePanelUser("admin");
  const { id } = await params;

  const student = await findStudent(Number(id));
  if (!student) notFound();

  return <SaEditStudent student={student} />;
}
