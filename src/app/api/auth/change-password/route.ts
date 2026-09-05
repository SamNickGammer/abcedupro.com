import { prisma } from "@/lib/db";
import { fail, handler, ok, parseBody, validationFailed } from "@/lib/api";
import {
  endSession,
  hashPassword,
  requireBranch,
  revokeAllSessions,
  verifyPassword,
} from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

/** Changes the signed-in account's own password — never someone else's. */
export const POST = handler(async (request) => {
  const branch = await requireBranch();

  const parsed = await parseBody(request, changePasswordSchema);
  if (!parsed.success) return validationFailed(parsed.error);

  if (!verifyPassword(parsed.data.currentPassword, branch.password)) {
    return fail("Current password is incorrect.", 401);
  }

  await prisma.branch.update({
    where: { id: branch.id },
    data: { password: hashPassword(parsed.data.newPassword) },
  });

  // The point of changing a password is that whoever knew the old one is
  // locked out — which means every browser, not just this one.
  const revoked = await revokeAllSessions(branch.id);
  await endSession();

  return ok("Password changed successfully. Please sign in again.", undefined, {
    sessions_ended: revoked,
  });
});
