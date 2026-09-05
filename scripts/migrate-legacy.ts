/**
 * Copies the live cPanel MySQL database into Neon Postgres.
 *
 *   npm run migrate:legacy -- --dry-run     inspect and report, write nothing
 *   npm run migrate:legacy                  copy everything
 *   npm run migrate:legacy -- --truncate    wipe the target first, then copy
 *
 * Design notes
 * - Primary keys are carried across unchanged, so every foreign key, every
 *   registration number and every certificate already in circulation still
 *   refers to the same row. Postgres identity sequences are reset afterwards so
 *   the next insert does not collide.
 * - Tables are copied parents-first, in chunks, so a failure part-way leaves a
 *   partially-copied table that a re-run will complete rather than duplicate.
 * - Re-running is safe: `skipDuplicates` means existing rows are left alone.
 * - The `pass` column (plaintext passwords) is deliberately NOT copied. The
 *   bcrypt `password` column comes across as-is and every existing password
 *   keeps working, because PHP's $2y$ hashes verify under bcryptjs.
 *
 * Connection details come from the LEGACY_MYSQL_* variables in .env.
 */
import "dotenv/config";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const DRY_RUN = process.argv.includes("--dry-run");
const TRUNCATE = process.argv.includes("--truncate");
const CHUNK = 500;

const TABLES = [
  "branch",
  "courses",
  "student",
  "certificate_charge",
  "library_config",
  "library_members",
  "library_bookings",
  "library_booking_slots",
  "library_booking_lockers",
  "library_payment_logs",
] as const;

function required(name: string) {
  const value = process.env[name];
  if (!value) {
    console.error(`FAIL  ${name} is not set in .env`);
    process.exit(1);
  }
  return value;
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: required("DATABASE_URL") }),
});

function section(title: string) {
  console.log(`\n== ${title} ${"=".repeat(Math.max(0, 56 - title.length))}`);
}

// ------------------------------------------------------------------ helpers

