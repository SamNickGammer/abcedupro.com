import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { fail, handler, ok, parseBody, validationFailed, type RouteContext } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { libraryPriceSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export const POST = handler(async (request, context: RouteContext) => {
  const admin = await requireAdmin();
  const { id } = await context.params;

  const parsed = await parseBody(request, libraryPriceSchema);
  if (!parsed.success) return validationFailed(parsed.error);

  const booking = await prisma.libraryBooking.findUnique({
    where: { bookingId: BigInt(id) },
    select: { bookingId: true, paymentStatus: true },
  });

  if (!booking) return fail("Booking not found.", 404);

  // Repricing a booking that has already been paid would silently desync the
  // payment log from the amount owed.
  if (booking.paymentStatus === "paid") {
    return fail("This booking is already paid; its price can no longer be changed.", 409);
  }

  await prisma.libraryBooking.update({
    where: { bookingId: booking.bookingId },
    data: {
      monthlyPrice: new Prisma.Decimal(parsed.data.monthly_price),
      updatedByAdminBranchId: admin.id,
    },
  });

  return ok("Booking price updated successfully.");
});
