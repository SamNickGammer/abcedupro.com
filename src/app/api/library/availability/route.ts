import { handler, ok, parseBody, validationFailed } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { occupiedSeatIds, usedLockers } from "@/lib/library";
import { libraryAvailabilitySchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

/**
 * Which seats and lockers are already taken for a given year, set of months and
 * set of slots — this is what greys out the seat map before a booking is made.
 */
export const POST = handler(async (request) => {
  await requireAdmin();

  const parsed = await parseBody(request, libraryAvailabilitySchema);
  if (!parsed.success) return validationFailed(parsed.error);

  const { year, exclude_booking_id } = parsed.data;
  const months = [...new Set(parsed.data.months)];
  const slots = [...new Set(parsed.data.slots)];

  const [seats, lockers] = await Promise.all([
    occupiedSeatIds(year, months, slots, exclude_booking_id),
    usedLockers(year, months, exclude_booking_id),
  ]);

  return ok("Availability fetched successfully.", {
    occupied_seat_ids: seats,
    used_lockers: lockers,
  });
});
