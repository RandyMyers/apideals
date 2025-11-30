const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
const crypto = require('crypto');
const Store = require('../models/store');
const Coupon = require('../models/coupon');
const Deal = require('../models/deal');
const cloudinary = require('cloudinary').v2;
const { logger } = require('../utils/logger');
const { wooCommerceValidation, validate } = require('../utils/validation');

const buildClient = (store) => new WooCommerceRestApi({
  url: store.url,
  consumerKey: store.apiKey,
  consumerSecret: store.secretKey,
  version: 'wc/v3',
}); 

exports.connectStore = async (req, res) => {
  try {
    // Validate user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required' 
      });
    }

    // Get user ID (Mongoose document has _id, but also provides id as virtual)
    const userId = req.user._id || req.user.id;
    if (!userId) {
      logger.error('User ID not found in request', { user: req.user });
      return res.status(500).json({ 
        error: 'Server error',
        message: 'User identification failed' 
      });
    }

    const {
      url,
      consumerKey,
      consumerSecret,
      syncDirection,
      webhookSecret,
      categoryId,
      name,
      description,
      storeIndicators: storeIndicatorsRaw,
    } = req.body;

    // Validate required fields
    if (!url || !consumerKey || !consumerSecret) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'URL, Consumer Key, and Consumer Secret are required'
      });
    }

    // Handle logo upload (if provided)
    let logoUrl = '';
    if (req.files && req.files.logo) {
      try {
        const file = req.files.logo;
        const result = await cloudinary.uploader.upload(file.tempFilePath, {
          folder: 'store_logos',
          public_id: `store_${Date.now()}`,
          overwrite: false,
        });
        logoUrl = result.secure_url;
      } catch (uploadError) {
        logger.error('Logo upload error', { error: uploadError.message });
        // Logo upload failure is not critical - continue without logo
      }
    }

    // Validate URL format
    let storeName;
    try {
      const urlObj = new URL(url);
      storeName = urlObj.hostname;
      
      // Ensure URL has protocol
      if (!urlObj.protocol || !['http:', 'https:'].includes(urlObj.protocol)) {
        return res.status(400).json({ 
          error: 'Invalid URL',
          message: 'URL must include http:// or https:// protocol'
        });
      }
    } catch (urlError) {
      logger.error('URL validation error', { url, error: urlError.message });
      return res.status(400).json({ 
        error: 'Invalid URL',
        message: 'Please provide a valid URL (e.g., https://yourstore.com)'
      });
    }

    // Validate consumer key and secret format (WooCommerce keys usually start with ck_ and cs_)
    if (consumerKey.length < 10) {
      return res.status(400).json({ 
        error: 'Invalid Consumer Key',
        message: 'Consumer Key must be at least 10 characters long'
      });
    }
    
    if (consumerSecret.length < 10) {
      return res.status(400).json({ 
        error: 'Invalid Consumer Secret',
        message: 'Consumer Secret must be at least 10 characters long'
      });
    }

    // Parse storeIndicators (optional JSON string or array)
    let storeIndicators = [];
    if (Array.isArray(storeIndicatorsRaw)) {
      storeIndicators = storeIndicatorsRaw;
    } else if (typeof storeIndicatorsRaw === 'string') {
      try {
        const parsed = JSON.parse(storeIndicatorsRaw);
        if (Array.isArray(parsed)) {
          storeIndicators = parsed.filter(ind => ind && ind.key && ind.label);
        }
      } catch (e) {
        logger.warn('Could not parse storeIndicators JSON from Woo connect', { error: e.message });
      }
    }

    // Check if store with same name or URL already exists for this user
    const existingStore = await Store.findOne({ 
      $or: [
        { name: storeName, userId },
        { url, userId }
      ]
    });
    
    if (existingStore) {
      return res.status(409).json({ 
        error: 'Store already exists',
        message: 'You have already connected this store',
        storeId: existingStore._id
      });
    }

    // Create new store
    const store = new Store({
      name: name || storeName, // Use provided name or fallback to hostname
      url,
      apiKey: consumerKey,
      secretKey: consumerSecret,
      syncDirection: syncDirection || 'pull',
      webhookSecret: webhookSecret || undefined,
      categoryId: categoryId || undefined,
      description: description || undefined,
      logo: logoUrl || undefined,
      storeType: 'woocommerce',
      userId,
      storeIndicators,
    });
    
    await store.save();

    logger.info('WooCommerce store connected', { 
      storeId: store._id, 
      userId,
      storeName,
      url: url.replace(/\/\/.*@/, '//***@') // Mask credentials in logs
    });

    res.status(201).json({ 
      message: 'Store connected successfully', 
      storeId: store._id,
      store: {
        _id: store._id,
        name: store.name,
        url: store.url,
        syncDirection: store.syncDirection
      }
    });
  } catch (error) {
    logger.error('Connect store error', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?._id || req.user?.id,
      body: { ...req.body, consumerSecret: req.body.consumerSecret ? '***' : undefined }
    });
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(e => ({
        field: e.path,
        message: e.message
      }));
      
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Store data validation failed',
        details: validationErrors
      });
    }
    
    // Handle duplicate key errors (MongoDB unique index violations)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({ 
        error: 'Duplicate store',
        message: `A store with this ${field} already exists`
      });
    }
    
    // Handle URL parsing errors
    if (error instanceof TypeError && error.message.includes('Invalid URL')) {
      return res.status(400).json({ 
        error: 'Invalid URL',
        message: 'Please provide a valid URL with http:// or https:// protocol'
      });
    }
    
    // Generic server error
    res.status(500).json({ 
      error: 'Server error',
      message: error.message || 'Failed to connect store. Please try again.',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

exports.testConnection = async (req, res) => {
  try {
    const { storeId } = req.params;
    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: 'Store not found' });

    const client = buildClient(store);
    const result = await client.get('system_status');
    res.json({ ok: true, status: result.status, data: result.data?.environment });
  } catch (error) {
    logger.error('Test connection error', { error: error.message });
    res.status(400).json({ ok: false, message: error.message });
  }
};

