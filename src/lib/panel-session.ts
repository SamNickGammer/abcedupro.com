import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { PanelUser } from "@/components/panel/PanelShell";

/**
 * Server-side session for the panel layouts.
 *
 * The proxy already redirected anonymous visitors, so this is the second
 * check rather than the first — but it re-reads the branch row, which is what
 * makes a suspension or a role change take effect immediately.
 */
export async function requirePanelUser(portal: "branch" | "admin"): Promise<PanelUser> {
  const loginPath = portal === "admin" ? "/admin-abc/login" : "/branch/login";
  const session = await getSession();

  if (!session) redirect(loginPath);

  const branch = await prisma.branch.findUnique({
    where: { id: BigInt(session.branchId) },
    select: {
      id: true,
      branchCode: true,
      branchName: true,
      firstName: true,
      lastName: true,
      role: true,
      active: true,
      credit: true,
      creditPerCertificate: true,
    },
  });

  if (!branch || !branch.active) redirect(loginPath);

  const isAdmin = branch.role.toLowerCase() === "admin";

  if (portal === "admin" && !isAdmin) redirect("/branch");
  if (portal === "branch" && isAdmin) redirect("/admin-abc");

  return {
    branch_id: Number(branch.id),
    branchCode: branch.branchCode,
    branchName: branch.branchName,
    firstName: branch.firstName,
    lastName: branch.lastName,
    role: branch.role,
    isAdmin,
    credit: branch.credit,
    credit_per_certificate: branch.creditPerCertificate,
  };
}
