import { handler, type RouteContext } from "@/lib/api";
import { downloadDocument } from "@/lib/documents/route-helpers";

export const runtime = "nodejs";
export const maxDuration = 60;

export const GET = handler(async (request, context: RouteContext) => {
  const { id } = await context.params;
  return downloadDocument({ kind: "marksheet", studentId: Number(id), request });
});
