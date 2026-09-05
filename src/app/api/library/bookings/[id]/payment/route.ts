import { prisma } from "@/lib/db";
import { fail, handler, ok, parseBody, validationFailed, type RouteContext } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { libraryPaymentSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

/** Marks a month paid and appends an immutable row to the payment log. */
export const POST = handler(async (request, context: RouteContext) => {
  const admin = await requireAdmin();
  const { id } = await context.params;

  const parsed = await parseBody(request, libraryPaymentSchema);
  if (!parsed.success) return validationFailed(parsed.error);

  const booking = await prisma.libraryBooking.findUnique({
    where: { bookingId: BigInt(id) },
  });

  if (!booking) return fail("Booking not found.", 404);
  if (booking.paymentStatus === "paid") {
    return fail("This booking is already marked paid.", 409);
  }

  const paidAt = new Date();

  await prisma.$transaction([
    prisma.libraryBooking.update({
      where: { bookingId: booking.bookingId },
      data: {
        paymentStatus: "paid",
        paymentMethod: parsed.data.payment_method,
        paymentCollectedBy: parsed.data.payment_collected_by,
        paymentNote: parsed.data.payment_note ?? null,
        paymentPaidAt: paidAt,
        updatedByAdminBranchId: admin.id,
      },
    }),
    prisma.libraryPaymentLog.create({
      data: {
        bookingId: booking.bookingId,
        amount: booking.monthlyPrice,
        paymentMethod: parsed.data.payment_method,
        collectedBy: parsed.data.payment_collected_by,
        note: parsed.data.payment_note ?? null,
        paidAt,
        createdByAdminBranchId: admin.id,
      },
    }),
  ]);

  return ok("Payment recorded successfully.");
});
