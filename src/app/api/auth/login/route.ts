import { prisma } from "@/lib/db";
import { fail, handler, ok, parseBody, validationFailed } from "@/lib/api";
import {
  assertLoginAllowed,
  recordLoginAttempt,
  startSession,
  verifyPassword,
} from "@/lib/auth";
import { loginSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export const POST = handler(async (request) => {
  const parsed = await parseBody(request, loginSchema);
  if (!parsed.success) return validationFailed(parsed.error);

  const { branchCode, password, portal } = parsed.data;
  const identifier = branchCode.trim().toLowerCase();

  // Throws 429 once this branch code has collected too many recent failures.
  await assertLoginAllowed(identifier);

  // Branch codes are matched case-insensitively, as the legacy LOWER() did.
  const branch = await prisma.branch.findFirst({
    where: { branchCode: { equals: branchCode.trim(), mode: "insensitive" } },
  });

  // One message for both "no such branch" and "wrong password". The old API
  // answered 404 vs 401, which let anyone enumerate valid branch codes.
  if (!branch || !verifyPassword(password, branch.password)) {
    await recordLoginAttempt(identifier, false);
    return fail("Invalid credentials.", 401);
  }

  const isAdmin =
    branch.branchCode.toLowerCase() === "admin" || branch.role.toLowerCase() === "admin";

  // A refusal below is not a credential failure, so it is not counted towards
  // the lockout — the password was right, the door was wrong.
  if (portal === "superadmin" && !isAdmin) {
    return fail("Only an admin account can sign in from the superadmin portal.", 403);
  }

  if (portal === "branch" && isAdmin) {
    return fail("Admin accounts sign in from the superadmin portal.", 403, {
      redirect_url: "/admin-abc/login",
    });
  }

  if (!branch.active) {
    return fail("This branch is not active. Please contact the administrator.", 403);
  }

  await recordLoginAttempt(identifier, true);
  await startSession(branch);

  return ok("Login successful.", {
    branch_id: Number(branch.id),
    email: branch.emailId,
    branchCode: branch.branchCode,
    branchName: branch.branchName,
    image: branch.image,
    firstName: branch.firstName,
    lastName: branch.lastName,
    state: branch.state,
    city: branch.city,
    zip: branch.zip,
    addressLine1: branch.addressLine1,
    addressLine2: branch.addressLine2,
    role: branch.role,
    active: branch.active,
    isAdmin,
    redirect_url: isAdmin ? "/admin-abc" : "/branch",
  });
});
