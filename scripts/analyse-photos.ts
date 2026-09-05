/**
 * Breaks down exactly how the photos referenced by the database line up with
 * the files on disk.
 *
 *   npm run dump:photos -- <path-to.sql> <path-to-student_photo>
 *
 * The interesting cases are the mismatches: a row pointing at a filename that
 * is no longer in the folder, which happens when a photo was replaced without
 * the row being updated.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { parseInserts, photoKey, text } from "./lib/sql-dump";

const [, , sqlPath, photoDir] = process.argv;

if (!sqlPath || !photoDir) {
  console.error("Usage: npm run dump:photos -- <path-to.sql> <path-to-student_photo>");
  process.exit(1);
}

const students = parseInserts(readFileSync(sqlPath, "utf8"), "student");

/** studentId -> the filenames actually present in that student's folder. */
const folders = new Map<string, string[]>();

for (const entry of readdirSync(photoDir)) {
  const full = path.join(photoDir, entry);
  if (!statSync(full).isDirectory()) continue;
  folders.set(
    entry,
    readdirSync(full).filter((file) => file !== ".DS_Store"),
  );
}

const buckets = {
  exact: [] as string[],
  /** Row points at a name that is gone, but the folder holds exactly one file. */
  singleAlternative: [] as Array<{ id: string; wanted: string; found: string }>,
  /** Gone, and the folder holds several files — ambiguous which is current. */
  multipleAlternatives: [] as Array<{ id: string; wanted: string; found: string[] }>,
  /** Folder exists but is empty. */
  emptyFolder: [] as Array<{ id: string; wanted: string }>,
  /** No folder at all. */
  noFolder: [] as Array<{ id: string; wanted: string }>,
  noPhotoColumn: [] as string[],
};

for (const student of students) {
  const id = String(student.student_id);
  const key = photoKey(student.student_photo);

  if (!key) {
    buckets.noPhotoColumn.push(id);
    continue;
  }

  const [, folderId, ...rest] = key.split("/");
  const filename = rest.join("/");
  const present = folders.get(folderId);

  if (present === undefined) {
    buckets.noFolder.push({ id, wanted: key });
  } else if (present.includes(filename)) {
    buckets.exact.push(id);
  } else if (present.length === 0) {
    buckets.emptyFolder.push({ id, wanted: key });
  } else if (present.length === 1) {
    buckets.singleAlternative.push({ id, wanted: filename, found: present[0] });
  } else {
    buckets.multipleAlternatives.push({ id, wanted: filename, found: present });
  }
}

const total = students.length;
const pct = (n: number) => `${((n / total) * 100).toFixed(1)}%`;

console.log(`\nStudents: ${total}\n`);
console.log(`  exact file present          ${String(buckets.exact.length).padStart(5)}  ${pct(buckets.exact.length)}`);
console.log(`  no photo on the row         ${String(buckets.noPhotoColumn.length).padStart(5)}  ${pct(buckets.noPhotoColumn.length)}`);
console.log(`  renamed, one file in folder ${String(buckets.singleAlternative.length).padStart(5)}  ${pct(buckets.singleAlternative.length)}`);
console.log(`  renamed, several candidates ${String(buckets.multipleAlternatives.length).padStart(5)}  ${pct(buckets.multipleAlternatives.length)}`);
console.log(`  folder empty                ${String(buckets.emptyFolder.length).padStart(5)}  ${pct(buckets.emptyFolder.length)}`);
console.log(`  folder absent               ${String(buckets.noFolder.length).padStart(5)}  ${pct(buckets.noFolder.length)}`);

console.log("\n--- renamed, one file in folder (safe to repoint) ---");
for (const row of buckets.singleAlternative.slice(0, 12)) {
  console.log(`  #${row.id.padEnd(5)} wanted "${row.wanted}"  ->  found "${row.found}"`);
}
if (buckets.singleAlternative.length > 12) {
  console.log(`  ...and ${buckets.singleAlternative.length - 12} more`);
}

// How often the replacement is one of the generic placeholders, which tells us
// whether these students ever really had a photograph.
const placeholders = new Map<string, number>();
for (const row of buckets.singleAlternative) {
  placeholders.set(row.found, (placeholders.get(row.found) ?? 0) + 1);
}
console.log("\n  most common replacement filenames:");
for (const [name, count] of [...placeholders].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
  console.log(`    ${String(count).padStart(4)}x  ${name}`);
}

console.log("\n--- renamed, several candidates (ambiguous) ---");
for (const row of buckets.multipleAlternatives.slice(0, 12)) {
  console.log(`  #${row.id.padEnd(5)} wanted "${row.wanted}"  ->  ${JSON.stringify(row.found)}`);
}
if (buckets.multipleAlternatives.length > 12) {
  console.log(`  ...and ${buckets.multipleAlternatives.length - 12} more`);
}

console.log("\n--- folder empty or absent (no photo exists) ---");
for (const row of [...buckets.emptyFolder, ...buckets.noFolder].slice(0, 12)) {
  console.log(`  #${row.id.padEnd(5)} ${row.wanted}`);
}
const gone = buckets.emptyFolder.length + buckets.noFolder.length;
if (gone > 12) console.log(`  ...and ${gone - 12} more`);

console.log("");
