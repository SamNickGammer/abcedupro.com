import { prisma } from "@/lib/db";
import { fail, handler, ok, parseBody, validationFailed, type RouteContext } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { presentStudent, studentInclude } from "@/lib/students";
import { aadhaarSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

/** Aadhaar is admin-only to change, since it is the de-duplication key. */
export const POST = handler(async (request, context: RouteContext) => {
  await requireAdmin();

  const { id } = await context.params;
  const parsed = await parseBody(request, aadhaarSchema);
  if (!parsed.success) return validationFailed(parsed.error);

  const aadhaar = parsed.data.aadhaar_number;

  const student = await prisma.student.findUnique({
    where: { studentId: BigInt(id) },
    select: { studentId: true, aadhaarNumber: true },
  });

  if (!student) return fail("Student not found.", 404);

  if (student.aadhaarNumber === aadhaar) {
    return fail("The new Aadhaar is the same as the current one.", 400);
  }

  const conflict = await prisma.student.findFirst({
    where: { aadhaarNumber: aadhaar, NOT: { studentId: student.studentId } },
    select: {
      studentId: true,
      studentName: true,
      studentFatherName: true,
      studentPhone: true,
      registrationNumber: true,
      branch: { select: { branchName: true, branchCode: true } },
    },
  });

  if (conflict) {
    return fail("This Aadhaar is already registered to another student.", 409, {
      conflict: {
        student_id: Number(conflict.studentId),
        student_name: conflict.studentName,
        student_father_name: conflict.studentFatherName,
        student_phone: conflict.studentPhone,
        registration_number: conflict.registrationNumber,
        branch_name: conflict.branch.branchName,
        branch_code: conflict.branch.branchCode,
      },
    });
  }

  const updated = await prisma.student.update({
    where: { studentId: student.studentId },
    data: { aadhaarNumber: aadhaar },
    include: studentInclude,
  });

  return ok("Aadhaar updated successfully.", presentStudent(updated));
});
