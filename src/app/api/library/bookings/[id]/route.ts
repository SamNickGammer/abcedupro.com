import { prisma } from "@/lib/db";
import { fail, handler, ok, parseQuery, validationFailed, type RouteContext } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { libraryDeleteSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

/**
 * `scope=month` removes this month only; `scope=all` removes every month in the
 * same booking group. Slots, lockers and payment logs cascade with the booking.
 */
export const DELETE = handler(async (request, context: RouteContext) => {
  await requireAdmin();

  const { id } = await context.params;
  const parsed = parseQuery(request, libraryDeleteSchema);
  if (!parsed.success) return validationFailed(parsed.error);

  const booking = await prisma.libraryBooking.findUnique({
    where: { bookingId: BigInt(id) },
    select: { bookingId: true, bookingGroupId: true },
  });

  if (!booking) return fail("Booking not found.", 404);

  const deleted = await prisma.libraryBooking.deleteMany({
    where:
      parsed.data.scope === "all"
        ? { bookingGroupId: booking.bookingGroupId }
        : { bookingId: booking.bookingId },
  });

  return ok("Booking deleted successfully.", { deleted_count: deleted.count });
});
