const StoreLandingPage = require('../models/storeLandingPage');
const Store = require('../models/store');
const Deal = require('../models/deal');
const Coupon = require('../models/coupon');
const adminMiddleware = require('../middleware/adminMiddleware');
const { isCountryAvailable } = require('../utils/countryUtils');

function isObjectIdLike(value) {
  return /^[0-9a-fA-F]{24}$/.test(String(value || '').trim());
}

function buildKeywordRegex(keyword) {
  if (!keyword || typeof keyword !== 'string') return null;
  const trimmed = keyword.trim();
  if (!trimmed) return null;
  // keep it simple; escape regex metacharacters
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i');
}

async function resolveStoreBySlugOrId(storeSlugOrId, siteId) {
  const filter = isObjectIdLike(storeSlugOrId)
    ? { _id: storeSlugOrId }
    : { slug: String(storeSlugOrId).trim().toLowerCase() };
  if (siteId) filter.siteId = siteId;
  return Store.findOne(filter).select('_id name slug logo url website isActive categoryId siteId storeIndicators').lean();
}

function buildEntityFilters(landing) {
  const filters = {};
  if (landing.entityType && landing.entityType !== 'all') filters.entityType = landing.entityType;
  if (landing.entityLocation) filters.entityLocation = landing.entityLocation;
  if (Array.isArray(landing.entityTags) && landing.entityTags.length > 0) {
    filters.entityTags = { $in: landing.entityTags };
  }
  return filters;
}

// ---------------------------------------------------------------------------
// Public: GET /api/v1/stores/:storeSlug/landing/:landingSlug
// ---------------------------------------------------------------------------
exports.getPublicLanding = async (req, res) => {
  try {
    const { storeSlug, landingSlug } = req.params;
    const { country } = req.query;
    const now = new Date();

    const store = await resolveStoreBySlugOrId(storeSlug, req.siteId);
    if (!store) return res.status(404).json({ message: 'Store not found' });
    if (store.isActive === false) return res.status(404).json({ message: 'Store not found' });

    const landingFilter = {
      storeId: store._id,
      slug: String(landingSlug).trim().toLowerCase(),
      isActive: true,
      isPublished: true,
    };
    if (req.siteId) landingFilter.siteId = req.siteId;

    const landing = await StoreLandingPage.findOne(landingFilter).lean();
    if (!landing) return res.status(404).json({ message: 'Landing page not found' });

    // Landing page location gating (optional)
    if (country && !isCountryAvailable(country, landing.availableCountries || [], landing.isWorldwide !== false)) {
      return res.status(403).json({ message: 'This page is not available in your location' });
    }

    const keywordRegex = buildKeywordRegex(landing.keyword);
    const entityFilters = buildEntityFilters(landing);

    const includeDeals = !landing.offerTypes || landing.offerTypes.includes('deals');
    const includeCoupons = !landing.offerTypes || landing.offerTypes.includes('coupons');

    let deals = [];
    let coupons = [];

    if (includeDeals) {
      const dealQuery = {
        store: store._id,
        isPublished: true,
        isActive: true,
        $or: [{ endDate: { $gte: now } }, { endDate: null }, { endDate: { $exists: false } }],
        ...entityFilters,
      };
      if (req.siteId) dealQuery.siteId = req.siteId;
      if (keywordRegex) {
        dealQuery.$or = [
          ...(dealQuery.$or || []),
          { title: keywordRegex },
          { name: keywordRegex },
          { description: keywordRegex },
          { longDescription: keywordRegex },
        ];
      }

      deals = await Deal.find(dealQuery)
        .select('_id title name slug discountValue discountType originalPrice discountedPrice endDate store imageUrl entityType entityLocation entityTags createdAt')
        .populate('store', 'name slug logo website isActive')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      if (country) {
        deals = deals.filter((d) =>
          isCountryAvailable(country, d.availableCountries || [], d.isWorldwide !== false)
        );
      }
      deals = deals.filter((d) => (d.store && typeof d.store === 'object' ? d.store.isActive !== false : true));
    }

    if (includeCoupons) {
      const couponQuery = {
        storeId: store._id,
        isPublished: true,
        isActive: true,
        endDate: { $gte: now },
        ...entityFilters,
      };
      if (req.siteId) couponQuery.siteId = req.siteId;
      if (keywordRegex) {
        couponQuery.$or = [
          { title: keywordRegex },
          { code: keywordRegex },
          { description: keywordRegex },
          { longDescription: keywordRegex },
          { productName: keywordRegex },
        ];
      }

      coupons = await Coupon.find(couponQuery)
        .select('_id title code slug discountValue discountType endDate storeId successRate verifiedAt imageUrl entityType entityLocation entityTags createdAt')
        .populate('storeId', 'name slug logo website isActive')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      if (country) {
        coupons = coupons.filter((c) =>
          isCountryAvailable(country, c.availableCountries || [], c.isWorldwide !== false)
        );
      }
      coupons = coupons.filter((c) => (c.storeId && typeof c.storeId === 'object' ? c.storeId.isActive !== false : true));
    }

    return res.status(200).json({
      landing,
      store,
      deals,
      coupons,
    });
  } catch (error) {
    console.error('Error fetching store landing page:', error);
    return res.status(500).json({ message: 'Error fetching landing page', error: error.message });
  }
};

