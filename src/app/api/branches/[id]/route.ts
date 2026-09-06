import { prisma } from "@/lib/db";
import { fail, handler, ok, parseBody, validationFailed, type RouteContext } from "@/lib/api";
import { requireBranch } from "@/lib/auth";
import { AuthError, HttpError } from "@/lib/errors";
import { uploadImage, resolvePhotoUrl } from "@/lib/storage";
import { updateBranchSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

/** A branch may read and edit itself; an admin may read and edit anyone. */
async function authorise(idParam: string) {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError("Invalid branch id.", 400);

  const caller = await requireBranch();
  const isAdmin = caller.role.toLowerCase() === "admin";

  if (!isAdmin && Number(caller.id) !== id) {
    throw new AuthError("Unauthorized.", 403);
  }

  return { id: BigInt(id), caller, isAdmin };
}

export const GET = handler(async (_request, context: RouteContext) => {
  const { id } = await context.params;
  const auth = await authorise(id);

  const branch = await prisma.branch.findUnique({
    where: { id: auth.id },
    select: {
      id: true,
      branchCode: true,
      branchName: true,
      firstName: true,
      lastName: true,
      phone: true,
      emailId: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      zip: true,
      image: true,
      role: true,
      active: true,
      credit: true,
      creditPerCertificate: true,
      centerCreationDate: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { students: true } },
    },
  });

  if (!branch) return fail("Branch not found.", 404);

  const [certified, pending] = await Promise.all([
    prisma.student.count({ where: { branchId: auth.id, isCertificateApprove: true } }),
    prisma.student.count({ where: { branchId: auth.id, marksheetStage: "pending" } }),
  ]);

  return ok("Branch details fetched successfully.", {
    ...branch,
    imageUrl: resolvePhotoUrl(branch.image),
    total_students: branch._count.students,
    certified_students: certified,
    pending_students: pending,
  });
});

export const PATCH = handler(async (request, context: RouteContext) => {
  const { id } = await context.params;
  const auth = await authorise(id);

  const parsed = await parseBody(request, updateBranchSchema);
  if (!parsed.success) return validationFailed(parsed.error);

  const data = parsed.data;

  const branch = await prisma.branch.findUnique({ where: { id: auth.id } });
  if (!branch) return fail("Branch not found.", 404);

  // Only head office moves the certificate price; a branch editing itself
  // must not be able to make its own certificates free.
  const creditPerCertificate =
    auth.isAdmin && data.credit_per_certificate != null
      ? data.credit_per_certificate
      : undefined;

  let image: string | undefined;
  if (data.manager_photo) {
    image = (await uploadImage(data.manager_photo, "manager", branch.id)).key;
  }

  const updated = await prisma.branch.update({
    where: { id: auth.id },
    data: {
      firstName: data.first_name ?? undefined,
      lastName: data.last_name ?? undefined,
      addressLine1: data.address_line1 ?? undefined,
      addressLine2: data.address_line2 ?? undefined,
      city: data.city ?? undefined,
      state: data.state ?? undefined,
      zip: data.zip ?? undefined,
      phone: data.phone ?? undefined,
      emailId: data.email_id ?? undefined,
      creditPerCertificate,
      image,
    },
    select: {
      id: true,
      branchCode: true,
      branchName: true,
      firstName: true,
      lastName: true,
      phone: true,
      emailId: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      zip: true,
      image: true,
      role: true,
      active: true,
      credit: true,
      creditPerCertificate: true,
    },
  });

  return ok("Branch updated successfully.", updated);
});