const mapDiscountType = (type) => {
  if (type === 'percentage') return 'percent';
  if (type === 'fixed') return 'fixed_cart';
  return 'fixed_cart';
};

// Helper function to fetch product details from WooCommerce
const fetchProductDetails = async (client, productId) => {
  try {
    const resp = await client.get(`products/${productId}`);
    const product = resp.data;
    return {
      permalink: product.permalink || null,
      imageUrl: product.images && product.images.length > 0 ? product.images[0].src : null,
      name: product.name || null,
      description: product.short_description || product.description || null,
    };
  } catch (error) {
    logger.error('Error fetching product details', { productId, error: error.message });
    return null;
  }
};

exports.pullCoupons = async (req, res) => {
  try {
    const { storeId } = req.params;
    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: 'Store not found' });

    const client = buildClient(store);
    let page = 1;
    let totalImported = 0;
    while (true) {
      const resp = await client.get('coupons', { per_page: 100, page });
      const coupons = resp.data || [];
      if (coupons.length === 0) break;

      for (const c of coupons) {
        // Fetch product details if coupon is product-specific
        let productDetails = null;
        if (c.product_ids && Array.isArray(c.product_ids) && c.product_ids.length > 0) {
          const primaryProductId = c.product_ids[0];
          productDetails = await fetchProductDetails(client, primaryProductId);
        }
        
        // Build coupon update object with all fields
        const couponData = {
          userId: store.userId,
          storeId: store._id,
          categoryId: store.categoryId || undefined,
          code: c.code,
          title: c.description || c.code, // Use description as title, fallback to code
          description: c.description || undefined,
          discountType: c.discount_type === 'percent' ? 'percentage' : 'fixed',
          discountValue: Number(c.amount) || 0,
          minPurchaseAmount: c.minimum_amount ? Number(c.minimum_amount) : 0,
          maxPurchaseAmount: c.maximum_amount ? Number(c.maximum_amount) : undefined,
          startDate: c.date_created ? new Date(c.date_created) : new Date(),
          endDate: c.date_expires ? new Date(c.date_expires) : new Date(Date.now() + 14 * 86400000),
          usageLimit: c.usage_limit || 1,
          usageLimitPerUser: c.usage_limit_per_user || undefined,
          individualUse: Boolean(c.individual_use),
          freeShipping: Boolean(c.free_shipping),
          excludeSaleItems: Boolean(c.exclude_sale_items),
          emailRestrictions: Array.isArray(c.email_restrictions) ? c.email_restrictions : undefined,
          productIds: Array.isArray(c.product_ids) && c.product_ids.length > 0 ? c.product_ids : undefined,
          productCategoryIds: Array.isArray(c.product_categories) && c.product_categories.length > 0 ? c.product_categories : undefined,
          excludedProductCategoryIds: Array.isArray(c.excluded_product_categories) && c.excluded_product_categories.length > 0 ? c.excluded_product_categories : undefined,
          wooCommerceId: c.id || undefined,
          isActive: true,
          updatedAt: new Date(),
        };
        
        // Add product details if available
        if (productDetails) {
          couponData.productUrl = productDetails.permalink;
          couponData.imageUrl = productDetails.imageUrl;
          couponData.productName = productDetails.name;
        } else {
          // Use store logo as fallback image
          couponData.imageUrl = store.logo || undefined;
        }
        
        await Coupon.findOneAndUpdate(
          { code: c.code, storeId: store._id },
          couponData,
          { upsert: true }
        );
        totalImported += 1;
      }
      page += 1;
    }

    store.lastSyncDate = new Date();
    await store.save();

    res.json({ message: 'Pull sync complete', imported: totalImported });
  } catch (error) {
    logger.error('Pull coupons error', { error: error.message });
    res.status(500).json({ message: 'Failed to pull coupons' });
  }
};

