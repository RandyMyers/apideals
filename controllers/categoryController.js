const Category = require('../models/category');
const Store    = require('../models/store');
const Coupon   = require('../models/coupon');
const Deal     = require('../models/deal');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { generateSlug } = require('../utils/seoUtils');

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

    const newCategory = new Category({
      name: name.trim(),
      slug,
      description,
      imageUrl,
      storeId,
      parentCategory: parentCategoryId,
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
      .populate('storeId', 'name') // If you need to populate coupons
      .populate('parentCategory') // If you need to populate parent category
      .exec();

    return res.status(200).json({ categories });
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

// Get popular categories (sorted by number of stores in each category)
exports.getPopularCategories = async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    const limitNum = Math.min(parseInt(limit, 10) || 6, 6); // Max 6 for footer
    
    // Aggregate stores by categoryId to count stores per category
    const storeCounts = await Store.aggregate([
      { $match: { categoryId: { $exists: true, $ne: null }, isActive: { $ne: false } } },
      { $group: { _id: '$categoryId', storeCount: { $sum: 1 } } },
      { $sort: { storeCount: -1 } },
      { $limit: limitNum }
    ]);

    // Get category IDs
    const categoryIds = storeCounts.map(item => item._id);

    // Fetch category details
    const categories = await Category.find({ _id: { $in: categoryIds } })
      .select('name description imageUrl')
      .exec();

    // Map categories with store counts
    const categoriesWithCounts = categories.map(category => {
      const countData = storeCounts.find(item => item._id.toString() === category._id.toString());
      return {
        _id: category._id,
        name: category.name,
        description: category.description,
        imageUrl: category.imageUrl,
        storeCount: countData ? countData.storeCount : 0
      };
    });

    // Sort by store count (descending)
    categoriesWithCounts.sort((a, b) => b.storeCount - a.storeCount);

    // If we have fewer categories than limit, fill with any other categories
    if (categoriesWithCounts.length < limitNum) {
      const existingIds = categoriesWithCounts.map(c => c._id.toString());
      const additionalCategories = await Category.find({
        _id: { $nin: existingIds.map(id => new mongoose.Types.ObjectId(id)) }
      })
        .select('name description imageUrl')
        .limit(limitNum - categoriesWithCounts.length)
        .exec();

      additionalCategories.forEach(category => {
        categoriesWithCounts.push({
          _id: category._id,
          name: category.name,
          description: category.description,
          imageUrl: category.imageUrl,
          storeCount: 0
        });
      });
    }

    return res.status(200).json({
      success: true,
      categories: categoriesWithCounts.slice(0, limitNum)
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * GET /category/detail/:slug
 * Returns the category, its stores, and those stores' active coupons & deals.
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

    const stores = await Store.find({ categoryId: category._id, isActive: true })
      .select('_id name logo slug website')
      .lean();

    const storeIds = stores.map(s => s._id);
    const storeMap = {};
    for (const s of stores) {
      storeMap[s._id.toString()] = s;
    }

    let coupons = [];
    let deals   = [];

    if (type === 'all' || type === 'coupons') {
      coupons = await Coupon.find({ store: { $in: storeIds }, isActive: true })
        .select('_id title code slug discountValue discountType expirationDate store successRate verifiedAt imageUrl')
        .sort({ createdAt: -1 })
        .limit(60)
        .lean();
    }

    if (type === 'all' || type === 'deals') {
      deals = await Deal.find({ store: { $in: storeIds }, isActive: true })
        .select('_id title name slug discountValue discountType originalPrice discountedPrice endDate store imageUrl')
        .sort({ createdAt: -1 })
        .limit(60)
        .lean();
    }

    const attachStore = (items) =>
      items.map(item => ({
        ...item,
        storeInfo: storeMap[item.store?.toString()] || null,
      }));

    return res.status(200).json({
      success: true,
      category,
      stores,
      coupons: attachStore(coupons),
      deals:   attachStore(deals),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};