import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { fail, handler, ok, parseBody, validationFailed } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { calculatePrice, loadConfig, monthName, seatExists, seatLabel } from "@/lib/library";
import { libraryAdmitSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

/**
 * Admits a member and books one seat across one or more months of a year.
 *
 * Every month gets its own `library_bookings` row sharing a `booking_group_id`,
 * which is what lets a single admission be paid for, extended or cancelled
 * month by month.
 *
 * Conflicts are caught twice: an upfront check that produces a readable message,
 * and the unique indexes on (year, month, seat, slot) and (year, month, locker)
 * inside the transaction, which are what actually make double-booking
 * impossible when two admins click at the same moment.
 */
export const POST = handler(async (request) => {
  const admin = await requireAdmin();

  const parsed = await parseBody(request, libraryAdmitSchema);
  if (!parsed.success) return validationFailed(parsed.error);

  const data = parsed.data;
  const config = await loadConfig();

  const months = [...new Set(data.months)].sort((a, b) => a - b);
  const slots = [...new Set(data.slots)];
  const lockers = [...new Set(data.lockers)];

  if (!seatExists(data.seat_id, config.seat_layout)) {
    return fail("The selected seat does not exist in the library layout.", 422);
  }

  const knownSlots = new Set(config.slot_definitions.map((slot) => slot.id));
  const unknownSlot = slots.find((slot) => !knownSlots.has(slot));
  if (unknownSlot) return fail(`Unknown slot "${unknownSlot}".`, 422);

  const knownLockers = new Set(config.locker_numbers);
  const unknownLocker = lockers.find((locker) => !knownLockers.has(locker));
  if (unknownLocker !== undefined) return fail(`Unknown locker ${unknownLocker}.`, 422);

  if (data.payment_status === "paid" && (!data.payment_method || !data.payment_collected_by)) {
    return fail(
      "Payment method and collected-by are required when the payment is marked paid.",
      422,
    );
  }

  const monthlyPrice =
    data.custom_price != null ? data.custom_price : calculatePrice(slots, lockers, config);

  const paidAt = data.payment_status === "paid" ? new Date() : null;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Readable pre-flight; the unique indexes below are the real guarantee.
      for (const month of months) {
        const seatClash = await tx.libraryBookingSlot.findFirst({
          where: {
            bookingYear: data.year,
            bookingMonth: month,
            seatId: data.seat_id,
            slotCode: { in: slots },
          },
          select: { slotCode: true },
        });

        if (seatClash) {
          throw new BookingConflict(
            `Seat ${seatLabel(data.seat_id)} is already booked in ${monthName(month)} for slot ${seatClash.slotCode}.`,
          );
        }

        if (lockers.length > 0) {
          const lockerClash = await tx.libraryBookingLocker.findMany({
            where: {
              bookingYear: data.year,
              bookingMonth: month,
              lockerNumber: { in: lockers },
            },
            select: { lockerNumber: true },
          });

          if (lockerClash.length > 0) {
            throw new BookingConflict(
              `Locker ${lockerClash.map((row) => row.lockerNumber).join(", ")} is already assigned in ${monthName(month)}.`,
            );
          }
        }
      }

      const member = await tx.libraryMember.create({
        data: {
          fullName: data.name,
          phone: data.phone ?? null,
          notes: data.note ?? null,
          isActive: true,
          createdByAdminBranchId: admin.id,
          updatedByAdminBranchId: admin.id,
        },
      });

      const groupId = crypto.randomUUID();

      for (const month of months) {
        const booking = await tx.libraryBooking.create({
          data: {
            bookingGroupId: groupId,
            memberId: member.memberId,
            bookingYear: data.year,
            bookingMonth: month,
            status: data.status,
            blockCode: data.block,
            seatId: data.seat_id,
            seatLabel: seatLabel(data.seat_id),
            note: data.note ?? null,
            monthlyPrice: new Prisma.Decimal(monthlyPrice),
            paymentStatus: data.payment_status,
            paymentMethod: paidAt ? data.payment_method : null,
            paymentCollectedBy: paidAt ? data.payment_collected_by : null,
            paymentNote: paidAt ? data.payment_note : null,
            paymentPaidAt: paidAt,
            createdByAdminBranchId: admin.id,
            updatedByAdminBranchId: admin.id,
          },
        });

        if (slots.length > 0) {
          await tx.libraryBookingSlot.createMany({
            data: slots.map((slotCode) => ({
              bookingId: booking.bookingId,
              bookingYear: data.year,
              bookingMonth: month,
              seatId: data.seat_id,
              slotCode,
            })),
          });
        }

        if (lockers.length > 0) {
          await tx.libraryBookingLocker.createMany({
            data: lockers.map((lockerNumber) => ({
              bookingId: booking.bookingId,
              bookingYear: data.year,
              bookingMonth: month,
              lockerNumber,
            })),
          });
        }

        if (paidAt) {
          await tx.libraryPaymentLog.create({
            data: {
              bookingId: booking.bookingId,
              amount: new Prisma.Decimal(monthlyPrice),
              paymentMethod: data.payment_method ?? null,
              collectedBy: data.payment_collected_by ?? null,
              note: data.payment_note ?? null,
              paidAt,
              createdByAdminBranchId: admin.id,
            },
          });
        }
      }

      return { memberId: Number(member.memberId), groupId };
    });

    return ok(
      "Library member admitted successfully.",
      {
        member_id: result.memberId,
        booking_group_id: result.groupId,
        monthly_price: monthlyPrice,
        months,
      },
      undefined,
      201,
    );
  } catch (error) {
    if (error instanceof BookingConflict) return fail(error.message, 409);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("That seat, slot or locker was just taken. Please refresh and try again.", 409);
    }

    throw error;
  }
});

class BookingConflict extends Error {}
