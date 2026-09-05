import { prisma } from "@/lib/db";
import { fail, handler, ok, parseBody, validationFailed, type RouteContext } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
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

  return ok("Branch status updated successfully.", {
    branch_id: Number(branchId),
    branch_code: branch.branchCode,
    active: parsed.data.active,
  });
});
