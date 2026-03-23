/**
 * Multi-site tenant resolution.
 * Resolves site from X-Site-Id, X-Site-Slug, or Host header.
 * Falls back to dealcouponz (first site) when no site context for backward compatibility.
 */
const Site = require('../models/site');

async function resolveTenant(req, res, next) {
  try {
    const siteId = req.headers['x-site-id'];
    const siteSlug = req.headers['x-site-slug'];
    const host = (req.headers['host'] || req.headers['x-forwarded-host'] || '').split(':')[0].toLowerCase();

    let site = null;

    if (siteId) {
      site = await Site.findOne({ _id: siteId, isActive: true }).lean();
    }
    if (!site && siteSlug) {
      site = await Site.findOne({ slug: siteSlug, isActive: true }).lean();
    }
    if (!site && host) {
      site = await Site.findOne({ domains: host, isActive: true }).lean();
    }
    // Fallback: first active site (dealcouponz) for backward compatibility
    if (!site) {
      site = await Site.findOne({ isActive: true }).sort({ createdAt: 1 }).lean();
    }

    req.site = site;
    req.siteId = site?._id || null;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { resolveTenant };
