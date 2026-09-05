import { z } from "zod";

/** Form bodies deliver everything as strings, so ids arrive as `"12"`. */
export const idParam = z.coerce.number().int().positive();

export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a date in YYYY-MM-DD format.");

export const optionalDateString = dateString.nullish().or(z.literal("").transform(() => null));

/** Trims, then treats an empty string the same as an omitted field. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value))
    .nullish();

export const requiredText = (max: number, label = "This field") =>
  z.string().trim().min(1, `${label} is required.`).max(max);

export const boolish = z
  .union([z.boolean(), z.string(), z.number()])
  .transform((value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  });

export const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(5000).default(20),
});

export const fileOrNull = z
  .custom<File>((value) => value instanceof File && value.size > 0)
  .nullish();

/** Accepts a JSON string or an already-parsed object; both reach the API. */
export const jsonObject = z
  .union([z.string(), z.record(z.string(), z.unknown())])
  .transform((value, ctx) => {
    if (typeof value !== "string") return value;
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("not an object");
      }
      return parsed as Record<string, unknown>;
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid JSON object." });
      return z.NEVER;
    }
  });

/** `["1","2"]` from repeated form fields, or a JSON array, or a single value. */
export const numberArray = z
  .union([z.array(z.union([z.string(), z.number()])), z.string(), z.number()])
  .transform((value, ctx) => {
    let list: unknown[];

    if (Array.isArray(value)) {
      list = value;
    } else if (typeof value === "number") {
      list = [value];
    } else {
      try {
        const parsed = JSON.parse(value) as unknown;
        list = Array.isArray(parsed) ? parsed : [value];
      } catch {
        list = value.split(",");
      }
    }

    const out = list.map((item) => Number(item));

    if (out.some((item) => !Number.isFinite(item))) {
      ctx.addIssue({ code: "custom", message: "Expected a list of numbers." });
      return z.NEVER;
    }

    return out;
  });

export const stringArray = z
  .union([z.array(z.string()), z.string()])
  .transform((value) => {
    if (Array.isArray(value)) return value;
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      /* fall through to the single-value case */
    }
    return [value];
  });
