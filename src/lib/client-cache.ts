/**
 * In-memory client-side data cache for instant UI rendering during tab transitions.
 * Implements a Stale-While-Revalidate pattern so pages render immediately (0ms)
 * without flashing blank skeletons, while background revalidation keeps data accurate.
 */

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();

export function getCachedData<T>(key: string, maxAgeMs = 120_000): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;

  // If entry exists and is within acceptable stale age, return it
  if (Date.now() - entry.timestamp < maxAgeMs) {
    return entry.data as T;
  }
  return null;
}

export function setCachedData<T>(key: string, data: T): void {
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

export function invalidateCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(keyPrefix)) {
      memoryCache.delete(key);
    }
  }
}
