import { prisma } from "@/lib/db";
import { fail, handler, ok, parseBody, validationFailed, type RouteContext } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { addCreditSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export const POST = handler(async (request, context: RouteContext) => {
  await requireAdmin();

  const { id } = await context.params;
  const parsed = await parseBody(request, addCreditSchema);
  if (!parsed.success) return validationFailed(parsed.error);

  const branch = await prisma.branch.findUnique({ where: { id: BigInt(id) } });
  if (!branch) return fail("Branch not found.", 404);

  // `increment` is an atomic UPDATE … SET credit = credit + n, so two admins
  // topping up at once cannot overwrite each other's addition.
  const updated = await prisma.branch.update({
    where: { id: branch.id },
    data: { credit: { increment: Math.round(parsed.data.credit_to_add) } },
    select: { id: true, credit: true },
  });

  return ok("Credit added successfully.", {
    branch_id: Number(updated.id),
    new_credit: updated.credit,
  });
});
