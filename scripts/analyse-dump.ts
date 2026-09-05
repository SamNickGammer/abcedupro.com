/**
 * Reads the phpMyAdmin dump and the photo folder and reports what is there,
 * without touching the database.
 *
 *   npm run dump:analyse -- <path-to.sql> <path-to-student_photo>
 *
 * Run this before importing. It is the pass that catches the things a row
 * count would not: duplicate registration numbers, marks that will not parse,
 * students pointing at a branch that no longer exists, photos referenced by
 * the database but missing from disk.
 */
import "dotenv/config";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import {
  parseInserts,
  photoKey,
  text,
  type Row,
} from "./lib/sql-dump";

const [, , sqlPath, photoDir] = process.argv;

if (!sqlPath) {
  console.error("Usage: npm run dump:analyse -- <path-to.sql> [<path-to-student_photo>]");
  process.exit(1);
}

function heading(title: string) {
  console.log(`\n${"=".repeat(64)}\n${title}\n${"=".repeat(64)}`);
}

function counted<T>(label: string, items: T[], show = 8, render: (item: T) => string = String) {
  if (items.length === 0) {
    console.log(`  ok    ${label}: none`);
    return;
  }
  console.log(`  !!    ${label}: ${items.length}`);
  for (const item of items.slice(0, show)) console.log(`          ${render(item)}`);
  if (items.length > show) console.log(`          ...and ${items.length - show} more`);
}

const dump = readFileSync(sqlPath, "utf8");

const branches = parseInserts(dump, "branch");
const courses = parseInserts(dump, "courses");
const students = parseInserts(dump, "student");

heading("Row counts");
console.log(`  branch   ${String(branches.length).padStart(6)}`);
console.log(`  courses  ${String(courses.length).padStart(6)}`);
console.log(`  student  ${String(students.length).padStart(6)}`);

// ------------------------------------------------------------------ branch

heading("Branches");
const roles = new Map<string, number>();
for (const b of branches) {
  const role = String(b.role ?? "");
  roles.set(role, (roles.get(role) ?? 0) + 1);
}
console.log(`  roles: ${[...roles].map(([r, n]) => `${r}=${n}`).join(", ")}`);
console.log(`  active: ${branches.filter((b) => b.active === 1).length} / ${branches.length}`);

const branchIds = new Set(branches.map((b) => String(b.id)));
const branchCodes = branches.map((b) => String(b.branch_code));
counted(
  "duplicate branch codes",
  [...new Set(branchCodes.filter((c, i) => branchCodes.indexOf(c) !== i))],
);
counted("branches with no password hash", branches.filter((b) => !text(b.password)), 8,
  (b) => `#${b.id} ${b.branch_code}`);

const hashes = new Set(branches.map((b) => String(b.password)));
console.log(`  distinct password hashes: ${hashes.size}`);

// ----------------------------------------------------------------- courses

heading("Courses");
const courseIds = new Set(courses.map((c) => String(c.course_id)));
for (const c of courses) {
  console.log(
    `  #${String(c.course_id).padStart(3)} ${String(c.short_form).padEnd(10)} ${String(c.course_name).slice(0, 42).padEnd(44)} ${String(c.course_duration).padStart(2)}mo  Rs.${c.course_fees}  ${c.course_status}`,
  );
}

// ----------------------------------------------------------------- students

heading("Students - referential integrity");
counted(
  "students whose branch is missing",
  students.filter((s) => !branchIds.has(String(s.branch_id))),
  8,
  (s) => `#${s.student_id} ${s.registration_number} -> branch ${s.branch_id}`,
);
counted(
  "students whose course is missing",
  students.filter((s) => !courseIds.has(String(s.student_course_id))),
  8,
  (s) => `#${s.student_id} ${s.registration_number} -> course ${s.student_course_id}`,
);

heading("Students - uniqueness");
const dupes = (field: string, rows: Row[]) => {
  const seen = new Map<string, Row[]>();
  for (const r of rows) {
    const value = text(r[field]);
    if (!value) continue;
    (seen.get(value) ?? seen.set(value, []).get(value)!).push(r);
  }
  return [...seen.entries()].filter(([, group]) => group.length > 1);
};

counted("duplicate registration_number", dupes("registration_number", students), 8,
  ([value, group]) => `${value} -> ids ${group.map((g) => g.student_id).join(", ")}`);
counted("duplicate marksheet_id", dupes("marksheet_id", students), 8,
  ([value, group]) => `${value} -> ids ${group.map((g) => g.student_id).join(", ")}`);
counted("duplicate aadhaar_number", dupes("aadhaar_number", students), 8,
  ([value, group]) => `${value} -> ids ${group.map((g) => g.student_id).join(", ")}`);

