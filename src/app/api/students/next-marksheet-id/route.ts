import { prisma } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { requireBranch } from "@/lib/auth";
import { nextMarksheetId } from "@/lib/domain";

export const runtime = "nodejs";

/** Marksheet numbers are one global sequence across every branch. */
export const GET = handler(async () => {
  await requireBranch();

  const last = await prisma.student.findFirst({
    where: { marksheetId: { not: null } },
    orderBy: { marksheetId: "desc" },
    select: { marksheetId: true },
  });

  return ok("Next marksheet number generated.", {
    marksheet_id: nextMarksheetId(last?.marksheetId),
  });
});
