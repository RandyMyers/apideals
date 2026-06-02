/**
 * Agent Catalog Controller
 * Read-only, machine-readable feed of verified offers for AI shopping agents
 * and answer engines. Exposed at GET /api/v1/catalog.json.
 */

const Coupon = require('../models/coupon');
const Deal = require('../models/deal');

const getBaseUrl = (req) =>
  process.env.CLIENT_URL || `${req.protocol}://${req.get('host')}`;

const serializeCoupon = (c, baseUrl) => ({
  type: 'coupon',
  id: c._id.toString(),
  title: c.title || null,
  code: c.code || null,
  store: c.storeId && c.storeId.name ? c.storeId.name : undefined,
  category: c.categoryId && c.categoryId.name ? c.categoryId.name : undefined,
  discountType: c.discountType,
  discountValue: c.discountValue,
  url: `${baseUrl}/coupon/${c.seoSlug || c.slug || c._id}`,
  verified: !!c.verified,
  lastVerifiedAt: c.lastVerifiedAt || null,
  startsAt: c.startDate || null,
  expiresAt: c.endDate || null,
  exclusions: c.exclusions || null,
  flags: {
    freeShipping: !!c.freeShipping,
    studentDiscount: !!c.studentDiscount,
    militaryDiscount: !!c.militaryDiscount,
    firstPurchaseOnly: !!c.firstPurchaseOnly,
    stackable: !!c.stackable,
    minCartValue: c.minCartValue != null ? c.minCartValue : null,
  },
  faqs: Array.isArray(c.faqs)
    ? c.faqs.map((f) => ({ question: f.question, answer: f.answer, group: f.group || 'faq' }))
    : [],
});

const serializeDeal = (d, baseUrl) => ({
  type: 'deal',
  id: d._id.toString(),
  title: d.title || d.name || null,
  store: d.store && d.store.name ? d.store.name : undefined,
  category: d.categoryId && d.categoryId.name ? d.categoryId.name : undefined,
  dealType: d.dealType,
  discountType: d.discountType,
  discountValue: d.discountValue,
  originalPrice: d.originalPrice != null ? d.originalPrice : null,
  discountedPrice: d.discountedPrice != null ? d.discountedPrice : null,
  currency: d.currency || null,
  url: `${baseUrl}/deal/${d.seoSlug || d.slug || d._id}`,
  verified: !!d.verified,
  lastVerifiedAt: d.lastVerifiedAt || null,
  startsAt: d.startDate || null,
  expiresAt: d.endDate || null,
  exclusions: d.exclusions || null,
  faqs: Array.isArray(d.faqs)
    ? d.faqs.map((f) => ({ question: f.question, answer: f.answer, group: f.group || 'faq' }))
    : [],
});

exports.getCatalog = async (req, res) => {
  try {
    const baseUrl = getBaseUrl(req);
    const now = new Date();
    const limit = Math.min(parseInt(req.query.limit, 10) || 1000, 5000);
    const verifiedOnly = req.query.verified === 'true';

    const couponFilter = { isPublished: true, isActive: true, endDate: { $gte: now } };
    const dealFilter = { isPublished: true, isActive: true, endDate: { $gte: now } };
    if (verifiedOnly) {
      couponFilter.verified = true;
      dealFilter.verified = true;
    }

    const [coupons, deals] = await Promise.all([
      Coupon.find(couponFilter)
        .select('title code slug seoSlug discountType discountValue startDate endDate verified lastVerifiedAt exclusions freeShipping studentDiscount militaryDiscount firstPurchaseOnly stackable minCartValue faqs storeId categoryId')
        .populate('storeId', 'name')
        .populate('categoryId', 'name')
        .limit(limit)
        .lean(),
      Deal.find(dealFilter)
        .select('title name slug seoSlug dealType discountType discountValue originalPrice discountedPrice currency startDate endDate verified lastVerifiedAt exclusions faqs store categoryId')
        .populate('store', 'name')
        .populate('categoryId', 'name')
        .limit(limit)
        .lean(),
    ]);

    const payload = {
      '@context': 'https://schema.org',
      provider: {
        name: 'DealCouponz',
        url: baseUrl,
        contact: `${baseUrl}/contact`,
        methodology: `${baseUrl}/faq`,
      },
      generatedAt: now.toISOString(),
      counts: { coupons: coupons.length, deals: deals.length },
      offers: [
        ...coupons.map((c) => serializeCoupon(c, baseUrl)),
        ...deals.map((d) => serializeDeal(d, baseUrl)),
      ],
    };

    res.set('Cache-Control', 'public, max-age=3600');
    res.set('Access-Control-Allow-Origin', '*');
    res.status(200).json(payload);
  } catch (error) {
    console.error('Error generating agent catalog:', error);
    res.status(500).json({ error: 'Failed to generate catalog', message: error.message });
  }
};
