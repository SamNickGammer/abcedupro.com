import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePanelUser } from "@/lib/panel-session";
import { prisma } from "@/lib/db";
import { findStudent } from "@/lib/students";
import { MarksForm } from "@/components/panel/marks/MarksForm";

export const metadata: Metadata = { title: "Marks" };
export const dynamic = "force-dynamic";

/**
 * Head office can enter marks on a branch's behalf. The charge still lands on
 * that branch's balance, which is why the credit figures come from the
 * student's branch rather than from the signed-in admin.
 */
export default async function AdminMarksPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePanelUser("admin");
  const { id } = await params;

  const student = await findStudent(Number(id));
  if (!student) notFound();

  const branch = await prisma.branch.findUnique({
    where: { id: BigInt(student.branch_id) },
    select: { credit: true, creditPerCertificate: true },
  });

  return (
    <MarksForm
      student={student}
      credit={branch?.credit ?? 0}
      creditPerCertificate={branch?.creditPerCertificate ?? 200}
      scope="admin"
    />
  );
}
