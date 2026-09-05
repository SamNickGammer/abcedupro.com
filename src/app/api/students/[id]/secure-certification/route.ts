import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { fail, handler, ok, parseBody, validationFailed, type RouteContext } from "@/lib/api";
import { requireAdmin, verifyPassword } from "@/lib/auth";
import { calculateMarksheetSummary, toDateOnly } from "@/lib/domain";
import { presentStudent, studentInclude } from "@/lib/students";
import { secureCertificationSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

/**
 * Amends an already-issued certificate. Because the document is in circulation
 * this is the one write that re-asks for the admin's password even inside an
 * authenticated session.
 */
export const POST = handler(async (request, context: RouteContext) => {
  const admin = await requireAdmin();

  const { id } = await context.params;
  const parsed = await parseBody(request, secureCertificationSchema);
  if (!parsed.success) return validationFailed(parsed.error);

  const data = parsed.data;

  if (!verifyPassword(data.password, admin.password)) {
    return fail("Wrong password.", 401);
  }

  const student = await prisma.student.findUnique({
    where: { studentId: BigInt(id) },
    select: { studentId: true },
  });

  if (!student) return fail("Student not found.", 404);

  const update: Prisma.StudentUpdateInput = {};

  if (data.marksheet_id !== undefined) update.marksheetId = data.marksheet_id;
  if (data.certified_date !== undefined) {
    update.certifiedDate = data.certified_date ? toDateOnly(data.certified_date) : null;
  }

  if (data.marks) {
    try {
      const summary = calculateMarksheetSummary(data.marks);
      update.marks = JSON.stringify(summary.marks);
      update.overallPercent = new Prisma.Decimal(summary.overallPercent);
      update.performance = summary.performance;
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Invalid marks data.", 422);
    }
  }

  if (Object.keys(update).length === 0) {
    return fail("No changes were provided.", 422);
  }

  try {
    const updated = await prisma.student.update({
      where: { studentId: student.studentId },
      data: update,
      include: studentInclude,
    });

    return ok("Certification data updated successfully.", presentStudent(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("That marksheet number is already in use.", 409);
    }
    throw error;
  }
});
