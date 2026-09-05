/**
 * Verifies the R2 configuration end to end.
 *
 *   npm run r2:check
 *
 * Credentials and public access are checked separately, because they fail for
 * different reasons and are fixed in different places: the keys come from an
 * API token, the public URL from the bucket's own settings.
 */
import "dotenv/config";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

const CREDENTIALS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
] as const;

const missing = CREDENTIALS.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`FAIL  Not set in .env: ${missing.join(", ")}`);
  console.error("      See docs/R2_SETUP.md for where each value comes from.");
  process.exit(1);
}

const bucket = process.env.R2_BUCKET!;
const publicBase = (process.env.R2_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
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

async function main() {
  console.log(`\nBucket   ${bucket}`);
  console.log(`Endpoint https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com\n`);

  // ------------------------------------------------------------- credentials

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log("ok    credentials valid, bucket reachable");
  } catch (error) {
    console.error(`FAIL  cannot reach bucket "${bucket}".`);
    console.error("      Check R2_ACCOUNT_ID and the API token's Access Key ID / Secret,");
    console.error("      and that the token has Object Read & Write on this bucket.");
    console.error(error instanceof Error ? `      ${error.message}` : error);
    process.exit(1);
  }

  // ------------------------------------------------------------------ write

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "text/plain",
    }),
  );
  console.log(`ok    upload works (${key})`);

  // Reading it back through the API proves the token has read as well as write,
  // independently of whether the bucket is published.
  const read = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const roundTripped = await read.Body?.transformToString();

  if (roundTripped === body) {
    console.log("ok    read-back works");
  } else {
    console.error("FAIL  the object read back did not match what was written.");
  }

  // ------------------------------------------------------------ public read

  let publicOk = false;

  if (!publicBase) {
    console.log("SKIP  public read - R2_PUBLIC_BASE_URL is not set yet");
  } else {
    const url = `${publicBase}/${key}`;

    try {
      const response = await fetch(url, { cache: "no-store" });

      if (response.ok && (await response.text()) === body) {
        console.log(`ok    public read works (${publicBase})`);
        publicOk = true;
      } else {
        console.error(`FAIL  public read returned ${response.status} for ${url}`);
      }
    } catch (error) {
      console.error(`FAIL  public read could not reach ${url}`);
      console.error(error instanceof Error ? `      ${error.message}` : error);
    }
  }

  // ------------------------------------------------------------------ tidy up

  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  console.log("ok    cleaned up");

  // What is already in the bucket, so a migration can be checked afterwards.
  const listing = await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 5 }));
  const total = listing.KeyCount ?? 0;

  console.log(
    total === 0
      ? "\nBucket is currently empty."
      : `\nBucket currently holds objects, first few:\n${(listing.Contents ?? [])
          .map((object) => `  ${object.Key}  (${object.Size} bytes)`)
          .join("\n")}${listing.IsTruncated ? "\n  ..." : ""}`,
  );

  if (publicOk) {
    console.log("\nR2 is fully configured - photo upload and display will both work.\n");
  } else if (!publicBase) {
    console.log(
      [
        "",
        "Uploads will work, but photos will not display until the bucket is public.",
        "",
        "In the Cloudflare dashboard: R2 > your bucket > Settings > Public access.",
        "  Either  connect a custom domain (e.g. cdn.abcedupro.com), or",
        "  enable  the r2.dev subdomain for testing.",
        "",
        "Then set the URL it gives you as R2_PUBLIC_BASE_URL in .env (no trailing slash)",
        "and run this again.",
        "",
      ].join("\n"),
    );
  } else {
    console.log("\nUploads work, but the public URL is not serving. See the error above.\n");
  }
}

main().catch((error) => {
  console.error("\nFAIL  R2 check failed:", error);
  process.exitCode = 1;
});
