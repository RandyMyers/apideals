/**
 * IndexNow utility
 * Instantly notifies IndexNow-enabled engines (Bing, Yandex, Seznam, etc.)
 * when content is published or updated.
 *
 * Requires:
 *   - INDEXNOW_API_KEY env (a 8-128 char hex-ish key)
 *   - A key file served at {host}/{key}.txt containing the key
 *     (drop it in client/public/{key}.txt so CRA serves it at the root)
 *
 * No-ops gracefully when the key is missing so it never blocks publishing.
 */

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

const getBaseUrl = () => process.env.CLIENT_URL || 'https://dealcouponz.com';

/**
 * Resolve the IndexNow key. The env var wins for ops overrides; otherwise we
 * fall back to the admin-managed key in SEO settings. Returns null when
 * IndexNow is disabled in settings or no key is configured.
 */
const getKey = async () => {
  let enabled = true;
  let dbKey = null;
  try {
    const SEOSettings = require('../models/seoSettings');
    const settings = await SEOSettings.getSettings();
    if (settings && settings.indexNow) {
      enabled = settings.indexNow.enabled !== false;
      dbKey = settings.indexNow.apiKey || null;
    }
  } catch (e) {
    // DB unavailable — fall back to env-only behavior.
  }
  if (!enabled) return null;
  return process.env.INDEXNOW_API_KEY || dbKey;
};

/**
 * Submit one or more URLs to IndexNow.
 * @param {string|string[]} urls Absolute URLs (or root-relative paths) to submit.
 * @returns {Promise<{ok: boolean, skipped?: boolean, status?: number, error?: string}>}
 */
const submitUrls = async (urls) => {
  const key = await getKey();
  if (!key) {
    return { ok: false, skipped: true, error: 'IndexNow disabled or key not set' };
  }

  const baseUrl = getBaseUrl();
  const host = baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const urlList = (Array.isArray(urls) ? urls : [urls])
    .filter(Boolean)
    .map((u) => (u.startsWith('http') ? u : `${baseUrl}${u.startsWith('/') ? '' : '/'}${u}`));

  if (urlList.length === 0) {
    return { ok: false, skipped: true, error: 'No URLs to submit' };
  }

  const payload = {
    host,
    key,
    keyLocation: `${baseUrl}/${key}.txt`,
    urlList,
  };

  try {
    // Node 18+ provides a global fetch.
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok, status: res.status };
  } catch (error) {
    console.warn('IndexNow submission failed:', error.message);
    return { ok: false, error: error.message };
  }
};

/**
 * Fire-and-forget helper for use inside controllers — never throws.
 */
const pingIndexNow = (urls) => {
  submitUrls(urls).catch((e) => console.warn('IndexNow ping error:', e.message));
};

module.exports = { submitUrls, pingIndexNow };
