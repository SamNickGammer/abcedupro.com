import { prisma } from "@/lib/db";
import { requireBranch } from "@/lib/auth";
import { AuthError, HttpError } from "@/lib/errors";

/**
 * A certificate or marksheet is visible to the branch that issued it and to
 * head office — nobody else.
 *
 * The Laravel version served both PDFs to anyone who could put a student id in
 * a query string, with no session of any kind.
 */
export async function authoriseDocumentAccess(studentId: number) {
  const caller = await requireBranch();

  if (caller.role.toLowerCase() === "admin") return caller;

  const student = await prisma.student.findUnique({
    where: { studentId: BigInt(studentId) },
    select: { branchId: true },
  });

  if (!student) throw new HttpError("Student not found.", 404);
  if (student.branchId !== caller.id) throw new AuthError("Unauthorized.", 403);

  return caller;
}
