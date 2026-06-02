/**
 * Tenant-aware Mongo filters: match current site or legacy rows without siteId.
 */
function withSiteScope(baseFilter, siteId) {
  if (!siteId) return baseFilter;
  return {
    $and: [
      baseFilter,
      {
        $or: [{ siteId }, { siteId: { $exists: false } }, { siteId: null }],
      },
    ],
  };
}

module.exports = { withSiteScope };
