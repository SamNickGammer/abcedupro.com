import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { fail, handler, ok, parseBody, validationFailed, type RouteContext } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { calculatePrice, loadConfig, monthName } from "@/lib/library";
import { libraryExtendSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

/**
 * Carries an existing booking — same member, seat, slots and lockers — into
 * further months. Months that clash are reported back rather than failing the
 * whole request, so extending Jan–Jun still works when one month is taken.
 *
 * A locker that is unavailable in a target month is dropped for that month
 * only, and the price is recalculated accordingly.
 */
export const POST = handler(async (request, context: RouteContext) => {
  const admin = await requireAdmin();
  const { id } = await context.params;

  const parsed = await parseBody(request, libraryExtendSchema);
  if (!parsed.success) return validationFailed(parsed.error);

  const source = await prisma.libraryBooking.findUnique({
    where: { bookingId: BigInt(id) },
    include: {
      slots: { select: { slotCode: true }, orderBy: { slotCode: "asc" } },
      lockers: { select: { lockerNumber: true }, orderBy: { lockerNumber: "asc" } },
    },
  });

  if (!source) return fail("Booking not found.", 404);

  const config = await loadConfig();
  const year = parsed.data.year;
  const targetMonths = [...new Set(parsed.data.months)].sort((a, b) => a - b);
  const slots = source.slots.map((slot) => slot.slotCode);
  const lockers = source.lockers.map((locker) => locker.lockerNumber);

  const existingMonths = new Set(
    (
      await prisma.libraryBooking.findMany({
        where: { bookingGroupId: source.bookingGroupId, bookingYear: year },
        select: { bookingMonth: true },
      })
    ).map((row) => row.bookingMonth),
  );

  const created: Array<{ month: number; removed_lockers: number[]; price: number }> = [];
  const skipped: Array<{ month: number; reason: string }> = [];

  for (const month of targetMonths) {
    if (existingMonths.has(month)) {
      skipped.push({ month, reason: `Already booked in ${monthName(month)}.` });
      continue;
    }

    try {
      type ExtendOutcome =
        | { kind: "conflict"; reason: string }
        | { kind: "created"; removedLockers: number[]; price: number };

      const outcome: ExtendOutcome = await prisma.$transaction(async (tx) => {
        const seatClash = await tx.libraryBookingSlot.findFirst({
          where: {
            bookingYear: year,
            bookingMonth: month,
            seatId: source.seatId,
            slotCode: { in: slots },
          },
          select: { id: true },
        });

        if (seatClash) {
          return { kind: "conflict", reason: `Seat conflict in ${monthName(month)}.` };
        }

        const takenLockers = lockers.length
          ? (
              await tx.libraryBookingLocker.findMany({
                where: {
                  bookingYear: year,
                  bookingMonth: month,
                  lockerNumber: { in: lockers },
                },
                select: { lockerNumber: true },
              })
            ).map((row) => row.lockerNumber)
          : [];

        const availableLockers = lockers.filter((locker) => !takenLockers.includes(locker));

        // Keep the original price when nothing was dropped, so a manually
        // discounted booking carries its discount forward.
        const price =
          availableLockers.length === lockers.length
            ? Number(source.monthlyPrice)
            : calculatePrice(slots, availableLockers, config);

        const booking = await tx.libraryBooking.create({
          data: {
            bookingGroupId: source.bookingGroupId,
            memberId: source.memberId,
            bookingYear: year,
            bookingMonth: month,
            status: source.status,
            blockCode: source.blockCode,
            seatId: source.seatId,
            seatLabel: source.seatLabel,
            note: source.note,
            monthlyPrice: new Prisma.Decimal(price),
            paymentStatus: "pending",
            createdByAdminBranchId: admin.id,
            updatedByAdminBranchId: admin.id,
          },
        });

        if (slots.length > 0) {
          await tx.libraryBookingSlot.createMany({
            data: slots.map((slotCode) => ({
              bookingId: booking.bookingId,
              bookingYear: year,
              bookingMonth: month,
              seatId: source.seatId,
              slotCode,
            })),
          });
        }

        if (availableLockers.length > 0) {
          await tx.libraryBookingLocker.createMany({
            data: availableLockers.map((lockerNumber) => ({
              bookingId: booking.bookingId,
              bookingYear: year,
              bookingMonth: month,
              lockerNumber,
            })),
          });
        }

        return { kind: "created", removedLockers: takenLockers, price };
      });

      if (outcome.kind === "conflict") {
        skipped.push({ month, reason: outcome.reason });
      } else {
        created.push({
          month,
          removed_lockers: outcome.removedLockers,
          price: outcome.price,
        });
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        skipped.push({ month, reason: `Seat conflict in ${monthName(month)}.` });
        continue;
      }
      throw error;
    }
  }

  return ok("Booking extension processed.", {
    created_months: created,
    skipped_months: skipped,
  });
});
