/**
 * Imports the production phpMyAdmin dump into Neon Postgres, and uploads the
 * student photographs to R2.
 *
 *   npm run dump:import -- <path-to.sql> [<path-to-student_photo>] [flags]
 *
 *     --skip-photos     import the database only
 *     --photos-only     upload photographs only, leave the database alone
 *     --repoint-photos  where a row names a file that is no longer in the
 *                       folder and exactly one other file is, point the row at
 *                       that file (off by default — the row is kept truthful)
 *
 * Everything is destructive: the target tables are emptied first, so a re-run
 * always produces the same result rather than accumulating duplicates.
 *
 * Primary keys are carried across unchanged. That is what keeps every
 * registration number, marksheet number and already-issued certificate URL
 * pointing at the same record.
 */
import "dotenv/config";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  parseInserts,
  photoKey,
  text,
  requiredText,
  int,
  bool,
  decimal,
  dateOnly,
  timestamp,
  performance,
  marksheetStage,
  type Row,
} from "./lib/sql-dump";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const [sqlPath, photoDir] = args.filter((a) => !a.startsWith("--"));

const SKIP_PHOTOS = flags.has("--skip-photos");
const PHOTOS_ONLY = flags.has("--photos-only");
const REPOINT = flags.has("--repoint-photos");

if (!sqlPath) {
  console.error("Usage: npm run dump:import -- <path-to.sql> [<path-to-student_photo>] [flags]");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: requireEnv("DATABASE_URL") }),
});

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    console.error(`FAIL  ${name} is not set in .env`);
    process.exit(1);
  }
  return value;
}

function section(title: string) {
  console.log(`\n${"=".repeat(64)}\n${title}\n${"=".repeat(64)}`);
}

const EPOCH = new Date("2024-12-27T00:00:00.000Z");

/**
 * A course runs for `duration` whole months from admission and the student is
 * relieved the day before that anniversary — the same rule the app applies
 * when enrolling.
 *
 * Needed because one production row carries MySQL's zero date
 * (`0000-00-00`) in `relieving_date`, which Postgres cannot store. That
 * student is certified, and the range is printed on their certificate, so
 * deriving the real date is meaningfully better than substituting a
 * placeholder.
 */
function derivedRelievingDate(admission: Date, months: number): Date {
  const derived = new Date(admission);
  derived.setUTCMonth(derived.getUTCMonth() + months);
  derived.setUTCDate(derived.getUTCDate() - 1);
  return derived;
}

// --------------------------------------------------------------------- main

async function main() {
  const dump = readFileSync(sqlPath, "utf8");

  const branches = parseInserts(dump, "branch");
  const courses = parseInserts(dump, "courses");
  const students = parseInserts(dump, "student");
  const libraryConfig = parseInserts(dump, "library_config");

  console.log(
    `\nParsed: ${branches.length} branches, ${courses.length} courses, ` +
      `${students.length} students, ${libraryConfig.length} library config rows`,
  );

  // Resolve which file on disk each student's photo actually is, before any
  // writing, so the database and the bucket agree.
  const photos = resolvePhotos(students, photoDir);

  if (!PHOTOS_ONLY) {
    await importDatabase({ branches, courses, students, libraryConfig, photos });
  }

  if (!SKIP_PHOTOS && photoDir) {
    await uploadPhotos(photoDir);
  } else if (!SKIP_PHOTOS) {
    console.log("\n(no photo folder given — skipping upload)");
  }

  await verify({ branches, courses, students });
}

// ------------------------------------------------------------------- photos

type PhotoPlan = {
  /** studentId -> the key to store on the row. */
  keyForStudent: Map<string, string>;
  repointed: Array<{ id: string; from: string; to: string }>;
  missing: Array<{ id: string; key: string }>;
};

