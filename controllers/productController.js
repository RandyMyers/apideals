const Product = require('../models/products');
const Store = require('../models/store');
const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
const User = require('../models/user');

// Synchronize products from a WooCommerce store
// Synchronize products from a WooCommerce store
exports.syncProducts = async function (storeId, userId) {
    try {
        // Validate inputs
        if (!storeId) {
            throw new Error('Store ID is required.');
        }
        if (!userId) {
            throw new Error('User ID is required.');
        }

        // Verify if the user exists
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found.');
        }

        // Fetch store details using storeId
        const store = await Store.findById(storeId);
        if (!store) {
            throw new Error('Store not found.');
        }

        // Initialize WooCommerce API client
        const wooCommerce = new WooCommerceRestApi({
            url: store.url, // Store's URL
            consumerKey: store.apiKey, // API key
            consumerSecret: store.secretKey, // Secret key
            version: 'wc/v3',
        });

        // Function to retrieve all products with pagination
        const fetchProducts = async (page = 1) => {
            const response = await wooCommerce.get('products', {
                per_page: 100, // Max WooCommerce supports per page
                page,
            });
            return response.data; // Extract product data
        };

        let allProducts = [];
        let page = 1;
        let hasMoreProducts = true;

        // Fetch products page by page
        while (hasMoreProducts) {
            const products = await fetchProducts(page);
            if (products.length === 0) {
                hasMoreProducts = false;
            } else {
                allProducts = [...allProducts, ...products];
                page++;
            }
        }

        // Process and sync products with the database
        for (const apiProduct of allProducts) {
            // Check if product already exists for the store
            const existingProduct = await Product.findOne({
                storeId,
                id: apiProduct.id.toString(),
            });

            const productData = {
                storeId,
                userId,
                id: apiProduct.id ? apiProduct.id.toString() : null,
                name: apiProduct.name || 'Unnamed Product',
                sku: apiProduct.sku || `default-sku-${apiProduct.id}`,
                stock: apiProduct.stock_status || 'unknown',
                slug: apiProduct.slug || `default-slug-${apiProduct.id}`,
                price: apiProduct.price || 0,
                description: apiProduct.description || '',
                regular_price: apiProduct.regular_price || 0,
                sale_price: apiProduct.sale_price || 0,
                permalink: apiProduct.permalink || '',
                date_created: apiProduct.date_created ? new Date(apiProduct.date_created) : new Date(),
                date_modified: apiProduct.date_modified ? new Date(apiProduct.date_modified) : new Date(),
                type: apiProduct.type || 'simple',
                status: apiProduct.status || 'draft',
                featured: apiProduct.featured || false,
                dimensions: apiProduct.dimensions || { length: '0', width: '0', height: '0' },
                categories: apiProduct.categories || [],
                images: apiProduct.images || [],
                _links: apiProduct._links || {},
                manage_stock: apiProduct.manage_stock || false,
                stock_quantity: apiProduct.stock_quantity || 0,
                stock_status: apiProduct.stock_status || 'instock',
                shipping_required: apiProduct.shipping_required || false,
                shipping_taxable: apiProduct.shipping_taxable || false,
                shipping_class: apiProduct.shipping_class || '',
                shipping_class_id: apiProduct.shipping_class_id || 0,
                average_rating: apiProduct.average_rating || '0',
                rating_count: apiProduct.rating_count || 0,
                tags: apiProduct.tags || [],
                upsell_ids: apiProduct.upsell_ids || [],
                cross_sell_ids: apiProduct.cross_sell_ids || [],
                related_ids: apiProduct.related_ids || [],
                variations: apiProduct.variations || [],
                attributes: apiProduct.attributes || [],
            };

            if (existingProduct) {
                // Update existing product
                await Product.findByIdAndUpdate(existingProduct._id, { $set: productData });
            } else {
                // Create new product
                const newProduct = new Product(productData);
                await newProduct.save();
            }
        }

        return { message: 'Products synchronized successfully.', total: allProducts.length };
    } catch (error) {
        console.error(error);
        throw new Error(`An error occurred while syncing products: ${error.message}`);
    }
};


// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
    .populate('userId')
    .populate('storeId');
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error });
  }
};

// Get products by userId
exports.getProductsByUserId = async (req, res) => {
    try {
      const { userId } = req.params;
  
      // Validate userId
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
      }
  
      // Verify if the user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
  
      // Find stores associated with the user
      const stores = await Store.find({ userId });
      if (!stores.length) {
        return res.status(404).json({ error: 'No stores found for the user.' });
      }
  
      // Extract storeIds
      const storeIds = stores.map(store => store._id);
  
      // Find products associated with the user's stores
      const products = await Product.find({ storeId: { $in: storeIds } })
      .populate('userId')
      .populate('storeId');
  
      res.status(200).json({ total: products.length, products });
    } catch (error) {
      console.error('Error fetching products by user ID:', error);
      res.status(500).json({ error: 'An error occurred while fetching products.', details: error.message });
    }
  };

// Get a single product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    .populate('userId')
    .populate('storeId');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product', error });
  }
};

// Update a product by ID
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json({ message: 'Product updated successfully', product });
  } catch (error) {
    res.status(500).json({ message: 'Error updating product', error });
  }
};

// Delete a product by ID
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error });
  }
};

// Delete all products by userId
exports.deleteProductsByUserId = async (req, res) => {
    try {
      const { userId } = req.params;
  
      // Validate userId
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
      }
  
      // Verify if the user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
  
      // Find stores associated with the user
      const stores = await Store.find({ userId });
      if (!stores.length) {
        return res.status(404).json({ error: 'No stores found for the user.' });
      }
  
      // Extract storeIds
      const storeIds = stores.map(store => store._id);
  
      // Delete products associated with the user's stores
      const result = await Product.deleteMany({ storeId: { $in: storeIds } });
  
      res.status(200).json({ message: 'Products deleted successfully', deletedCount: result.deletedCount });
    } catch (error) {
      console.error('Error deleting products by user ID:', error);
      res.status(500).json({ error: 'An error occurred while deleting products.', details: error.message });
    }
  };

  // Delete all products
exports.deleteAllProducts = async (req, res) => {
    try {
      const result = await Product.deleteMany(); // Deletes all documents in the Product collection
      console.log(result);
      res.status(200).json({ message: 'All products deleted successfully', deletedCount: result.deletedCount });
    } catch (error) {
      console.error('Error deleting all products:', error);
      res.status(500).json({ message: 'Error deleting all products', error });
    }
  };
  


