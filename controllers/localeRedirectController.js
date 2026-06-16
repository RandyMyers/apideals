const { resolveLocaleRedirect } = require('../utils/localeRedirectResolver');

const CACHE_MAX_AGE = parseInt(process.env.LOCALE_REDIRECT_CACHE_SECONDS || '120', 10);

/**
 * GET /api/v1/locale/redirect-check?path=/de/stores/foo
 * Returns { redirect: "/stores/foo" | null, reason?, locale?, urlCode? }
 */
exports.redirectCheck = async (req, res) => {
  try {
    const path = req.query.path || req.query.url || '';
    if (!path || typeof path !== 'string') {
      return res.status(400).json({ message: 'path query parameter is required' });
    }

    const result = await resolveLocaleRedirect(path);

    res.set('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_MAX_AGE}`);
    return res.json(result);
  } catch (err) {
    console.error('[localeRedirect] redirect-check error:', err);
    return res.status(500).json({ message: 'Failed to check locale redirect', redirect: null });
  }
};
