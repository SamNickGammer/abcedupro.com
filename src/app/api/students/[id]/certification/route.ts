import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { fail, handler, ok, parseBody, validationFailed, type RouteContext } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { toDateOnly, nextMarksheetId } from "@/lib/domain";
import { presentStudent, studentInclude } from "@/lib/students";
import { certificationSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

/**
 * Head office approves a pending marksheet: it gets a marksheet number, a
 * certified date, and moves to `verified` — which is what unlocks the
 * certificate and marksheet PDFs.
 *
 * The legacy version allowed this for a hard-coded list of branch ids
 * (`[0, 1, 10]`) as well as admins, so three franchises could approve their own
 * certificates. Approval is admin-only here.
 */
export const POST = handler(async (request, context: RouteContext) => {
  await requireAdmin();

  const { id } = await context.params;
  const parsed = await parseBody(request, certificationSchema);
  if (!parsed.success) return validationFailed(parsed.error);

  const student = await prisma.student.findUnique({
    where: { studentId: BigInt(id) },
    select: { studentId: true, marksheetStage: true, marks: true, marksheetId: true },
  });

  if (!student) return fail("Student not found.", 404);

  if (student.marksheetStage !== "pending" || !student.marks) {
    return fail("Only a student with a submitted marksheet can be certified.", 409);
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // Allocating the number inside the transaction keeps the global sequence
      // gapless when two approvals land at the same moment; the unique index on
      // marksheet_id is the backstop.
      const marksheetId =
        parsed.data.marksheet_id ??
        student.marksheetId ??
        nextMarksheetId(
          (
            await tx.student.findFirst({
              where: { marksheetId: { not: null } },
              orderBy: { marksheetId: "desc" },
              select: { marksheetId: true },
            })
          )?.marksheetId,
        );

      return tx.student.update({
        where: { studentId: student.studentId },
        data: {
          certifiedDate: toDateOnly(parsed.data.certified_date),
          isCertificateApprove: true,
          marksheetId,
          marksheetStage: "verified",
        },
        include: studentInclude,
      });
    });

    return ok("Student certification approved.", presentStudent(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("That marksheet number is already in use.", 409);
    }
    throw error;
  }
});
