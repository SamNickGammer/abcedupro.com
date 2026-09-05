import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { siteUrl } from "@/lib/domain";
import { renderPdf } from "@/lib/documents/pdf";
import { authoriseDocumentAccess } from "@/lib/documents/access";

/**
 * Shared body of both PDF download routes: authorise, print the matching
 * `/print/…?bare=1` page, and stream it back as an attachment.
 */
export async function downloadDocument({
  kind,
  studentId,
  request,
}: {
  kind: "certificate" | "marksheet";
  studentId: number;
  request: Request;
}) {
  if (!Number.isInteger(studentId) || studentId <= 0) {
    throw new HttpError("Invalid student id.", 400);
  }

  await authoriseDocumentAccess(studentId);

  const student = await prisma.student.findUnique({
    where: { studentId: BigInt(studentId) },
    select: { registrationNumber: true },
  });

  if (!student) throw new HttpError("Student not found.", 404);

  // Chromium fetches the page over HTTP, so it must reach this same server —
  // in dev that is the request's own origin, in production the configured one.
  const origin = process.env.NEXT_PUBLIC_SITE_URL
    ? siteUrl()
    : new URL(request.url).origin;

  const pdf = await renderPdf({
    url: `${origin}/print/${kind}/${studentId}?bare=1`,
    cookieHeader: request.headers.get("cookie"),
  });

  const label = kind === "certificate" ? "Certificate" : "Marksheet";
  const filename = `${label}_${student.registrationNumber.replace(/[/\\]/g, "-")}.pdf`;

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
