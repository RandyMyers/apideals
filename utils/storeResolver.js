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
    base = { $or: [{ slug: normalized }, { seoSlug: normalized }] };
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
