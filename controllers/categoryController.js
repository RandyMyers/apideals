const Category = require('../models/category');
const Store    = require('../models/store');
const Coupon   = require('../models/coupon');
const Deal     = require('../models/deal');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { generateSlug } = require('../utils/seoUtils');
const { withSiteScope } = require('../utils/tenantQuery');

function buildPublishedOfferFilter(siteId) {
  const base = { isPublished: true, isActive: true };
  if (!siteId) return base;
  return {
    ...base,
    $or: [
      { siteId },
      { siteId: { $exists: false } },
      { siteId: null },
    ],
  };
}

/**
 * Category IDs that have at least one published offer or an active store with published offers.
 */
async function getCategoryIdsWithPublicContent(siteId) {
  const offerFilter = buildPublishedOfferFilter(siteId);

  const [couponCategoryIds, dealCategoryIds, couponStoreIds, dealStoreIds] = await Promise.all([
    Coupon.distinct(
      'categoryId',
      withSiteScope(
        { ...offerFilter, categoryId: { $exists: true, $ne: null } },
        siteId
      )
    ),
    Deal.distinct(
      'categoryId',
      withSiteScope(
        { ...offerFilter, categoryId: { $exists: true, $ne: null } },
        siteId
      )
    ),
    Coupon.distinct(
      'storeId',
      withSiteScope(
        { ...offerFilter, storeId: { $exists: true, $ne: null } },
        siteId
      )
    ),
    Deal.distinct(
      'store',
      withSiteScope(
        { ...offerFilter, store: { $exists: true, $ne: null } },
        siteId
      )
    ),
  ]);

  const storeIdSet = new Set(
    [...couponStoreIds, ...dealStoreIds]
      .filter(Boolean)
      .map((id) => String(id))
  );

  let storeCategoryIds = [];
  if (storeIdSet.size > 0) {
    const storeObjectIds = [...storeIdSet]
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    storeCategoryIds = await Store.distinct(
      'categoryId',
      withSiteScope(
        {
          _id: { $in: storeObjectIds },
          isActive: true,
          categoryId: { $exists: true, $ne: null },
        },
        siteId
      )
    );
  }

  const ids = new Set();
  [...couponCategoryIds, ...dealCategoryIds, ...storeCategoryIds]
    .filter(Boolean)
    .forEach((id) => ids.add(String(id)));
  return ids;
}

// Helper: ensure slug uniqueness for a category
async function uniqueCategorySlug(base, excludeId = null) {
  let slug = generateSlug(base);
  let candidate = slug;
  let i = 1;
  while (true) {
    const q = { slug: candidate };
    if (excludeId) q._id = { $ne: excludeId };
    const exists = await Category.findOne(q);
    if (!exists) break;
    candidate = `${slug}-${i++}`;
  }
  return candidate;
}

