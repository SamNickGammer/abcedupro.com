import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePanelUser } from "@/lib/panel-session";
import { findStudent } from "@/lib/students";
import { MarksForm } from "@/components/panel/marks/MarksForm";

export const metadata: Metadata = { title: "Enter Marks" };
export const dynamic = "force-dynamic";

export default async function BranchMarksPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePanelUser("branch");
  const { id } = await params;

  const student = await findStudent(Number(id));
  if (!student || student.branch_id !== user.branch_id) notFound();

  return (
    <MarksForm
      student={student}
      credit={user.credit}
      creditPerCertificate={user.credit_per_certificate}
    />
  );
}
