import { handler, ok, parseQuery, validationFailed } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { fetchMonthBookings, hydrateBookings } from "@/lib/library";
import { libraryMonthSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export const GET = handler(async (request) => {
  await requireAdmin();

  const parsed = parseQuery(request, libraryMonthSchema);
  if (!parsed.success) return validationFailed(parsed.error);

  const { year, month, search } = parsed.data;
  const bookings = await fetchMonthBookings(year, month, search ?? "");

  return ok("Library bookings loaded successfully.", await hydrateBookings(bookings, year));
});
