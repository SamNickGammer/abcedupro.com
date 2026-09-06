"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api, type RequestOptions } from "@/lib/client";

type State<T> = {
  data: T | null;
  extra: Record<string, unknown>;
  loading: boolean;
  error: string | null;
};

/**
 * Fetches on mount and whenever `path` changes.
 *
 * A superseded response is ignored rather than aborted. Aborting looked
 * tidier but fought React Strict Mode, which mounts every component twice in
 * development: the first request was cancelled and immediately refired, so the
 * network panel showed each call twice. Letting `api` deduplicate instead means
 * the second mount reuses the first request, and the ignore-flag still
 * guarantees a slow earlier response can never overwrite a fast later one.
 */
export function useApi<T>(path: string | null, options?: RequestOptions) {
  const [state, setState] = useState<State<T>>({
    data: null,
    extra: {},
    loading: path !== null,
    error: null,
  });

  const [nonce, setNonce] = useState(0);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (path === null) {
      setState({ data: null, extra: {}, loading: false, error: null });
      return;
    }

    let ignore = false;
    setState((current) => ({ ...current, loading: true, error: null }));

    api<T>(path, optionsRef.current)
      .then(({ data, extra }) => {
        if (ignore) return;
        setState({ data, extra, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (ignore) return;
        setState({
          data: null,
          extra: {},
          loading: false,
          error: error instanceof ApiError ? error.message : "Could not reach the server.",
        });
      });

    return () => {
      ignore = true;
    };
  }, [path, nonce]);

  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  return { ...state, refresh };
}

/** For writes: tracks pending state and surfaces field errors from Zod. */
export function useMutation() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const run = useCallback(
    async <T,>(
      path: string,
      options: RequestOptions,
    ): Promise<
      | { ok: true; data: T; message: string; extra: Record<string, unknown> }
      | { ok: false; error: ApiError }
    > => {
      setPending(true);
      setError(null);
      setFieldErrors({});

      try {
        const result = await api<T>(path, options);
        return { ok: true, ...result };
      } catch (caught) {
        const apiError =
          caught instanceof ApiError ? caught : new ApiError("Could not reach the server.", 0);

        setError(apiError.message);
        setFieldErrors(apiError.fields);
        return { ok: false, error: apiError };
      } finally {
        setPending(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setError(null);
    setFieldErrors({});
  }, []);

  return { run, pending, error, fieldErrors, reset };
}
