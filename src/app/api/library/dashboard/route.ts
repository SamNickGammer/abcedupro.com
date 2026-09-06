import { prisma } from "@/lib/db";
import { handler, ok, parseQuery, validationFailed } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { loadConfig, monthName, totalSeats } from "@/lib/library";
import { libraryYearSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

/** Twelve month-cards: bookings, money collected vs outstanding, occupancy. */
export const GET = handler(async (request) => {
  await requireAdmin();

  const parsed = parseQuery(request, libraryYearSchema);
  if (!parsed.success) return validationFailed(parsed.error);

  const year = parsed.data.year;
  const config = await loadConfig();

  const seats = Math.max(1, totalSeats(config.seat_layout));
  const slotCount = Math.max(1, config.slot_definitions.length);
  const capacity = seats * slotCount;

  const [bookings, slotCounts, lockerCounts] = await Promise.all([
    prisma.libraryBooking.findMany({
      where: { bookingYear: year },
      select: {
        bookingMonth: true,
        status: true,
        paymentStatus: true,
        monthlyPrice: true,
      },
    }),
    // Grouped by slot as well as month. A single occupancy figure hides the
    // thing that actually matters when taking a booking: the morning slot can
    // be full while the evening is empty, and the total says neither.
    prisma.libraryBookingSlot.groupBy({
      by: ["bookingMonth", "slotCode"],
      where: { bookingYear: year },
      _count: { _all: true },
    }),
    prisma.libraryBookingLocker.groupBy({
      by: ["bookingMonth"],
      where: { bookingYear: year },
      _count: { _all: true },
    }),
  ]);

  const occupiedByMonth = new Map<number, number>();
  const bySlot = new Map<number, Record<string, number>>();

  for (const row of slotCounts) {
    occupiedByMonth.set(
      row.bookingMonth,
      (occupiedByMonth.get(row.bookingMonth) ?? 0) + row._count._all,
    );

    const slots = bySlot.get(row.bookingMonth) ?? {};
    slots[row.slotCode] = row._count._all;
    bySlot.set(row.bookingMonth, slots);
  }
  const lockersByMonth = new Map(
    lockerCounts.map((row) => [row.bookingMonth, row._count._all]),
  );

  const months = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const forMonth = bookings.filter((booking) => booking.bookingMonth === month);
    const occupied = occupiedByMonth.get(month) ?? 0;

    const collected = forMonth
      .filter((booking) => booking.paymentStatus === "paid")
      .reduce((sum, booking) => sum + Number(booking.monthlyPrice), 0);

    const outstanding = forMonth
      .filter((booking) => booking.paymentStatus !== "paid")
      .reduce((sum, booking) => sum + Number(booking.monthlyPrice), 0);

    return {
      month,
      month_label: monthName(month),
      total_bookings: forMonth.length,
      confirmed_count: forMonth.filter((booking) => booking.status === "confirmed").length,
      secured_count: forMonth.filter((booking) => booking.status === "secured").length,
      collected_amount: collected,
      pending_amount: outstanding,
      used_lockers: lockersByMonth.get(month) ?? 0,
      occupied_slot_seats: occupied,
      occupancy_percent: Math.round((occupied / capacity) * 100),
      /** Seats taken in each slot, so free capacity is visible per slot. */
      slot_usage: Object.fromEntries(
        config.slot_definitions.map((slot) => [slot.id, bySlot.get(month)?.[slot.id] ?? 0]),
      ),
      seats_total: seats,
    };
  });

  return ok("Library dashboard loaded successfully.", {
    year,
    months,
    meta: {
      total_seats: seats,
      total_slots: slotCount,
      total_lockers: config.locker_numbers.length,
      config,
    },
  });
});
