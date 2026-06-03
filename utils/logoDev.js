/**
 * Logo.dev — brand search (secret key) + image URLs (public token).
 * @see https://www.logo.dev/docs/brand-search/introduction
 */

const LOGO_DEV_SECRET =
  process.env.LOGO_DEV_SECRET_KEY ||
  process.env.LOGO_DEV_SECRET ||
  '';

const LOGO_DEV_TOKEN = process.env.LOGO_DEV_TOKEN || '';

function isConfigured() {
  return Boolean(LOGO_DEV_SECRET && LOGO_DEV_TOKEN);
}

function normalizeDomain(input) {
  if (!input || typeof input !== 'string') return '';
  let value = input.trim().toLowerCase();
  try {
    if (value.includes('://')) {
      value = new URL(value).hostname;
    }
  } catch {
    // keep as-is
  }
  return value.replace(/^www\./, '').split('/')[0];
}

/**
 * Public CDN logo URL (same pattern as seedPopularStores.js).
 */
function buildLogoImageUrl(domainOrUrl, options = {}) {
  if (!LOGO_DEV_TOKEN) return '';
  const domain = normalizeDomain(domainOrUrl);
  if (!domain) return '';
  const size = options.size || 200;
  const format = options.format || 'png';
  return `https://img.logo.dev/${encodeURIComponent(domain)}?token=${LOGO_DEV_TOKEN}&size=${size}&format=${format}`;
}

/**
 * Brand search — requires LOGO_DEV_SECRET_KEY (sk_…).
 */
/** Logo.dev accepts `suggest` (autocomplete) or `match` (exact). */
function normalizeSearchStrategy(strategy) {
  if (strategy === 'match') return 'match';
  if (strategy === 'typeahead' || strategy === 'suggest') return 'suggest';
  return 'suggest';
}

async function searchBrands(query, strategy = 'suggest') {
  const q = String(query || '').trim();
  if (!q) return [];
  if (!LOGO_DEV_SECRET) {
    const err = new Error('Logo.dev search is not configured. Set LOGO_DEV_SECRET_KEY on the server.');
    err.code = 'LOGO_DEV_NOT_CONFIGURED';
    throw err;
  }

  const url = new URL('https://api.logo.dev/search');
  url.searchParams.set('q', q);
  url.searchParams.set('strategy', normalizeSearchStrategy(strategy));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${LOGO_DEV_SECRET}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Logo.dev search failed (${res.status})${text ? `: ${text.slice(0, 120)}` : ''}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const list = Array.isArray(data) ? data : data?.results || data?.data || [];

  return list
    .map((item) => {
      const domain = normalizeDomain(item.domain || item.website || item.url || '');
      const name = item.name || item.brand || item.company || domain;
      if (!domain) return null;
      return {
        name: String(name).trim(),
        domain,
        logoUrl: buildLogoImageUrl(domain),
      };
    })
    .filter(Boolean);
}

module.exports = {
  isConfigured,
  normalizeDomain,
  buildLogoImageUrl,
  searchBrands,
  hasSearchKey: Boolean(LOGO_DEV_SECRET),
  hasImageToken: Boolean(LOGO_DEV_TOKEN),
};
