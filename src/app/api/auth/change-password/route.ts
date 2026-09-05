import { prisma } from "@/lib/db";
import { fail, handler, ok, parseBody, validationFailed } from "@/lib/api";
import { clearSessionCookie, hashPassword, requireBranch, verifyPassword } from "@/lib/auth";
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

  // Force a fresh sign-in so any other live session dies with the old password.
  await clearSessionCookie();

  return ok("Password changed successfully. Please sign in again.");
});
