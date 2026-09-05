import { prisma } from "@/lib/db";
import { fail, handler, ok, parseBody, validationFailed, type RouteContext } from "@/lib/api";
import { hashPassword, requireAdmin, revokeAllSessions } from "@/lib/auth";
import { setBranchPasswordSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

/**
 * Head office sets a branch's password directly. The old API also had a
 * `reset_password` endpoint that generated a random one and returned it in
 * clear; this covers both — the admin either types a password or asks the UI
 * to generate one, and the value is shown once and never persisted in clear.
 */
export const POST = handler(async (request, context: RouteContext) => {
  await requireAdmin();

  const { id } = await context.params;
  const parsed = await parseBody(request, setBranchPasswordSchema);
  if (!parsed.success) return validationFailed(parsed.error);

  const branch = await prisma.branch.findUnique({ where: { id: BigInt(id) } });
  if (!branch) return fail("Branch not found.", 404);

  await prisma.branch.update({
    where: { id: branch.id },
    data: { password: hashPassword(parsed.data.new_password) },
  });

  // Otherwise whoever knew the old password keeps a working session.
  const revoked = await revokeAllSessions(branch.id);

  return ok("Password updated successfully.", {
    branch_code: branch.branchCode,
    sessions_ended: revoked,
  });
});