// List stores for authenticated user
exports.listStores = async (req, res) => {
  try {
    const userId = req.user.id;
    const stores = await Store.find({ userId }).select('name url syncDirection lastSyncDate createdAt');
    res.json({ stores });
  } catch (error) {
    logger.error('List stores error', { error: error.message });
    res.status(500).json({ message: 'Failed to list stores' });
  }
};

// Pull products from Woo and create/update Deals for discounted products
exports.pullProductsAsDeals = async (req, res) => {
  try {
    const { storeId } = req.params;
    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: 'Store not found' });

    const client = buildClient(store);
    let page = 1;
    let totalImported = 0;
    while (true) {
      const resp = await client.get('products', { per_page: 100, page });
      const products = resp.data || [];
      if (products.length === 0) break;

      for (const p of products) {
        const onSale = Boolean(p.on_sale) || (p.sale_price && p.sale_price !== '');
        const regular = Number(p.regular_price || 0);
        const sale = Number(p.sale_price || 0);
        if (!onSale || !(regular > 0 && sale > 0 && sale < regular)) continue;

        const discountPct = Math.round(((regular - sale) / regular) * 100);
        const startDate = p.date_on_sale_from ? new Date(p.date_on_sale_from) : new Date();
        const endDate = p.date_on_sale_to ? new Date(p.date_on_sale_to) : new Date(Date.now() + 14 * 86400000);

        // Get product image (first image if available)
        const imageUrl = p.images && Array.isArray(p.images) && p.images.length > 0 
          ? p.images[0].src 
          : undefined;

        // Choose a category if available, else fallback to store.categoryId
        // If no category, we need a default - deals require categoryId
        const categoryId = store.categoryId;
        
        if (!categoryId) {
          logger.warn(`Skipping deal sync for product ${p.name}: Store ${store._id} has no categoryId`);
          continue;
        }

        await Deal.findOneAndUpdate(
          { name: p.name, store: store._id },
          {
            title: p.name, // Use product name as title
            name: p.name,
            description: '', // No description needed for deals
            dealType: 'discount',
            discountType: 'percentage',
            discountValue: discountPct,
            imageUrl: imageUrl || store.logo || undefined, // Product image or store logo fallback
            productUrl: p.permalink || undefined,
            productId: p.id || undefined,
            startDate,
            endDate,
            isActive: true,
            store: store._id,
            categoryId: categoryId, // Required field
            userId: store.userId,
            updatedAt: new Date(),
          },
          { upsert: true, setDefaultsOnInsert: true }
        );
        totalImported += 1;
      }
      page += 1;
    }

    store.lastSyncDate = new Date();
    await store.save();

    res.json({ message: 'Pulled products as deals', imported: totalImported });
  } catch (error) {
    logger.error('Pull products error', { error: error.message });
    res.status(500).json({ message: 'Failed to pull products' });
  }
};

