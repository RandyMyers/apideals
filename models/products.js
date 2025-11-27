const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Product Schema for WooCommerce integration
const ProductSchema = new Schema({
  // WooCommerce Product ID and SKU
  id: { type: Number, required: true },
  sku: { type: String, required: true },

  // Basic Information
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number },
  sale_price: { type: Number }, // Discounted price
  regular_price: { type: Number }, // Regular price (if different)
  status: { type: String, required: true }, // e.g., publish, draft
  featured: { type: Boolean, default: false }, // Featured product

  // Stock Management
  stock: { type: String, required: true },
  manage_stock: { type: Boolean, default: false },
  stock_quantity: { type: Number },
  stock_status: { type: String },

  // Shipping Information
  shipping_required: { type: Boolean },
  shipping_class: { type: String },
  shipping_class_id: { type: Number },

  // Product Categorization
  categories: [{
    id: { type: Number, required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
  }],
  tags: [{
    name: { type: String },
  }],

  // Product Images
  images: [{
    id: { type: Number, required: true },
    date_created: { type: Date, required: true },
    src: { type: String, required: true }, // Image URL
  }],

  // Ratings and Reviews
  average_rating: { type: String },
  rating_count: { type: Number },

  // Dimensions
  dimensions: {
    length: { type: String },
    width: { type: String },
    height: { type: String },
  },

 
  // WooCommerce Links
  permalink: { type: String, required: true },
  slug: { type: String, required: true },

  // Timestamps
  date_created: { type: Date, required: true },
  date_modified: { type: Date, required: true },

  // WooCommerce Product Type
  type: { type: String, required: true },
  
  // Upsell and Cross-Sell Products (related products)
  upsell_ids: [{ type: Number }],
  cross_sell_ids: [{ type: Number }],
  related_ids: [{ type: Number }],
  
  // Store Reference (optional, if users can have multiple stores)
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },

  // User Reference
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

const Product = mongoose.model('Product', ProductSchema);
module.exports = Product;