function resolvePhotos(students: Row[], dir: string | undefined): PhotoPlan {
  const plan: PhotoPlan = { keyForStudent: new Map(), repointed: [], missing: [] };

  const folders = new Map<string, string[]>();

  if (dir && existsSync(dir)) {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (!statSync(full).isDirectory()) continue;
      folders.set(entry, readdirSync(full).filter((f) => f !== ".DS_Store"));
    }
  }

  for (const student of students) {
    const id = String(student.student_id);
    const key = photoKey(student.student_photo);
    if (!key) continue;

    const [, folderId, ...rest] = key.split("/");
    const filename = rest.join("/");
    const present = folders.get(folderId);

    if (!dir || present === undefined) {
      // Without the folder to check against, keep the row exactly as it is.
      plan.keyForStudent.set(id, key);
      if (dir) plan.missing.push({ id, key });
      continue;
    }

    if (present.includes(filename)) {
      plan.keyForStudent.set(id, key);
      continue;
    }

    // The named file is gone. One replacement is unambiguous; anything else is
    // a guess, so the row keeps its original value and is reported instead.
    if (REPOINT && present.length === 1) {
      const replacement = `student_photo/${folderId}/${present[0]}`;
      plan.keyForStudent.set(id, replacement);
      plan.repointed.push({ id, from: key, to: replacement });
    } else {
      plan.keyForStudent.set(id, key);
      plan.missing.push({ id, key });
    }
  }

  return plan;
}

// ----------------------------------------------------------------- database

