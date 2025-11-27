const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Category Schema
const CategorySchema = new Schema({
  // Name of the category (e.g., Electronics, Fashion, etc.)
  name: {
    type: String,
    required: true,
    unique: true, // Ensure category names are unique
    trim: true,
  },

  // Optional description of the category
  description: {
    type: String,
    trim: true,
  },

  // URL to an image representing the category
  imageUrl: {
    type: String,
    required: false, // Optional field for the category image
  },

  // Reference to the store that owns this category (if applicable)
  storeId: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store', // Reference to the Store model
    required: false, // This could be optional if categories are global
  }],

  // Parent category (for nested categories)
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category', // Reference to the Category model (for nested categories)
    default: null,
  },

  // Category created and updated timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Create Category Model (avoid OverwriteModelError in watch/reload)
const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);
module.exports = Category;
