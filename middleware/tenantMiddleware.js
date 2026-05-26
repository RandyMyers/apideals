/**
 * Multi-site tenant resolution.
 * Resolves site from X-Site-Id, X-Site-Slug, or Host header.
 * Falls back to dealcouponz (first site) when no site context for backward compatibility.
 */
const Site = require('../models/site');
const tenantCache = require('../utils/tenantCache');

async function resolveTenant(req, res, next) {
  try {
    const siteId = req.headers['x-site-id'];
    const siteSlug = req.headers['x-site-slug'];
    const host = (req.headers['host'] || req.headers['x-forwarded-host'] || '').split(':')[0].toLowerCase();

    const key = tenantCache.cacheKey(siteId, siteSlug, host);
    let site = tenantCache.get(key);

    if (!site && siteId) {
      site = await Site.findOne({ _id: siteId, isActive: true }).lean();
    }
    if (!site && siteSlug) {
      site = await Site.findOne({ slug: siteSlug, isActive: true }).lean();
    }
    if (!site && host) {
      site = await Site.findOne({ domains: host, isActive: true }).lean();
    }
    if (!site) {
      site = await Site.findOne({ isActive: true }).sort({ createdAt: 1 }).lean();
    }
    if (site) {
      tenantCache.set(key, site);
    }

    req.site = site;
    req.siteId = site?._id || null;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { resolveTenant };
