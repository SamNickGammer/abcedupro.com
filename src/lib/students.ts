import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { resolvePhotoUrl } from "@/lib/storage";
import {
  buildVerificationUrl,
  dateOnlyString,
  parseMarks,
  parseSubjects,
  performanceLabel,
} from "@/lib/domain";
import type { STUDENT_STATUS_FILTERS } from "@/lib/validation/schemas";

const withRelations = {
  course: {
    select: {
      courseId: true,
      courseName: true,
      shortForm: true,
      courseDuration: true,
      courseFees: true,
      subjects: true,
    },
  },
  branch: {
    select: {
      id: true,
      branchName: true,
      branchCode: true,
      firstName: true,
      lastName: true,
      addressLine1: true,
      city: true,
      state: true,
      zip: true,
      phone: true,
      creditPerCertificate: true,
    },
  },
} satisfies Prisma.StudentInclude;

type StudentWithRelations = Prisma.StudentGetPayload<{ include: typeof withRelations }>;

export type StudentView = ReturnType<typeof presentStudent>;

/**
 * Flattens the Prisma row into the same field names the Laravel API returned,
 * so the ported screens read `student_name`, `course_name`, `branch_code` and
 * friends exactly as they always did.
 */
export function presentStudent(student: StudentWithRelations) {
  const verificationUrl = buildVerificationUrl(student.registrationNumber, student.dob);

  return {
    student_id: Number(student.studentId),
    student_name: student.studentName,
    registration_number: student.registrationNumber,
    student_email: student.studentEmail,
    student_phone: student.studentPhone,
    student_father_name: student.studentFatherName,
    student_mother_name: student.studentMotherName,
    branch_id: Number(student.branchId),
    student_course_id: Number(student.studentCourseId),
    dob: dateOnlyString(student.dob),
    address: student.address,
    city: student.city,
    state: student.state,
    zip: student.zip,
    admission_date: dateOnlyString(student.admissionDate),
    relieving_date: dateOnlyString(student.relievingDate),
    is_student_active: student.isStudentActive,
    student_photo: student.studentPhoto,
    student_photo_src: resolvePhotoUrl(student.studentPhoto),
    total_fees: student.totalFees === null ? null : Number(student.totalFees),
    paid_fees: student.paidFees === null ? null : Number(student.paidFees),
    due_fees: student.dueFees === null ? null : Number(student.dueFees),
    marksheet_id: student.marksheetId,
    marks: student.marks,
    marks_parsed: parseMarks(student.marks),
    marksheet_stage: student.marksheetStage,
    overall_percent: student.overallPercent === null ? null : Number(student.overallPercent),
    performance: performanceLabel(student.performance),
    certified_date: student.certifiedDate ? dateOnlyString(student.certifiedDate) : null,
    is_certificate_approve: student.isCertificateApprove,
    aadhaar_number: student.aadhaarNumber,
    created_at: student.createdAt.toISOString(),
    updated_at: student.updatedAt.toISOString(),

    course_name: student.course.courseName,
    short_form: student.course.shortForm,
    course_duration: student.course.courseDuration,
    course_fees: Number(student.course.courseFees),
    course_subjects: parseSubjects(student.course.subjects),

    branch_name: student.branch.branchName,
    branch_code: student.branch.branchCode,
    branch_director_first: student.branch.firstName,
    branch_director_last: student.branch.lastName,
    branch_address: student.branch.addressLine1,
    branch_city: student.branch.city,
    branch_state: student.branch.state,
    branch_zip: student.branch.zip,
    branch_phone: student.branch.phone,

    verification_url: verificationUrl,
  };
}

export const studentInclude = withRelations;

export type StudentStatusFilter = (typeof STUDENT_STATUS_FILTERS)[number];

/** The status chips shared by the branch and admin student lists. */
export function statusWhere(status: StudentStatusFilter): Prisma.StudentWhereInput {
  switch (status) {
    case "no_cert":
      return { isCertificateApprove: false, certifiedDate: null };
    case "pending":
      return { marksheetStage: "pending" };
    case "verified":
      return { marksheetStage: "verified" };
    case "certified":
      return { isCertificateApprove: true };
    case "active":
      return { isStudentActive: true };
    case "inactive":
      return { isStudentActive: false };
    default:
      return {};
  }
}

export function searchWhere(search: string | null | undefined): Prisma.StudentWhereInput {
  const term = (search ?? "").trim();
  if (!term) return {};

  const contains = { contains: term, mode: "insensitive" } as const;

  return {
    OR: [
      { studentName: contains },
      { studentFatherName: contains },
      { studentMotherName: contains },
      { registrationNumber: contains },
      { studentPhone: contains },
      { course: { courseName: contains } },
      { course: { shortForm: contains } },
      { branch: { branchName: contains } },
      { branch: { branchCode: contains } },
    ],
  };
}

export async function findStudent(studentId: number) {
  const student = await prisma.student.findUnique({
    where: { studentId: BigInt(studentId) },
    include: withRelations,
  });

  return student ? presentStudent(student) : null;
}
