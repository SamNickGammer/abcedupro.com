import { Decimal } from "@/generated/prisma/internal/prismaNamespace";

/**
 * Prisma hands back `BigInt` for id columns and `Decimal` for money columns.
 * `JSON.stringify` throws on the first and mangles the second, so every value
 * crossing the API boundary goes through here.
 *
 * BigInt becomes a number (ids are far below 2^53), Decimal becomes a number,
 * and Date becomes an ISO date string — matching what the legacy PHP API
 * returned, so the client code reads the same shapes it always did.
 */
export function serialize<T>(value: T): SerializedDeep<T> {
  return walk(value) as SerializedDeep<T>;
}

function walk(value: unknown): unknown {
  if (value === null || value === undefined) return value ?? null;

  if (typeof value === "bigint") return Number(value);

  if (value instanceof Date) return toDateString(value);

  if (Decimal.isDecimal(value)) return Number(value);

  if (Array.isArray(value)) return value.map(walk);

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      out[key] = walk(inner);
    }
    return out;
  }

  return value;
}

/**
 * Date-only columns (dob, admission_date, …) came out of MySQL as `YYYY-MM-DD`
 * and the certificate verification flow compares them as strings, so they must
 * not gain a time component. Anything with a real time-of-day stays ISO.
 */
function toDateString(date: Date): string {
  const iso = date.toISOString();
  return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso;
}

type SerializedDeep<T> = T extends bigint
  ? number
  : T extends Date
    ? string
    : T extends Decimal
      ? number
      : T extends Array<infer U>
        ? SerializedDeep<U>[]
        : T extends object
          ? { [K in keyof T]: SerializedDeep<T[K]> }
          : T;