heading("Students - workflow state");
const stages = new Map<string, number>();
for (const s of students) {
  const stage = String(s.marksheet_stage ?? "");
  stages.set(stage, (stages.get(stage) ?? 0) + 1);
}
console.log(`  marksheet_stage: ${[...stages].map(([k, n]) => `${k}=${n}`).join(", ")}`);
console.log(`  certificate approved: ${students.filter((s) => s.is_certificate_approve === 1).length}`);
console.log(`  with marksheet_id:    ${students.filter((s) => text(s.marksheet_id)).length}`);
console.log(`  with marks:           ${students.filter((s) => text(s.marks)).length}`);
console.log(`  with aadhaar:         ${students.filter((s) => text(s.aadhaar_number)).length}`);
console.log(`  active:               ${students.filter((s) => s.is_student_active === 1).length}`);

const performances = new Map<string, number>();
for (const s of students) {
  const p = text(s.performance) ?? "(null)";
  performances.set(p, (performances.get(p) ?? 0) + 1);
}
console.log(`  performance: ${[...performances].map(([k, n]) => `${k}=${n}`).join(", ")}`);

heading("Students - marks parse check");
const badMarks: Row[] = [];
const subjectNames = new Map<string, number>();
for (const s of students) {
  const raw = text(s.marks);
  if (!raw) continue;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      badMarks.push(s);
      continue;
    }
    for (const [subject, value] of Object.entries(parsed as Record<string, unknown>)) {
      subjectNames.set(subject, (subjectNames.get(subject) ?? 0) + 1);
      if (!Number.isFinite(Number(value))) badMarks.push(s);
    }
  } catch {
    badMarks.push(s);
  }
}
counted("marks that will not parse", badMarks, 8, (s) => `#${s.student_id} ${String(s.marks).slice(0, 80)}`);
console.log(`  subjects seen: ${[...subjectNames].map(([k, n]) => `"${k}"=${n}`).join(", ")}`);

heading("Students - dates");
const badDate = (field: string) =>
  students.filter((s) => {
    const raw = text(s[field]);
    return raw !== null && !/^\d{4}-\d{2}-\d{2}/.test(raw);
  });
for (const field of ["dob", "admission_date", "relieving_date", "certified_date"]) {
  counted(`malformed ${field}`, badDate(field), 4, (s) => `#${s.student_id} ${s[field]}`);
}

// ------------------------------------------------------------------ photos

heading("Photos");
const referenced = students.filter((s) => text(s.student_photo));
console.log(`  students referencing a photo: ${referenced.length} / ${students.length}`);

const hosts = new Map<string, number>();
for (const s of referenced) {
  const raw = String(s.student_photo);
  const host = /^https?:\/\/([^/]+)/i.exec(raw)?.[1] ?? "(relative)";
  hosts.set(host, (hosts.get(host) ?? 0) + 1);
}
console.log(`  hosts: ${[...hosts].map(([h, n]) => `${h}=${n}`).join(", ")}`);

const keys = referenced.map((s) => ({ student: s, key: photoKey(s.student_photo) }));
counted("photo values that yield no key", keys.filter((k) => !k.key), 5,
  (k) => `#${k.student.student_id} ${k.student.student_photo}`);

const badPrefix = keys.filter((k) => k.key && !k.key.startsWith("student_photo/"));
counted("photo keys outside student_photo/", badPrefix, 8,
  (k) => `#${k.student.student_id} ${k.key}`);

if (photoDir && existsSync(photoDir)) {
  // Every file on disk, as the key it will be uploaded under.
  const onDisk = new Set<string>();
  for (const dir of readdirSync(photoDir)) {
    const full = path.join(photoDir, dir);
    if (!statSync(full).isDirectory()) continue;
    for (const file of readdirSync(full)) {
      if (file === ".DS_Store") continue;
      onDisk.add(`student_photo/${dir}/${file}`);
    }
  }

  console.log(`  files on disk: ${onDisk.size}`);

  const missing = keys.filter((k) => k.key && !onDisk.has(k.key));
  counted("referenced by DB but missing on disk", missing, 10,
    (k) => `#${k.student.student_id} ${k.student.registration_number} -> ${k.key}`);

  const usedKeys = new Set(keys.map((k) => k.key).filter(Boolean) as string[]);
  const orphans = [...onDisk].filter((f) => !usedKeys.has(f));
  console.log(`  on disk but not referenced: ${orphans.length}  (uploaded anyway - old certificates may link to them)`);

  // Does the folder id match the student id the row belongs to?
  const mismatched = keys.filter((k) => {
    if (!k.key) return false;
    const folder = k.key.split("/")[1];
    return folder !== String(k.student.student_id);
  });
  counted("photo folder id != student id", mismatched, 8,
    (k) => `#${k.student.student_id} -> ${k.key}`);
} else {
  console.log("  (photo folder not given or not found - skipping disk cross-check)");
}

console.log("\nAnalysis complete. Nothing was written.\n");
