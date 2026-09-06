import { prisma } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { presentStudent, studentInclude } from "@/lib/students";

export const runtime = "nodejs";

export const GET = handler(async () => {
  await requireAdmin();

  const [total, pending, certified, coursesCount, recent, branches] = await Promise.all([
    prisma.student.count(),
    prisma.student.count({ where: { marksheetStage: "pending" } }),
    prisma.student.count({ where: { isCertificateApprove: true } }),
    prisma.course.count(),
    // Deliberately still updated_at: this panel answers "what changed
    // recently", not "who enrolled recently".
    prisma.student.findMany({
      include: studentInclude,
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    prisma.branch.findMany({
      where: { NOT: { role: "admin" } },
      select: {
        id: true,
        branchCode: true,
        branchName: true,
        city: true,
        state: true,
        credit: true,
        creditPerCertificate: true,
        active: true,
        role: true,
        _count: { select: { students: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return ok("Dashboard summary retrieved successfully.", {
    stats: {
      total_students: total,
      pending_students: pending,
      certified_students: certified,
      total_branches: branches.length,
      active_branches: branches.filter((branch) => branch.active).length,
      total_courses: coursesCount,
    },
    recent_students: recent.map(presentStudent),
    branches: branches.map((branch) => ({
      id: Number(branch.id),
      branch_code: branch.branchCode,
      branch_name: branch.branchName,
      city: branch.city,
      state: branch.state,
      credit: branch.credit,
      credit_per_certificate: branch.creditPerCertificate,
      active: branch.active,
      role: branch.role,
      total_students: branch._count.students,
    })),
  });
});