// Create a new category
exports.createCategory = async (req, res) => {
  try {
    const { name, description, storeId, parentCategory } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    // Check if the category already exists
    const existingCategory = await Category.findOne({ name: name.trim() });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    let imageUrl = null;

    // Handle uploaded image (express-fileupload style)
    if (req.files && req.files.image) {
      const file = req.files.image;
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: 'categories',
        public_id: `category_${Date.now()}`,
        overwrite: false,
      });
      imageUrl = result.secure_url;
    }

    const parentCategoryId = parentCategory && parentCategory.trim() !== '' ? parentCategory : null;
    const slug = await uniqueCategorySlug(name);

    // SEO fields (optional)
    const { seoSlug, seoTitle, seoDescription, h1, intro } = req.body;
    let seoKeywords = [];
    if (req.body.seoKeywords) {
      try {
        seoKeywords = typeof req.body.seoKeywords === 'string'
          ? JSON.parse(req.body.seoKeywords)
          : (Array.isArray(req.body.seoKeywords) ? req.body.seoKeywords : []);
      } catch (e) {
        seoKeywords = String(req.body.seoKeywords).split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    let faqs = [];
    if (req.body.faqs) {
      try {
        const parsed = typeof req.body.faqs === 'string' ? JSON.parse(req.body.faqs) : req.body.faqs;
        if (Array.isArray(parsed)) faqs = parsed;
      } catch (e) {
        console.warn('[categoryController] Could not parse faqs:', e.message);
      }
    }

    const newCategory = new Category({
      name: name.trim(),
      slug,
      description,
      imageUrl,
      storeId,
      parentCategory: parentCategoryId,
      seoSlug: seoSlug || undefined,
      seoTitle: seoTitle || undefined,
      seoDescription: seoDescription || undefined,
      seoKeywords: seoKeywords.length > 0 ? seoKeywords : undefined,
      h1: h1 || undefined,
      intro: intro || undefined,
      faqs: faqs.length > 0 ? faqs : undefined,
    });

    await newCategory.save();
    return res.status(201).json({
      message: 'Category created successfully',
      category: newCategory,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
};

// Get all categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find()
      .populate('storeId', 'name')
      .populate('parentCategory')
      .lean();

    const categoryIds = categories.map((c) => c._id);
    const publishedOfferMatch = {
      categoryId: { $in: categoryIds },
      isActive: true,
      isPublished: true,
    };

    const [couponAgg, dealAgg] = await Promise.all([
      Coupon.aggregate([
        { $match: publishedOfferMatch },
        { $group: { _id: '$categoryId', count: { $sum: 1 } } },
      ]),
      Deal.aggregate([
        { $match: publishedOfferMatch },
        { $group: { _id: '$categoryId', count: { $sum: 1 } } },
      ]),
    ]);

    const couponCountMap = new Map(couponAgg.map((r) => [String(r._id), r.count]));
    const dealCountMap = new Map(dealAgg.map((r) => [String(r._id), r.count]));

    const includeEmpty = req.query.includeEmpty === 'true' || req.query.includeEmpty === '1';
    const categoryIdsWithContent = includeEmpty
      ? null
      : await getCategoryIdsWithPublicContent(req.siteId);

    const categoriesWithCounts = categories
      .map((cat) => {
        const id = String(cat._id);
        const couponCount = couponCountMap.get(id) || 0;
        const dealCount = dealCountMap.get(id) || 0;
        return {
          ...cat,
          couponCount,
          dealCount,
          offerCount: couponCount + dealCount,
        };
      })
      .filter((cat) => {
        if (includeEmpty) return true;
        return categoryIdsWithContent.has(String(cat._id));
      });

    res.set('Cache-Control', 'public, max-age=300');
    return res.status(200).json({ categories: categoriesWithCounts });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('storeId', 'name slug logo')
      .populate('parentCategory', 'name slug')
      .exec();

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    return res.status(200).json({ category });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update a category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, storeId, parentCategory } = req.body;

    const existing = await Category.findById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const updateData = { updatedAt: Date.now() };

    if (name && name.trim() && name.trim() !== existing.name) {
      // Name changed — regenerate slug
      updateData.name = name.trim();
      updateData.slug = await uniqueCategorySlug(name, id);
    } else if (name) {
      updateData.name = name.trim();
    }

    if (description !== undefined) updateData.description = description;
    if (storeId       !== undefined) updateData.storeId       = storeId;
    if (parentCategory !== undefined) {
      updateData.parentCategory = parentCategory && parentCategory.trim() !== '' ? parentCategory : null;
    }

    // SEO / AEO fields
    if (req.body.seoSlug !== undefined) updateData.seoSlug = req.body.seoSlug;
    if (req.body.seoTitle !== undefined) updateData.seoTitle = req.body.seoTitle;
    if (req.body.seoDescription !== undefined) updateData.seoDescription = req.body.seoDescription;
    if (req.body.h1 !== undefined) updateData.h1 = req.body.h1;
    if (req.body.intro !== undefined) updateData.intro = req.body.intro;
    if (req.body.seoKeywords !== undefined) {
      try {
        updateData.seoKeywords = typeof req.body.seoKeywords === 'string'
          ? JSON.parse(req.body.seoKeywords)
          : (Array.isArray(req.body.seoKeywords) ? req.body.seoKeywords : []);
      } catch (e) {
        updateData.seoKeywords = String(req.body.seoKeywords).split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    if (req.body.faqs !== undefined) {
      try {
        const parsed = typeof req.body.faqs === 'string' ? JSON.parse(req.body.faqs) : req.body.faqs;
        if (Array.isArray(parsed)) updateData.faqs = parsed;
      } catch (e) {
        console.warn('[categoryController] Could not parse faqs:', e.message);
      }
    }
    updateData.contentUpdatedAt = Date.now();

    // Handle new image upload
    if (req.files && req.files.image) {
      const file = req.files.image;
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: 'categories',
        public_id: `category_${Date.now()}`,
        overwrite: false,
      });
      updateData.imageUrl = result.secure_url;
    } else if (req.body.imageUrl !== undefined) {
      // Allow passing a URL directly (e.g. from an existing Cloudinary URL)
      updateData.imageUrl = req.body.imageUrl;
    }

    const category = await Category.findByIdAndUpdate(id, updateData, { new: true });

    return res.status(200).json({ message: 'Category updated successfully', category });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    return res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get categories by parent category (for nested categories)
exports.getCategoriesByParent = async (req, res) => {
  try {
    const categories = await Category.find({ parentCategory: req.params.parentId })
      .populate('parentCategory')
      .exec();

    if (categories.length === 0) {
      return res.status(404).json({ message: 'No categories found for this parent category' });
    }

    return res.status(200).json({ categories });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get popular categories (only categories with published offers or stores that have them)
exports.getPopularCategories = async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 6, 1), 50);

    const contentIds = await getCategoryIdsWithPublicContent(req.siteId);
    if (contentIds.size === 0) {
      res.set('Cache-Control', 'public, max-age=300');
      return res.status(200).json({ success: true, categories: [] });
    }

    const contentObjectIds = [...contentIds]
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const offerFilter = buildPublishedOfferFilter(req.siteId);
    const [couponStoreIds, dealStoreIds] = await Promise.all([
      Coupon.distinct(
        'storeId',
        withSiteScope(
          { ...offerFilter, storeId: { $exists: true, $ne: null } },
          req.siteId
        )
      ),
      Deal.distinct(
        'store',
        withSiteScope(
          { ...offerFilter, store: { $exists: true, $ne: null } },
          req.siteId
        )
      ),
    ]);
    const storeIdsWithOffers = [...new Set([...couponStoreIds, ...dealStoreIds].map(String))]
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const storeMatch = withSiteScope(
      {
        categoryId: { $in: contentObjectIds },
        isActive: true,
        ...(storeIdsWithOffers.length
          ? { _id: { $in: storeIdsWithOffers } }
          : { _id: { $in: [] } }),
      },
      req.siteId
    );

    const storeCounts = await Store.aggregate([
      { $match: storeMatch },
      { $group: { _id: '$categoryId', storeCount: { $sum: 1 } } },
      { $sort: { storeCount: -1 } },
    ]);

    const categories = await Category.find({ _id: { $in: contentObjectIds } })
      .select('name slug description imageUrl')
      .lean();

    const storeCountMap = new Map(
      storeCounts.map((row) => [String(row._id), row.storeCount])
    );

    const categoriesWithCounts = categories
      .map((category) => ({
        _id: category._id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        imageUrl: category.imageUrl,
        storeCount: storeCountMap.get(String(category._id)) || 0,
      }))
      .sort((a, b) => b.storeCount - a.storeCount || a.name.localeCompare(b.name))
      .slice(0, limitNum);

    res.set('Cache-Control', 'public, max-age=300');
    return res.status(200).json({
      success: true,
      categories: categoriesWithCounts,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * GET /category/detail/:slug
 * Returns the category, stores assigned to this category, and active coupons & deals
 * whose **categoryId** matches this category (not merely “all offers from stores in this category”).
 * WooCommerce sync sets each deal/coupon categoryId from the admin flow; listing by categoryId
 * keeps category pages aligned with those assignments.
 *
 * Accepts either a slug or a MongoDB ObjectId.
 */
exports.getCategoryDetail = async (req, res) => {
  try {
    const { slug } = req.params;
    const { type = 'all' } = req.query;

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(slug);
    const category = isObjectId
      ? await Category.findById(slug).lean()
      : await Category.findOne({ slug }).lean();

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const categoryId = category._id;

    // List by each document’s categoryId (not “all offers from stores tagged with this category”).
    // siteId is not required here — same as before; store list above already scopes tenants when needed.
    const offerBase = { categoryId, isActive: true, isPublished: true };

    let coupons = [];
    let deals = [];

    if (type === 'all' || type === 'coupons') {
      coupons = await Coupon.find(offerBase)
        .select('_id title code slug discountValue discountType expirationDate storeId successRate verifiedAt imageUrl')
        .populate('storeId', 'name logo slug website isActive')
        .sort({ createdAt: -1 })
        .limit(60)
        .lean();
      coupons = coupons.filter((c) => {
        const st = c.storeId;
        return st && typeof st === 'object' && st.isActive !== false;
      });
    }

    if (type === 'all' || type === 'deals') {
      deals = await Deal.find(offerBase)
        .select('_id title name slug discountValue discountType originalPrice discountedPrice endDate store imageUrl')
        .populate('store', 'name logo slug website isActive')
        .sort({ createdAt: -1 })
        .limit(60)
        .lean();
      deals = deals.filter((d) => {
        const st = d.store;
        return st && typeof st === 'object' && st.isActive !== false;
      });
    }

    const storeIdsFromOffers = new Set();
    for (const c of coupons) {
      const sid = c.storeId?._id || c.storeId;
      if (sid) storeIdsFromOffers.add(String(sid));
    }
    for (const d of deals) {
      const sid = d.store?._id || d.store;
      if (sid) storeIdsFromOffers.add(String(sid));
    }

    let stores = [];
    if (storeIdsFromOffers.size > 0) {
      const storeFilter = {
        _id: { $in: [...storeIdsFromOffers] },
        isActive: true,
      };
      if (req.siteId) storeFilter.siteId = req.siteId;
      stores = await Store.find(storeFilter)
        .select('_id name logo slug website url')
        .lean();
    }

    const storeMap = {};
    for (const s of stores) {
      storeMap[s._id.toString()] = s;
    }

    const storeInfoFromCoupon = (item) => {
      const st = item.storeId;
      if (st && typeof st === 'object' && st._id) {
        return {
          _id: st._id,
          name: st.name,
          logo: st.logo,
          slug: st.slug,
          website: st.website,
        };
      }
      return storeMap[String(item.storeId)] || null;
    };

    const storeInfoFromDeal = (item) => {
      const st = item.store;
      if (st && typeof st === 'object' && st._id) {
        return {
          _id: st._id,
          name: st.name,
          logo: st.logo,
          slug: st.slug,
          website: st.website,
        };
      }
      return storeMap[item.store?.toString()] || null;
    };

    return res.status(200).json({
      success: true,
      category,
      stores,
      coupons: coupons.map((item) => ({
        ...item,
        storeInfo: storeInfoFromCoupon(item),
      })),
      deals: deals.map((item) => ({
        ...item,
        storeInfo: storeInfoFromDeal(item),
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};