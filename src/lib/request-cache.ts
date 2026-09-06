"use client";

/**
 * Deduplication for GET requests.
 *
 * Two things cause the same URL to be fetched twice in quick succession:
 *
 *   - React Strict Mode, which mounts every component twice in development to
 *     surface effects that are not cleanup-safe. Without this, one request is
 *     fired, aborted, and fired again.
 *   - Two components on one page wanting the same data — the branch filter and
 *     a branch column, say.
 *
 * Neither should reach the network twice. An in-flight request is shared by
 * every caller, and a just-completed one is reused for a short window, which is
 * long enough to absorb a remount but far too short to serve anything a user
 * would perceive as stale.
 *
 * Any write clears the cache, so a list never shows data from before an edit.
 */

const FRESH_MS = 2000;

type Entry<T = unknown> = { at: number; value: T };

const inFlight = new Map<string, Promise<unknown>>();
const fresh = new Map<string, Entry>();

/** Runs `fetcher` unless an identical call is already in flight or just done. */
export function dedupe<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = fresh.get(key);

  if (cached && Date.now() - cached.at < FRESH_MS) {
    return Promise.resolve(cached.value as T);
  }

  const running = inFlight.get(key);
  if (running) return running as Promise<T>;

  const promise = fetcher()
    .then((value) => {
      fresh.set(key, { at: Date.now(), value });
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

/**
 * Drops everything cached. Called after every write, because a stale list is
 * worse than an extra request.
 */
export function invalidateCache() {
  fresh.clear();
}

/** Test/debug helper: what the cache currently holds. */
export function cacheState() {
  return { inFlight: [...inFlight.keys()], fresh: [...fresh.keys()] };
}
