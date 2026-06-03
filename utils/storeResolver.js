/**
 * Build MongoDB filter to resolve a store by ObjectId, slug, or seoSlug.
 */
function buildStoreLookupFilter(slugOrId, siteId) {
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(String(slugOrId || '').trim());
  let base;
  if (isObjectId) {
    base = { _id: slugOrId };
  } else {
    const normalized = String(slugOrId).trim().toLowerCase();
    const compact = normalized.replace(/[^a-z0-9]/g, '');
    const orConditions = [
      { slug: normalized },
      { seoSlug: normalized },
    ];
    if (compact && compact !== normalized) {
      orConditions.push({ slug: compact }, { seoSlug: compact });
    }
    base = { $or: orConditions };
  }
  if (!siteId) return base;
  return {
    $and: [
      base,
      {
        $or: [
          { siteId },
          { siteId: { $exists: false } },
          { siteId: null },
        ],
      },
    ],
  };
}

module.exports = { buildStoreLookupFilter };
