import { prisma } from "@/lib/db";
import { fail, handler, ok, type RouteContext } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

/** Promotes a provisional ("secured") hold into a confirmed booking. */
export const POST = handler(async (_request, context: RouteContext) => {
  const admin = await requireAdmin();
  const { id } = await context.params;

  const booking = await prisma.libraryBooking.findUnique({
    where: { bookingId: BigInt(id) },
    select: { bookingId: true },
  });

  if (!booking) return fail("Booking not found.", 404);

  await prisma.libraryBooking.update({
    where: { bookingId: booking.bookingId },
    data: { status: "confirmed", updatedByAdminBranchId: admin.id },
  });

  return ok("Booking confirmed successfully.");
});