/** MySQL DATE columns arrive as JS Dates in local time; pin them to UTC midnight. */
function dateOnly(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function timestamp(value: unknown): Date {
  if (!value) return new Date();
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function nullableTimestamp(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function bool(value: unknown): boolean {
  return value === 1 || value === true || value === "1";
}

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

function decimal(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : null;
}

/** The DB enum stores "Very Good" with a space; the Prisma member cannot. */
function performance(value: unknown) {
  const raw = text(value);
  if (!raw) return null;

  const map: Record<string, "Excellent" | "Very_Good" | "Good" | "Failure"> = {
    Excellent: "Excellent",
    "Very Good": "Very_Good",
    Very_Good: "Very_Good",
    Good: "Good",
    Failure: "Failure",
  };

  return map[raw] ?? null;
}

function marksheetStage(value: unknown): "started" | "pending" | "verified" {
  const raw = String(value ?? "started");
  return raw === "pending" || raw === "verified" ? raw : "started";
}

async function chunked<T>(rows: T[], write: (batch: T[]) => Promise<unknown>) {
  for (let index = 0; index < rows.length; index += CHUNK) {
    await write(rows.slice(index, index + CHUNK));
  }
}

/**
 * Explicit ids bypass the identity sequence, so the next insert would collide
 * on the primary key. Bumping each sequence past its table's max fixes that,
 * which is why this must run at the end of every migration.
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

  console.log(`  ok  reset ${tables.length} identity sequences`);
}

// --------------------------------------------------------------------- main

async function main() {
  const connection = await mysql.createConnection({
    host: required("LEGACY_MYSQL_HOST"),
    port: Number(process.env.LEGACY_MYSQL_PORT ?? 3306),
    user: required("LEGACY_MYSQL_USER"),
    password: required("LEGACY_MYSQL_PASSWORD"),
    database: required("LEGACY_MYSQL_DATABASE"),
    supportBigNumbers: true,
  });

  const read = async (sql: string) => {
    const [rows] = await connection.query<RowDataPacket[]>(sql);
    return rows;
  };

  console.log(
    DRY_RUN
      ? "\nDRY RUN - reading the legacy database, writing nothing.\n"
      : "\nMigrating the legacy MySQL database into Neon Postgres.\n",
  );

  // ---------------------------------------------------------------- inspect
  section("Source");

  const counts: Record<string, number> = {};

  for (const table of TABLES) {
    try {
      const rows = await read(`SELECT COUNT(*) AS n FROM \`${table}\``);
      counts[table] = Number(rows[0].n);
      console.log(`  ${table.padEnd(26)} ${String(counts[table]).padStart(6)}`);
    } catch {
      counts[table] = 0;
      console.log(`  ${table.padEnd(26)} ${"-".padStart(6)}  (table not present)`);
    }
  }

  // Flag anything the legacy schema is missing that this one expects.
  const branchColumns = new Set(
    (await read("SHOW COLUMNS FROM `branch`")).map((row) => String(row.Field)),
  );

  if (!branchColumns.has("credit_per_certificate")) {
    console.log(
      "\n  note: branch.credit_per_certificate is missing upstream - every branch gets the default of 200.",
    );
  }

  if (DRY_RUN) {
    console.log("\nNothing was written. Re-run without --dry-run to migrate.\n");
    await connection.end();
    return;
  }

  if (TRUNCATE) {
    section("Clearing the target");
    // Children first, so foreign keys never block the delete.
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
    console.log("  ok  target emptied");
  }

  // ---------------------------------------------------------------- branch
  section("branch");
  const branches = await read("SELECT * FROM `branch`");

  await chunked(branches, (batch) =>
    prisma.branch.createMany({
      skipDuplicates: true,
      data: batch.map((row) => ({
        id: BigInt(row.id),
        createdAt: timestamp(row.created_at),
        updatedAt: timestamp(row.updated_at),
        phone: String(row.phone ?? ""),
        emailId: String(row.email_id ?? ""),
        branchCode: String(row.branch_code),
        branchName: String(row.branch_name ?? ""),
        role: String(row.role ?? "branch"),
        addressLine1: String(row.address_line1 ?? ""),
        addressLine2: text(row.address_line2),
        city: String(row.city ?? ""),
        state: String(row.state ?? ""),
        zip: Number(row.zip ?? 0),
        firstName: String(row.first_name ?? ""),
        lastName: text(row.last_name),
        active: bool(row.active),
        image: text(row.image),
        // `pass` (the plaintext copy) is deliberately not carried across.
        password: String(row.password ?? ""),
        centerCreationDate: dateOnly(row.center_creation_date) ?? new Date(),
        credit: Number(row.credit ?? 0),
        creditPerCertificate: Number(row.credit_per_certificate ?? 200),
      })),
    }),
  );
  console.log(`  ok  ${branches.length} branches (plaintext 'pass' column dropped)`);

  // --------------------------------------------------------------- courses
  section("courses");
  const courses = await read("SELECT * FROM `courses`");

  await chunked(courses, (batch) =>
    prisma.course.createMany({
      skipDuplicates: true,
      data: batch.map((row) => ({
        courseId: BigInt(row.course_id),
        createdAt: timestamp(row.created_at),
        updatedAt: timestamp(row.updated_at),
        courseName: String(row.course_name),
        shortForm: String(row.short_form),
        courseDuration: Number(row.course_duration ?? 0),
        courseStatus: row.course_status === "inactive" ? "inactive" : "active",
        courseFees: decimal(row.course_fees) ?? "0.00",
        subjects: String(
          row.subjects ?? "Written Marks, Practical Marks, Project Marks, Viva Marks",
        ),
      })),
    }),
  );
  console.log(`  ok  ${courses.length} courses`);

  // --------------------------------------------------------------- student
  section("student");
  const students = await read("SELECT * FROM `student`");

  const branchIds = new Set(branches.map((row) => String(row.id)));
  const courseIds = new Set(courses.map((row) => String(row.course_id)));

  // A student whose branch or course no longer exists would fail the foreign
  // key; report them rather than aborting the whole run.
  const orphans = students.filter(
    (row) =>
      !branchIds.has(String(row.branch_id)) || !courseIds.has(String(row.student_course_id)),
  );

  const orphanSet = new Set(orphans);
  const importable = students.filter((row) => !orphanSet.has(row));

  await chunked(importable, (batch) =>
    prisma.student.createMany({
      skipDuplicates: true,
      data: batch.map((row) => ({
        studentId: BigInt(row.student_id),
        studentName: String(row.student_name ?? ""),
        registrationNumber: String(row.registration_number),
        studentEmail: text(row.student_email),
        studentPhone: String(row.student_phone ?? ""),
        studentFatherName: text(row.student_father_name),
        studentMotherName: text(row.student_mother_name),
        branchId: BigInt(row.branch_id),
        studentCourseId: BigInt(row.student_course_id),
        dob: dateOnly(row.dob) ?? new Date(0),
        address: text(row.address),
        city: text(row.city),
        state: text(row.state),
        zip: text(row.zip),
        admissionDate: dateOnly(row.admission_date) ?? new Date(0),
        relievingDate: dateOnly(row.relieving_date) ?? new Date(0),
        isStudentActive: bool(row.is_student_active),
        isStudentDeleted: bool(row.is_student_deleted),
        // Kept as the absolute URL it already is: certificates in circulation
        // point at it, and resolvePhotoUrl() rewrites the host when serving.
        studentPhoto: text(row.student_photo),
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
        createdAt: timestamp(row.created_at),
        updatedAt: timestamp(row.updated_at),
      })),
    }),
  );
  console.log(`  ok  ${importable.length} students`);

  if (orphans.length > 0) {
    console.log(`  !!  ${orphans.length} skipped - their branch or course no longer exists:`);
    for (const row of orphans.slice(0, 10)) {
      console.log(
        `        #${row.student_id} ${row.registration_number} (branch ${row.branch_id}, course ${row.student_course_id})`,
      );
    }
    if (orphans.length > 10) console.log(`        ...and ${orphans.length - 10} more`);
  }

  // ---------------------------------------------------- certificate_charge
  if (counts.certificate_charge > 0) {
    section("certificate_charge");
    const charges = await read("SELECT * FROM `certificate_charge`");

    await chunked(
      charges.filter((row) => branchIds.has(String(row.branch_id))),
      (batch) =>
        prisma.certificateCharge.createMany({
          skipDuplicates: true,
          data: batch.map((row) => ({
            id: BigInt(row.id),
            createdAt: timestamp(row.created_at),
            updatedAt: timestamp(row.updated_at),
            branchId: BigInt(row.branch_id),
            // The legacy table recorded no amount; leave it at zero rather
            // than invent one.
            amount: Number(row.amount ?? 0),
            reason: text(row.reason) ?? "Migrated from the legacy system",
          })),
        }),
    );
    console.log(`  ok  ${charges.length} credit ledger rows`);
  }

  // --------------------------------------------------------------- library
  if (counts.library_config > 0) {
    section("library");

    const config = await read("SELECT * FROM `library_config`");
    await chunked(config, (batch) =>
      prisma.libraryConfig.createMany({
        skipDuplicates: true,
        data: batch.map((row) => ({
          id: BigInt(row.id),
          configKey: String(row.config_key),
          configValue: String(row.config_value),
          valueType: String(row.value_type ?? "json"),
          description: text(row.description),
          createdAt: timestamp(row.created_at),
          updatedAt: timestamp(row.updated_at),
        })),
      }),
    );
    console.log(`  ok  ${config.length} config keys`);

    const members = await read("SELECT * FROM `library_members`");
    await chunked(members, (batch) =>
      prisma.libraryMember.createMany({
        skipDuplicates: true,
        data: batch.map((row) => ({
          memberId: BigInt(row.member_id),
          fullName: String(row.full_name ?? ""),
          phone: text(row.phone),
          notes: text(row.notes),
          isActive: bool(row.is_active),
          createdByAdminBranchId: row.created_by_admin_branch_id
            ? BigInt(row.created_by_admin_branch_id)
            : null,
          updatedByAdminBranchId: row.updated_by_admin_branch_id
            ? BigInt(row.updated_by_admin_branch_id)
            : null,
          createdAt: timestamp(row.created_at),
          updatedAt: timestamp(row.updated_at),
        })),
      }),
    );
    console.log(`  ok  ${members.length} members`);

    const bookings = await read("SELECT * FROM `library_bookings`");
    await chunked(bookings, (batch) =>
      prisma.libraryBooking.createMany({
        skipDuplicates: true,
        data: batch.map((row) => ({
          bookingId: BigInt(row.booking_id),
          bookingGroupId: String(row.booking_group_id),
          memberId: BigInt(row.member_id),
          bookingYear: Number(row.booking_year),
          bookingMonth: Number(row.booking_month),
          status: row.status === "secured" ? "secured" : "confirmed",
          blockCode: String(row.block_code ?? ""),
          seatId: String(row.seat_id ?? ""),
          seatLabel: String(row.seat_label ?? ""),
          note: text(row.note),
          monthlyPrice: decimal(row.monthly_price) ?? "0.00",
          paymentStatus: row.payment_status === "paid" ? "paid" : "pending",
          paymentMethod: text(row.payment_method),
          paymentCollectedBy: text(row.payment_collected_by),
          paymentNote: text(row.payment_note),
          paymentPaidAt: nullableTimestamp(row.payment_paid_at),
          createdByAdminBranchId: row.created_by_admin_branch_id
            ? BigInt(row.created_by_admin_branch_id)
            : null,
          updatedByAdminBranchId: row.updated_by_admin_branch_id
            ? BigInt(row.updated_by_admin_branch_id)
            : null,
          createdAt: timestamp(row.created_at),
          updatedAt: timestamp(row.updated_at),
        })),
      }),
    );
    console.log(`  ok  ${bookings.length} bookings`);

    const slots = await read("SELECT * FROM `library_booking_slots`");
    await chunked(slots, (batch) =>
      prisma.libraryBookingSlot.createMany({
        skipDuplicates: true,
        data: batch.map((row) => ({
          id: BigInt(row.id),
          bookingId: BigInt(row.booking_id),
          bookingYear: Number(row.booking_year),
          bookingMonth: Number(row.booking_month),
          seatId: String(row.seat_id),
          slotCode: String(row.slot_code),
          createdAt: timestamp(row.created_at),
          updatedAt: timestamp(row.updated_at),
        })),
      }),
    );
    console.log(`  ok  ${slots.length} booked slots`);

    const lockers = await read("SELECT * FROM `library_booking_lockers`");
    await chunked(lockers, (batch) =>
      prisma.libraryBookingLocker.createMany({
        skipDuplicates: true,
        data: batch.map((row) => ({
          id: BigInt(row.id),
          bookingId: BigInt(row.booking_id),
          bookingYear: Number(row.booking_year),
          bookingMonth: Number(row.booking_month),
          lockerNumber: Number(row.locker_number),
          createdAt: timestamp(row.created_at),
          updatedAt: timestamp(row.updated_at),
        })),
      }),
    );
    console.log(`  ok  ${lockers.length} locker allocations`);

    const logs = await read("SELECT * FROM `library_payment_logs`");
    await chunked(logs, (batch) =>
      prisma.libraryPaymentLog.createMany({
        skipDuplicates: true,
        data: batch.map((row) => ({
          id: BigInt(row.id),
          bookingId: BigInt(row.booking_id),
          amount: decimal(row.amount) ?? "0.00",
          paymentMethod: text(row.payment_method),
          collectedBy: text(row.collected_by),
          note: text(row.note),
          paidAt: nullableTimestamp(row.paid_at),
          createdByAdminBranchId: row.created_by_admin_branch_id
            ? BigInt(row.created_by_admin_branch_id)
            : null,
          createdAt: timestamp(row.created_at),
          updatedAt: timestamp(row.updated_at),
        })),
      }),
    );
    console.log(`  ok  ${logs.length} payment log entries`);
  }

  // ---------------------------------------------------------------- finish
  section("Finishing up");
  await resyncSequences();

  section("Verification");

  const after: Record<string, number> = {
    branch: await prisma.branch.count(),
    courses: await prisma.course.count(),
    student: await prisma.student.count(),
    library_bookings: await prisma.libraryBooking.count(),
  };

  let mismatch = false;

  for (const [table, target] of Object.entries(after)) {
    const source = counts[table] ?? 0;
    // Orphaned students were skipped on purpose, so compare against what was
    // actually importable rather than the raw source count.
    const expected = table === "student" ? importable.length : source;
    const ok = target === expected;
    if (!ok) mismatch = true;

    console.log(
      `  ${ok ? "ok  " : "FAIL"} ${table.padEnd(20)} source ${String(source).padStart(6)}   target ${String(target).padStart(6)}`,
    );
  }

  console.log(
    mismatch
      ? "\nFAIL  Row counts differ. Investigate before pointing the domain at this database.\n"
      : "\nDone. Migration complete and row counts match.\n",
  );

  console.log("Next: copy the student photos to R2 - see docs/R2_SETUP.md.\n");

  await connection.end();
}

main()
  .catch((error) => {
    console.error("\nFAIL  Migration failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
