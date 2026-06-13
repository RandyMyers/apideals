/**
 * Build MongoDB filter to resolve a store by ObjectId, slug, or seoSlug.
 */
const { buildEntityLookupFilter } = require('./slugResolver');

function buildStoreLookupFilter(slugOrId, siteId) {
  return buildEntityLookupFilter(slugOrId, siteId, ['slug', 'seoSlug']);
}

module.exports = { buildStoreLookupFilter };