async function importDatabase({
  branches,
  courses,
  students,
  libraryConfig,
  photos,
}: {
  branches: Row[];
  courses: Row[];
  students: Row[];
  libraryConfig: Row[];
  photos: PhotoPlan;
}) {
  section("Emptying the target");

  // Children first, so foreign keys never block a delete.
  await prisma.libraryPaymentLog.deleteMany();
  await prisma.libraryBookingLocker.deleteMany();
  await prisma.libraryBookingSlot.deleteMany();
  await prisma.libraryBooking.deleteMany();
  await prisma.libraryMember.deleteMany();
  await prisma.libraryConfig.deleteMany();
  await prisma.certificateCharge.deleteMany();
  await prisma.student.deleteMany();
  await prisma.course.deleteMany();
  await prisma.branch.deleteMany();
  console.log("  ok  every table emptied");

  section("branch");
  await prisma.branch.createMany({
    data: branches.map((row) => ({
      id: BigInt(int(row.id)),
      createdAt: timestamp(row.created_at, EPOCH),
      updatedAt: timestamp(row.updated_at, EPOCH),
      phone: requiredText(row.phone),
      emailId: requiredText(row.email_id),
      branchCode: requiredText(row.branch_code),
      branchName: requiredText(row.branch_name),
      role: requiredText(row.role, "branch"),
      addressLine1: requiredText(row.address_line1),
      addressLine2: text(row.address_line2),
      city: requiredText(row.city),
      state: requiredText(row.state),
      zip: int(row.zip),
      firstName: requiredText(row.first_name),
      lastName: text(row.last_name),
      active: bool(row.active),
      // Manager photos live under the same bucket layout as student photos.
      image: photoKey(row.image),
      // The bcrypt hash comes across untouched, so existing passwords keep
      // working. The plaintext `pass` column is deliberately not copied.
      password: requiredText(row.password),
      centerCreationDate: dateOnly(row.center_creation_date) ?? EPOCH,
      credit: int(row.credit),
      creditPerCertificate: int(row.credit_per_certificate, 200),
    })),
  });
  console.log(`  ok  ${branches.length} branches (plaintext 'pass' column dropped)`);

  section("courses");
  await prisma.course.createMany({
    data: courses.map((row) => ({
      courseId: BigInt(int(row.course_id)),
      createdAt: timestamp(row.created_at, EPOCH),
      updatedAt: timestamp(row.updated_at, EPOCH),
      courseName: requiredText(row.course_name),
      shortForm: requiredText(row.short_form),
      courseDuration: int(row.course_duration),
      courseStatus: text(row.course_status) === "inactive" ? "inactive" : "active",
      courseFees: decimal(row.course_fees) ?? "0.00",
      subjects: requiredText(
        row.subjects,
        "Written Marks, Practical Marks, Project Marks, Viva Marks",
      ),
    })),
  });
  console.log(`  ok  ${courses.length} courses`);

  section("student");
  const CHUNK = 400;

  const courseDuration = new Map(
    courses.map((row) => [String(row.course_id), int(row.course_duration)]),
  );
  const derivedDates: Array<{ id: string; from: string; to: string }> = [];

  for (let i = 0; i < students.length; i += CHUNK) {
    const batch = students.slice(i, i + CHUNK);

    await prisma.student.createMany({
      data: batch.map((row) => {
        const id = String(row.student_id);
        const admission = dateOnly(row.admission_date) ?? EPOCH;

        let relieving = dateOnly(row.relieving_date);
        if (!relieving) {
          relieving = derivedRelievingDate(
            admission,
            courseDuration.get(String(row.student_course_id)) ?? 0,
          );
          derivedDates.push({
            id,
            from: String(row.relieving_date),
            to: relieving.toISOString().slice(0, 10),
          });
        }

        return {
          studentId: BigInt(int(row.student_id)),
          studentName: requiredText(row.student_name),
          registrationNumber: requiredText(row.registration_number),
          studentEmail: text(row.student_email),
          studentPhone: requiredText(row.student_phone),
          studentFatherName: text(row.student_father_name),
          studentMotherName: text(row.student_mother_name),
          branchId: BigInt(int(row.branch_id)),
          studentCourseId: BigInt(int(row.student_course_id)),
          dob: dateOnly(row.dob) ?? EPOCH,
          address: text(row.address),
          city: text(row.city),
          state: text(row.state),
          zip: text(row.zip),
          admissionDate: admission,
          relievingDate: relieving,
          isStudentActive: bool(row.is_student_active),
          // The object key, so the delivery host can change without a rewrite.
          studentPhoto: photos.keyForStudent.get(id) ?? null,
          totalFees: decimal(row.total_fees),
          paidFees: decimal(row.paid_fees),
          dueFees: decimal(row.due_fees),
          marksheetId: text(row.marksheet_id),
          marks: text(row.marks),
          marksheetStage: marksheetStage(row.marksheet_stage),
          overallPercent: decimal(row.overall_percent),
          performance: performance(row.performance),
          certifiedDate: dateOnly(row.certified_date),
          isCertificateApprove: bool(row.is_certificate_approve),
          aadhaarNumber: text(row.aadhaar_number),
          createdAt: timestamp(row.created_at, EPOCH),
          updatedAt: timestamp(row.updated_at, EPOCH),
        };
      }),
    });

    process.stdout.write(`\r  ok  ${Math.min(i + CHUNK, students.length)} / ${students.length} students`);
  }
  console.log("");

  if (derivedDates.length > 0) {
    console.log(`\n  derived ${derivedDates.length} relieving date(s) the dump could not supply:`);
    for (const row of derivedDates) {
      console.log(`    #${row.id}  "${row.from}" -> ${row.to}  (admission + course duration - 1 day)`);
    }
  }

  if (libraryConfig.length > 0) {
    section("library_config");
    await prisma.libraryConfig.createMany({
      data: libraryConfig.map((row) => ({
        id: BigInt(int(row.id)),
        configKey: requiredText(row.config_key),
        configValue: requiredText(row.config_value),
        valueType: requiredText(row.value_type, "json"),
        description: text(row.description),
        createdAt: timestamp(row.created_at, EPOCH),
        updatedAt: timestamp(row.updated_at, EPOCH),
      })),
    });
    console.log(`  ok  ${libraryConfig.length} config rows`);
  }

  section("Identity sequences");
  await resyncSequences();

  if (photos.repointed.length > 0) {
    console.log(`\n  repointed ${photos.repointed.length} photo rows to the file present on disk:`);
    for (const row of photos.repointed) console.log(`    #${row.id}  ${row.from} -> ${row.to}`);
  }
}

/**
 * Explicit ids bypass the identity sequence, so the next insert would collide
 * on the primary key. Bumping each sequence past its table's max fixes that.
 */
