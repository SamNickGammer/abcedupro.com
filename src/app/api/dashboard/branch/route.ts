import { prisma } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { requireBranch } from "@/lib/auth";
import { presentStudent, studentInclude } from "@/lib/students";

export const runtime = "nodejs";

export const GET = handler(async () => {
  const branch = await requireBranch();
  const scope = { branchId: branch.id };

  const [total, pending, verified, certified, active, recent] = await Promise.all([
    prisma.student.count({ where: scope }),
    prisma.student.count({ where: { ...scope, marksheetStage: "pending" } }),
    prisma.student.count({ where: { ...scope, marksheetStage: "verified" } }),
    prisma.student.count({ where: { ...scope, isCertificateApprove: true } }),
    prisma.student.count({ where: { ...scope, isStudentActive: true } }),
    prisma.student.findMany({
      where: scope,
      include: studentInclude,
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
  ]);

  return ok("Dashboard summary retrieved successfully.", {
    stats: {
      total_students: total,
      pending_students: pending,
      verified_students: verified,
      certified_students: certified,
      active_students: active,
      credit: branch.credit,
      credit_per_certificate: branch.creditPerCertificate,
      certificates_affordable: Math.floor(
        branch.credit / Math.max(1, branch.creditPerCertificate),
      ),
    },
    branch: {
      branch_id: Number(branch.id),
      branch_code: branch.branchCode,
      branch_name: branch.branchName,
      city: branch.city,
      state: branch.state,
    },
    recent_students: recent.map(presentStudent),
  });
});
