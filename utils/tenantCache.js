/**
 * Short-lived in-memory cache for Site tenant resolution.
 */

const TTL_MS = 2 * 60 * 1000;
const cache = new Map();

function cacheKey(siteId, siteSlug, host) {
  return `${siteId || ''}|${siteSlug || ''}|${host || ''}`;
}

function get(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.site;
}

function set(key, site) {
  cache.set(key, { site, at: Date.now() });
  if (cache.size > 200) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
}

module.exports = { cacheKey, get, set };
