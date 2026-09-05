import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { fail, handler, ok, parseBody, validationFailed, type RouteContext } from "@/lib/api";
import { requireBranch, type AuthedBranch } from "@/lib/auth";
import { AuthError, HttpError } from "@/lib/errors";
import { storageConfigured, uploadImage } from "@/lib/storage";
import { calculateRelievingDate, toDateOnly } from "@/lib/domain";
import { presentStudent, studentInclude } from "@/lib/students";
import { updateStudentSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

/**
 * Loads the student and proves the caller is allowed to see them. A branch is
 * confined to its own roll; head office sees everyone.
 *
 * The Laravel version accepted the branch id from the request body, so any
 * caller could read any student by guessing a number.
 */
async function loadStudent(idParam: string, caller: AuthedBranch) {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError("Invalid student id.", 400);

  const student = await prisma.student.findUnique({
    where: { studentId: BigInt(id) },
    include: studentInclude,
  });

  if (!student) throw new HttpError("Student not found.", 404);

  const isAdmin = caller.role.toLowerCase() === "admin";

  if (!isAdmin && student.branchId !== caller.id) {
    throw new AuthError("Unauthorized access to student data.", 403);
  }

  return { student, isAdmin };
}

export const GET = handler(async (_request, context: RouteContext) => {
  const caller = await requireBranch();
  const { id } = await context.params;
  const { student } = await loadStudent(id, caller);

  return ok("Student retrieved successfully.", presentStudent(student));
});

export const PATCH = handler(async (request, context: RouteContext) => {
  const caller = await requireBranch();
  const { id } = await context.params;
  const { student, isAdmin } = await loadStudent(id, caller);

  const parsed = await parseBody(request, updateStudentSchema);
  if (!parsed.success) return validationFailed(parsed.error);

  const data = parsed.data;

  // Once head office has approved the certificate the record is the basis of a
  // document in circulation, so a branch can no longer edit it. Admin still can.
  if (student.isCertificateApprove && !isAdmin) {
    return fail(
      "This student's certificate has been approved and can no longer be edited by a branch.",
      403,
    );
  }

  const update: Prisma.StudentUpdateInput = {
    studentName: data.student_name ?? undefined,
    studentEmail: data.student_email ?? undefined,
    studentFatherName: data.student_father_name ?? undefined,
    studentMotherName: data.student_mother_name ?? undefined,
    address: data.address ?? undefined,
    city: data.city ?? undefined,
    state: data.state ?? undefined,
    zip: data.zip ?? undefined,
    isStudentActive: data.is_student_active ?? undefined,
  };

  if (data.student_phone) update.studentPhone = `+91${data.student_phone}`;
  if (data.dob) update.dob = toDateOnly(data.dob);
  if (data.total_fees != null) update.totalFees = new Prisma.Decimal(data.total_fees);
  if (data.paid_fees != null) update.paidFees = new Prisma.Decimal(data.paid_fees);
  if (data.due_fees != null) update.dueFees = new Prisma.Decimal(data.due_fees);

  // Changing the course resets the fee to that course's price and re-derives the
  // relieving date, because the duration it was based on has changed.
  let duration = student.course.courseDuration;

  if (data.student_course_id && BigInt(data.student_course_id) !== student.studentCourseId) {
    const course = await prisma.course.findUnique({
      where: { courseId: BigInt(data.student_course_id) },
      select: { courseId: true, courseFees: true, courseDuration: true },
    });

    if (!course) return fail("Selected course does not exist.", 422);

    update.course = { connect: { courseId: course.courseId } };
    update.totalFees = course.courseFees;
    duration = course.courseDuration;
  }

  const admissionDate = data.admission_date ? toDateOnly(data.admission_date) : student.admissionDate;
  if (data.admission_date) update.admissionDate = admissionDate;

  if (data.relieving_date) {
    update.relievingDate = toDateOnly(data.relieving_date);
  } else if (data.admission_date || update.course) {
    update.relievingDate = calculateRelievingDate(admissionDate, duration);
  }

  if (data.student_photo && storageConfigured()) {
    update.studentPhoto = (
      await uploadImage(data.student_photo, "student_photo", student.studentId)
    ).url;
  }

  const updated = await prisma.student.update({
    where: { studentId: student.studentId },
    data: update,
    include: studentInclude,
  });

  return ok("Student updated successfully.", presentStudent(updated));
});

export const DELETE = handler(async (_request, context: RouteContext) => {
  const caller = await requireBranch();
  const { id } = await context.params;
  const { student } = await loadStudent(id, caller);

  if (student.certifiedDate || student.isCertificateApprove) {
    return fail("Cannot delete a certified student.", 403);
  }

  await prisma.student.delete({ where: { studentId: student.studentId } });

  return ok("Student deleted successfully.");
});
