import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSession } from "@/lib/auth";
import { getStorageClient } from "@/lib/storage";
import { verifyPhotoSignature } from "@/lib/photo-url";

export const runtime = "nodejs";

/**
 * Streams a photo out of R2.
 *
 * Used when the bucket has no public URL, which means the app works with only
 * the four S3 credentials configured. Access is granted to signed-in staff, or
 * to a caller holding a signed link — the public verification endpoint issues
 * one only after the registration number and date of birth have matched.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ key: string[] }> },
) {
  const { key: segments } = await context.params;
  const key = segments.map(decodeURIComponent).join("/");

  // Keys come from the URL, so a traversal attempt must not reach the bucket.
  if (!key || key.includes("..") || key.startsWith("/")) {
    return new Response("Not found", { status: 404 });
  }

  // Only the two prefixes the app writes are readable through here.
  if (!key.startsWith("student_photo/") && !key.startsWith("manager/")) {
    return new Response("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const signed = verifyPhotoSignature(key, url.searchParams.get("exp"), url.searchParams.get("sig"));

  if (!signed && !(await getSession())) {
    return new Response("Unauthorized", { status: 401 });
  }

  let object;
  try {
    const { client, bucket } = getStorageClient();
    object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  } catch {
    return new Response("Not found", { status: 404 });
  }

  if (!object.Body) return new Response("Not found", { status: 404 });

  return new Response(object.Body.transformToWebStream(), {
    headers: {
      "Content-Type": object.ContentType ?? "image/jpeg",
      "Content-Length": String(object.ContentLength ?? ""),
      // Private: the response is tied to a session or a signature, so a shared
      // cache must not hand it to the next person.
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
