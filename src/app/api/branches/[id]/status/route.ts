import { prisma } from "@/lib/db";
import { fail, handler, ok, parseBody, validationFailed, type RouteContext } from "@/lib/api";
import { requireAdmin, revokeAllSessions } from "@/lib/auth";
import { branchStatusSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export const POST = handler(async (request, context: RouteContext) => {
  const admin = await requireAdmin();
  const { id } = await context.params;
  const branchId = BigInt(id);

  if (branchId === admin.id) {
    return fail("You cannot suspend your own account.", 400);
  }

  const parsed = await parseBody(request, branchStatusSchema);
  if (!parsed.success) return validationFailed(parsed.error);

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) return fail("Branch not found.", 404);

  await prisma.branch.update({
    where: { id: branchId },
    data: { active: parsed.data.active },
  });

  // requireBranch would refuse them anyway, but dropping the rows ends the
  // session outright rather than leaving a cookie that merely gets rejected.
  const revoked = parsed.data.active ? 0 : await revokeAllSessions(branchId);

  return ok("Branch status updated successfully.", {
    branch_id: Number(branchId),
    branch_code: branch.branchCode,
    active: parsed.data.active,
    sessions_ended: revoked,
  });
});
