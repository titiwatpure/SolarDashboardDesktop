/**
 * Simple API Response Cache
 * ป้องกัน re-fetch ซ้ำภายใน TTL (Time-to-Live)
 */

const cache = new Map();
const DEFAULT_TTL = 30_000; // 30 วินาที

/**
 * Cache wrapper สำหรับ apiCall
 * @param {string} key - cache key (เช่น URL + params)
 * @param {Function} fetchFn - function ที่ return promise
 * @param {number} ttl - time-to-live ใน ms
 */
export async function cachedFetch(key, fetchFn, ttl = DEFAULT_TTL) {
  const now = Date.now();
  const cached = cache.get(key);

  if (cached && now - cached.timestamp < ttl) {
    return cached.data;
  }

  const data = await fetchFn();
  cache.set(key, { data, timestamp: now });
  return data;
}

/**
 * ล้าง cache ทั้งหมด
 */
export function clearCache() {
  cache.clear();
}

/**
 * ล้าง cache ที่ match key prefix
 * @param {string} prefix
 */
export function clearCacheByPrefix(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Cache size (สำหรับ debug)
 */
export function getCacheSize() {
  return cache.size;
}