// Read-only: list coupons from Woo for selection in wizard
exports.listWcCoupons = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { page = 1, per_page = 50, search = '' } = req.query;
    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: 'Store not found' });
    const client = buildClient(store);
    const resp = await client.get('coupons', { per_page: Number(per_page), page: Number(page), search });
    const coupons = (resp.data || []).map(c => ({
      id: c.id,
      code: c.code,
      amount: c.amount,
      discount_type: c.discount_type,
      description: c.description,
      date_created: c.date_created,
      date_expires: c.date_expires,
      usage_limit: c.usage_limit,
      usage_count: c.usage_count,
    }));
    res.json({ coupons });
  } catch (error) {
    logger.error('List WC coupons error', { error: error.message });
    res.status(500).json({ message: 'Failed to list Woo coupons' });
  }
};

// Read-only: list products from Woo for selection in wizard
exports.listWcProducts = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { page = 1, per_page = 50, search = '', on_sale = 'true' } = req.query;
    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: 'Store not found' });
    const client = buildClient(store);
    const resp = await client.get('products', { per_page: Number(per_page), page: Number(page), search, on_sale });
    const products = (resp.data || []).map(p => ({
      id: p.id,
      name: p.name,
      permalink: p.permalink,
      on_sale: p.on_sale,
      regular_price: p.regular_price,
      sale_price: p.sale_price,
      date_on_sale_from: p.date_on_sale_from,
      date_on_sale_to: p.date_on_sale_to,
      images: p.images?.map(i=>i.src) || [],
      short_description: p.short_description,
      description: p.description,
    }));
    res.json({ products });
  } catch (error) {
    logger.error('List WC products error', { error: error.message });
    res.status(500).json({ message: 'Failed to list Woo products' });
  }
};

// Create coupon in WooCommerce when approved
exports.pushCoupon = async (couponId) => {
  const coupon = await Coupon.findById(couponId).populate('storeId');
  if (!coupon || !coupon.storeId) return;
  const store = coupon.storeId;
  if (!store.apiKey || !store.secretKey) return;
  if (!(store.syncDirection === 'push' || store.syncDirection === 'bidirectional')) return;

  const client = buildClient(store);
  const payload = {
    code: coupon.code,
    amount: String(coupon.discountValue),
    discount_type: mapDiscountType(coupon.discountType),
    description: coupon.title || coupon.description || '',
    date_expires: coupon.endDate ? new Date(coupon.endDate).toISOString() : undefined,
    usage_limit: coupon.usageLimit || undefined,
  };
  try {
    await client.post('coupons', payload);
    logger.info('Pushed coupon to WooCommerce', { couponId, storeId: store._id });
  } catch (e) {
    logger.error('Failed to push coupon', { error: e.message, couponId });
  }
};