async function resyncSequences() {
  const tables: Array<[string, string]> = [
    ["branch", "id"],
    ["courses", "course_id"],
    ["student", "student_id"],
    ["certificate_charge", "id"],
    ["library_config", "id"],
    ["library_members", "member_id"],
    ["library_bookings", "booking_id"],
    ["library_booking_slots", "id"],
    ["library_booking_lockers", "id"],
    ["library_payment_logs", "id"],
  ];

  for (const [table, column] of tables) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(
         pg_get_serial_sequence('"${table}"', '${column}'),
         GREATEST(COALESCE((SELECT MAX("${column}") FROM "${table}"), 0), 1),
         (SELECT MAX("${column}") IS NOT NULL FROM "${table}")
       )`,
    );
  }

  console.log(`  ok  ${tables.length} sequences reset past their current maximum`);
}

// ---------------------------------------------------------------- R2 upload

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

async function uploadPhotos(dir: string) {
  section("Uploading photographs to R2");

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
  const bucket = requireEnv("R2_BUCKET");

  // Every file is uploaded, including ones no row points at: certificates
  // already issued may link to a photo that has since been replaced.
  const files: Array<{ key: string; file: string }> = [];

  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (!statSync(full).isDirectory()) continue;

    for (const name of readdirSync(full)) {
      if (name === ".DS_Store") continue;
      files.push({ key: `student_photo/${entry}/${name}`, file: path.join(full, name) });
    }
  }

  console.log(`  ${files.length} files to upload`);

  let done = 0;
  let failed = 0;
  const failures: string[] = [];
  const CONCURRENCY = 16;

  async function worker() {
    while (files.length > 0) {
      const next = files.pop();
      if (!next) return;

      try {
        const body = await readFile(next.file);
        const extension = path.extname(next.file).toLowerCase();

        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: next.key,
            Body: body,
            ContentType: CONTENT_TYPES[extension] ?? "application/octet-stream",
            CacheControl: "public, max-age=31536000, immutable",
          }),
        );
      } catch (error) {
        failed += 1;
        if (failures.length < 20) {
          failures.push(`${next.key}: ${error instanceof Error ? error.message : error}`);
        }
      }

      done += 1;
      if (done % 50 === 0) process.stdout.write(`\r  uploaded ${done}`);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`\r  ok  ${done - failed} uploaded, ${failed} failed`);
  for (const failure of failures) console.log(`      ${failure}`);
}

// ------------------------------------------------------------ verification

async function verify({
  branches,
  courses,
  students,
}: {
  branches: Row[];
  courses: Row[];
  students: Row[];
}) {
  section("Verification");

  const counts = {
    branch: await prisma.branch.count(),
    courses: await prisma.course.count(),
    student: await prisma.student.count(),
  };

  let failures = 0;
  const check = (label: string, actual: number, expected: number) => {
    const ok = actual === expected;
    if (!ok) failures += 1;
    console.log(
      `  ${ok ? "ok  " : "FAIL"} ${label.padEnd(24)} source ${String(expected).padStart(6)}   target ${String(actual).padStart(6)}`,
    );
  };

  check("branch rows", counts.branch, branches.length);
  check("course rows", counts.courses, courses.length);
  check("student rows", counts.student, students.length);

  // Aggregates, which would catch a column silently landing in the wrong place.
  const [certified, verifiedStage, withMarksheetId, withMarks, withPhoto, withAadhaar] =
    await Promise.all([
      prisma.student.count({ where: { isCertificateApprove: true } }),
      prisma.student.count({ where: { marksheetStage: "verified" } }),
      prisma.student.count({ where: { NOT: { marksheetId: null } } }),
      prisma.student.count({ where: { NOT: { marks: null } } }),
      prisma.student.count({ where: { NOT: { studentPhoto: null } } }),
      prisma.student.count({ where: { NOT: { aadhaarNumber: null } } }),
    ]);

  check("certificate approved", certified, students.filter((s) => bool(s.is_certificate_approve)).length);
  check("marksheet verified", verifiedStage, students.filter((s) => text(s.marksheet_stage) === "verified").length);
  check("with marksheet_id", withMarksheetId, students.filter((s) => text(s.marksheet_id)).length);
  check("with marks", withMarks, students.filter((s) => text(s.marks)).length);
  check("with photo", withPhoto, students.filter((s) => photoKey(s.student_photo)).length);
  check("with aadhaar", withAadhaar, students.filter((s) => text(s.aadhaar_number)).length);

  console.log(
    failures === 0
      ? "\nAll counts match.\n"
      : `\n${failures} check(s) FAILED — investigate before using this database.\n`,
  );
}

main()
  .catch((error) => {
    console.error("\nFAIL  import failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
