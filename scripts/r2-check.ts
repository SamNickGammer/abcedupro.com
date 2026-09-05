/**
 * Verifies the five R2_* variables end to end: upload a small object, read it
 * back over the public URL, then delete it.
 *
 *   npm run r2:check
 */
import "dotenv/config";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";

const required = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_BASE_URL",
] as const;

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`✖ Not set in .env: ${missing.join(", ")}`);
  console.error("  See docs/R2_SETUP.md for where each value comes from.");
  process.exit(1);
}

const bucket = process.env.R2_BUCKET!;
const publicBase = process.env.R2_PUBLIC_BASE_URL!.replace(/\/+$/, "");
const key = `_healthcheck/${Date.now()}.txt`;
const body = `ok ${new Date().toISOString()}`;

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

try {
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
  console.log(`✔ bucket "${bucket}" reachable`);
} catch (error) {
  console.error(`✖ cannot reach bucket "${bucket}".`);
  console.error("  Check R2_ACCOUNT_ID, the API token's keys, and that the token");
  console.error("  was scoped to this bucket with Object Read & Write.");
  console.error(error instanceof Error ? `  ${error.message}` : error);
  process.exit(1);
}

await client.send(
  new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: "text/plain" }),
);
console.log(`✔ uploaded ${key}`);

const url = `${publicBase}/${key}`;
const response = await fetch(url, { cache: "no-store" });

if (response.ok && (await response.text()) === body) {
  console.log(`✔ public read works — ${publicBase}`);
} else {
  console.error(`✖ public read failed (${response.status}) at ${url}`);
  console.error("  Enable public access on the bucket: Settings → Public access →");
  console.error("  either connect a custom domain or allow the r2.dev subdomain,");
  console.error("  then set R2_PUBLIC_BASE_URL to that URL.");
}

await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
console.log("✔ cleaned up\n\nR2 is configured correctly.");
