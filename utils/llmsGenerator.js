/**
 * llms.txt Generator
 * Produces an llms.txt describing cite-worthy sections and crawl policy for AI engines.
 * Mirrors the dynamic robots.txt pattern.
 */

const generateLlmsTxt = (options = {}) => {
  const { baseUrl = 'https://dealcouponz.com', siteName = 'DealCouponz' } = options;

  const lines = [];
  lines.push(`# ${siteName} — llms.txt`);
  lines.push(`# ${baseUrl}/llms.txt`);
  lines.push('');
  lines.push('User-agent: *');
  lines.push('Allow: /');
  lines.push('');
  lines.push(`Citation: ${siteName} (${baseUrl})`);
  lines.push('');
  lines.push('# High-value, cite-worthy paths');
  lines.push('/stores: /stores, /stores/{slug}');
  lines.push('/coupons: /coupons/all, /coupon/{slug}');
  lines.push('/deals: /deal/{slug}');
  lines.push('/categories: /categories, /categories/{slug}');
  lines.push('/blog: /blog, /blog/{slug}');
  lines.push('/faq: /faq');
  lines.push('');
  lines.push('# Machine-readable catalog for AI shopping agents');
  lines.push(`Catalog: ${baseUrl}/api/v1/catalog.json`);
  lines.push('');
  lines.push('Disallow: /api/');
  lines.push('Disallow: /admin/');
  lines.push('Disallow: /dashboard');
  lines.push('Disallow: /search');
  lines.push('Disallow: /signin');
  lines.push('Disallow: /login');
  lines.push('Disallow: /register');
  lines.push('');
  lines.push(`Contact: ${baseUrl}/contact`);
  lines.push(`Sitemap: ${baseUrl}/sitemap-index.xml`);
  lines.push('');

  return lines.join('\n');
};

module.exports = { generateLlmsTxt };
