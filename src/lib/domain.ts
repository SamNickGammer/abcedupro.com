import { addMonths, subDays, format, parseISO } from "date-fns";
import type { Performance } from "@/generated/prisma/enums";

// ------------------------------------------------------------------- dates

/** A date-only value, kept as UTC midnight so it round-trips as `YYYY-MM-DD`. */
export function toDateOnly(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

export function dateOnlyString(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : parseISO(value);
  return format(date, "yyyy-MM-dd");
}

/** `dd/mm/yyyy` — the format printed on certificates and marksheets. */
export function formatPrintDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : parseISO(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "dd/MM/yyyy");
}

/**
 * A course runs for `courseDuration` whole months from admission, and the
 * student is relieved the day before that anniversary — matching the legacy
 * `addMonths($n)->subDays(1)`.
 */
export function calculateRelievingDate(admissionDate: string | Date, durationMonths: number): Date {
  const start = toDateOnly(admissionDate);
  return toDateOnly(subDays(addMonths(start, durationMonths), 1));
}

// ------------------------------------------------------- registration numbers

export const REGISTRATION_SEQUENCE_WIDTH = 4;

/**
 * Registration numbers are `{branchCode}{zero-padded sequence}`, counted per
 * branch — e.g. `PAT0001`, `PAT0002`.
 *
 * The Laravel version padded the new sequence to the width of the *previous*
 * number rather than a fixed width, so `PAT0001` was followed by `PAT2`
 * instead of `PAT0002`. Here the width is fixed at 4 (widening automatically
 * once a branch passes 9,999), which is what the seed value `0001` always
 * implied. Existing numbers of any width are still read correctly, so a branch
 * mid-sequence simply resumes with proper padding.
 */
export function nextRegistrationNumber(branchCode: string, existingNumbers: string[]): string {
  const prefixLength = branchCode.length;
  let max = 0;

  for (const number of existingNumbers) {
    const suffix = number.slice(prefixLength);
    const parsed = Number.parseInt(suffix.replace(/\D.*$/, ""), 10);
    if (Number.isFinite(parsed) && parsed > max) max = parsed;
  }

  const next = String(max + 1).padStart(REGISTRATION_SEQUENCE_WIDTH, "0");
  return `${branchCode}${next}`;
}

/** Marksheet ids are a single global 5-digit sequence, not per branch. */
export function nextMarksheetId(lastMarksheetId: string | null | undefined): string {
  if (!lastMarksheetId) return "00001";
  const numeric = Number.parseInt(lastMarksheetId, 10);
  const next = Number.isFinite(numeric) ? numeric + 1 : 1;
  return String(next).padStart(5, "0");
}

// ------------------------------------------------------------------- marks

export type MarksheetSummary = {
  marks: Record<string, number>;
  overallPercent: number;
  performance: Performance;
};

/**
 * Each subject is out of 100, so the overall percentage is the mean of the
 * subject marks. The banding thresholds are the originals.
 */
export function calculateMarksheetSummary(input: Record<string, unknown>): MarksheetSummary {
  const entries = Object.entries(input);

  if (entries.length === 0) {
    throw new Error("Marks data cannot be empty.");
  }

  const marks: Record<string, number> = {};
  let total = 0;

  for (const [subject, raw] of entries) {
    const value = typeof raw === "number" ? raw : Number(raw);

    if (!Number.isFinite(value)) {
      throw new Error(`Mark for "${subject}" must be numeric.`);
    }

    if (value < 0 || value > 100) {
      throw new Error(`Mark for "${subject}" must be between 0 and 100.`);
    }

    marks[subject] = value;
    total += value;
  }

  const overallPercent = round2((total / (entries.length * 100)) * 100);

  return { marks, overallPercent, performance: bandFor(overallPercent) };
}

export function bandFor(percentage: number): Performance {
  if (percentage >= 85) return "Excellent";
  if (percentage >= 60) return "Very_Good";
  if (percentage >= 30) return "Good";
  return "Failure";
}

/** The DB enum stores "Very Good" with a space; the TS member cannot have one. */
export function performanceLabel(value: Performance | null | undefined): string {
  if (!value) return "";
  return value === "Very_Good" ? "Very Good" : value;
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function parseMarks(stored: string | null | undefined): Record<string, number> {
  if (!stored) return {};
  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, Number(v)]),
    );
  } catch {
    return {};
  }
}

export function parseSubjects(subjects: string | null | undefined): string[] {
  return (subjects ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// ------------------------------------------------------------ verification

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

/**
 * The URL printed on every certificate. Its shape is fixed by the documents
 * already in circulation — `/student_info?rn=…&dob=…` must keep resolving.
 */
export function buildVerificationUrl(
  registrationNumber: string | null | undefined,
  dob: Date | string | null | undefined,
): string | null {
  if (!registrationNumber || !dob) return null;

  const params = new URLSearchParams({
    rn: registrationNumber,
    dob: dateOnlyString(dob),
  });

  return `${siteUrl()}/student_info?${params.toString()}`;
}

// ------------------------------------------------------------------ masking

/** Public certificate lookup shows enough to confirm, not enough to harvest. */
export function maskPhoneNumber(phone: string | null | undefined): string {
  const cleaned = (phone ?? "").replace(/\s+/g, "");
  if (!cleaned || cleaned.length < 10) return "NO CONTACT";

  const lastTwo = cleaned.slice(-2);

  if (cleaned.startsWith("+")) {
    return `${cleaned.slice(0, 4)} ${"*".repeat(Math.max(0, cleaned.length - 6))}${lastTwo}`;
  }

  if (cleaned.startsWith("0")) {
    return `${cleaned.slice(0, 2)}${"*".repeat(Math.max(0, cleaned.length - 4))}${lastTwo}`;
  }

  return `${"*".repeat(Math.max(0, cleaned.length - 2))}${lastTwo}`;
}

export function maskEmail(email: string | null | undefined): string {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "NO EMAIL";

  const [name, domain] = email.split("@");
  if (name.length <= 2) return `${"*".repeat(name.length)}@${domain}`;

  return `${name[0]}${"*".repeat(name.length - 2)}${name.at(-1)}@${domain}`;
}

export function maskAadhaarNumber(aadhaar: string | null | undefined): string {
  if (!aadhaar || aadhaar.length !== 12) return "NO AADHAAR";
  return `**** **** **** ${aadhaar.slice(-4)}`;
}
