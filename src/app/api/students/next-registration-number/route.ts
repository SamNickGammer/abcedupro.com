import { prisma } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { requireBranch } from "@/lib/auth";
import { nextRegistrationNumber } from "@/lib/domain";

export const runtime = "nodejs";

/**
 * Suggests the next registration number for the signed-in branch. It is only a
 * suggestion — the unique index on `registration_number` is what guarantees no
 * two students share one.
 */
export const GET = handler(async () => {
  const branch = await requireBranch();

  const existing = await prisma.student.findMany({
    where: { branchId: branch.id },
    select: { registrationNumber: true },
  });

  return ok("Next registration number generated.", {
    registration_number: nextRegistrationNumber(
      branch.branchCode,
      existing.map((row) => row.registrationNumber),
    ),
  });
});
