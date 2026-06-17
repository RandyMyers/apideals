/**
 * Classify neutral (English) URL paths for locale redirect checks.
 * Lives under utils/ (deployed) — do not import from scripts/ (gitignored on Hostinger).
 */

const STATIC_NEUTRAL_PATHS = [
  '/faq',
  '/help',
  '/contact',
  '/feedback',
  '/report-issue',
  '/about',
  '/partners',
  '/benefits',
  '/privacy',
  '/terms',
  '/community-guidelines',
  '/cookies',
  '/sitemap',
];

const LIST_NEUTRAL_PATHS = new Set([
  '/stores/all',
  '/coupons/all',
  '/deals/all',
  '/categories/all',
  '/blog',
]);

function classifyNeutralPath(neutralPath) {
  const p = neutralPath.replace(/\/+$/, '') || '/';
  if (p === '/' || p === '') return { type: 'home' };
  if (STATIC_NEUTRAL_PATHS.includes(p)) return { type: 'static', path: p };
  if (LIST_NEUTRAL_PATHS.has(p)) return { type: 'list', path: p };
  if (p === '/stores/all') return { type: 'list', path: p, entity: 'stores' };

  const patterns = [
    { re: /^\/stores\/([^/]+)$/, type: 'store', slugKey: 1, reserved: new Set(['all']) },
    { re: /^\/categories\/([^/]+)$/, type: 'category', slugKey: 1, reserved: new Set(['all']) },
    { re: /^\/coupon\/([^/]+)$/, type: 'coupon', slugKey: 1 },
    { re: /^\/deal\/([^/]+)$/, type: 'deal', slugKey: 1 },
    { re: /^\/blog\/([^/]+)$/, type: 'blog', slugKey: 1 },
    { re: /^\/stores\/([^/]+)\/([^/]+)$/, type: 'storeLanding', slugKey: 1, landingSlug: 2 },
  ];

  for (const { re, type, slugKey, landingSlug, reserved } of patterns) {
    const m = p.match(re);
    if (!m) continue;
    const slug = m[slugKey];
    if (reserved?.has(slug)) continue;
    const out = { type, slug, path: p };
    if (landingSlug) out.landingSlug = m[landingSlug];
    return out;
  }

  return { type: 'other', path: p };
}

module.exports = {
  classifyNeutralPath,
  STATIC_NEUTRAL_PATHS,
  LIST_NEUTRAL_PATHS,
};
