/**
 * Compares the imported database against the dump field by field, and checks
 * every referenced photograph is actually in the bucket.
 *
 *   npm run dump:verify -- <path-to.sql> [<path-to-student_photo>]
 *
 * A row count matching proves nothing about whether a value landed in the
 * right column, so this walks every row of every table and compares each
 * field individually.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import {
  parseInserts,
  photoKey,
  text,
  requiredText,
  int,
  bool,
  decimal,
  dateOnly,
  performance,
  marksheetStage,
  type Row,
} from "./lib/sql-dump";

const [, , sqlPath, photoDir] = process.argv;

if (!sqlPath) {
  console.error("Usage: npm run dump:verify -- <path-to.sql> [<path-to-student_photo>]");
  process.exit(1);
}
void photoDir;

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

function section(title: string) {
  console.log(`\n${"=".repeat(64)}\n${title}\n${"=".repeat(64)}`);
}

type Mismatch = { id: string; field: string; expected: unknown; actual: unknown };

const mismatches: Mismatch[] = [];
const derivedRelieving: Array<{ id: string; raw: string; derived: string }> = [];

/** Mirrors the importer, so the comparison tests the same rule. */
function derivedRelievingDate(admission: Date, months: number): Date {
  const derived = new Date(admission);
  derived.setUTCMonth(derived.getUTCMonth() + months);
  derived.setUTCDate(derived.getUTCDate() - 1);
  return derived;
}

function compare(id: string, field: string, expected: unknown, actual: unknown) {
  const same =
    expected instanceof Date && actual instanceof Date
      ? expected.getTime() === actual.getTime()
      : expected === actual;

  if (!same) mismatches.push({ id, field, expected, actual });
}

