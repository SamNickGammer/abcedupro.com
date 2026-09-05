import { prisma } from "@/lib/db";
import { fail, handler, ok, parseBody, validationFailed } from "@/lib/api";
import { resolvePhotoUrl } from "@/lib/storage";
import {
  dateOnlyString,
  maskAadhaarNumber,
  maskEmail,
  maskPhoneNumber,
  parseMarks,
  performanceLabel,
} from "@/lib/domain";
import { publicStudentLookupSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

/**
 * Public certificate verification — the endpoint behind the URL and QR code
 * printed on every document. Deliberately unauthenticated: anyone holding a
 * certificate must be able to check it.
 *
 * Access is gated on knowing both the registration number *and* the date of
 * birth, and the response masks phone, email and Aadhaar, so a correct guess
 * confirms a certificate without handing over a contactable personal record.
 */
export const POST = handler(async (request) => {
  const parsed = await parseBody(request, publicStudentLookupSchema);
  if (!parsed.success) return validationFailed(parsed.error);

  const student = await prisma.student.findUnique({
    where: { registrationNumber: parsed.data.registration_number.trim() },
    include: {
      course: { select: { courseName: true, shortForm: true, courseDuration: true } },
      branch: {
        select: {
          branchCode: true,
          branchName: true,
          addressLine1: true,
          city: true,
          state: true,
          zip: true,
          phone: true,
        },
      },
    },
  });

  // One message for "no such number" and "wrong date of birth", so the endpoint
  // cannot be used to confirm which registration numbers exist.
  const NOT_FOUND = "No certificate matches that registration number and date of birth.";

  if (!student) return fail(NOT_FOUND, 404);
  if (dateOnlyString(student.dob) !== parsed.data.dob) return fail(NOT_FOUND, 404);

  return ok("Student data retrieved successfully.", {
    student_name: student.studentName,
    registration_number: student.registrationNumber,
    student_father_name: student.studentFatherName,
    student_mother_name: student.studentMotherName,
    dob: dateOnlyString(student.dob),
    student_phone: maskPhoneNumber(student.studentPhone),
    student_email: maskEmail(student.studentEmail),
    aadhaar_number: maskAadhaarNumber(student.aadhaarNumber),
    city: student.city,
    state: student.state,
    admission_date: dateOnlyString(student.admissionDate),
    relieving_date: dateOnlyString(student.relievingDate),
    student_photo_src: resolvePhotoUrl(student.studentPhoto),
    marksheet_id: student.marksheetId,
    marksheet_stage: student.marksheetStage,
    marks: parseMarks(student.marks),
    overall_percent: student.overallPercent === null ? null : Number(student.overallPercent),
    performance: performanceLabel(student.performance),
    certified_date: student.certifiedDate ? dateOnlyString(student.certifiedDate) : null,
    is_certificate_approve: student.isCertificateApprove,
    is_student_active: student.isStudentActive,

    course_name: student.course.courseName,
    short_form: student.course.shortForm,
    course_duration: student.course.courseDuration,

    branch_code: student.branch.branchCode,
    branch_name: student.branch.branchName,
    branch_address_line1: student.branch.addressLine1,
    branch_city: student.branch.city,
    branch_state: student.branch.state,
    branch_zip: student.branch.zip,
    branch_phone: student.branch.phone,
  });
});