// Sync selected coupons from WooCommerce
exports.syncSelectedCoupons = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { couponIds, categoryId } = req.body; // Array of WooCommerce coupon IDs
    
    if (!Array.isArray(couponIds) || couponIds.length === 0) {
      return res.status(400).json({ message: 'couponIds must be a non-empty array' });
    }

    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: 'Store not found' });
    
    const client = buildClient(store);
    const results = [];
    
    for (const wcCouponId of couponIds) {
      try {
        const resp = await client.get(`coupons/${wcCouponId}`);
        const c = resp.data;
        
        // Fetch product details if coupon is product-specific
        let productDetails = null;
        if (c.product_ids && Array.isArray(c.product_ids) && c.product_ids.length > 0) {
          const primaryProductId = c.product_ids[0];
          productDetails = await fetchProductDetails(client, primaryProductId);
        }
        
        // Build coupon update object with all fields
        const couponData = {
          userId: store.userId,
          storeId: store._id,
          categoryId: categoryId || store.categoryId || undefined,
          code: c.code,
          title: c.description || c.code, // Use description as title, fallback to code
          description: c.description || undefined,
          discountType: c.discount_type === 'percent' ? 'percentage' : 'fixed',
          discountValue: Number(c.amount) || 0,
          minPurchaseAmount: c.minimum_amount ? Number(c.minimum_amount) : 0,
          maxPurchaseAmount: c.maximum_amount ? Number(c.maximum_amount) : undefined,
          startDate: c.date_created ? new Date(c.date_created) : new Date(),
          endDate: c.date_expires ? new Date(c.date_expires) : new Date(Date.now() + 14 * 86400000),
          usageLimit: c.usage_limit || 1,
          usageLimitPerUser: c.usage_limit_per_user || undefined,
          individualUse: Boolean(c.individual_use),
          freeShipping: Boolean(c.free_shipping),
          excludeSaleItems: Boolean(c.exclude_sale_items),
          emailRestrictions: Array.isArray(c.email_restrictions) ? c.email_restrictions : undefined,
          productIds: Array.isArray(c.product_ids) && c.product_ids.length > 0 ? c.product_ids : undefined,
          productCategoryIds: Array.isArray(c.product_categories) && c.product_categories.length > 0 ? c.product_categories : undefined,
          excludedProductCategoryIds: Array.isArray(c.excluded_product_categories) && c.excluded_product_categories.length > 0 ? c.excluded_product_categories : undefined,
          wooCommerceId: c.id || Number(wcCouponId),
          isActive: true,
          updatedAt: new Date(),
        };
        
        // Add product details if available
        if (productDetails) {
          couponData.productUrl = productDetails.permalink;
          couponData.imageUrl = productDetails.imageUrl;
          couponData.productName = productDetails.name;
        } else {
          // Use store logo as fallback image
          couponData.imageUrl = store.logo || undefined;
        }
        
        const coupon = await Coupon.findOneAndUpdate(
          { code: c.code, storeId: store._id },
          couponData,
          { upsert: true, new: true }
        );
        
        results.push({ wcCouponId, success: true, couponId: coupon._id, code: c.code });
      } catch (error) {
        logger.error('Error syncing coupon', { wcCouponId, error: error.message });
        results.push({ wcCouponId, success: false, error: error.message });
      }
    }
    
    store.lastSyncDate = new Date();
    await store.save();
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    logger.info('Selective coupon sync complete', { 
      storeId, 
      total: couponIds.length, 
      successCount, 
      failureCount 
    });
    
    res.json({ 
      message: 'Selective sync complete', 
      results,
      successCount,
      failureCount,
      total: couponIds.length
    });
  } catch (error) {
    logger.error('Sync selected coupons error', { error: error.message });
    res.status(500).json({ message: 'Failed to sync selected coupons', error: error.message });
  }
};

