import { prisma } from "@/lib/db";
import { fail, handler, ok, parseBody, parseQuery, validationFailed } from "@/lib/api";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { uploadImage, storageConfigured } from "@/lib/storage";
import { createBranchSchema, listBranchesSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

const BRANCH_LIST_SELECT = {
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
} as const;

export const GET = handler(async (request) => {
  await requireAdmin();

  const parsed = parseQuery(request, listBranchesSchema);
  if (!parsed.success) return validationFailed(parsed.error);

  const branches = await prisma.branch.findMany({
    where: parsed.data.showActiveOnly ? { active: true } : undefined,
    select: BRANCH_LIST_SELECT,
    orderBy: { branchCode: "asc" },
  });

  return ok("Branches fetched successfully.", branches);
});

export const POST = handler(async (request) => {
  await requireAdmin();

  const parsed = await parseBody(request, createBranchSchema);
  if (!parsed.success) return validationFailed(parsed.error);

  const data = parsed.data;

  const existing = await prisma.branch.findFirst({
    where: { branchCode: { equals: data.branch_code, mode: "insensitive" } },
    select: { id: true },
  });

  if (existing) {
    return fail("A branch with this code already exists.", 409);
  }

  // The legacy code hard-coded "123456789" for every new branch. Here the admin
  // sets it, and the generated fallback is random rather than guessable.
  const initialPassword = data.initial_password ?? randomPassword(12);

  const branch = await prisma.branch.create({
    data: {
      phone: data.phone,
      emailId: data.email_id,
      branchCode: data.branch_code,
      branchName: data.branch_name,
      addressLine1: data.address_line1,
      addressLine2: data.address_line2 ?? null,
      city: data.city,
      state: data.state,
      zip: data.zip,
      firstName: data.first_name,
      lastName: data.last_name ?? null,
      active: true,
      password: hashPassword(initialPassword),
      credit: data.credit,
      creditPerCertificate: data.credit_per_certificate,
    },
    select: BRANCH_LIST_SELECT,
  });

  let image: string | null = null;

  if (data.manager_photo && storageConfigured()) {
    const uploaded = await uploadImage(data.manager_photo, "manager", branch.id);
    image = uploaded.url;
    await prisma.branch.update({ where: { id: branch.id }, data: { image } });
  }

  return ok(
    "Branch created successfully.",
    { ...branch, image },
    // Shown once, so the admin can hand it over. It is never stored in clear.
    { initial_password: initialPassword },
    201,
  );
});

function randomPassword(length: number) {
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}
