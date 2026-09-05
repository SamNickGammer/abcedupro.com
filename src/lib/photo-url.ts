import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Turns a stored photo reference into something a browser can load.
 *
 * There are two ways a photo can be served:
 *
 *  1. Straight from the bucket's public URL, when R2_PUBLIC_BASE_URL is set.
 *     Fastest — Cloudflare serves it, egress is free, nothing touches the app.
 *
 *  2. Through `/api/photos/...`, which streams the object using the S3
 *     credentials. Needs no bucket configuration at all, so the app works the
 *     moment the four R2 keys are present.
 *
 * Route (2) is also the more private of the two: the legacy site served every
 * student photo as a plain public URL with no permission check, so anyone who
 * could guess a path could pull a minor's photograph. Through the app, a photo
 * is readable by signed-in staff, or by a caller holding a signed link — which
 * the public verification endpoint issues only after the registration number
 * and date of birth have both matched.
 */

const SIGNATURE_TTL_SECONDS = 30 * 60;

function publicBaseUrl() {
  const value = process.env.R2_PUBLIC_BASE_URL;
  return value ? value.replace(/\/+$/, "") : null;
}

/** Strips a legacy absolute URL back to the object key it refers to. */
export function toObjectKey(stored: string): string | null {
  const legacyHost = /^https?:\/\/(?:www\.)?abcedupro\.com\//i;

  if (legacyHost.test(stored)) return stored.replace(legacyHost, "");
  if (/^https?:\/\//i.test(stored)) return null; // absolute and elsewhere
  return stored.replace(/^\/+/, "");
}

/**
 * A URL for signed-in staff. Prefers the public bucket URL when there is one,
 * and otherwise points at the app's own streaming route.
 */
export function photoUrl(stored: string | null | undefined): string | null {
  if (!stored) return null;

  // Anything absolute that is not the old host is already servable.
  if (/^https?:\/\//i.test(stored) && !/^https?:\/\/(?:www\.)?abcedupro\.com\//i.test(stored)) {
    return stored;
  }

  const key = toObjectKey(stored);
  if (!key) return stored;

  const base = publicBaseUrl();

  // Over half of the production filenames contain spaces ("naushad 2273.jpg"),
  // and some contain other characters that are not URL-safe. Keys are stored
  // decoded, so each segment is encoded exactly once here.
  return base ? `${base}/${encodeKey(key)}` : `/api/photos/${encodeKey(key)}`;
}

/**
 * A URL safe to hand to an anonymous visitor, valid for half an hour.
 *
 * When the bucket is public this is just the public URL — the object is world
 * readable anyway, so a signature would be theatre. Otherwise it is the app
 * route plus an expiring HMAC.
 */
export function signedPhotoUrl(stored: string | null | undefined): string | null {
  if (!stored) return null;

  const base = publicBaseUrl();
  if (base) return photoUrl(stored);

  const key = toObjectKey(stored);
  if (!key) return photoUrl(stored);

  const expires = Math.floor(Date.now() / 1000) + SIGNATURE_TTL_SECONDS;

  // The signature covers the decoded key, which is what the route compares
  // after decoding its own path segments.
  return `/api/photos/${encodeKey(key)}?exp=${expires}&sig=${sign(key, expires)}`;
}

export function verifyPhotoSignature(key: string, exp: string | null, sig: string | null) {
  if (!exp || !sig) return false;

  const expires = Number(exp);
  if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) return false;

  const expected = Buffer.from(sign(key, expires));
  const provided = Buffer.from(sig);

  // Lengths must match before timingSafeEqual will accept the comparison.
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

function sign(key: string, expires: number) {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET is not set; photo links cannot be signed.");
  }

  return createHmac("sha256", secret).update(`${key}:${expires}`).digest("base64url");
}

/** Each path segment is encoded separately so the slashes survive. */
function encodeKey(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}