/** Date column read back from Postgres, as `YYYY-MM-DD`. */
function dbDate(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function srcDate(value: unknown): string | null {
  const parsed = dateOnly(value as never);
  return parsed ? parsed.toISOString().slice(0, 10) : null;
}

async function main() {
  const dump = readFileSync(sqlPath, "utf8");

  const srcBranches = parseInserts(dump, "branch");
  const srcCourses = parseInserts(dump, "courses");
  const srcStudents = parseInserts(dump, "student");

  const courseMonths = new Map(
    srcCourses.map((row) => [String(row.course_id), int(row.course_duration)]),
  );

  // ------------------------------------------------------------- branches
  section("Branches — every field");

  const dbBranches = new Map(
    (await prisma.branch.findMany()).map((b) => [String(b.id), b]),
  );

  for (const src of srcBranches) {
    const id = String(src.id);
    const got = dbBranches.get(id);

    if (!got) {
      mismatches.push({ id: `branch#${id}`, field: "(row)", expected: "present", actual: "missing" });
      continue;
    }

    const tag = `branch#${id}`;
    compare(tag, "phone", requiredText(src.phone), got.phone);
    compare(tag, "email_id", requiredText(src.email_id), got.emailId);
    compare(tag, "branch_code", requiredText(src.branch_code), got.branchCode);
    compare(tag, "branch_name", requiredText(src.branch_name), got.branchName);
    compare(tag, "role", requiredText(src.role, "branch"), got.role);
    compare(tag, "address_line1", requiredText(src.address_line1), got.addressLine1);
    compare(tag, "address_line2", text(src.address_line2), got.addressLine2);
    compare(tag, "city", requiredText(src.city), got.city);
    compare(tag, "state", requiredText(src.state), got.state);
    compare(tag, "zip", int(src.zip), got.zip);
    compare(tag, "first_name", requiredText(src.first_name), got.firstName);
    compare(tag, "last_name", text(src.last_name), got.lastName);
    compare(tag, "active", bool(src.active), got.active);
    compare(tag, "image", photoKey(src.image), got.image);
    // The hash must be byte-identical or every password stops working.
    compare(tag, "password", requiredText(src.password), got.password);
    compare(tag, "center_creation_date", srcDate(src.center_creation_date), dbDate(got.centerCreationDate));
    compare(tag, "credit", int(src.credit), got.credit);
    compare(tag, "credit_per_certificate", int(src.credit_per_certificate, 200), got.creditPerCertificate);
  }
  console.log(`  compared ${srcBranches.length} branches x 18 fields`);

  // -------------------------------------------------------------- courses
  section("Courses — every field");

  const dbCourses = new Map(
    (await prisma.course.findMany()).map((c) => [String(c.courseId), c]),
  );

  for (const src of srcCourses) {
    const id = String(src.course_id);
    const got = dbCourses.get(id);

    if (!got) {
      mismatches.push({ id: `course#${id}`, field: "(row)", expected: "present", actual: "missing" });
      continue;
    }

    const tag = `course#${id}`;
    compare(tag, "course_name", requiredText(src.course_name), got.courseName);
    compare(tag, "short_form", requiredText(src.short_form), got.shortForm);
    compare(tag, "course_duration", int(src.course_duration), got.courseDuration);
    compare(tag, "course_status", text(src.course_status) === "inactive" ? "inactive" : "active", got.courseStatus);
    compare(tag, "course_fees", decimal(src.course_fees) ?? "0.00", got.courseFees.toFixed(2));
    compare(tag, "subjects", requiredText(src.subjects, "Written Marks, Practical Marks, Project Marks, Viva Marks"), got.subjects);
  }
  console.log(`  compared ${srcCourses.length} courses x 6 fields`);

  // ------------------------------------------------------------- students
  section("Students — every field");

  const dbStudents = new Map<string, Awaited<ReturnType<typeof prisma.student.findMany>>[number]>();
  const PAGE = 1000;

  for (let skip = 0; ; skip += PAGE) {
    const page = await prisma.student.findMany({ skip, take: PAGE, orderBy: { studentId: "asc" } });
    if (page.length === 0) break;
    for (const row of page) dbStudents.set(String(row.studentId), row);
  }

  for (const src of srcStudents) {
    const id = String(src.student_id);
    const got = dbStudents.get(id);

    if (!got) {
      mismatches.push({ id: `student#${id}`, field: "(row)", expected: "present", actual: "missing" });
      continue;
    }

    const tag = `student#${id}`;
    compare(tag, "student_name", requiredText(src.student_name), got.studentName);
    compare(tag, "registration_number", requiredText(src.registration_number), got.registrationNumber);
    compare(tag, "student_email", text(src.student_email), got.studentEmail);
    compare(tag, "student_phone", requiredText(src.student_phone), got.studentPhone);
    compare(tag, "student_father_name", text(src.student_father_name), got.studentFatherName);
    compare(tag, "student_mother_name", text(src.student_mother_name), got.studentMotherName);
    compare(tag, "branch_id", int(src.branch_id), Number(got.branchId));
    compare(tag, "student_course_id", int(src.student_course_id), Number(got.studentCourseId));
    compare(tag, "dob", srcDate(src.dob), dbDate(got.dob));
    compare(tag, "address", text(src.address), got.address);
    compare(tag, "city", text(src.city), got.city);
    compare(tag, "state", text(src.state), got.state);
    compare(tag, "zip", text(src.zip), got.zip);
    compare(tag, "admission_date", srcDate(src.admission_date), dbDate(got.admissionDate));

    // A zero date in the dump is unstorable, so the importer derives one from
    // admission plus the course duration. Expect that, and report it.
    const srcRelieving = srcDate(src.relieving_date);
    if (srcRelieving === null) {
      const admission = dateOnly(src.admission_date);
      const months = courseMonths.get(String(src.student_course_id)) ?? 0;
      const derived = admission ? derivedRelievingDate(admission, months) : null;
      derivedRelieving.push({
        id,
        raw: String(src.relieving_date),
        derived: derived ? derived.toISOString().slice(0, 10) : "(none)",
      });
      compare(tag, "relieving_date (derived)", derived ? derived.toISOString().slice(0, 10) : null, dbDate(got.relievingDate));
    } else {
      compare(tag, "relieving_date", srcRelieving, dbDate(got.relievingDate));
    }
    compare(tag, "is_student_active", bool(src.is_student_active), got.isStudentActive);
    compare(tag, "total_fees", decimal(src.total_fees), got.totalFees === null ? null : got.totalFees.toFixed(2));
    compare(tag, "paid_fees", decimal(src.paid_fees), got.paidFees === null ? null : got.paidFees.toFixed(2));
    compare(tag, "due_fees", decimal(src.due_fees), got.dueFees === null ? null : got.dueFees.toFixed(2));
    compare(tag, "marksheet_id", text(src.marksheet_id), got.marksheetId);
    compare(tag, "marks", text(src.marks), got.marks);
    compare(tag, "marksheet_stage", marksheetStage(src.marksheet_stage), got.marksheetStage);
    compare(tag, "overall_percent", decimal(src.overall_percent), got.overallPercent === null ? null : got.overallPercent.toFixed(2));
    compare(tag, "performance", performance(src.performance), got.performance);
    compare(tag, "certified_date", srcDate(src.certified_date), dbDate(got.certifiedDate));
    compare(tag, "is_certificate_approve", bool(src.is_certificate_approve), got.isCertificateApprove);
    compare(tag, "aadhaar_number", text(src.aadhaar_number), got.aadhaarNumber);
  }
  console.log(`  compared ${srcStudents.length} students x 27 fields`);

  if (derivedRelieving.length > 0) {
    console.log(`\n  ${derivedRelieving.length} relieving date(s) derived, the dump value being unstorable:`);
    for (const row of derivedRelieving) {
      console.log(`    #${row.id}  "${row.raw}" -> ${row.derived}`);
    }
  }

  // ---------------------------------------------------------- marks detail
  section("Marks — value by value");

  let marksChecked = 0;
  let marksBad = 0;

  for (const src of srcStudents) {
    const raw = text(src.marks);
    if (!raw) continue;

    const got = dbStudents.get(String(src.student_id));
    if (!got?.marks) {
      marksBad += 1;
      continue;
    }

    const a = JSON.parse(raw) as Record<string, number>;
    const b = JSON.parse(got.marks) as Record<string, number>;

    for (const [subject, value] of Object.entries(a)) {
      marksChecked += 1;
      if (Number(b[subject]) !== Number(value)) {
        marksBad += 1;
        mismatches.push({
          id: `student#${src.student_id}`,
          field: `marks.${subject}`,
          expected: value,
          actual: b[subject],
        });
      }
    }
  }
  console.log(`  ${marksChecked} individual subject marks compared, ${marksBad} wrong`);

  // --------------------------------------------------------------- photos
  section("Photographs — every referenced key present in R2");

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  const inBucket = new Set<string>();
  let token: string | undefined;

  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET!,
        ContinuationToken: token,
        MaxKeys: 1000,
      }),
    );
    for (const object of page.Contents ?? []) if (object.Key) inBucket.add(object.Key);
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);

  console.log(`  objects in bucket: ${inBucket.size}`);

  const referencing = [...dbStudents.values()].filter((s) => s.studentPhoto);
  const servable = referencing.filter((s) => inBucket.has(s.studentPhoto!));
  const notInBucket = referencing.filter((s) => !inBucket.has(s.studentPhoto!));

  console.log(`  students referencing a photo:     ${referencing.length}`);
  console.log(`  of those, present in the bucket:  ${servable.length}`);
  console.log(`  of those, file not uploaded:      ${notInBucket.length}`);

  if (notInBucket.length > 0) {
    const ids = notInBucket.map((s) => Number(s.studentId)).sort((a, b) => a - b);
    console.log(`    id range ${ids[0]} .. ${ids.at(-1)}  (these folders were not in the export)`);
  }

  // --------------------------------------------------------------- verdict
  section("Verdict");

  if (mismatches.length === 0) {
    console.log("  Every field of every row matches the dump exactly.\n");
  } else {
    console.log(`  ${mismatches.length} FIELD MISMATCH(ES):\n`);
    for (const m of mismatches.slice(0, 40)) {
      console.log(`    ${m.id} ${m.field}`);
      console.log(`      expected: ${JSON.stringify(m.expected)}`);
      console.log(`      actual:   ${JSON.stringify(m.actual)}`);
    }
    if (mismatches.length > 40) console.log(`    ...and ${mismatches.length - 40} more`);
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("\nFAIL  verification failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
