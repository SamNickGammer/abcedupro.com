import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { HttpError } from "@/lib/errors";

/**
 * Cloudflare R2 is S3-compatible, so the standard AWS SDK talks to it — the
 * only differences are the endpoint and that the region is always "auto".
 *
 * Uploads keep the legacy `student_photo/{id}/{filename}` key layout. That
 * matters: every certificate already issued embeds a URL in that shape, and
 * `rclone` can push the existing 2,609 files straight into the same prefixes.
 */

let client: S3Client | null = null;

function config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
    return null;
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl };
}

export function storageConfigured() {
  return config() !== null;
}

function getClient() {
  const cfg = config();

  if (!cfg) {
    throw new HttpError(
      "Image storage is not configured. Set the R2_* variables in .env — see docs/R2_SETUP.md.",
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

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // matches the old `max:2048` rule

export type UploadedImage = { url: string; key: string };

/**
 * Resizes to fit 300x300 and uploads. The legacy code did the same thing with
 * Intervention's `resize(300, 300, aspectRatio + upsize)`, i.e. "fit inside the
 * box, never enlarge" — `sharp`'s `fit: inside, withoutEnlargement` is exactly
 * that.
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

  return { key, url: `${cfg.publicBaseUrl.replace(/\/+$/, "")}/${key}` };
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
 * Photos issued before the migration are stored as absolute URLs pointing at
 * the old cPanel host. Rewriting them to R2 lets old rows resolve without a
 * database backfill; anything already absolute-and-elsewhere is left alone.
 */
export function resolvePhotoUrl(stored: string | null | undefined): string | null {
  if (!stored) return null;

  const cfg = config();
  if (!cfg) return stored;

  const legacyPrefix = /^https?:\/\/(?:www\.)?abcedupro\.com\//i;

  if (legacyPrefix.test(stored)) {
    return stored.replace(legacyPrefix, `${cfg.publicBaseUrl.replace(/\/+$/, "")}/`);
  }

  if (stored.startsWith("/")) {
    return `${cfg.publicBaseUrl.replace(/\/+$/, "")}${stored}`;
  }

  return stored;
}
