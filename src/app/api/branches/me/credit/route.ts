import { handler, ok } from "@/lib/api";
import { requireBranch } from "@/lib/auth";

export const runtime = "nodejs";

/** The signed-in branch's own balance — powers the header credit chip. */
export const GET = handler(async () => {
  const branch = await requireBranch();

  return ok("Branch credit retrieved successfully.", {
    branch_id: Number(branch.id),
    credit: branch.credit,
    credit_per_certificate: branch.creditPerCertificate,
  });
});
