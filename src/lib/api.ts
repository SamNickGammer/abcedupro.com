import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { serialize } from "@/lib/serialize";
import { HttpError } from "@/lib/errors";

/**
 * The legacy PHP API answered every call with `{ error, message, data? }` and
 * the panels branch on `result.error`. Keeping that envelope means the ported
 * screens read exactly like the originals.
 */
export type ApiEnvelope<T> = {
  error: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
  [key: string]: unknown;
};

export function ok<T>(
  message: string,
  data?: T,
  extra?: Record<string, unknown>,
  status = 200,
) {
  const body: ApiEnvelope<unknown> = { error: false, message, ...extra };
  if (data !== undefined) body.data = serialize(data);
  return NextResponse.json(body, { status });
}

export function fail(
  message: string,
  status = 400,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json({ error: true, message, ...extra }, { status });
}

export function validationFailed(error: ZodError) {
  const errors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (errors[key] ??= []).push(issue.message);
  }

  return NextResponse.json(
    { error: true, message: "Validation failed.", errors },
    { status: 422 },
  );
}

/**
 * Reads the request body as either JSON or multipart/form-data and validates
 * it. File uploads arrive as `File`; everything else is coerced from strings,
 * which is why the schemas lean on `z.coerce`.
 */
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      return (await request.json()) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  if (
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded")
  ) {
    const form = await request.formData();
    const out: Record<string, unknown> = {};

    for (const [key, value] of form.entries()) {
      // `slots[]`-style repeated keys collapse into an array.
      const name = key.endsWith("[]") ? key.slice(0, -2) : key;
      const existing = out[name];

      if (existing === undefined && !key.endsWith("[]")) {
        out[name] = value;
      } else if (Array.isArray(existing)) {
        existing.push(value);
      } else if (existing !== undefined) {
        out[name] = [existing, value];
      } else {
        out[name] = [value];
      }
    }

    return out;
  }

  return {};
}

export async function parseBody<T>(request: Request, schema: ZodType<T>) {
  const raw = await readBody(request);
  const result = schema.safeParse(raw);
  return result;
}

export function parseQuery<T>(request: Request, schema: ZodType<T>) {
  const url = new URL(request.url);
  const raw: Record<string, unknown> = {};
  for (const [key, value] of url.searchParams.entries()) raw[key] = value;
  return schema.safeParse(raw);
}

/**
 * Wraps a route handler so an unexpected throw becomes a 500 envelope instead
 * of Next's HTML error page — the panels only ever parse JSON.
 */
export function handler(fn: (request: Request, context: RouteContext) => Promise<Response>) {
  return async (request: Request, context: RouteContext): Promise<Response> => {
    try {
      return await fn(request, context);
    } catch (error) {
      if (error instanceof ZodError) return validationFailed(error);
      if (error instanceof HttpError) return fail(error.message, error.status, error.extra);

      console.error("[api]", request.method, new URL(request.url).pathname, error);
      return fail("Internal server error.", 500);
    }
  };
}

export type RouteContext = { params: Promise<Record<string, string>> };
