/**
 * TTL-based in-memory cache.
 * Stores values with an expiry timestamp; expired entries are left in store
 * for stale-data retrieval and cleaned up on overwrite or explicit invalidation.
 */

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

const store = new Map();

/**
 * Retrieve a cached value by key.
 * Returns undefined if the key does not exist or has expired.
 * Does NOT delete expired entries so that allowStale can still retrieve them.
 * @param {string} key
 * @param {{ allowStale?: boolean }} [options] - If allowStale is true, return data even if expired
 * @returns {*|undefined}
 */
export function get(key, options = {}) {
  const entry = store.get(key);
  if (!entry) return undefined;

  const isExpired = Date.now() > entry.expiresAt;

  if (isExpired && !options.allowStale) {
    return undefined;
  }

  return entry.value;
}

/**
 * Store a value with an optional TTL.
 * Overwrites any existing entry (including expired ones).
 * @param {string} key
 * @param {*} value
 * @param {number} [ttlMs=300000] Time-to-live in milliseconds (default 5 min)
 */
export function set(key, value, ttlMs = DEFAULT_TTL_MS) {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Remove a specific key from the cache.
 * @param {string} key
 */
export function invalidate(key) {
  store.delete(key);
}

/**
 * Clear the entire cache.
 */
export function invalidateAll() {
  store.clear();
}
