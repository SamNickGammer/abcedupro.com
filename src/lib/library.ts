import { prisma } from "@/lib/db";
import { formatPrintDate } from "@/lib/domain";

/**
 * Library seating, slots and lockers.
 *
 * Everything configurable — the seat map, the time slots, the price ladder —
 * lives in `library_config` as JSON rather than in code, so head office can
 * re-lay the room without a deploy. These defaults are what a fresh database
 * starts with and what a missing/corrupt config row falls back to.
 */

export type SlotDefinition = { id: string; label: string; time: string; color?: string | null };
export type SeatRow = { row: string; seats: number[] };
export type SeatLayout = Record<string, SeatRow[]>;

export type LibraryConfigMap = {
  slot_definitions: SlotDefinition[];
  pricing_tiers: Record<string, number>;
  locker_price: number;
  locker_numbers: number[];
  seat_layout: SeatLayout;
};

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index);

export const CONFIG_DEFINITIONS = {
  slot_definitions: {
    type: "json",
    description: "Available library slot definitions.",
    value: [
      { id: "A", label: "Slot A", time: "6AM-10AM", color: "#f59e0b" },
      { id: "B", label: "Slot B", time: "10AM-2PM", color: "#10b981" },
      { id: "C", label: "Slot C", time: "2PM-6PM", color: "#3b82f6" },
      { id: "D", label: "Slot D", time: "6PM-10PM", color: "#a78bfa" },
    ] satisfies SlotDefinition[],
  },
  pricing_tiers: {
    type: "json",
    description: "Monthly pricing by number of selected slots.",
    value: { "1": 300, "2": 500, "3": 800, "4": 1000 } as Record<string, number>,
  },
  locker_price: {
    type: "number",
    description: "Monthly price per locker.",
    value: 300,
  },
  locker_numbers: {
    type: "json",
    description: "Available locker numbers.",
    value: [1, 2, 3, 4, 5, 6],
  },
  seat_layout: {
    type: "json",
    description: "Library seat layout grouped by block and row.",
    value: {
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
    } satisfies SeatLayout,
  },
} as const;

export type ConfigKey = keyof typeof CONFIG_DEFINITIONS;

export const CONFIG_KEYS = Object.keys(CONFIG_DEFINITIONS) as ConfigKey[];

