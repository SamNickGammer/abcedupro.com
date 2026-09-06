import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePanelUser } from "@/lib/panel-session";
import { prisma } from "@/lib/db";
import { resolvePhotoUrl } from "@/lib/storage";
import { SaBranchDetail } from "@/components/panel/sa/SaBranchDetail";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const branch = await prisma.branch
    .findUnique({ where: { id: BigInt(id) }, select: { branchName: true } })
    .catch(() => null);
  return { title: branch?.branchName ?? "Branch" };
}

export default async function BranchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePanelUser("admin");

  const { id } = await params;
  const branchId = Number(id);
  if (!Number.isInteger(branchId) || branchId <= 0) notFound();

  const branch = await prisma.branch.findUnique({ where: { id: BigInt(branchId) } });
  if (!branch) notFound();

  // Counted here rather than fetched by the client, so the stat cards are in
  // the first paint instead of arriving a round trip later.
  const [total, certified, pending] = await Promise.all([
    prisma.student.count({ where: { branchId: branch.id } }),
    prisma.student.count({ where: { branchId: branch.id, isCertificateApprove: true } }),
    prisma.student.count({ where: { branchId: branch.id, marksheetStage: "pending" } }),
  ]);

  return (
    <SaBranchDetail
      branch={{
        id: Number(branch.id),
        branchCode: branch.branchCode,
        branchName: branch.branchName,
        firstName: branch.firstName,
        lastName: branch.lastName,
        phone: branch.phone,
        emailId: branch.emailId,
        addressLine1: branch.addressLine1,
        addressLine2: branch.addressLine2,
        city: branch.city,
        state: branch.state,
        zip: branch.zip,
        image: branch.image,
        imageUrl: resolvePhotoUrl(branch.image),
        role: branch.role,
        active: branch.active,
        credit: branch.credit,
        creditPerCertificate: branch.creditPerCertificate,
        centerCreationDate: branch.centerCreationDate.toISOString().slice(0, 10),
        createdAt: branch.createdAt.toISOString(),
        totalStudents: total,
        certifiedStudents: certified,
        pendingStudents: pending,
      }}
    />
  );
}
