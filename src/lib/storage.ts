import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { HttpError } from "@/lib/errors";

/**
 * Cloudflare R2 is S3-compatible, so the standard AWS SDK talks to it — the
 * only differences are the endpoint and that the region is always "auto".
 *
 * Photos are stored under the legacy `student_photo/{id}/{filename}` key
 * layout. That matters: every certificate already issued embeds a URL in that
 * shape, and `rclone` can push the existing files straight into the same
 * prefixes.
 *
 * What is stored in the database is the **object key**, not an absolute URL.
 * `resolvePhotoUrl` builds the URL at read time, which means the bucket can
 * move from an r2.dev subdomain to a custom domain without rewriting a single
 * row. Rows migrated from the old system hold absolute URLs instead, and are
 * rewritten on the way out — so both shapes work.
 */

let client: S3Client | null = null;

/** The four values needed to read and write objects. */
function credentials() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;

  return { accountId, accessKeyId, secretAccessKey, bucket };
}

/** Set once the bucket is published; uploads do not depend on it. */
function publicBaseUrl() {
  const value = process.env.R2_PUBLIC_BASE_URL;
  return value ? value.replace(/\/+$/, "") : null;
}

/** Whether photos can be uploaded at all. */
export function storageConfigured() {
  return credentials() !== null;
}

/** Whether stored photos can actually be displayed to a browser. */
export function storagePublic() {
  return publicBaseUrl() !== null;
}

function getClient() {
  const cfg = credentials();

  if (!cfg) {
    throw new HttpError(
      "Image storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, " +
        "R2_SECRET_ACCESS_KEY and R2_BUCKET in .env — see docs/R2_SETUP.md.",
      503,
    );
  }

  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });

  return { client, cfg };
}

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // matches the old `max:2048` rule

export type UploadedImage = {
  /** What gets stored in the database. */
  key: string;
  /** Servable URL, or null until the bucket is published. */
  url: string | null;
};

/**
 * Resizes to fit 300x300 and uploads. The legacy code did the same with
 * Intervention's `resize(300, 300, aspectRatio + upsize)`, i.e. "fit inside
 * the box, never enlarge" — `sharp`'s `fit: inside, withoutEnlargement` is
 * exactly that.
 */
export async function uploadImage(
  file: File,
  prefix: string,
  id: number | bigint,
): Promise<UploadedImage> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new HttpError("Photo must be a JPEG, PNG, GIF or WebP image.", 422);
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new HttpError("Photo must be 2 MB or smaller.", 422);
  }

  const input = Buffer.from(await file.arrayBuffer());

  const resized = await sharp(input)
    .rotate() // honour EXIF orientation; phone uploads are frequently sideways
    .resize(300, 300, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();

  const key = `${prefix}/${id}/${safeFilename(file.name)}`;
  const { client: s3, cfg } = getClient();

  await s3.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: resized,
      ContentType: "image/jpeg",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  const base = publicBaseUrl();

  return { key, url: base ? `${base}/${key}` : null };
}

export async function deleteImage(key: string) {
  const { client: s3, cfg } = getClient();
  await s3.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
}

/**
 * Filenames reach the object key, so anything that could climb out of the
 * prefix or confuse a URL parser is stripped. Always ends in `.jpg` because
 * `uploadImage` re-encodes to JPEG.
 */
function safeFilename(original: string) {
  const base = original
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^[._-]+/, "")
    .slice(0, 80);

  return `${base || "photo"}.jpg`;
}

/**
 * Turns whatever is stored on the row into a URL a browser can load.
 *
 * Three shapes reach this:
 *   - an object key from a new upload      → prefix with the public base
 *   - an absolute legacy abcedupro.com URL → swap the host for the public base
 *   - any other absolute URL               → leave alone
 *
 * Returns null when the bucket has no public URL yet, so callers render their
 * placeholder rather than a broken image.
 */
export function resolvePhotoUrl(stored: string | null | undefined): string | null {
  if (!stored) return null;

  const base = publicBaseUrl();
  const legacyHost = /^https?:\/\/(?:www\.)?abcedupro\.com\//i;

  if (legacyHost.test(stored)) {
    return base ? stored.replace(legacyHost, `${base}/`) : stored;
  }

  // Anything else absolute is already servable as-is.
  if (/^https?:\/\//i.test(stored)) return stored;

  if (!base) return null;

  return `${base}/${stored.replace(/^\/+/, "")}`;
}