function parseConfigValue(valueType: string, raw: string): unknown {
  if (valueType === "json") {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  if (valueType === "number") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return raw;
}

/** Stored config merged over the defaults, so a missing key never breaks a page. */
export async function loadConfig(): Promise<LibraryConfigMap> {
  const config = Object.fromEntries(
    CONFIG_KEYS.map((key) => [key, CONFIG_DEFINITIONS[key].value]),
  ) as unknown as LibraryConfigMap;

  const rows = await prisma.libraryConfig.findMany();

  for (const row of rows) {
    if (!CONFIG_KEYS.includes(row.configKey as ConfigKey)) continue;
    const value = parseConfigValue(row.valueType, row.configValue);
    if (value !== null && value !== undefined) {
      (config as Record<string, unknown>)[row.configKey] = value;
    }
  }

  return config;
}

export function configRows(config: LibraryConfigMap) {
  return CONFIG_KEYS.map((key) => ({
    config_key: key,
    value_type: CONFIG_DEFINITIONS[key].type,
    description: CONFIG_DEFINITIONS[key].description,
    config_value: config[key],
  }));
}

export function totalSeats(layout: SeatLayout): number {
  return Object.values(layout ?? {}).reduce(
    (sum, rows) => sum + rows.reduce((rowSum, row) => rowSum + (row.seats?.length ?? 0), 0),
    0,
  );
}

/** Seat ids are `{block}_{row}{number}` — e.g. `A_B7`. */
export function seatExists(seatId: string, layout: SeatLayout): boolean {
  for (const [block, rows] of Object.entries(layout ?? {})) {
    for (const row of rows) {
      for (const seat of row.seats ?? []) {
        if (seatId === `${block}_${row.row}${seat}`) return true;
      }
    }
  }
  return false;
}

export function seatLabel(seatId: string): string {
  const index = seatId.indexOf("_");
  return index === -1 ? seatId : seatId.slice(index + 1);
}

/** Price = the tier for however many slots were picked, plus each locker. */
export function calculatePrice(
  slots: string[],
  lockers: number[],
  config: LibraryConfigMap,
): number {
  const tier = config.pricing_tiers?.[String(slots.length)];
  const base = Number.isFinite(tier) ? Number(tier) : 300;
  return base + lockers.length * Number(config.locker_price ?? 0);
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? "Unknown";
}

// ------------------------------------------------------------------ bookings

/**
 * Turns booking rows into the shape the seat-map UI consumes: slots and lockers
 * inlined, plus every month the same member holds under one booking group, so a
 * six-month admission renders as one card rather than six.
 */
export async function hydrateBookings(
  bookings: Awaited<ReturnType<typeof fetchMonthBookings>>,
  year: number,
) {
  if (bookings.length === 0) return [];

  const groupIds = [...new Set(bookings.map((booking) => booking.bookingGroupId))];

  const groupRows = await prisma.libraryBooking.findMany({
    where: { bookingYear: year, bookingGroupId: { in: groupIds } },
    select: { bookingGroupId: true, bookingMonth: true },
    orderBy: { bookingMonth: "asc" },
  });

  const groupMonths = new Map<string, number[]>();
  for (const row of groupRows) {
    const list = groupMonths.get(row.bookingGroupId) ?? [];
    list.push(row.bookingMonth);
    groupMonths.set(row.bookingGroupId, list);
  }

  return bookings.map((booking) => ({
    booking_id: Number(booking.bookingId),
    booking_group_id: booking.bookingGroupId,
    member_id: Number(booking.memberId),
    name: booking.member.fullName,
    phone: booking.member.phone,
    note: booking.note || booking.member.notes,
    status: booking.status,
    block: booking.blockCode,
    seat_id: booking.seatId,
    seat_label: booking.seatLabel,
    slots: booking.slots.map((slot) => slot.slotCode),
    lockers: booking.lockers.map((locker) => locker.lockerNumber),
    price: Number(booking.monthlyPrice),
    booking_year: booking.bookingYear,
    booking_month: booking.bookingMonth,
    group_months: groupMonths.get(booking.bookingGroupId) ?? [booking.bookingMonth],
    payment: {
      status: booking.paymentStatus,
      method: booking.paymentMethod,
      collectedBy: booking.paymentCollectedBy,
      note: booking.paymentNote,
      paidAt: booking.paymentPaidAt ? formatPrintDate(booking.paymentPaidAt) : null,
    },
    created_at: booking.createdAt.toISOString(),
    createdAt: formatPrintDate(booking.createdAt),
  }));
}

export async function fetchMonthBookings(year: number, month: number, search: string) {
  const term = search.trim();

  return prisma.libraryBooking.findMany({
    where: {
      bookingYear: year,
      bookingMonth: month,
      ...(term
        ? {
            OR: [
              { member: { fullName: { contains: term, mode: "insensitive" } } },
              { member: { phone: { contains: term, mode: "insensitive" } } },
              { seatLabel: { contains: term, mode: "insensitive" } },
              { seatId: { contains: term, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      member: { select: { fullName: true, phone: true, notes: true } },
      slots: { select: { slotCode: true }, orderBy: { slotCode: "asc" } },
      lockers: { select: { lockerNumber: true }, orderBy: { lockerNumber: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// --------------------------------------------------------------- availability

export async function occupiedSeatIds(
  year: number,
  months: number[],
  slots: string[],
  excludeBookingId?: number | null,
): Promise<string[]> {
  const rows = await prisma.libraryBookingSlot.findMany({
    where: {
      bookingYear: year,
      bookingMonth: { in: months },
      slotCode: { in: slots },
      ...(excludeBookingId ? { NOT: { bookingId: BigInt(excludeBookingId) } } : {}),
    },
    select: { seatId: true },
    distinct: ["seatId"],
  });

  return rows.map((row) => row.seatId);
}

export async function usedLockers(
  year: number,
  months: number[],
  excludeBookingId?: number | null,
): Promise<number[]> {
  const rows = await prisma.libraryBookingLocker.findMany({
    where: {
      bookingYear: year,
      bookingMonth: { in: months },
      ...(excludeBookingId ? { NOT: { bookingId: BigInt(excludeBookingId) } } : {}),
    },
    select: { lockerNumber: true },
    distinct: ["lockerNumber"],
  });

  return rows.map((row) => row.lockerNumber);
}
