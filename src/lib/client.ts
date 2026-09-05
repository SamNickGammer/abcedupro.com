"use client";

/**
 * Browser-side API client.
 *
 * Every panel request goes through here so the `{ error, message, data }`
 * envelope is unwrapped in one place, and a 401 always lands the user back on
 * the right login screen rather than leaving a half-rendered page behind.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors?: Record<string, string[]>,
    readonly payload?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** The first message per field, ready to drop into form state. */
  get fields(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, messages] of Object.entries(this.fieldErrors ?? {})) {
      if (messages?.[0]) out[key] = messages[0];
    }
    return out;
  }
}

type Envelope<T> = {
  error: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
  [key: string]: unknown;
};

export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Set for uploads; the browser writes the multipart boundary itself. */
  formData?: FormData;
  signal?: AbortSignal;
  /** Skip the automatic redirect on 401 — used by the login screens. */
  noRedirect?: boolean;
};

export async function api<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T; message: string; extra: Record<string, unknown> }> {
  const { method = "GET", body, formData, signal, noRedirect } = options;

  const response = await fetch(path, {
    method,
    signal,
    headers: formData ? undefined : { "content-type": "application/json" },
    body: formData ?? (body === undefined ? undefined : JSON.stringify(body)),
  });

  let payload: Envelope<T>;
  try {
    payload = (await response.json()) as Envelope<T>;
  } catch {
    throw new ApiError(
      response.ok ? "The server sent an unreadable response." : `Request failed (${response.status}).`,
      response.status,
    );
  }

  if (!response.ok || payload.error) {
    if (response.status === 401 && !noRedirect && typeof window !== "undefined") {
      const loginPath = window.location.pathname.startsWith("/admin-abc")
        ? "/admin-abc/login"
        : "/branch/login";
      window.location.href = `${loginPath}?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    }

    const { error: _e, message: _m, data: _d, errors, ...extra } = payload;
    void _e;
    void _m;
    void _d;

    throw new ApiError(
      payload.message || "Something went wrong.",
      response.status,
      errors,
      extra,
    );
  }

  const { error: _error, message, data, ...extra } = payload;
  void _error;

  return { data: data as T, message, extra };
}

/** Builds a query string, dropping empty values so URLs stay readable. */
export function query(params: Record<string, string | number | boolean | null | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    search.set(key, String(value));
  }

  const serialised = search.toString();
  return serialised ? `?${serialised}` : "";
}
