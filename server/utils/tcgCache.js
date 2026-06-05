const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCachedResponse(key) {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

function setCachedResponse(key, value) {
  cache.set(key, {
    value,
    expires: Date.now() + CACHE_TTL_MS
  });
}

module.exports = {
  getCachedResponse,
  setCachedResponse
};
