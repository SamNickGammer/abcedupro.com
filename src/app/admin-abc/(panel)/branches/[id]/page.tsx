import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePanelUser } from "@/lib/panel-session";
import { prisma } from "@/lib/db";
import { BranchDetail } from "@/components/panel/admin/BranchDetail";

export const metadata: Metadata = { title: "Branch" };
export const dynamic = "force-dynamic";

export default async function BranchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePanelUser("admin");
  const { id } = await params;

  const branchId = Number(id);
  if (!Number.isInteger(branchId) || branchId <= 0) notFound();

  const branch = await prisma.branch.findUnique({
    where: { id: BigInt(branchId) },
    select: {
      id: true,
      branchCode: true,
      branchName: true,
      firstName: true,
      lastName: true,
      phone: true,
      emailId: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      zip: true,
      role: true,
      active: true,
      credit: true,
      creditPerCertificate: true,
      centerCreationDate: true,
    },
  });

  if (!branch) notFound();

  const [total, pending, certified, charges] = await Promise.all([
    prisma.student.count({ where: { branchId: branch.id } }),
    prisma.student.count({ where: { branchId: branch.id, marksheetStage: "pending" } }),
    prisma.student.count({ where: { branchId: branch.id, isCertificateApprove: true } }),
    prisma.certificateCharge.findMany({
      where: { branchId: branch.id },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, amount: true, reason: true, createdAt: true },
    }),
  ]);

  return (
    <BranchDetail
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
        role: branch.role,
        active: branch.active,
        credit: branch.credit,
        creditPerCertificate: branch.creditPerCertificate,
        centerCreationDate: branch.centerCreationDate.toISOString().slice(0, 10),
      }}
      stats={{ total, pending, certified }}
      charges={charges.map((charge) => ({
        id: Number(charge.id),
        amount: charge.amount,
        reason: charge.reason,
        createdAt: charge.createdAt.toISOString(),
      }))}
    />
  );
}
