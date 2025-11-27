const Category = require('../models/Category'); // Import the Category model
const Store = require('../models/store');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

// Create a new category
exports.createCategory = async (req, res) => {
  try {
    const { name, description, storeId, parentCategory } = req.body;

    let imageUrl = null;

    // Check if a file was uploaded
    if (req.files && req.files.image) {
      const file = req.files.image;

      // Upload file to Cloudinary
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: 'categories', // Folder name in Cloudinary
        public_id: `category_${Date.now()}`, // Unique public ID
        overwrite: false,
      });

      imageUrl = result.secure_url; // Get the secure URL
    }

    // Ensure parentCategory is null if empty or undefined
    const parentCategoryId = parentCategory && parentCategory.trim() !== '' ? parentCategory : null;

    // Check if the category already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    // Create a new category
    const newCategory = new Category({
      name,
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
      .populate('coupons') // Populate coupons if needed
      .populate('deals') // Populate deals if needed
      .populate('parentCategory') // Populate parent category if needed
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
    const { name, description, imageUrl, storeId, parentCategory } = req.body;
    
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        imageUrl,
        storeId,
        parentCategory,
        updatedAt: Date.now(), // Update timestamp
      },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

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
      .populate('coupons')
      .populate('deals')
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