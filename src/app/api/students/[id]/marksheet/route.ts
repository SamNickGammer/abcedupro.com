import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { fail, handler, ok, parseBody, validationFailed, type RouteContext } from "@/lib/api";
import { requireBranch } from "@/lib/auth";
import { AuthError, HttpError } from "@/lib/errors";
import { calculateMarksheetSummary, parseSubjects } from "@/lib/domain";
import { presentStudent, studentInclude } from "@/lib/students";
import { marksheetSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

/**
 * Enters marks and moves the student to `pending`, awaiting head-office
 * approval. The first marksheet for a student costs the branch credits; later
 * corrections are free, so a typo does not cost money to fix.
 */
export const POST = handler(async (request, context: RouteContext) => {
  const caller = await requireBranch();
  const { id } = await context.params;

  const parsed = await parseBody(request, marksheetSchema);
  if (!parsed.success) return validationFailed(parsed.error);

  const student = await prisma.student.findUnique({
    where: { studentId: BigInt(id) },
    include: studentInclude,
  });

  if (!student) throw new HttpError("Student not found.", 404);

  const isAdmin = caller.role.toLowerCase() === "admin";
  if (!isAdmin && student.branchId !== caller.id) {
    throw new AuthError("Unauthorized access to student data.", 403);
  }

  if (student.marksheetStage === "verified") {
    return fail(
      "This marksheet is already verified. Ask head office to amend it.",
      409,
    );
  }

  let summary;
  try {
    summary = calculateMarksheetSummary(parsed.data.marks);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid marks data.", 422);
  }

  // Only subjects the course actually defines may be scored, so the marksheet
  // template and the stored marks can never drift apart.
  const allowed = parseSubjects(student.course.subjects);
  const unknown = Object.keys(summary.marks).filter((subject) => !allowed.includes(subject));

  if (allowed.length > 0 && unknown.length > 0) {
    return fail(
      `Unknown subject(s) for this course: ${unknown.join(", ")}. Expected: ${allowed.join(", ")}.`,
      422,
    );
  }

  const isFirstMarksheet = !student.marks;
  const charge = isFirstMarksheet ? student.branch.creditPerCertificate ?? 200 : 0;

  const result = await prisma.$transaction(async (tx) => {
    if (charge > 0) {
      // A conditional UPDATE is the guard against two concurrent submissions
      // both passing a read-then-check and overdrawing the balance.
      const debited = await tx.branch.updateMany({
        where: { id: student.branchId, credit: { gte: charge } },
        data: { credit: { decrement: charge } },
      });

      if (debited.count === 0) {
        const branch = await tx.branch.findUnique({
          where: { id: student.branchId },
          select: { credit: true },
        });

        return {
          insufficient: true as const,
          credit: branch?.credit ?? 0,
          charge,
        };
      }

      await tx.certificateCharge.create({
        data: {
          branchId: student.branchId,
          studentId: student.studentId,
          amount: charge,
          reason: `Marksheet created for ${student.registrationNumber}`,
        },
      });
    }

    const updated = await tx.student.update({
      where: { studentId: student.studentId },
      data: {
        marks: JSON.stringify(summary.marks),
        overallPercent: new Prisma.Decimal(summary.overallPercent),
        performance: summary.performance,
        marksheetStage: "pending",
      },
      include: studentInclude,
    });

    return { insufficient: false as const, updated, charge };
  });

  if (result.insufficient) {
    return fail(
      `Insufficient credit. This marksheet costs ${result.charge} credits but the branch has ${result.credit}.`,
      402,
      { insufficient_credit: true, credit: result.credit, charge: result.charge },
    );
  }

  const branch = await prisma.branch.findUnique({
    where: { id: student.branchId },
    select: { credit: true },
  });

  return ok("Marksheet saved and sent for approval.", presentStudent(result.updated), {
    credit_deducted: result.charge,
    remaining_credit: branch?.credit ?? 0,
  });
});