// Sync selected products as deals from WooCommerce
exports.syncSelectedDeals = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { productIds, categoryId } = req.body; // Array of WooCommerce product IDs
    
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ message: 'productIds must be a non-empty array' });
    }

    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: 'Store not found' });
    
    const client = buildClient(store);
    const results = [];
    
    for (const wcProductId of productIds) {
      try {
        const resp = await client.get(`products/${wcProductId}`);
        const p = resp.data;
        
        const onSale = Boolean(p.on_sale) || (p.sale_price && p.sale_price !== '');
        const regular = Number(p.regular_price || 0);
        const sale = Number(p.sale_price || 0);
        
        if (!onSale || !(regular > 0 && sale > 0 && sale < regular)) {
          results.push({ 
            wcProductId, 
            success: false, 
            error: 'Product is not on sale or invalid pricing' 
          });
          continue;
        }
        
        const discountPct = Math.round(((regular - sale) / regular) * 100);
        const startDate = p.date_on_sale_from ? new Date(p.date_on_sale_from) : new Date();
        const endDate = p.date_on_sale_to ? new Date(p.date_on_sale_to) : new Date(Date.now() + 14 * 86400000);
        
        // Get product image (first image if available)
        const imageUrl = p.images && Array.isArray(p.images) && p.images.length > 0 
          ? p.images[0].src 
          : undefined;
        
        // Ensure categoryId exists (required field)
        const finalCategoryId = categoryId || store.categoryId;
        if (!finalCategoryId) {
          results.push({ 
            wcProductId, 
            success: false, 
            error: 'Store does not have a categoryId assigned' 
          });
          continue;
        }

        const deal = await Deal.findOneAndUpdate(
          { name: p.name, store: store._id },
          {
            title: p.name, // Use product name as title
            name: p.name,
            description: '', // No description needed for deals
            dealType: 'discount',
            discountType: 'percentage',
            discountValue: discountPct,
            imageUrl: imageUrl || store.logo || undefined, // Product image or store logo fallback
            productUrl: p.permalink || undefined,
            productId: p.id || Number(wcProductId),
            startDate,
            endDate,
            isActive: true,
            store: store._id,
            categoryId: finalCategoryId, // Required field
            userId: store.userId,
            updatedAt: new Date(),
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        
        results.push({ wcProductId, success: true, dealId: deal._id, name: p.name });
      } catch (error) {
        logger.error('Error syncing product as deal', { wcProductId, error: error.message });
        results.push({ wcProductId, success: false, error: error.message });
      }
    }
    
    store.lastSyncDate = new Date();
    await store.save();
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    logger.info('Selective deals sync complete', { 
      storeId, 
      total: productIds.length, 
      successCount, 
      failureCount 
    });
    
    res.json({ 
      message: 'Selective deals sync complete', 
      results,
      successCount,
      failureCount,
      total: productIds.length
    });
  } catch (error) {
    logger.error('Sync selected deals error', { error: error.message });
    res.status(500).json({ message: 'Failed to sync selected deals', error: error.message });
  }
};

// Verify Woo webhook signature
const verifyWebhook = (payloadRaw, signature, secret) => {
  if (!signature || !secret) return false;
  const digest = crypto
    .createHmac('sha256', secret)
    .update(payloadRaw, 'utf8')
    .digest('base64');
  return digest === signature;
};

exports.webhook = async (req, res) => {
  try {
    const topic = req.headers['x-wc-webhook-topic'];
    const signature = req.headers['x-wc-webhook-signature'];

    // Prefer per-store secret; fallback to global
    const secret = process.env.WOOCOMMERCE_WEBHOOK_SECRET;

    const raw = req.rawBody || JSON.stringify(req.body);
    if (!verifyWebhook(raw, signature, secret)) {
      logger.warn('Invalid Woo webhook signature');
      return res.status(401).json({ message: 'Invalid signature' });
    }

    logger.info('Woo webhook received', { topic });

    // Acknowledge quickly; processing can be queued later
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Webhook error', { error: error.message });
    res.status(400).json({ message: 'Invalid webhook' });
  }
};
