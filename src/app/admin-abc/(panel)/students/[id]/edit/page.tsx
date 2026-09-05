import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePanelUser } from "@/lib/panel-session";
import { findStudent } from "@/lib/students";
import { StudentForm } from "@/components/panel/students/StudentForm";
import { AadhaarCard } from "@/components/panel/admin/AadhaarCard";

export const metadata: Metadata = { title: "Edit Student" };
export const dynamic = "force-dynamic";

export default async function AdminEditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePanelUser("admin");
  const { id } = await params;

  const student = await findStudent(Number(id));
  if (!student) notFound();

  return (
    <div className="space-y-6">
      <StudentForm mode="edit" student={student} scope="admin" />
      {/* Aadhaar is the de-duplication key, so only head office may change it. */}
      <AadhaarCard student={student} />
    </div>
  );
}
