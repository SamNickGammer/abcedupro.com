/**
 * Creates sample library bookings so the module can be seen with data.
 *
 *   npm run library:demo               add sample bookings
 *   npm run library:demo -- --clear    remove them again
 *
 * The library tables came across empty — the production dump has none — so
 * there is nothing real to look at. Every member created here is named with a
 * "[demo]" prefix, and --clear removes exactly those and their bookings.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

const CLEAR = process.argv.includes("--clear");
const YEAR = new Date().getFullYear();
const PREFIX = "[demo] ";

const FIRST = [
  "Rahul", "Priya", "Amit", "Sneha", "Vikash", "Anjali", "Manish", "Pooja",
  "Ravi", "Kajal", "Suraj", "Nidhi", "Deepak", "Sweety", "Arjun", "Rekha",
  "Nitish", "Aarti", "Gaurav", "Meena", "Sanjay", "Rani", "Alok", "Puja",
  "Ankit", "Shalini", "Rohit", "Neha", "Vivek", "Kiran", "Saurabh", "Divya",
];

const LAST = [
  "Kumar", "Singh", "Verma", "Yadav", "Devi", "Prasad", "Jha", "Ranjan",
  "Sinha", "Gupta", "Sharma", "Roy", "Mishra", "Pandey",
];

/** Mulberry32 — seeded, so re-running produces the same library. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = rng(20260906);

function any<T>(list: T[]): T {
  return list[Math.floor(random() * list.length)];
}

async function clear() {
  const members = await prisma.libraryMember.findMany({
    where: { fullName: { startsWith: PREFIX } },
    select: { memberId: true },
  });

  if (members.length === 0) {
    console.log("Nothing to clear — no demo members found.");
    return;
  }

  // Bookings cascade from the member, and slots/lockers from the booking.
  const { count } = await prisma.libraryMember.deleteMany({
    where: { memberId: { in: members.map((member) => member.memberId) } },
  });

  console.log(`Removed ${count} demo members and everything booked under them.`);
}

async function seed() {
  const admin = await prisma.branch.findFirst({ where: { role: "admin" }, select: { id: true } });

  const rows = await prisma.libraryConfig.findMany();
  const stored = (key: string) => {
    const row = rows.find((entry) => entry.configKey === key);
    if (!row) return null;
    try {
      return JSON.parse(row.configValue) as unknown;
    } catch {
      return null;
    }
  };

  const range = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, index) => from + index);

  const layout = (stored("seat_layout") as Record<string, { row: string; seats: number[] }[]>) ?? {
    A: [
      { row: "A", seats: range(1, 19) },
      { row: "B", seats: range(0, 11) },
      { row: "C", seats: range(0, 11) },
      { row: "D", seats: range(1, 17) },
      { row: "E", seats: range(1, 7) },
    ],
    B: [
      { row: "A", seats: range(1, 16) },
      { row: "B", seats: range(1, 14) },
      { row: "C", seats: range(1, 15) },
      { row: "D", seats: range(1, 19) },
    ],
  };

  const slotIds = ((stored("slot_definitions") as { id: string }[]) ?? [
    { id: "A" }, { id: "B" }, { id: "C" }, { id: "D" },
  ]).map((slot) => slot.id);

  const tiers = (stored("pricing_tiers") as Record<string, number>) ?? {
    "1": 300, "2": 500, "3": 800, "4": 1000,
  };
  const lockerNumbers = (stored("locker_numbers") as number[]) ?? [1, 2, 3, 4, 5, 6];
  const lockerPrice = 300;

  const seatIds: string[] = [];
  for (const [block, blockRows] of Object.entries(layout)) {
    for (const row of blockRows) {
      for (const seat of row.seats) seatIds.push(`${block}_${row.row}${seat}`);
    }
  }

  // What is already spoken for, so the seeder never writes a clash the unique
  // indexes would reject.
  const takenSeatSlot = new Set<string>();
  const takenLocker = new Set<string>();

  // Evenings and mornings fill first, as they do in a real reading room.
  const slotWeights: Record<string, number> = { A: 0.6, B: 0.3, C: 0.36, D: 0.68 };

  let members = 0;
  let bookings = 0;

  for (let index = 0; index < 190; index += 1) {
    const startMonth = 1 + Math.floor(random() * 12);
    const span = 1 + Math.floor(random() * 5);
    const months = Array.from({ length: span }, (_, offset) => startMonth + offset).filter(
      (month) => month <= 12,
    );
    if (months.length === 0) continue;

    const slots = slotIds.filter((slot) => random() < (slotWeights[slot] ?? 0.5));
    if (slots.length === 0) slots.push(any(slotIds));

    // A seat free for every chosen slot across every chosen month.
    const seatId = seatIds
      .slice()
      .sort(() => random() - 0.5)
      .find((candidate) =>
        months.every((month) =>
          slots.every((slot) => !takenSeatSlot.has(`${month}:${candidate}:${slot}`)),
        ),
      );
    if (!seatId) continue;

    const locker =
      random() < 0.22
        ? lockerNumbers.find((number) =>
            months.every((month) => !takenLocker.has(`${month}:${number}`)),
          )
        : undefined;
    const lockers = locker ? [locker] : [];

    const price = (Number(tiers[String(slots.length)]) || 300) + lockers.length * lockerPrice;

    const member = await prisma.libraryMember.create({
      data: {
        fullName: `${PREFIX}${any(FIRST)} ${any(LAST)}`,
        phone: `9${String(700000000 + Math.floor(random() * 99999999)).slice(0, 9)}`,
        notes: random() < 0.2 ? "Prefers a window seat" : null,
        isActive: true,
        createdByAdminBranchId: admin?.id ?? null,
        updatedByAdminBranchId: admin?.id ?? null,
      },
    });
    members += 1;

    const groupId = crypto.randomUUID();
    const secured = random() < 0.14;
    const paid = !secured && random() < 0.72;
    const block = seatId.split("_")[0];
    const label = seatId.split("_")[1];

    for (const month of months) {
      const booking = await prisma.libraryBooking.create({
        data: {
          bookingGroupId: groupId,
          memberId: member.memberId,
          bookingYear: YEAR,
          bookingMonth: month,
          status: secured ? "secured" : "confirmed",
          blockCode: block,
          seatId,
          seatLabel: label,
          note: null,
          monthlyPrice: price.toFixed(2),
          paymentStatus: paid ? "paid" : "pending",
          paymentMethod: paid ? (random() < 0.5 ? "cash" : "upi") : null,
          paymentCollectedBy: paid ? "Front desk" : null,
          paymentPaidAt: paid ? new Date() : null,
          createdByAdminBranchId: admin?.id ?? null,
          updatedByAdminBranchId: admin?.id ?? null,
        },
      });

      await prisma.libraryBookingSlot.createMany({
        data: slots.map((slotCode) => ({
          bookingId: booking.bookingId,
          bookingYear: YEAR,
          bookingMonth: month,
          seatId,
          slotCode,
        })),
      });

      for (const slot of slots) takenSeatSlot.add(`${month}:${seatId}:${slot}`);

      if (lockers.length > 0) {
        await prisma.libraryBookingLocker.createMany({
          data: lockers.map((lockerNumber) => ({
            bookingId: booking.bookingId,
            bookingYear: YEAR,
            bookingMonth: month,
            lockerNumber,
          })),
        });
        for (const number of lockers) takenLocker.add(`${month}:${number}`);
      }

      bookings += 1;
    }
  }

  console.log(`Created ${members} demo members and ${bookings} bookings for ${YEAR}.`);
  console.log("Remove them with:  npm run library:demo -- --clear");
}

(CLEAR ? clear() : seed())
  .catch((error) => {
    console.error("FAIL", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
