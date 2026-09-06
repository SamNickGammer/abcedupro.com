/**
 * Uploads the manager photographs to R2 under the same `manager/{branchId}/`
 * layout the database already points at.
 *
 *   npm run upload:managers -- <path-to-manager-folder>
 *
 * Separate from the student import because these live in their own folder and
 * were not part of the student_photo export.
 */
import "dotenv/config";
import { readdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const dir = process.argv[2];
if (!dir) {
  console.error("Usage: npm run upload:managers -- <path-to-manager-folder>");
  process.exit(1);
}

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function main() {
  const bucket = process.env.R2_BUCKET!;
  const files: Array<{ key: string; file: string }> = [];

  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (!statSync(full).isDirectory()) continue;

    for (const name of readdirSync(full)) {
      if (name === ".DS_Store") continue;
      files.push({ key: `manager/${entry}/${name}`, file: path.join(full, name) });
    }
  }

  console.log(`\n${files.length} manager photographs to upload\n`);

  for (const item of files) {
    const body = await readFile(item.file);
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: item.key,
        Body: body,
        ContentType: CONTENT_TYPES[path.extname(item.file).toLowerCase()] ?? "application/octet-stream",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    console.log(`  uploaded ${item.key}  (${body.length} bytes)`);
  }

  // Report which branches now resolve and which still do not.
  const branches = await prisma.branch.findMany({
    where: { NOT: { image: null } },
    select: { id: true, branchCode: true, image: true },
    orderBy: { id: "asc" },
  });

  const uploaded = new Set(files.map((f) => f.key));
  console.log("\nBranch images:");
  for (const branch of branches) {
    const ok = uploaded.has(branch.image!);
    console.log(`  ${ok ? "ok  " : "MISS"} #${branch.id} ${branch.branchCode.padEnd(8)} ${branch.image}`);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("\nFAIL", error);
  process.exitCode = 1;
});
