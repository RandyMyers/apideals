/**
 * Slug variant helpers for resolving URLs from GSC/sitemaps (dots, &, apostrophes, encoding).
 */

function collectSlugVariants(input) {
  if (!input || typeof input !== 'string') return [];
  let raw = input.trim();
  try {
    raw = decodeURIComponent(raw);
  } catch {
    /* keep raw */
  }
  raw = raw.replace(/\+/g, ' ');

  const lower = raw.toLowerCase();
  const variants = new Set([lower]);

  const compact = lower.replace(/[^a-z0-9]/g, '');
  if (compact) variants.add(compact);

  const hyphenated = lower
    .replace(/\./g, '-')
    .replace(/&amp;/g, 'and')
    .replace(/&/g, 'and')
    .replace(/['']/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (hyphenated) variants.add(hyphenated);

  const andSpaced = lower.replace(/&/g, ' and ').replace(/\s+/g, '-').replace(/-+/g, '-');
  if (andSpaced) variants.add(andSpaced);

  // software-&-apps style → software-apps
  const noSpecial = lower.replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (noSpecial) variants.add(noSpecial);

  return [...variants].filter(Boolean);
}

function buildSlugOrConditions(slugOrId, fields = ['slug', 'seoSlug']) {
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(String(slugOrId || '').trim());
  if (isObjectId) {
    return [{ _id: slugOrId }];
  }

  const variants = collectSlugVariants(slugOrId);
  const or = [];
  for (const v of variants) {
    for (const field of fields) {
      or.push({ [field]: v });
    }
  }
  return or.length ? or : [{ slug: String(slugOrId).toLowerCase() }];
}

function buildEntityLookupFilter(slugOrId, siteId, fields = ['slug', 'seoSlug']) {
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(String(slugOrId || '').trim());
  let base;
  if (isObjectId) {
    base = { _id: slugOrId };
  } else {
    base = { $or: buildSlugOrConditions(slugOrId, fields) };
  }

  if (!siteId) return base;
  return {
    $and: [
      base,
      {
        $or: [{ siteId }, { siteId: { $exists: false } }, { siteId: null }],
      },
    ],
  };
}

module.exports = {
  collectSlugVariants,
  buildSlugOrConditions,
  buildEntityLookupFilter,
  buildCouponLookupFilter: (slugOrId, siteId) =>
    buildEntityLookupFilter(slugOrId, siteId, ['slug', 'seoSlug']),
  buildDealLookupFilter: (slugOrId, siteId) =>
    buildEntityLookupFilter(slugOrId, siteId, ['slug', 'seoSlug']),
};
