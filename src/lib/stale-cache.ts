/**
 * In-memory stale-while-revalidate cache.
 *
 * - Fresh entry (younger than `ttlMs`): returned as-is.
 * - Expired but usable entry: returned immediately with `stale: true` while a
 *   single background refresh runs. Refreshes are deduplicated per key and,
 *   after a failure, not retried for `retryMs`.
 * - No usable entry, or `waitForFresh`: awaits the upstream fetch. On failure
 *   falls back to whatever entry exists, otherwise rethrows.
 *
 * Entries live only in this process; a restart empties the cache.
 */

export interface StaleCacheOptions<T> {
  /** How long an entry counts as fresh. */
  ttlMs: number;
  /** Maximum number of entries; the oldest is evicted first. */
  maxSize: number;
  /** Minimum gap between upstream attempts for a key after one fails. */
  retryMs: number;
  fetcher: (key: string) => Promise<T>;
  /** Whether an expired entry is still worth serving instantly. Defaults to always. */
  isUsable?: (data: T) => boolean;
  /** Called once per failed upstream attempt (e.g. to log it). */
  onError?: (key: string, err: unknown) => void;
  /** Clock, injectable for tests. */
  now?: () => number;
}

export interface StaleCacheResult<T> {
  data: T;
  /** True when `data` is older than the TTL (or an emergency fallback). */
  stale: boolean;
}

export interface StaleCache<T> {
  get(key: string, opts?: { waitForFresh?: boolean }): Promise<StaleCacheResult<T>>;
  readonly size: number;
}

export function createStaleCache<T>(options: StaleCacheOptions<T>): StaleCache<T> {
  const { ttlMs, maxSize, retryMs, fetcher, isUsable = () => true, onError, now = Date.now } = options;

  const entries = new Map<string, { data: T; ts: number }>();
  const inflight = new Map<string, Promise<T>>();
  const lastFailure = new Map<string, number>();

  function store(key: string, data: T): void {
    entries.delete(key);
    if (entries.size >= maxSize) {
      const oldest = entries.keys().next().value;
      if (oldest !== undefined) entries.delete(oldest);
    }
    entries.set(key, { data, ts: now() });
  }

  /** Start (or join) the single upstream fetch for a key. */
  function revalidate(key: string): Promise<T> {
    const running = inflight.get(key);
    if (running) return running;

    const attempt = fetcher(key)
      .then(
        (data) => {
          store(key, data);
          lastFailure.delete(key);
          return data;
        },
        (err: unknown) => {
          lastFailure.set(key, now());
          onError?.(key, err);
          throw err;
        }
      )
      .finally(() => inflight.delete(key));

    inflight.set(key, attempt);
    return attempt;
  }

  function recentlyFailed(key: string): boolean {
    const at = lastFailure.get(key);
    return at !== undefined && now() - at < retryMs;
  }

  async function get(
    key: string,
    { waitForFresh = false }: { waitForFresh?: boolean } = {}
  ): Promise<StaleCacheResult<T>> {
    const entry = entries.get(key);
    if (entry && now() - entry.ts < ttlMs) return { data: entry.data, stale: false };

    const usable = entry !== undefined && isUsable(entry.data);

    if (usable && !waitForFresh) {
      if (!inflight.has(key) && !recentlyFailed(key)) revalidate(key).catch(() => {});
      return { data: entry.data, stale: true };
    }

    // Caller needs fresh data (or the entry is too old to show). Skip a new
    // attempt if one just failed, unless a fetch is already running to join.
    if (entry && recentlyFailed(key) && !inflight.has(key)) {
      return { data: entry.data, stale: true };
    }

    try {
      return { data: await revalidate(key), stale: false };
    } catch (err) {
      if (entry) return { data: entry.data, stale: true };
      throw err;
    }
  }

  return {
    get,
    get size() {
      return entries.size;
    },
  };
}
