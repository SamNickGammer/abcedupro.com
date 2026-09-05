import { handler, ok } from "@/lib/api";
import { requireBranch } from "@/lib/auth";

export const runtime = "nodejs";

export const GET = handler(async () => {
  const branch = await requireBranch();

  return ok("Session active.", {
    branch_id: Number(branch.id),
    branchCode: branch.branchCode,
    branchName: branch.branchName,
    firstName: branch.firstName,
    lastName: branch.lastName,
    email: branch.emailId,
    phone: branch.phone,
    image: branch.image,
    addressLine1: branch.addressLine1,
    addressLine2: branch.addressLine2,
    city: branch.city,
    state: branch.state,
    zip: branch.zip,
    role: branch.role,
    isAdmin: branch.role.toLowerCase() === "admin",
    active: branch.active,
    credit: branch.credit,
    credit_per_certificate: branch.creditPerCertificate,
  });
});
