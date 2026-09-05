import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { resolvePhotoUrl } from "@/lib/storage";
import {
  buildVerificationUrl,
  formatPrintDate,
  parseMarks,
  performanceLabel,
} from "@/lib/domain";
import { MARKSHEET_SUBJECTS } from "@/lib/document-layout";

/**
 * Everything the two printed documents need, already formatted for the page —
 * uppercased, date-formatted and joined exactly as the Blade templates did, so
 * the printed output is unchanged.
 */

export type CertificateData = Awaited<ReturnType<typeof getCertificateData>>;
export type MarksheetData = Awaited<ReturnType<typeof getMarksheetData>>;

async function loadStudent(studentId: number) {
  const student = await prisma.student.findUnique({
    where: { studentId: BigInt(studentId) },
    include: {
      course: { select: { courseName: true, shortForm: true, courseDuration: true } },
      branch: {
        select: {
          branchName: true,
          branchCode: true,
          firstName: true,
          lastName: true,
          addressLine1: true,
        },
      },
    },
  });

  if (!student) throw new HttpError("Student not found.", 404);

  return student;
}

type LoadedStudent = Awaited<ReturnType<typeof loadStudent>>;

function shared(student: LoadedStudent) {
  const duration = student.course.courseDuration;

  return {
    studyCentre: `${(student.branch.branchName ?? "").toUpperCase()}, ${(student.branch.addressLine1 ?? "").toUpperCase()}`,
    centreCode: student.branch.branchCode.toUpperCase(),
    srNo: student.marksheetId ?? "",
    dateOfIssue: formatPrintDate(student.certifiedDate),
    dateCertified: `${formatPrintDate(student.admissionDate)} TO ${formatPrintDate(student.relievingDate)}`,
    duration: `${duration} MONTH${duration > 1 ? "S" : ""}`,
    overallPercent: `${student.overallPercent === null ? "" : Number(student.overallPercent)} %`,
    performance: performanceLabel(student.performance).toUpperCase(),
    registrationNumber: student.registrationNumber.toUpperCase(),
    studentName: student.studentName.toUpperCase(),
    fatherName: (student.studentFatherName ?? "").toUpperCase(),
  };
}

export async function getCertificateData(studentId: number) {
  const student = await loadStudent(studentId);

  if (!student.isCertificateApprove) {
    throw new HttpError("This certificate has not been approved yet.", 403);
  }

  const courseFull = student.course.shortForm
    ? `${student.course.courseName} (${student.course.shortForm})`
    : student.course.courseName;

  const director = `${student.branch.firstName ?? ""} ${student.branch.lastName ?? ""}`.trim();

  return {
    studentId: Number(student.studentId),
    registrationNumberRaw: student.registrationNumber,
    fields: {
      ...shared(student),
      courseName: courseFull.toUpperCase(),
      branchDirector: director.toUpperCase(),
    },
  };
}

export async function getMarksheetData(studentId: number) {
  const student = await loadStudent(studentId);

  if (student.marksheetStage !== "verified") {
    throw new HttpError("This marksheet has not been verified yet.", 403);
  }

  const marks = parseMarks(student.marks);

  const markFields = Object.fromEntries(
    MARKSHEET_SUBJECTS.map(({ key, subject }) => [
      key,
      marks[subject] === undefined ? "-" : String(marks[subject]),
    ]),
  ) as Record<(typeof MARKSHEET_SUBJECTS)[number]["key"], string>;

  const verificationUrl = buildVerificationUrl(student.registrationNumber, student.dob);

  return {
    studentId: Number(student.studentId),
    registrationNumberRaw: student.registrationNumber,
    verificationUrl,
    studentPhotoSrc: resolvePhotoUrl(student.studentPhoto),
    fields: {
      ...shared(student),
      // The marksheet prints the short code, falling back to the full name.
      courseName: (student.course.shortForm || student.course.courseName).toUpperCase(),
      dob: formatPrintDate(student.dob).toUpperCase(),
      motherName: (student.studentMotherName ?? "").toUpperCase(),
      ...markFields,
    },
  };
}