// ---------------------------------------------------------------------------
// Admin CRUD (JWT + adminMiddleware)
// Base: /api/v1/store-landing-pages
// ---------------------------------------------------------------------------

exports.listLandingPages = async (req, res) => {
  try {
    const { storeId, search, isActive, isPublished, limit = 100, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = {};
    if (req.siteId) query.siteId = req.siteId;
    if (storeId) query.storeId = storeId;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (isPublished !== undefined) query.isPublished = isPublished === 'true';
    if (search) {
      const rx = buildKeywordRegex(search);
      query.$or = [{ title: rx }, { slug: rx }, { description: rx }, { keyword: rx }];
    }

    const rows = await StoreLandingPage.find(query)
      .populate('storeId', 'name slug logo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await StoreLandingPage.countDocuments(query);
    res.status(200).json({
      pages: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error listing landing pages:', error);
    res.status(500).json({ message: 'Error listing landing pages', error: error.message });
  }
};

exports.getLandingPageById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = { _id: id };
    if (req.siteId) query.siteId = req.siteId;
    const page = await StoreLandingPage.findOne(query).populate('storeId', 'name slug logo').lean();
    if (!page) return res.status(404).json({ message: 'Landing page not found' });
    res.status(200).json(page);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching landing page', error: error.message });
  }
};

exports.createLandingPage = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (req.siteId) payload.siteId = req.siteId;
    if (payload.slug) payload.slug = String(payload.slug).trim().toLowerCase();

    const created = await StoreLandingPage.create(payload);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating landing page:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Landing page slug already exists for this store.' });
    }
    res.status(500).json({ message: 'Error creating landing page', error: error.message });
  }
};

exports.updateLandingPage = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updatedAt: new Date() };
    if (updates.slug) updates.slug = String(updates.slug).trim().toLowerCase();

    const query = { _id: id };
    if (req.siteId) query.siteId = req.siteId;

    const updated = await StoreLandingPage.findOneAndUpdate(query, updates, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) return res.status(404).json({ message: 'Landing page not found' });
    res.status(200).json(updated);
  } catch (error) {
    console.error('Error updating landing page:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Landing page slug already exists for this store.' });
    }
    res.status(500).json({ message: 'Error updating landing page', error: error.message });
  }
};

exports.deleteLandingPage = async (req, res) => {
  try {
    const { id } = req.params;
    const query = { _id: id };
    if (req.siteId) query.siteId = req.siteId;
    const deleted = await StoreLandingPage.findOneAndDelete(query).lean();
    if (!deleted) return res.status(404).json({ message: 'Landing page not found' });
    res.status(200).json({ message: 'Landing page deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting landing page', error: error.message });
  }
};

// Convenience export for route composition (keeps similar pattern to other routes)
exports.adminOnly = adminMiddleware(['superAdmin', 'marketingManager', 'contentEditor', 'couponManager']);

