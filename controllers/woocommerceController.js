const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
const crypto = require('crypto');
const Store = require('../models/store');
const Coupon = require('../models/coupon');
const Deal = require('../models/deal');
const cloudinary = require('cloudinary').v2;
const { logger } = require('../utils/logger');
const { wooCommerceValidation, validate } = require('../utils/validation');

const buildClient = (store) => {
  console.log('[buildClient] Building WooCommerce client...');
  console.log('[buildClient] Store info:', {
    storeId: store._id,
    name: store.name,
    url: store.url,
    hasApiKey: !!store.apiKey,
    hasSecretKey: !!store.secretKey,
    apiKeyPreview: store.apiKey ? store.apiKey.substring(0, 10) + '...' : 'MISSING',
    secretKeyPreview: store.secretKey ? store.secretKey.substring(0, 10) + '...' : 'MISSING'
  });
  
  if (!store.url || !store.apiKey || !store.secretKey) {
    console.log('[buildClient] ❌ ERROR: Missing required credentials');
    throw new Error('Store is missing required WooCommerce credentials (url, apiKey, or secretKey)');
  }
  
  try {
    console.log('[buildClient] Creating WooCommerceRestApi instance...');
    const client = new WooCommerceRestApi({
  url: store.url,
  consumerKey: store.apiKey,
  consumerSecret: store.secretKey,
  version: 'wc/v3',
}); 
    
    console.log('[buildClient] ✅ Client created successfully');
    logger.debug('WooCommerce client built', {
      storeId: store._id,
      url: store.url,
      hasApiKey: !!store.apiKey,
      hasSecretKey: !!store.secretKey
    });
    
    return client;
  } catch (error) {
    console.log('[buildClient] ❌ ERROR: Failed to create client:', error.message);
    logger.error('Failed to build WooCommerce client', {
      storeId: store._id,
      error: error.message,
      url: store.url
    });
    throw error;
  }
}; 

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

// Helper function to extract attributes from WooCommerce variation format
const extractAttributes = (attributes) => {
  const attrMap = new Map();
  if (Array.isArray(attributes)) {
    attributes.forEach(attr => {
      if (attr.name && attr.option) {
        attrMap.set(attr.name, attr.option);
      }
    });
  }
  return attrMap;
};

// Helper function to fetch and process variations for variable products
const fetchAndProcessVariations = async (client, productId, productName) => {
  try {
    logger.info('Fetching variations for variable product', { productId, productName });
    
    // Fetch all variations
    let page = 1;
    let allVariations = [];
    
    while (true) {
      const variationsResp = await client.get(`products/${productId}/variations`, {
        per_page: 100,
        page: page,
        status: 'publish'
      });
      
      // Handle string response (same as products)
      let variationsData = variationsResp.data;
      if (typeof variationsData === 'string') {
        try {
          let jsonString = variationsData;
          const jsonStart = jsonString.indexOf('[');
          
          if (jsonStart !== -1) {
            // Find the matching closing bracket by counting brackets
            let bracketCount = 0;
            let jsonEnd = -1;
            for (let i = jsonStart; i < jsonString.length; i++) {
              if (jsonString[i] === '[') bracketCount++;
              if (jsonString[i] === ']') {
                bracketCount--;
                if (bracketCount === 0) {
                  // Check if followed by whitespace or HTML
                  const after = jsonString.substring(i + 1).trim();
                  if (after === '' || after.startsWith('<') || after.startsWith('\n<script')) {
                    jsonEnd = i;
                    break;
                  }
                }
              }
            }
            
            if (jsonEnd === -1) {
              // Fallback: use lastIndexOf
              jsonEnd = jsonString.lastIndexOf(']');
            }
            
            if (jsonEnd !== -1 && jsonEnd > jsonStart) {
              jsonString = jsonString.substring(jsonStart, jsonEnd + 1);
              variationsData = JSON.parse(jsonString);
            } else {
              throw new Error('Could not find valid JSON array');
            }
          } else {
            throw new Error('No JSON array found in response');
          }
        } catch (parseError) {
          logger.warn('Failed to parse variations response', { 
            productId, 
            error: parseError.message 
          });
          variationsData = [];
        }
      }
      
      const variations = Array.isArray(variationsData) ? variationsData : [];
      if (variations.length === 0) break;
      
      allVariations = allVariations.concat(variations);
      
      // If we got less than 100, we've reached the end
      if (variations.length < 100) break;
      page++;
    }
    
    logger.info('Fetched variations', { 
      productId, 
      productName,
      variationCount: allVariations.length 
    });
    
    // Process variations - filter and format
    const processedVariations = allVariations
      .filter(v => v.status === 'publish' && v.purchasable !== false)
      .map(v => {
        const regularPrice = parseFloat(v.regular_price) || 0;
        const salePrice = parseFloat(v.sale_price) || 0;
        const onSale = v.on_sale === true && salePrice > 0 && salePrice < regularPrice;
        
        return {
          variationId: v.id,
          sku: v.sku || '',
          attributes: extractAttributes(v.attributes),
          regularPrice: regularPrice > 0 ? regularPrice : undefined,
          salePrice: salePrice > 0 ? salePrice : undefined,
          onSale: onSale,
          image: v.image && v.image.src ? {
            url: v.image.src,
            alt: v.image.alt || productName || 'Product variation'
          } : undefined,
          stockStatus: v.stock_status || 'instock',
          stockQuantity: v.stock_quantity || undefined,
          purchasable: v.purchasable !== false,
        };
      });
    
    // Get variations that are on sale
    const onSaleVariations = processedVariations.filter(v => v.onSale);
    const applicableVariationIds = onSaleVariations.map(v => v.variationId);
    const allVariationsOnSale = onSaleVariations.length === processedVariations.length && processedVariations.length > 0;
    
    // Calculate price range from on-sale variations only (or all if all are on sale)
    const prices = onSaleVariations.length > 0
      ? onSaleVariations.map(v => v.salePrice || v.regularPrice).filter(p => p !== null && p > 0)
      : processedVariations.map(v => v.regularPrice).filter(p => p !== null && p > 0);
    
    const priceRange = prices.length > 0 ? {
      min: Math.min(...prices),
      max: Math.max(...prices),
    } : undefined;
    
    // Determine default variation (first on-sale and in-stock, or first in-stock, or first)
    const defaultVariation = onSaleVariations.find(v => 
      v.stockStatus === 'instock' && v.purchasable
    ) || processedVariations.find(v => 
      v.stockStatus === 'instock' && v.purchasable
    ) || processedVariations[0];
    
    logger.info('Processed variations', { 
      productId, 
      productName,
      totalVariations: processedVariations.length,
      onSaleVariations: onSaleVariations.length,
      allVariationsOnSale: allVariationsOnSale,
      applicableVariationIds: applicableVariationIds,
      inStockVariations: processedVariations.filter(v => v.stockStatus === 'instock').length,
      defaultVariationId: defaultVariation?.variationId,
      priceRange: priceRange
    });
    
    return {
      variations: processedVariations,
      defaultVariationId: defaultVariation?.variationId,
      applicableVariationIds: applicableVariationIds,
      allVariationsOnSale: allVariationsOnSale,
      priceRange: priceRange,
      defaultVariation: defaultVariation, // For use in price calculations
    };
  } catch (error) {
    logger.error('Error fetching variations', { 
      productId, 
      productName,
      error: error.message,
      errorStack: error.stack 
    });
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

        // Get currency from store or default to USD
        const currency = p.currency || store.currency || 'USD';
        
        // Get product images - create image gallery
        let imageGallery = [];
        if (p.images && Array.isArray(p.images) && p.images.length > 0) {
          imageGallery = p.images.map((img, idx) => ({
            url: img.src,
            alt: img.alt || img.name || p.name || 'Product image',
            order: idx,
          }));
        }

        await Deal.findOneAndUpdate(
          { name: p.name, store: store._id },
          {
            title: p.name, // Use product name as title
            name: p.name,
            description: undefined, // Do NOT use product description - leave empty for manual entry
            instructions: undefined, // Do NOT use product description - leave empty for manual entry
            dealType: 'discount',
            discountType: 'percentage',
            discountValue: discountPct,
            // Pricing fields for savings calculation
            originalPrice: regular > 0 ? regular : undefined,
            discountedPrice: sale > 0 ? sale : undefined,
            currency: currency,
            // Image fields
            imageUrl: imageUrl || store.logo || undefined, // Product image or store logo fallback
            imageGallery: imageGallery.length > 0 ? imageGallery : undefined, // Image gallery
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
  console.log('\n=== [WooCommerce Controller] listWcCoupons START ===');
  try {
    const { storeId } = req.params;
    const { page = 1, per_page = 50, search = '' } = req.query;
    
    console.log('[Step 1] Request params:', { storeId, page, per_page, search });
    
    console.log('[Step 2] Finding store in database...');
    const store = await Store.findById(storeId);
    if (!store) {
      console.log('[ERROR] Store not found with ID:', storeId);
      return res.status(404).json({ message: 'Store not found' });
    }
    
    console.log('[Step 2] Store found:', {
      _id: store._id,
      name: store.name,
      url: store.url,
      storeType: store.storeType,
      hasApiKey: !!store.apiKey,
      hasSecretKey: !!store.secretKey,
      apiKeyPreview: store.apiKey ? store.apiKey.substring(0, 10) + '...' : 'MISSING',
      secretKeyPreview: store.secretKey ? store.secretKey.substring(0, 10) + '...' : 'MISSING'
    });
    
    // Validate store has API credentials
    if (!store.apiKey || !store.secretKey) {
      console.log('[ERROR] Store missing API credentials');
      return res.status(400).json({ 
        message: 'Store is missing API credentials. Please update the store with valid API keys.' 
      });
    }
    
    console.log('[Step 3] Building WooCommerce client...');
    const client = buildClient(store);
    console.log('[Step 3] Client built successfully');
    
    console.log('[Step 4] Making API request to WooCommerce...');
    console.log('[Step 4] Request params:', { 
      endpoint: 'coupons',
      per_page: Number(per_page), 
      page: Number(page), 
      search 
    });
    
    const resp = await client.get('coupons', { per_page: Number(per_page), page: Number(page), search });
    
    console.log('[Step 5] API response received!');
    console.log('[Step 5] Response structure:', {
      hasResponse: !!resp,
      respType: typeof resp,
      respStatus: resp?.status,
      respStatusText: resp?.statusText,
      hasData: !!resp?.data,
      dataType: typeof resp?.data,
      isDataArray: Array.isArray(resp?.data),
      dataLength: Array.isArray(resp?.data) ? resp?.data.length : 'N/A',
      dataKeys: resp?.data && typeof resp?.data === 'object' && !Array.isArray(resp?.data) ? Object.keys(resp?.data) : null
    });
    
    // Handle different response formats from WooCommerce API
    // The @woocommerce/woocommerce-rest-api library returns resp.data as the array directly
    // BUT sometimes it returns a string that needs to be parsed
    console.log('[Step 6] Processing response data...');
    let rawData = resp.data;
    
    // If data is a string, try to parse it as JSON
    if (typeof rawData === 'string') {
      console.log('[Step 6] ⚠️  Response.data is a string, attempting to parse as JSON...');
      console.log('[Step 6] String length:', rawData.length);
      
      // Try to extract JSON part if HTML is mixed in (common with WooCommerce API)
      let jsonString = rawData;
      const jsonStart = jsonString.indexOf('[');
      
      if (jsonStart !== -1) {
        // Find the actual end of the JSON array by looking for the last ']' 
        // that's followed by whitespace or end of string (not HTML/JS)
        let jsonEnd = -1;
        for (let i = jsonString.length - 1; i >= jsonStart; i--) {
          if (jsonString[i] === ']') {
            // Check if this ']' is followed by whitespace or end of string
            const after = jsonString.substring(i + 1).trim();
            if (after === '' || after.startsWith('<') || after.startsWith('\n<script') || after.startsWith('<script')) {
              jsonEnd = i;
              break;
            }
          }
        }
        
        if (jsonEnd === -1) {
          // Fallback: use lastIndexOf
          jsonEnd = jsonString.lastIndexOf(']');
        }
        
        if (jsonEnd !== -1 && jsonEnd > jsonStart) {
          jsonString = jsonString.substring(jsonStart, jsonEnd + 1);
          console.log('[Step 6] Extracted JSON substring (length:', jsonString.length, ')');
        }
      }
      
      try {
        rawData = JSON.parse(jsonString);
        console.log('[Step 6] ✅ Successfully parsed JSON string');
        console.log('[Step 6] Parsed data type:', typeof rawData);
        console.log('[Step 6] Parsed data is array:', Array.isArray(rawData));
      } catch (parseError) {
        console.log('[Step 6] ❌ Failed to parse JSON:', parseError.message);
        console.log('[Step 6] String preview (first 500 chars):', rawData.substring(0, 500));
        console.log('[Step 6] String end preview (last 200 chars):', rawData.substring(Math.max(0, rawData.length - 200)));
        logger.error('Failed to parse WooCommerce response as JSON', {
          storeId,
          error: parseError.message,
          dataPreview: rawData.substring(0, 500)
        });
      }
    }
    
    let couponsData = [];
    if (Array.isArray(rawData)) {
      couponsData = rawData;
      console.log(`[Step 6] ✅ Using parsed data as array - Found ${couponsData.length} coupons`);
    } else if (resp && Array.isArray(resp)) {
      // Sometimes the response itself is the array
      couponsData = resp;
      console.log(`[Step 6] ✅ Using resp as array - Found ${couponsData.length} coupons`);
    } else if (rawData && Array.isArray(rawData.data)) {
      couponsData = rawData.data;
      console.log(`[Step 6] ✅ Using rawData.data as array - Found ${couponsData.length} coupons`);
    } else if (rawData && typeof rawData === 'object') {
      // If it's an object, try to extract array from common properties
      couponsData = rawData.coupons || rawData.items || rawData.results || [];
      const usedProperty = rawData.coupons ? 'coupons' : (rawData.items ? 'items' : 'results');
      console.log(`[Step 6] ✅ Extracted from object property '${usedProperty}' - Found ${couponsData.length} coupons`);
    } else {
      // Safely log response without circular references
      console.log('[Step 6] ❌ Unexpected response format!');
      const safeRespData = {
        storeId,
        respType: typeof resp,
        rawDataType: typeof rawData,
        isArray: Array.isArray(rawData),
        respStatus: resp.status,
        rawDataKeys: rawData && typeof rawData === 'object' ? Object.keys(rawData) : null
      };
      console.log('[Step 6] Response details:', safeRespData);
      logger.error('Unexpected WooCommerce coupons response format', safeRespData);
    }
    
    console.log(`[Step 7] Mapping ${couponsData.length} coupons to response format...`);
    
    // Helper function to check if coupon is compatible for sync
    const isCompatibleCoupon = (coupon) => {
      // A coupon is compatible if:
      // 1. It has specific product_ids (we can create separate entries per product) - COMPATIBLE
      // 2. It applies to all products (no product_ids, no product_categories) - COMPATIBLE (but needs featured product)
      // 3. It has product_categories only (harder to get specific product data) - INCOMPATIBLE
      
      const hasProductIds = Array.isArray(coupon.product_ids) && coupon.product_ids.length > 0;
      const hasProductCategories = Array.isArray(coupon.product_categories) && coupon.product_categories.length > 0;
      
      // Compatible if:
      // - Has specific product_ids (we'll create one entry per product)
      // - Applies to all products (no restrictions)
      // Incompatible if:
      // - Only has product_categories (can't determine specific products easily)
      if (hasProductIds) {
        return { compatible: true, type: 'multi_product', productCount: coupon.product_ids.length };
      } else if (!hasProductCategories) {
        return { compatible: true, type: 'all_products', productCount: 0 };
      } else {
        return { compatible: false, type: 'category_only', reason: 'Coupon restricted to product categories only. Cannot determine specific products for data collection.' };
      }
    };
    
    const coupons = couponsData.map(c => {
      const compatibility = isCompatibleCoupon(c);
      return {
      id: c.id,
      code: c.code,
      amount: c.amount,
      discount_type: c.discount_type,
      description: c.description,
      date_created: c.date_created,
      date_expires: c.date_expires,
        date_created_gmt: c.date_created_gmt,
        date_modified: c.date_modified,
        date_modified_gmt: c.date_modified_gmt,
      usage_limit: c.usage_limit,
        usage_limit_per_user: c.usage_limit_per_user,
      usage_count: c.usage_count,
        limit_usage_to_x_items: c.limit_usage_to_x_items,
        minimum_amount: c.minimum_amount,
        maximum_amount: c.maximum_amount,
        individual_use: c.individual_use || false,
        free_shipping: c.free_shipping || false,
        exclude_sale_items: c.exclude_sale_items || false,
        product_ids: c.product_ids || [],
        excluded_product_ids: c.excluded_product_ids || [],
        product_categories: c.product_categories || [],
        excluded_product_categories: c.excluded_product_categories || [],
        email_restrictions: c.email_restrictions || [],
        compatible: compatibility.compatible, // Compatibility flag
        compatibility_type: compatibility.type, // 'multi_product', 'all_products', or 'category_only'
        product_count: compatibility.productCount || 0,
        compatibility_reason: compatibility.compatible 
          ? (compatibility.type === 'multi_product' 
              ? `Will create ${compatibility.productCount} separate coupon entry/entries (one per product)` 
              : 'Applies to all products - will use featured product for images/prices')
          : compatibility.reason || 'Incompatible coupon',
      };
    });
    
    console.log(`[Step 8] ✅ Successfully processed ${coupons.length} coupons`);
    console.log('=== [WooCommerce Controller] listWcCoupons END ===\n');
    res.json({ coupons });
  } catch (error) {
    console.log('[ERROR] Exception caught in listWcCoupons');
    console.log('[ERROR] Error message:', error.message);
    console.log('[ERROR] Error name:', error.name);
    console.log('[ERROR] Error code:', error.code);
    
    if (error.response) {
      console.log('[ERROR] Response status:', error.response.status);
      console.log('[ERROR] Response statusText:', error.response.statusText);
      console.log('[ERROR] Response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.config) {
      console.log('[ERROR] Request URL:', error.config.url);
      console.log('[ERROR] Request method:', error.config.method);
    }
    
    // Enhanced error logging (avoid circular references)
    const errorLogData = {
      storeId: req.params.storeId, 
      error: error.message,
      errorName: error.name,
      code: error.code,
      responseStatus: error.response?.status,
      responseStatusText: error.response?.statusText,
      responseData: error.response?.data,
      requestUrl: error.config?.url,
      requestMethod: error.config?.method
    };
    
    // Only include stack in development
    if (process.env.NODE_ENV === 'development') {
      errorLogData.stack = error.stack;
    }
    
    logger.error('List WC coupons error', errorLogData);
    
    // Provide more detailed error message
    let errorMessage = 'Failed to list Woo coupons';
    let statusCode = 500;
    
    if (error.message && error.message.includes('missing required')) {
      errorMessage = error.message;
      statusCode = 400;
    } else if (error.response?.status === 401) {
      errorMessage = 'Invalid API credentials. Please check your Consumer Key and Consumer Secret.';
      statusCode = 401;
    } else if (error.response?.status === 404) {
      errorMessage = 'WooCommerce store not found or API endpoint not available. Please verify the store URL.';
      statusCode = 404;
    } else if (error.response?.status === 403) {
      errorMessage = 'Access forbidden. Please check API key permissions (needs Read access).';
      statusCode = 403;
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      errorMessage = `Cannot connect to WooCommerce store. Please verify the store URL: ${error.message}`;
      statusCode = 503;
    } else if (error.message) {
      errorMessage = `Failed to list Woo coupons: ${error.message}`;
    }
    
    console.log('[ERROR] Sending error response:', { statusCode, errorMessage });
    console.log('=== [WooCommerce Controller] listWcCoupons END (ERROR) ===\n');
    
    res.status(statusCode).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: process.env.NODE_ENV === 'development' ? {
        status: error.response?.status,
        data: error.response?.data,
        code: error.code
      } : undefined
    });
  }
};

// Read-only: list products from Woo for selection in wizard
exports.listWcProducts = async (req, res) => {
  console.log('\n=== [WooCommerce Controller] listWcProducts START ===');
  try {
    const { storeId } = req.params;
    const { page = 1, per_page = 50, search = '', category = '', on_sale = '' } = req.query;
    
    console.log('[Step 1] Request params:', { storeId, page, per_page, search, category, on_sale });
    
    console.log('[Step 2] Finding store in database...');
    const store = await Store.findById(storeId);
    if (!store) {
      console.log('[ERROR] Store not found with ID:', storeId);
      return res.status(404).json({ message: 'Store not found' });
    }
    
    console.log('[Step 2] Store found:', {
      _id: store._id,
      name: store.name,
      url: store.url,
      storeType: store.storeType,
      hasApiKey: !!store.apiKey,
      hasSecretKey: !!store.secretKey,
      apiKeyPreview: store.apiKey ? store.apiKey.substring(0, 10) + '...' : 'MISSING',
      secretKeyPreview: store.secretKey ? store.secretKey.substring(0, 10) + '...' : 'MISSING'
    });
    
    // Validate store has API credentials
    if (!store.apiKey || !store.secretKey) {
      console.log('[ERROR] Store missing API credentials');
      return res.status(400).json({ 
        message: 'Store is missing API credentials. Please update the store with valid API keys.' 
      });
    }
    
    console.log('[Step 3] Building WooCommerce client...');
    const client = buildClient(store);
    console.log('[Step 3] Client built successfully');
    
    console.log('[Step 4] Making API request to WooCommerce...');
    
    // Build query params for WooCommerce API
    const queryParams = {
      per_page: Number(per_page),
      page: Number(page),
    };
    
    if (search) {
      queryParams.search = search;
    }
    
    if (category) {
      queryParams.category = category;
    }
    
    if (on_sale === 'true' || on_sale === 'false') {
      queryParams.on_sale = on_sale === 'true';
    }
    
    console.log('[Step 4] Request params:', { 
      endpoint: 'products',
      ...queryParams
    });
    
    const resp = await client.get('products', queryParams);
    
    console.log('[Step 5] API response received!');
    console.log('[Step 5] Response structure:', {
      hasResponse: !!resp,
      respType: typeof resp,
      respStatus: resp?.status,
      respStatusText: resp?.statusText,
      hasData: !!resp?.data,
      dataType: typeof resp?.data,
      isDataArray: Array.isArray(resp?.data),
      dataLength: Array.isArray(resp?.data) ? resp?.data.length : 'N/A',
      dataKeys: resp?.data && typeof resp?.data === 'object' && !Array.isArray(resp?.data) ? Object.keys(resp?.data) : null
    });
    
    // Handle different response formats from WooCommerce API
    // The @woocommerce/woocommerce-rest-api library returns resp.data as the array directly
    // BUT sometimes it returns a string that needs to be parsed
    console.log('[Step 6] Processing response data...');
    let rawData = resp.data;
    
    // If data is a string, try to parse it as JSON
    if (typeof rawData === 'string') {
      console.log('[Step 6] ⚠️  Response.data is a string, attempting to parse as JSON...');
      console.log('[Step 6] String length:', rawData.length);
      
      // Try to extract JSON part if HTML is mixed in (common with WooCommerce API)
      let jsonString = rawData;
      const jsonStart = jsonString.indexOf('[');
      
      if (jsonStart !== -1) {
        // Find the actual end of the JSON array by looking for the last ']' 
        // that's followed by whitespace or end of string (not HTML/JS)
        let jsonEnd = -1;
        for (let i = jsonString.length - 1; i >= jsonStart; i--) {
          if (jsonString[i] === ']') {
            // Check if this ']' is followed by whitespace or end of string
            const after = jsonString.substring(i + 1).trim();
            if (after === '' || after.startsWith('<') || after.startsWith('\n<script')) {
              jsonEnd = i;
              break;
            }
          }
        }
        
        if (jsonEnd === -1) {
          // Fallback: use lastIndexOf
          jsonEnd = jsonString.lastIndexOf(']');
        }
        
        if (jsonEnd !== -1 && jsonEnd > jsonStart) {
          jsonString = jsonString.substring(jsonStart, jsonEnd + 1);
          console.log('[Step 6] Extracted JSON substring (length:', jsonString.length, ')');
        }
      }
      
      try {
        rawData = JSON.parse(jsonString);
        console.log('[Step 6] ✅ Successfully parsed JSON string');
        console.log('[Step 6] Parsed data type:', typeof rawData);
        console.log('[Step 6] Parsed data is array:', Array.isArray(rawData));
      } catch (parseError) {
        console.log('[Step 6] ❌ Failed to parse JSON:', parseError.message);
        console.log('[Step 6] String preview (first 500 chars):', rawData.substring(0, 500));
        console.log('[Step 6] String end preview (last 200 chars):', rawData.substring(Math.max(0, rawData.length - 200)));
        logger.error('Failed to parse WooCommerce response as JSON', {
          storeId,
          error: parseError.message,
          dataPreview: rawData.substring(0, 500)
        });
      }
    }
    
    let productsData = [];
    if (Array.isArray(rawData)) {
      productsData = rawData;
      console.log(`[Step 6] ✅ Using parsed data as array - Found ${productsData.length} products`);
    } else if (resp && Array.isArray(resp)) {
      // Sometimes the response itself is the array
      productsData = resp;
      console.log(`[Step 6] ✅ Using resp as array - Found ${productsData.length} products`);
    } else if (rawData && Array.isArray(rawData.data)) {
      productsData = rawData.data;
      console.log(`[Step 6] ✅ Using rawData.data as array - Found ${productsData.length} products`);
    } else if (rawData && typeof rawData === 'object') {
      // If it's an object, try to extract array from common properties
      productsData = rawData.products || rawData.items || rawData.results || [];
      const usedProperty = rawData.products ? 'products' : (rawData.items ? 'items' : 'results');
      console.log(`[Step 6] ✅ Extracted from object property '${usedProperty}' - Found ${productsData.length} products`);
    } else {
      // Safely log response without circular references
      console.log('[Step 6] ❌ Unexpected response format!');
      const safeRespData = {
        storeId,
        respType: typeof resp,
        rawDataType: typeof rawData,
        isArray: Array.isArray(rawData),
        respStatus: resp.status,
        rawDataKeys: rawData && typeof rawData === 'object' ? Object.keys(rawData) : null
      };
      console.log('[Step 6] Response details:', safeRespData);
      logger.error('Unexpected WooCommerce products response format', safeRespData);
    }
    
    console.log(`[Step 7] Mapping ${productsData.length} products to response format...`);
    const products = productsData.map(p => {
      // Handle variable products - they don't have prices at parent level
      let regularPrice = p.regular_price;
      let salePrice = p.sale_price;
      let priceDisplay = null;
      
      if (p.type === 'variable' && p.variations && Array.isArray(p.variations) && p.variations.length > 0) {
        // For variable products, we need to fetch variation prices
        // For now, indicate it's a variable product
        priceDisplay = 'Variable';
      } else if (!regularPrice && !salePrice && p.type === 'variable') {
        priceDisplay = 'Variable';
      } else if (!regularPrice || regularPrice === '' || regularPrice === '0') {
        // If no regular price, try to get from price field
        regularPrice = p.price || null;
      }
      
      return {
      id: p.id,
      name: p.name,
      permalink: p.permalink,
        type: p.type || 'simple',
      on_sale: p.on_sale,
        regular_price: regularPrice,
        sale_price: salePrice,
        price_display: priceDisplay,
      date_on_sale_from: p.date_on_sale_from,
      date_on_sale_to: p.date_on_sale_to,
        images: p.images?.map(i => ({
          id: i.id,
          src: i.src,
          name: i.name || i.src.split('/').pop(),
          alt: i.alt || p.name,
        })) || [],
      short_description: p.short_description,
      description: p.description,
        // Variation information for variable products
        variationCount: p.type === 'variable' && p.variations && Array.isArray(p.variations) ? p.variations.length : 0,
        isVariable: p.type === 'variable',
      };
    });
    
    // Get pagination info from response headers
    const totalProducts = resp.headers['x-wp-total'] ? parseInt(resp.headers['x-wp-total'], 10) : products.length;
    const totalPages = resp.headers['x-wp-totalpages'] ? parseInt(resp.headers['x-wp-totalpages'], 10) : 1;
    
    console.log(`[Step 8] ✅ Successfully processed ${products.length} products`);
    console.log(`[Step 8] Pagination info: Total: ${totalProducts}, Total Pages: ${totalPages}, Current Page: ${page}`);
    console.log('=== [WooCommerce Controller] listWcProducts END ===\n');
    
    res.json({ 
      products,
      pagination: {
        page: Number(page),
        perPage: Number(per_page),
        total: totalProducts,
        totalPages: totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    });
  } catch (error) {
    // Enhanced error logging (avoid circular references)
    const errorLogData = {
      storeId: req.params.storeId, 
      error: error.message,
      errorName: error.name,
      code: error.code,
      responseStatus: error.response?.status,
      responseStatusText: error.response?.statusText,
      responseData: error.response?.data,
      requestUrl: error.config?.url,
      requestMethod: error.config?.method
    };
    
    // Only include stack in development
    if (process.env.NODE_ENV === 'development') {
      errorLogData.stack = error.stack;
    }
    
    logger.error('List WC products error', errorLogData);
    
    // Provide more detailed error message
    let errorMessage = 'Failed to list Woo products';
    let statusCode = 500;
    
    if (error.message && error.message.includes('missing required')) {
      errorMessage = error.message;
      statusCode = 400;
    } else if (error.response?.status === 401) {
      errorMessage = 'Invalid API credentials. Please check your Consumer Key and Consumer Secret.';
      statusCode = 401;
    } else if (error.response?.status === 404) {
      errorMessage = 'WooCommerce store not found or API endpoint not available. Please verify the store URL.';
      statusCode = 404;
    } else if (error.response?.status === 403) {
      errorMessage = 'Access forbidden. Please check API key permissions (needs Read access).';
      statusCode = 403;
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      errorMessage = `Cannot connect to WooCommerce store. Please verify the store URL: ${error.message}`;
      statusCode = 503;
    } else if (error.message) {
      errorMessage = `Failed to list Woo products: ${error.message}`;
    }
    
    res.status(statusCode).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: process.env.NODE_ENV === 'development' ? {
        status: error.response?.status,
        data: error.response?.data,
        code: error.code
      } : undefined
    });
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

// Create coupon directly in WooCommerce and our database
exports.createWcCoupon = async (req, res) => {
  try {
    const { storeId } = req.params;
    const {
      code,
      discountType,
      discountValue,
      description,
      instructions,
      productIds, // Array of WooCommerce product IDs
      startDate,
      endDate,
      usageLimit,
      usageLimitPerUser,
      minPurchaseAmount,
      maxPurchaseAmount,
      individualUse,
      freeShipping,
      excludeSaleItems,
      categoryId, // Our category ID
      title,
      longDescription,
      highlights,
      tags,
      seoTitle,
      seoDescription,
      seoKeywords,
      canonicalUrl,
      currency,
      isPublished,
      isActive
    } = req.body;

    console.log('\n=== [WooCommerce Controller] createWcCoupon START ===');
    console.log('[Step 1] Request received:', {
      storeId,
      code,
      discountType,
      discountValue,
      productIds: productIds || [],
      productCount: productIds ? productIds.length : 0
    });

    // Validate required fields
    if (!code || !discountType || !discountValue) {
      return res.status(400).json({
        message: 'Missing required fields: code, discountType, and discountValue are required'
      });
    }

    // Find store
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    if (!store.apiKey || !store.secretKey) {
      return res.status(400).json({
        message: 'Store is missing API credentials. Please update the store with valid API keys.'
      });
    }

    // Build WooCommerce client
    const client = buildClient(store);

    // Prepare WooCommerce coupon payload
    // Map discount type: 'percentage' -> 'percent', 'fixed' -> 'fixed_product'
    const wcDiscountType = discountType === 'percentage' ? 'percent' : 'fixed_product';
    
    const wcCouponPayload = {
      code: code,
      amount: String(discountValue),
      discount_type: wcDiscountType,
      description: description || title || '',
      date_expires: endDate ? new Date(endDate).toISOString() : undefined,
      individual_use: individualUse || false,
      product_ids: Array.isArray(productIds) && productIds.length > 0 ? productIds.map(id => Number(id)) : [],
      usage_limit: usageLimit || undefined,
      usage_limit_per_user: usageLimitPerUser || undefined,
      free_shipping: freeShipping || false,
      exclude_sale_items: excludeSaleItems || false,
      minimum_amount: minPurchaseAmount ? String(minPurchaseAmount) : undefined,
      maximum_amount: maxPurchaseAmount ? String(maxPurchaseAmount) : undefined,
    };

    console.log('[Step 2] Creating coupon in WooCommerce...');
    console.log('[Step 2] WooCommerce payload:', JSON.stringify(wcCouponPayload, null, 2));

    // Create coupon in WooCommerce
    let wcCouponResponse;
    try {
      const resp = await client.post('coupons', wcCouponPayload);
      
      // Handle string response (extract JSON if needed)
      let couponData = resp.data;
      if (typeof couponData === 'string') {
        try {
          const jsonStart = couponData.indexOf('{');
          if (jsonStart !== -1) {
            let braceCount = 0;
            let jsonEnd = -1;
            for (let i = jsonStart; i < couponData.length; i++) {
              if (couponData[i] === '{') braceCount++;
              if (couponData[i] === '}') {
                braceCount--;
                if (braceCount === 0) {
                  jsonEnd = i;
                  break;
                }
              }
            }
            if (jsonEnd !== -1) {
              couponData = JSON.parse(couponData.substring(jsonStart, jsonEnd + 1));
            }
          }
        } catch (parseError) {
          console.error('❌ Failed to parse WooCommerce response:', parseError.message);
          return res.status(500).json({
            message: 'Failed to parse WooCommerce response',
            error: parseError.message
          });
        }
      }
      
      wcCouponResponse = couponData;
      console.log('[Step 2] ✅ Coupon created in WooCommerce:', {
        wcCouponId: wcCouponResponse.id,
        code: wcCouponResponse.code
      });
    } catch (wcError) {
      console.error('❌ WooCommerce API Error:', {
        message: wcError.message,
        status: wcError.response?.status,
        data: wcError.response?.data
      });
      
      let errorMessage = 'Failed to create coupon in WooCommerce';
      if (wcError.response?.status === 400) {
        errorMessage = wcError.response?.data?.message || 'Invalid coupon data';
      } else if (wcError.response?.status === 401) {
        errorMessage = 'Invalid API credentials';
      }
      
      return res.status(wcError.response?.status || 500).json({
        message: errorMessage,
        error: wcError.response?.data || wcError.message
      });
    }

    const wcCouponId = wcCouponResponse.id;
    const wcCoupon = wcCouponResponse;

    // Fetch product details if products are selected
    let productDetails = [];
    let imageGallery = [];
    let imageUrl = undefined;
    let originalPrice = undefined;
    let discountedPrice = undefined;
    let productUrl = undefined;
    let productName = undefined;
    let wooProductId = undefined;
    let parentProductId = undefined;

    if (Array.isArray(productIds) && productIds.length > 0) {
      console.log('[Step 3] Fetching product details for', productIds.length, 'products...');
      
      // For multiple products, we'll use the first product for images/prices
      // But store all product IDs
      const primaryProductId = productIds[0];
      
      try {
        const productResp = await client.get(`products/${primaryProductId}`);
        let productData = productResp.data;
        
        // Handle string response
        if (typeof productData === 'string') {
          try {
            const jsonStart = productData.indexOf('{');
            if (jsonStart !== -1) {
              let braceCount = 0;
              let jsonEnd = -1;
              for (let i = jsonStart; i < productData.length; i++) {
                if (productData[i] === '{') braceCount++;
                if (productData[i] === '}') {
                  braceCount--;
                  if (braceCount === 0) {
                    jsonEnd = i;
                    break;
                  }
                }
              }
              if (jsonEnd !== -1) {
                productData = JSON.parse(productData.substring(jsonStart, jsonEnd + 1));
              }
            }
          } catch (parseError) {
            console.error('⚠️ Failed to parse product response, continuing without product details');
          }
        }
        
        const product = productData;
        
        // Extract product details
        productUrl = product.permalink;
        productName = product.name;
        wooProductId = product.id;
        parentProductId = product.parent_id || undefined;
        
        // Build image gallery
        if (product.images && Array.isArray(product.images) && product.images.length > 0) {
          imageGallery = product.images.map((img, idx) => ({
            url: img.src || img.url || '',
            alt: img.alt || product.name || 'Product image',
            order: idx,
          })).filter(img => img.url);
          imageUrl = imageGallery.length > 0 ? imageGallery[0].url : undefined;
        }
        
        // Calculate prices
        const regularPriceStr = product.regular_price || product.price || '0';
        const regular = parseFloat(regularPriceStr) || 0;
        const salePriceStr = product.sale_price || '0';
        const sale = parseFloat(salePriceStr) || 0;
        
        if (regular > 0) {
          originalPrice = regular;
          const currentPrice = (sale > 0 && sale < regular) ? sale : regular;
          
          // Apply coupon discount to current price
          if (discountType === 'percentage' && discountValue > 0) {
            discountedPrice = currentPrice * (1 - discountValue / 100);
            discountedPrice = Math.round(discountedPrice * 100) / 100;
          } else if (discountType === 'fixed' && discountValue > 0) {
            discountedPrice = Math.max(0, currentPrice - discountValue);
            discountedPrice = Math.round(discountedPrice * 100) / 100;
          } else {
            discountedPrice = currentPrice;
          }
        }
        
        console.log('[Step 3] ✅ Product details fetched:', {
          productId: wooProductId,
          productName,
          hasImages: imageGallery.length > 0,
          originalPrice,
          discountedPrice
        });
      } catch (productError) {
        console.error('⚠️ Failed to fetch product details:', productError.message);
        // Continue without product details - coupon will still be created
      }
    } else {
      // No products selected - "all products" coupon
      productUrl = `__all_products__${code}`;
      console.log('[Step 3] No products selected - creating all-products coupon');
    }

    // Get currency and location settings
    const finalCurrency = currency || store.currency || 'USD';
    const availableCountries = store.availableCountries || ['WORLDWIDE'];
    const isWorldwide = store.isWorldwide !== undefined ? store.isWorldwide : true;

    // Build coupon data for our database
    const couponData = {
      userId: req.user?._id || store.userId,
      storeId: store._id,
      categoryId: categoryId || store.categoryId || undefined,
      code: code,
      title: title || description || code,
      description: description || undefined,
      instructions: instructions || undefined,
      longDescription: longDescription || description || undefined,
      discountType: discountType,
      discountValue: Number(discountValue),
      minPurchaseAmount: minPurchaseAmount ? Number(minPurchaseAmount) : 0,
      maxPurchaseAmount: maxPurchaseAmount ? Number(maxPurchaseAmount) : undefined,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : undefined,
      usageLimit: usageLimit || 1,
      usageLimitPerUser: usageLimitPerUser || undefined,
      individualUse: individualUse || false,
      freeShipping: freeShipping || false,
      excludeSaleItems: excludeSaleItems || false,
      productIds: Array.isArray(productIds) && productIds.length > 0 ? productIds.map(id => Number(id)) : undefined,
      wooCommerceId: wcCouponId,
      wooProductId: wooProductId,
      parentProductId: parentProductId,
      productUrl: productUrl,
      productName: productName,
      originalPrice: originalPrice,
      discountedPrice: discountedPrice,
      currency: finalCurrency,
      imageUrl: imageUrl || store.logo || undefined,
      imageGallery: imageGallery.length > 0 ? imageGallery : undefined,
      highlights: Array.isArray(highlights) && highlights.length > 0 ? highlights : undefined,
      tags: Array.isArray(tags) && tags.length > 0 ? tags : undefined,
      seoTitle: seoTitle || undefined,
      seoDescription: seoDescription || undefined,
      seoKeywords: Array.isArray(seoKeywords) && seoKeywords.length > 0 ? seoKeywords : undefined,
      canonicalUrl: canonicalUrl || undefined,
      availableCountries: availableCountries,
      isWorldwide: isWorldwide,
      isActive: isActive !== undefined ? isActive : true,
      isPublished: isPublished !== undefined ? isPublished : false,
      updatedAt: new Date(),
    };

    console.log('[Step 4] Creating coupon in our database...');

    // Create coupon in our database
    let coupon;
    try {
      // Determine query for uniqueness
      let query;
      if (productUrl && !productUrl.startsWith('__all_products__')) {
        query = { code: code, storeId: store._id, productUrl: productUrl };
      } else if (wooProductId) {
        query = { code: code, storeId: store._id, wooProductId: wooProductId };
      } else {
        query = { code: code, storeId: store._id, productUrl: `__all_products__${code}` };
      }

      coupon = await Coupon.findOneAndUpdate(
        query,
        couponData,
        { upsert: true, new: true }
      );

      console.log('[Step 4] ✅ Coupon created in database:', {
        couponId: coupon._id,
        code: coupon.code,
        wcCouponId: wcCouponId
      });
    } catch (dbError) {
      console.error('❌ Database Error:', {
        message: dbError.message,
        code: dbError.code,
        codeName: dbError.codeName
      });

      // If our DB creation fails, we should ideally delete the WooCommerce coupon
      // But for now, just return error
      return res.status(500).json({
        message: 'Failed to create coupon in database',
        error: dbError.message,
        wcCouponId: wcCouponId // Return WC coupon ID so admin can manually delete if needed
      });
    }

    console.log('=== [WooCommerce Controller] createWcCoupon END ===\n');

    res.status(201).json({
      message: 'Coupon created successfully in WooCommerce and database',
      coupon: {
        _id: coupon._id,
        code: coupon.code,
        title: coupon.title,
        wooCommerceId: wcCouponId,
        productIds: coupon.productIds,
        hasImages: imageGallery.length > 0,
        hasPrices: !!(originalPrice && discountedPrice)
      },
      wcCoupon: {
        id: wcCouponId,
        code: wcCoupon.code
      }
    });

  } catch (error) {
    console.error('❌ createWcCoupon Error:', error);
    logger.error('Create WC coupon error', {
      storeId: req.params.storeId,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      message: 'Failed to create coupon',
      error: error.message
    });
  }
};

// Sync selected coupons from WooCommerce
// This function uses the EXACT same logic as importAllCompatibleCoupons.js script
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
    
    console.log(`\n=== Starting Import of ${couponIds.length} Selected Coupons ===\n`);
    
    logger.info('Starting sync for selected coupons', { 
      storeId, 
      totalCoupons: couponIds.length,
      couponIds: couponIds.map(id => String(id))
    });
    
    for (let i = 0; i < couponIds.length; i++) {
      const wcCouponId = couponIds[i];
      logger.info(`[${i + 1}/${couponIds.length}] Starting to process coupon`, { 
        wcCouponId, 
        couponIndex: i + 1,
        totalCoupons: couponIds.length 
      });
      
      try {
        logger.debug(`Fetching coupon ${wcCouponId} from WooCommerce...`);
        const resp = await client.get(`coupons/${wcCouponId}`);
        logger.debug('Coupon fetched successfully', { wcCouponId, responseType: typeof resp.data });
        
        // Handle string response (same as listWcCoupons) - extract JSON from HTML/JS
        let couponData = resp.data;
        if (typeof couponData === 'string') {
          try {
            // Try to extract JSON object from string response
            let jsonString = couponData;
            const jsonStart = jsonString.indexOf('{');
            
            if (jsonStart !== -1) {
              // Find the matching closing brace by counting braces
              let braceCount = 0;
              let jsonEnd = -1;
              for (let i = jsonStart; i < jsonString.length; i++) {
                if (jsonString[i] === '{') braceCount++;
                if (jsonString[i] === '}') {
                  braceCount--;
                  if (braceCount === 0) {
                    jsonEnd = i;
                    break;
                  }
                }
              }
              
              if (jsonEnd === -1) {
                // Fallback: use lastIndexOf
                jsonEnd = jsonString.lastIndexOf('}');
              }
              
              if (jsonEnd !== -1 && jsonEnd > jsonStart) {
                jsonString = jsonString.substring(jsonStart, jsonEnd + 1);
                couponData = JSON.parse(jsonString);
              } else {
                throw new Error('Could not find valid JSON object');
              }
            } else {
              throw new Error('No JSON object found in response');
            }
          } catch (parseError) {
            logger.error('Failed to parse coupon response', { 
              couponId: wcCouponId, 
              error: parseError.message 
            });
            results.push({
              wcCouponId,
              success: false,
              error: `Failed to parse coupon response: ${parseError.message}`
            });
            continue;
          }
        }
        
        const c = couponData;
        logger.info('Coupon data parsed successfully', {
          wcCouponId,
          code: c.code,
          discountType: c.discount_type,
          amount: c.amount,
          productIds: c.product_ids || [],
          productCategories: c.product_categories || []
        });
        
        // Check coupon compatibility
        const hasProductIds = Array.isArray(c.product_ids) && c.product_ids.length > 0;
        const hasProductCategories = Array.isArray(c.product_categories) && c.product_categories.length > 0;
        
        logger.info('Coupon compatibility check', {
          wcCouponId,
          code: c.code,
          hasProductIds,
          hasProductCategories,
          productIdsCount: hasProductIds ? c.product_ids.length : 0
        });
        
        // Incompatible: Only category restrictions (can't determine specific products)
        if (!hasProductIds && hasProductCategories) {
          logger.warn('Skipping incompatible coupon with category-only restrictions', {
            couponId: wcCouponId,
            code: c.code,
            productCategories: c.product_categories
          });
          results.push({
            wcCouponId: wcCouponId,
            couponId: wcCouponId,
            code: c.code,
            success: false,
            error: 'Coupon restricted to product categories only. Cannot determine specific products for data collection.'
          });
          continue;
        }
        
        // Get custom data from request body if provided
        const couponCustomData = req.body.couponData && req.body.couponData[wcCouponId] ? req.body.couponData[wcCouponId] : {};
        
        // Determine which products to process
        let productsToProcess = [];
        
        logger.info('Determining products to process', {
          wcCouponId,
          code: c.code,
          hasProductIds,
          productIds: hasProductIds ? c.product_ids : []
        });
        
        if (hasProductIds) {
          logger.info('Multi-product coupon: Fetching products', {
            wcCouponId,
            code: c.code,
            productIds: c.product_ids,
            totalProducts: c.product_ids.length
          });
          // Multi-product coupon: Fetch all products first to check for duplicate URLs
          // (variations of the same product will have the same permalink)
          const productMap = new Map(); // Map URL -> product info
          
          for (const productId of c.product_ids) {
            try {
              logger.info('Fetching product from WooCommerce', {
                wcCouponId,
                code: c.code,
                productId,
                url: `products/${productId}`
              });
              
              const productResp = await client.get(`products/${productId}`);
              
              logger.info('Product fetched successfully from WooCommerce', {
                wcCouponId,
                code: c.code,
                productId,
                responseType: typeof productResp.data,
                hasData: !!productResp.data
              });
              
              // Handle string response (same as coupons) - extract JSON from HTML/JS
              let productData = productResp.data;
              if (typeof productData === 'string') {
                try {
                  // Try to extract JSON object from string response
                  let jsonString = productData;
                  const jsonStart = jsonString.indexOf('{');
                  
                  if (jsonStart !== -1) {
                    // Find the matching closing brace by counting braces
                    let braceCount = 0;
                    let jsonEnd = -1;
                    for (let i = jsonStart; i < jsonString.length; i++) {
                      if (jsonString[i] === '{') braceCount++;
                      if (jsonString[i] === '}') {
                        braceCount--;
                        if (braceCount === 0) {
                          jsonEnd = i;
                          break;
                        }
                      }
                    }
                    
                    if (jsonEnd === -1) {
                      // Fallback: use lastIndexOf
                      jsonEnd = jsonString.lastIndexOf('}');
                    }
                    
                    if (jsonEnd !== -1 && jsonEnd > jsonStart) {
                      jsonString = jsonString.substring(jsonStart, jsonEnd + 1);
                      productData = JSON.parse(jsonString);
                    } else {
                      throw new Error('Could not find valid JSON object');
                    }
                  } else {
                    throw new Error('No JSON object found in response');
                  }
                } catch (parseError) {
                  logger.error('❌ FAILED TO PARSE PRODUCT RESPONSE - ACTUAL ERROR', { 
                    couponId: wcCouponId,
                    code: c?.code || 'unknown',
                    productId, 
                    errorMessage: parseError.message,
                    errorName: parseError.name,
                    errorStack: parseError.stack,
                    responseType: typeof productData,
                    responseLength: typeof productData === 'string' ? productData.length : 'N/A',
                    responsePreview: typeof productData === 'string' ? productData.substring(0, 200) : 'N/A'
                  });
                  continue; // Skip this product
                }
              }
              
              const product = productData;
              // Get product URL - use permalink or link, fallback to productId-based key if no URL
              let productUrl = product.permalink || product.link || null;
              
              // If no URL, use productId as the key to ensure uniqueness
              // This prevents multiple products with null URLs from being grouped together
              const mapKey = productUrl || `product-${productId}`;
              
              // Only add if we have valid product data with name
              if (product && product.name) {
                // If we haven't seen this key, or if this product is a parent (parent_id === 0) 
                // and the existing one is a variation, replace it with the parent
                const existing = productMap.get(mapKey);
                if (!existing) {
                  // First time seeing this key
                  productMap.set(mapKey, {
                    productId: productId,
                    productData: product,
                    isPrimary: productMap.size === 0,
                    mapKey: mapKey, // Store the key for reference
                  });
                } else if (product.parent_id === 0 && existing.productData?.parent_id !== 0) {
                  // This is a parent product, replace the variation with the parent
                  productMap.set(mapKey, {
                    productId: productId,
                    productData: product,
                    isPrimary: existing.isPrimary, // Keep the primary flag from the first one
                    mapKey: mapKey,
                  });
                } else if (productUrl && existing.productData && (!existing.productData.permalink && !existing.productData.link)) {
                  // Existing has no URL but this one does - replace it
                  productMap.set(mapKey, {
                    productId: productId,
                    productData: product,
                    isPrimary: existing.isPrimary,
                    mapKey: mapKey,
                  });
                } else {
                  // Same key, different product - skip to avoid duplicates
                  logger.debug('Product has same key as existing, skipping', { 
                    couponId: wcCouponId, 
                    productId, 
                    existingProductId: existing.productId 
                  });
                }
              }
            } catch (error) {
              console.error('❌❌❌ ACTUAL ERROR FETCHING PRODUCT:', {
                couponId: wcCouponId, 
                code: c?.code || 'unknown',
                productId,
                ERROR_MESSAGE: error.message,
                ERROR_NAME: error.name,
                ERROR_CODE: error.code,
                HTTP_STATUS: error.response?.status || error.status || 'N/A',
                HTTP_STATUS_TEXT: error.response?.statusText || error.statusText || 'N/A',
                ERROR_RESPONSE_DATA: error.response?.data ? (typeof error.response.data === 'string' ? error.response.data.substring(0, 1000) : JSON.stringify(error.response.data).substring(0, 1000)) : 'N/A',
                ERROR_STACK: error.stack,
                REQUEST_URL: error.config?.url || `products/${productId}`,
                REQUEST_METHOD: error.config?.method || 'GET',
                REQUEST_BASE_URL: error.config?.baseURL || 'N/A'
              });
              
              logger.error('❌ Could not fetch product for coupon - ACTUAL ERROR', { 
                couponId: wcCouponId, 
                code: c?.code || 'unknown',
                productId, 
                errorMessage: error.message,
                errorName: error.name,
                errorCode: error.code,
                errorStatus: error.response?.status || error.status || 'N/A',
                errorStatusText: error.response?.statusText || error.statusText || 'N/A',
                errorResponse: error.response?.data ? (typeof error.response.data === 'string' ? error.response.data.substring(0, 1000) : JSON.stringify(error.response.data).substring(0, 1000)) : 'N/A',
                errorStack: error.stack,
                errorConfig: error.config ? {
                  url: error.config.url,
                  method: error.config.method,
                  baseURL: error.config.baseURL
                } : 'N/A'
              });
              // Still add it even if fetch failed, we'll handle it later
              productMap.set(`unknown-${productId}`, {
                productId: productId,
                productData: null,
                isPrimary: productMap.size === 0,
              });
            }
          }
          
          // Convert map to array - one entry per unique URL
          productsToProcess = Array.from(productMap.values());
        } else {
          // All-products coupon: Need to get a featured/default product
          // Try to get featured product or first on-sale product
          try {
            const featuredResp = await client.get('products', { 
              per_page: 1, 
              featured: true,
              on_sale: true,
              status: 'publish'
            });
            
            // Handle string response
            let featuredData = featuredResp.data;
            if (typeof featuredData === 'string') {
              try {
                let jsonString = featuredData;
                const jsonStart = jsonString.indexOf('[');
                if (jsonStart !== -1) {
                  let jsonEnd = -1;
                  for (let i = jsonString.length - 1; i >= jsonStart; i--) {
                    if (jsonString[i] === ']') {
                      const after = jsonString.substring(i + 1).trim();
                      if (after === '' || after.startsWith('<')) {
                        jsonEnd = i;
                        break;
                      }
                    }
                  }
                  if (jsonEnd === -1) jsonEnd = jsonString.lastIndexOf(']');
                  if (jsonEnd !== -1 && jsonEnd > jsonStart) {
                    jsonString = jsonString.substring(jsonStart, jsonEnd + 1);
                    featuredData = JSON.parse(jsonString);
                  }
                }
              } catch (parseError) {
                logger.warn('Failed to parse featured products response', { 
                  couponId: wcCouponId, 
                  error: parseError.message 
                });
                featuredData = [];
              }
            }
            
            const featuredProducts = Array.isArray(featuredData) ? featuredData : [];
            
            if (featuredProducts.length > 0 && featuredProducts[0].name) {
              productsToProcess = [{ productId: featuredProducts[0].id, isPrimary: true, isFeatured: true, productData: featuredProducts[0] }];
            } else {
              // Fallback: Get first on-sale product
              const saleResp = await client.get('products', { 
                per_page: 1, 
                on_sale: true,
                status: 'publish'
              });
              
              // Handle string response
              let saleData = saleResp.data;
              if (typeof saleData === 'string') {
                try {
                  let jsonString = saleData;
                  const jsonStart = jsonString.indexOf('[');
                  if (jsonStart !== -1) {
                    let jsonEnd = jsonString.lastIndexOf(']');
                    if (jsonEnd !== -1 && jsonEnd > jsonStart) {
                      jsonString = jsonString.substring(jsonStart, jsonEnd + 1);
                      saleData = JSON.parse(jsonString);
                    }
                  }
                } catch (parseError) {
                  logger.warn('Failed to parse on-sale products response', { 
                    couponId: wcCouponId, 
                    error: parseError.message 
                  });
                  saleData = [];
                }
              }
              
              const saleProducts = Array.isArray(saleData) ? saleData : [];
              if (saleProducts.length > 0 && saleProducts[0].name) {
                productsToProcess = [{ productId: saleProducts[0].id, isPrimary: true, isFeatured: false, productData: saleProducts[0] }];
              } else {
                // No products found - will create coupon without product data
                productsToProcess = [{ productId: null, isPrimary: true, isFeatured: false, productData: null }];
              }
            }
          } catch (error) {
            logger.error('❌ Could not fetch featured product for all-products coupon - DETAILED ERROR', { 
              couponId: wcCouponId,
              code: c?.code || 'unknown',
              errorMessage: error.message,
              errorName: error.name,
              errorCode: error.code,
              errorStatus: error.response?.status || error.status || 'N/A',
              errorStatusText: error.response?.statusText || error.statusText || 'N/A',
              errorResponse: error.response?.data ? JSON.stringify(error.response.data).substring(0, 500) : 'N/A',
              errorStack: error.stack,
              errorConfig: error.config ? {
                url: error.config.url,
                method: error.config.method,
                baseURL: error.config.baseURL
              } : 'N/A'
            });
            productsToProcess = [{ productId: null, isPrimary: true, isFeatured: false, productData: null }];
          }
        }
        
        // Process each product (for multi-product coupons, this creates multiple entries)
        // Note: productsToProcess already has unique URLs (variations grouped together)
        logger.info('Processing products for coupon', { 
          couponId: wcCouponId, 
          code: c.code,
          productCount: productsToProcess.length,
          hasProductIds: hasProductIds,
          couponIndex: couponIds.indexOf(wcCouponId) + 1,
          totalCoupons: couponIds.length
        });
        
        let productIndex = 0;
        for (const productInfo of productsToProcess) {
          productIndex++;
          const productId = productInfo.productId;
          let productFullDetails = productInfo.productData; // Use already-fetched data if available
          
          logger.info(`[Product ${productIndex}/${productsToProcess.length}] Starting product processing`, {
            wcCouponId,
            code: c.code,
            productId: productId || 'all-products',
            hasProductData: !!productFullDetails,
            productName: productFullDetails?.name || 'Unknown'
          });
          
          // If we didn't fetch it earlier (shouldn't happen, but just in case)
          if (!productFullDetails && productId) {
            logger.warn('Product data not available, attempting to fetch', {
              wcCouponId,
              code: c.code,
              productId
            });
            try {
              console.log('🔍 FETCHING PRODUCT DETAILS:', { wcCouponId, code: c.code, productId });
              
              const productResp = await client.get(`products/${productId}`);
              productFullDetails = productResp.data;
              
              console.log('✅ PRODUCT FETCHED:', { 
                wcCouponId, 
                code: c.code, 
                productId,
                hasData: !!productFullDetails,
                productName: productFullDetails?.name || 'Unknown'
              });
              
              logger.info('Product details fetched successfully', {
                wcCouponId,
                code: c.code,
                productId,
                productName: productFullDetails?.name || 'Unknown'
              });
            } catch (error) {
              console.error('❌❌❌ ACTUAL ERROR FETCHING PRODUCT DETAILS:', {
                couponId: wcCouponId,
                code: c?.code || 'unknown',
                productId,
                ERROR_MESSAGE: error.message,
                ERROR_NAME: error.name,
                ERROR_CODE: error.code,
                HTTP_STATUS: error.response?.status || error.status || 'N/A',
                HTTP_STATUS_TEXT: error.response?.statusText || error.statusText || 'N/A',
                ERROR_RESPONSE_DATA: error.response?.data ? (typeof error.response.data === 'string' ? error.response.data.substring(0, 1000) : JSON.stringify(error.response.data).substring(0, 1000)) : 'N/A',
                ERROR_STACK: error.stack,
                REQUEST_URL: error.config?.url || `products/${productId}`,
                REQUEST_METHOD: error.config?.method || 'GET'
              });
              
              logger.error('❌ Could not fetch product details for coupon - ACTUAL ERROR', { 
                couponId: wcCouponId,
                code: c?.code || 'unknown',
                productId, 
                errorMessage: error.message,
                errorName: error.name,
                errorCode: error.code,
                errorStatus: error.response?.status || error.status || 'N/A',
                errorStatusText: error.response?.statusText || error.statusText || 'N/A',
                errorResponse: error.response?.data ? (typeof error.response.data === 'string' ? error.response.data.substring(0, 1000) : JSON.stringify(error.response.data).substring(0, 1000)) : 'N/A',
                errorStack: error.stack,
                errorConfig: error.config ? {
                  url: error.config.url,
                  method: error.config.method,
                  baseURL: error.config.baseURL
                } : 'N/A'
              });
            }
          }
          
          // For variations, get the parent product's URL if available
          // Variations typically have the same permalink as parent, but we want parent's data
          let actualProductUrl = productFullDetails ? (productFullDetails.permalink || productFullDetails.link) : null;
          if (productFullDetails && productFullDetails.parent_id && productFullDetails.parent_id > 0) {
            // This is a variation, try to get parent product for better data
            logger.info('Product is a variation, fetching parent product', {
              wcCouponId,
              code: c.code,
              variationId: productId,
              parentId: productFullDetails.parent_id
            });
            try {
              const parentResp = await client.get(`products/${productFullDetails.parent_id}`);
              
              // Handle string response
              let parentData = parentResp.data;
              if (typeof parentData === 'string') {
                try {
                  let jsonString = parentData;
                  const jsonStart = jsonString.indexOf('{');
                  if (jsonStart !== -1) {
                    const jsonEnd = jsonString.lastIndexOf('}');
                    if (jsonEnd !== -1 && jsonEnd > jsonStart) {
                      jsonString = jsonString.substring(jsonStart, jsonEnd + 1);
                      parentData = JSON.parse(jsonString);
                      logger.info('Successfully parsed parent product response', {
                        wcCouponId,
                        code: c.code,
                        variationId: productId,
                        parentId: productFullDetails.parent_id,
                        parentName: parentData?.name || 'Unknown'
                      });
                    }
                  }
                } catch (parseError) {
                  logger.warn('⚠️ Failed to parse parent product response (will use variation data)', { 
                    wcCouponId,
                    code: c.code,
                    variationId: productId, 
                    parentId: productFullDetails.parent_id,
                    error: parseError.message
                  });
                }
              } else {
                logger.info('Successfully fetched parent product (already JSON)', {
                  wcCouponId,
                  code: c.code,
                  variationId: productId,
                  parentId: productFullDetails.parent_id,
                  parentName: parentData?.name || 'Unknown'
                });
              }
              
              const parentProduct = parentData;
              if (parentProduct && parentProduct.permalink) {
                // Use parent's URL but keep variation's ID for tracking
                actualProductUrl = parentProduct.permalink || parentProduct.link || actualProductUrl;
                // Optionally use parent's images if variation doesn't have any
                if ((!productFullDetails.images || productFullDetails.images.length === 0) && 
                    parentProduct.images && parentProduct.images.length > 0) {
                  productFullDetails.images = parentProduct.images;
                }
              }
            } catch (error) {
              // If we can't get parent, just use variation data
              logger.debug('Could not fetch parent product for variation', { 
                variationId: productId, 
                parentId: productFullDetails.parent_id 
              });
            }
          }
          
          // Get custom data for this specific product (if multi-product coupon)
          const productCustomData = productId && couponCustomData.products && couponCustomData.products[productId]
            ? couponCustomData.products[productId]
            : (productInfo.isPrimary ? couponCustomData : {});
        
          // Build image gallery from product images if available
          let imageGallery = [];
          let imageUrl = undefined;
          if (productFullDetails && productFullDetails.images && Array.isArray(productFullDetails.images) && productFullDetails.images.length > 0) {
            if (productCustomData.imageGallery && Array.isArray(productCustomData.imageGallery)) {
              imageGallery = productCustomData.imageGallery;
            } else {
              imageGallery = productFullDetails.images
                .map((img, idx) => {
                  // Handle different image object structures
                  const imageUrl = img.src || img.url || (typeof img === 'string' ? img : null);
                  if (imageUrl) {
                    return {
                      url: imageUrl,
                      alt: img.alt || img.name || productFullDetails.name || 'Product image',
                      order: idx,
                    };
                  }
                  return null;
                })
                .filter(img => img !== null); // Filter out any null entries
            }
            imageUrl = imageGallery.length > 0 ? imageGallery[0].url : undefined;
          }
          
          // Extract highlights from product or custom data
          let highlights = [];
          if (productCustomData.highlights && Array.isArray(productCustomData.highlights)) {
            highlights = productCustomData.highlights;
          } else if (productFullDetails && productFullDetails.short_description) {
            const bulletPoints = productFullDetails.short_description.split(/[•\-\*]/).filter(line => line.trim().length > 0);
            highlights = bulletPoints.slice(0, 5).map(point => point.trim());
          }
          
          // Extract tags from product tags
          let tags = [];
          if (productCustomData.tags && Array.isArray(productCustomData.tags)) {
            tags = productCustomData.tags;
          } else if (productFullDetails && productFullDetails.tags && Array.isArray(productFullDetails.tags)) {
            tags = productFullDetails.tags.map(tag => tag.name || tag.slug).filter(Boolean);
          }
          
          // Check if this is a variable product and fetch variations if needed
          let variationData = null;
          let isVariableProduct = false;
          
          if (productFullDetails && productFullDetails.type === 'variable' && 
              productFullDetails.variations && Array.isArray(productFullDetails.variations) && 
              productFullDetails.variations.length > 0) {
            isVariableProduct = true;
            logger.info('Detected variable product, fetching variations', {
              wcCouponId,
              code: c.code,
              productId: productId,
              productName: productFullDetails.name,
              variationCount: productFullDetails.variations.length
            });
            
            variationData = await fetchAndProcessVariations(
              client, 
              productId, 
              productFullDetails.name
            );
            
            if (variationData && variationData.variations.length > 0) {
              logger.info('Successfully fetched variations', {
                wcCouponId,
                code: c.code,
                productId: productId,
                variationCount: variationData.variations.length,
                defaultVariationId: variationData.defaultVariationId
              });
            } else {
              logger.warn('No variations found or failed to fetch', {
                wcCouponId,
                code: c.code,
                productId: productId
              });
              // If we can't get variations, treat as simple product
              isVariableProduct = false;
            }
          }
          
          // Get pricing from product and calculate discounted price based on coupon
          // IMPORTANT: Products may already have a sale_price. The coupon applies on top of that.
          // Original price = regular_price (the base price before any discounts)
          // Current price = sale_price (if exists) or regular_price
          // Discounted price = Apply coupon discount to the current price (sale_price or regular_price)
          let originalPrice = undefined;
          let discountedPrice = undefined;
          
          logger.info('Calculating prices', {
            wcCouponId,
            code: c.code,
            productId: productId || 'all-products',
            hasProductDetails: !!productFullDetails,
            isVariableProduct: isVariableProduct,
            regularPrice: productFullDetails?.regular_price || 'N/A',
            salePrice: productFullDetails?.sale_price || 'N/A',
            couponAmount: c.amount,
            couponType: c.discount_type
          });
          
          if (productFullDetails) {
            // For variable products, use default variation prices
            if (isVariableProduct && variationData && variationData.defaultVariation) {
              const defaultVar = variationData.defaultVariation;
              const regular = defaultVar.regularPrice || 0;
              const sale = defaultVar.onSale && defaultVar.salePrice ? defaultVar.salePrice : 0;
              
              // Original price is always the regular_price (base price before any discounts)
              if (regular > 0) {
                originalPrice = regular;
                
                // Current price is sale_price if it exists and is less than regular, otherwise regular_price
                // This is the price the user sees before applying the coupon
                const currentPrice = (sale > 0 && sale < regular) ? sale : regular;
                
                // Calculate discounted price by applying coupon to the current price
                const discountValue = parseFloat(c.amount) || 0;
                if (c.discount_type === 'percent' && discountValue > 0) {
                  // Percentage discount: Apply to current price
                  discountedPrice = currentPrice * (1 - discountValue / 100);
                  discountedPrice = Math.round(discountedPrice * 100) / 100;
                } else if (c.discount_type === 'fixed_cart' || c.discount_type === 'fixed_product') {
                  // Fixed amount discount: Subtract from current price
                  discountedPrice = Math.max(0, currentPrice - discountValue);
                  discountedPrice = Math.round(discountedPrice * 100) / 100;
                } else {
                  discountedPrice = currentPrice;
                }
              } else if (sale > 0) {
                originalPrice = sale;
                discountedPrice = sale;
              }
            } else {
              // Simple product - use product prices directly
              // WooCommerce returns prices as strings, so we need to parse them
              const regularPriceStr = productFullDetails.regular_price || productFullDetails.price || '0';
              const regular = parseFloat(regularPriceStr) || 0;
              const salePriceStr = productFullDetails.sale_price || '0';
              const sale = parseFloat(salePriceStr) || 0;
              
              // Original price is always the regular_price (base price before any discounts)
              if (regular > 0) {
                originalPrice = regular;
                
                // Current price is sale_price if it exists and is less than regular, otherwise regular_price
                // This is the price the user sees before applying the coupon
                const currentPrice = (sale > 0 && sale < regular) ? sale : regular;
                
                // Calculate discounted price by applying coupon to the current price
                const discountValue = parseFloat(c.amount) || 0;
                if (c.discount_type === 'percent' && discountValue > 0) {
                  // Percentage discount: Apply to current price
                  // Example: Product on sale for $50 (regular $100), 20% coupon = $40
                  discountedPrice = currentPrice * (1 - discountValue / 100);
                  discountedPrice = Math.round(discountedPrice * 100) / 100; // Round to 2 decimal places
                } else if (c.discount_type === 'fixed_cart' || c.discount_type === 'fixed_product') {
                  // Fixed amount discount: Subtract from current price
                  // Example: Product on sale for $50 (regular $100), $10 coupon = $40
                  discountedPrice = Math.max(0, currentPrice - discountValue);
                  discountedPrice = Math.round(discountedPrice * 100) / 100; // Round to 2 decimal places
                } else {
                  // No discount type specified, use current price as discounted price
                  discountedPrice = currentPrice;
                }
              } else if (sale > 0) {
                // If no regular price but has sale price, use sale as original
                originalPrice = sale;
                discountedPrice = sale; // No discount if no regular price to compare
              } else {
                // Try to get price from price field
                const priceStr = productFullDetails.price || '0';
                const price = parseFloat(priceStr) || 0;
                if (price > 0) {
                  originalPrice = price;
                  discountedPrice = price;
                }
              }
            }
          }
          
          // Get currency from store or default to USD
          const currency = productCustomData.currency || (productFullDetails && productFullDetails.currency) || store.currency || 'USD';
          
          // Get location targeting from store settings
          const availableCountries = store.availableCountries || ['WORLDWIDE'];
          const isWorldwide = store.isWorldwide !== undefined ? store.isWorldwide : true;
        
        // Build coupon update object with all fields
          // For multi-product coupons, each entry will have the same code but different product URLs and data
          const couponTitle = productCustomData.title 
            || (productFullDetails ? `${c.description || c.code} - ${productFullDetails.name}` : c.description || c.code)
            || c.code;
          
        const couponData = {
          userId: store.userId,
          storeId: store._id,
          categoryId: categoryId || store.categoryId || undefined,
            code: c.code, // Same code for all entries of multi-product coupon
            title: couponTitle,
            // Use coupon description from WooCommerce, not product description
            description: productCustomData.description || c.description || undefined,
            // Instructions should be manually written in admin, not from product
            instructions: productCustomData.instructions || undefined,
            // Long description can be from product if needed, but prefer coupon description
            longDescription: productCustomData.longDescription || c.description || undefined,
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
            // Pricing fields
            originalPrice: originalPrice,
            discountedPrice: discountedPrice,
            currency: currency,
            // Variable product fields
            isVariableProduct: isVariableProduct,
            variations: isVariableProduct && variationData && variationData.variations ? variationData.variations : undefined,
            defaultVariationId: isVariableProduct && variationData && variationData.defaultVariationId ? variationData.defaultVariationId : undefined,
            applicableVariationIds: isVariableProduct && variationData && variationData.applicableVariationIds ? variationData.applicableVariationIds : undefined,
            allVariationsOnSale: isVariableProduct && variationData ? variationData.allVariationsOnSale : true,
            priceRange: isVariableProduct && variationData && variationData.priceRange ? variationData.priceRange : undefined,
            // Rich content fields
            highlights: highlights.length > 0 ? highlights : undefined,
            tags: tags.length > 0 ? tags : undefined,
            // Image fields
            imageUrl: imageUrl || store.logo || undefined,
            imageGallery: imageGallery.length > 0 ? imageGallery : undefined,
            // Product fields - link to specific product
            productUrl: actualProductUrl || (hasProductIds ? undefined : `__all_products__${c.code}`),
            productName: productFullDetails ? productFullDetails.name : undefined,
            wooProductId: productId || undefined, // Store WooCommerce product ID (not MongoDB ObjectId)
            parentProductId: productFullDetails && productFullDetails.parent_id ? productFullDetails.parent_id : undefined, // Store parent if variation
            // Location targeting
            availableCountries: availableCountries,
            isWorldwide: isWorldwide,
            // Status fields
          isActive: true,
            isPublished: false, // Default to false - admin must review and publish
          updatedAt: new Date(),
        };
        
          // For multi-product coupons, use productUrl in the query to create separate entries
          // This ensures variations of the same product (same URL) create only one entry
          // For all-products coupons, use just code+storeId (no productUrl/wooProductId)
          let query;
          if (actualProductUrl) {
            query = { code: c.code, storeId: store._id, productUrl: actualProductUrl };
          } else if (productId) {
            query = { code: c.code, storeId: store._id, wooProductId: productId };
        } else {
            // All-products coupon - use a placeholder productUrl to ensure uniqueness
            // We'll use a special marker to indicate this is an all-products coupon
            const allProductsMarker = `__all_products__${c.code}`;
            query = { code: c.code, storeId: store._id, productUrl: allProductsMarker };
          }
          
          logger.info('Attempting database save', {
            wcCouponId,
            code: c.code,
            productId: productId || 'all-products',
            query: JSON.stringify(query),
            imageGalleryCount: imageGallery.length,
            originalPrice: originalPrice || 'N/A',
            discountedPrice: discountedPrice || 'N/A',
            productUrl: actualProductUrl || 'N/A'
          });
          
          try {
        const coupon = await Coupon.findOneAndUpdate(
              query,
          couponData,
          { upsert: true, new: true }
        );
        
            logger.info('✅ Successfully created/updated coupon entry in database', {
              couponId: coupon._id,
              wcCouponId,
              code: c.code,
              productId: productId || 'all-products',
              productUrl: actualProductUrl || 'N/A',
              hasImages: imageGallery.length > 0,
              imageCount: imageGallery.length,
              hasPrices: !!(originalPrice || discountedPrice),
              originalPrice: originalPrice || 'N/A',
              discountedPrice: discountedPrice || 'N/A',
              productIndex: productIndex,
              totalProducts: productsToProcess.length
            });
            
            results.push({ 
              wcCouponId, 
              productId: productId || 'all-products',
              success: true, 
              couponId: coupon._id, 
              code: c.code,
              title: couponTitle,
              productUrl: actualProductUrl || undefined,
              hasImages: imageGallery.length > 0,
              hasPrices: !!(originalPrice || discountedPrice)
            });
          } catch (dbError) {
            logger.error('❌ DATABASE SAVE ERROR - DETAILED', {
              wcCouponId,
              code: c.code,
              productId: productId || 'all-products',
              errorMessage: dbError.message,
              errorName: dbError.name,
              errorCode: dbError.code,
              errorCodeName: dbError.codeName,
              errorKeyPattern: dbError.keyPattern ? JSON.stringify(dbError.keyPattern) : 'N/A',
              errorKeyValue: dbError.keyValue ? JSON.stringify(dbError.keyValue) : 'N/A',
              errorStack: dbError.stack,
              query: JSON.stringify(query),
              couponDataKeys: Object.keys(couponData),
              couponDataSample: JSON.stringify(couponData).substring(0, 500)
            });
            
            results.push({
              wcCouponId,
              productId: productId || 'all-products',
              success: false,
              error: `Database error: ${dbError.message}${dbError.codeName ? ` (${dbError.codeName})` : ''}${dbError.keyPattern ? ` - Duplicate key: ${JSON.stringify(dbError.keyPattern)}` : ''}`,
              code: c.code
            });
          }
        } // End of product loop
        
        // If no products were processed (shouldn't happen, but just in case)
        if (productsToProcess.length === 0) {
          logger.warn('No products processed for coupon', { wcCouponId, code: c.code });
          results.push({ 
            wcCouponId, 
            success: false, 
            error: 'No products found or processed for this coupon',
            code: c.code
          });
        }
      } catch (error) {
        logger.error('❌ ERROR SYNCING COUPON - DETAILED', { 
          wcCouponId, 
          couponIndex: i + 1,
          totalCoupons: couponIds.length,
          errorMessage: error.message,
          errorName: error.name,
          errorCode: error.code,
          errorCodeName: error.codeName,
          errorKeyPattern: error.keyPattern ? JSON.stringify(error.keyPattern) : 'N/A',
          errorKeyValue: error.keyValue ? JSON.stringify(error.keyValue) : 'N/A',
          errorStatus: error.response?.status || error.status || 'N/A',
          errorStatusText: error.response?.statusText || error.statusText || 'N/A',
          errorResponse: error.response?.data ? JSON.stringify(error.response.data).substring(0, 500) : 'N/A',
          errorStack: error.stack,
          code: c?.code || 'unknown',
          errorConfig: error.config ? {
            url: error.config.url,
            method: error.config.method,
            baseURL: error.config.baseURL
          } : 'N/A'
        });
        results.push({ 
          wcCouponId, 
          success: false, 
          error: `${error.name}: ${error.message}${error.codeName ? ` (${error.codeName})` : ''}${error.keyPattern ? ` - Duplicate: ${JSON.stringify(error.keyPattern)}` : ''}`,
          code: c?.code || 'unknown'
        });
      }
    }
    
    store.lastSyncDate = new Date();
    await store.save();
    
    // Count unique coupons (not product entries)
    // First, ensure all attempted coupons are in the results
    const couponResults = new Map();
    
    // Initialize all attempted coupons
    for (const wcCouponId of couponIds) {
      couponResults.set(wcCouponId, {
        wcCouponId: wcCouponId,
        code: 'unknown',
        success: false,
        error: 'No results recorded',
        productEntries: []
      });
    }
    
    // Process actual results
    for (const result of results) {
      const key = result.wcCouponId || result.couponId;
      if (!couponResults.has(key)) {
        couponResults.set(key, {
          wcCouponId: result.wcCouponId,
          code: result.code || 'unknown',
          success: result.success,
          error: result.error,
          productEntries: []
        });
      }
      
      const couponResult = couponResults.get(key);
      if (result.code) couponResult.code = result.code;
      
      if (result.success) {
        couponResult.success = true; // Mark as successful if at least one product entry succeeded
        couponResult.error = undefined;
        couponResult.productEntries.push({
          productId: result.productId,
          couponId: result.couponId,
          title: result.title,
          productUrl: result.productUrl
        });
      } else if (!couponResult.success) {
        // Only update error if we don't have any successful entries
        couponResult.error = result.error || couponResult.error;
      }
    }
    
    // Count successful coupons (at least one product entry created)
    const successfulCoupons = Array.from(couponResults.values()).filter(c => c.success && c.productEntries.length > 0);
    const failedCoupons = Array.from(couponResults.values()).filter(c => !c.success || c.productEntries.length === 0);
    
    const successCount = successfulCoupons.length; // Number of coupons successfully imported
    const failureCount = failedCoupons.length; // Number of coupons that failed completely
    const totalProductEntries = results.filter(r => r.success).length; // Total product entries created
    
    logger.info('📊 Selective coupon sync complete - FINAL SUMMARY', { 
      storeId, 
      totalCouponsAttempted: couponIds.length,
      totalResultsEntries: results.length,
      successCount, 
      failureCount,
      totalProductEntries,
      couponResults: Array.from(couponResults.values()).map(c => ({
        wcCouponId: c.wcCouponId,
        code: c.code,
        success: c.success,
        productEntriesCount: c.productEntries.length,
        error: c.error || 'None'
      })),
      detailedResults: results.map(r => ({
        wcCouponId: r.wcCouponId,
        code: r.code || 'unknown',
        success: r.success,
        productId: r.productId || 'N/A',
        error: r.error || 'None'
      }))
    });
    
    res.json({ 
      message: 'Selective sync complete', 
      results,
      couponResults: Array.from(couponResults.values()),
      successCount, // Number of coupons successfully imported (at least one product entry)
      failureCount, // Number of coupons that failed completely
      total: couponIds.length, // Total coupons attempted
      totalProductEntries // Total product entries created (for multi-product coupons)
    });
  } catch (error) {
    logger.error('❌ SYNC SELECTED COUPONS ERROR - DETAILED', { 
      errorMessage: error.message,
      errorName: error.name,
      errorCode: error.code,
      errorCodeName: error.codeName,
      errorKeyPattern: error.keyPattern ? JSON.stringify(error.keyPattern) : 'N/A',
      errorKeyValue: error.keyValue ? JSON.stringify(error.keyValue) : 'N/A',
      errorStatus: error.response?.status || error.status || 'N/A',
      errorStatusText: error.response?.statusText || error.statusText || 'N/A',
      errorResponse: error.response?.data ? JSON.stringify(error.response.data).substring(0, 500) : 'N/A',
      errorStack: error.stack,
      storeId: req.params.storeId,
      couponIds: req.body.couponIds || 'N/A',
      errorConfig: error.config ? {
        url: error.config.url,
        method: error.config.method,
        baseURL: error.config.baseURL
      } : 'N/A'
    });
    res.status(500).json({ 
      message: 'Failed to sync selected coupons', 
      error: error.message,
      errorName: error.name,
      errorCode: error.code,
      errorCodeName: error.codeName,
      errorKeyPattern: error.keyPattern,
      errorKeyValue: error.keyValue,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
        let p = resp.data;
        
        // Handle string response (same as coupons) - extract JSON from HTML/JS
        if (typeof p === 'string') {
          try {
            let jsonString = p;
            const jsonStart = jsonString.indexOf('{');
            if (jsonStart !== -1) {
              let braceCount = 0;
              let jsonEnd = -1;
              for (let i = jsonStart; i < jsonString.length; i++) {
                if (jsonString[i] === '{') braceCount++;
                if (jsonString[i] === '}') {
                  braceCount--;
                  if (braceCount === 0) {
                    jsonEnd = i;
                    break;
                  }
                }
              }
              if (jsonEnd === -1) {
                jsonEnd = jsonString.lastIndexOf('}');
              }
              if (jsonEnd !== -1 && jsonEnd > jsonStart) {
                jsonString = jsonString.substring(jsonStart, jsonEnd + 1);
                p = JSON.parse(jsonString);
              }
            }
          } catch (parseError) {
            logger.error('Failed to parse product response', { 
              productId: wcProductId, 
              error: parseError.message 
            });
            results.push({ 
              wcProductId, 
              success: false, 
              error: `Failed to parse product data: ${parseError.message}` 
            });
            continue;
          }
        }
        
        // Check if this is a variable product and fetch variations if needed
        let variationData = null;
        let isVariableProduct = false;
        let regular = 0;
        let sale = 0;
        let originalPrice = undefined;
        let discountedPrice = undefined;
        
        logger.info('Processing product for deal import', {
          productId: wcProductId,
          productName: p.name,
          productType: p.type,
          hasVariations: p.variations && Array.isArray(p.variations) && p.variations.length > 0
        });
        
        if (p.type === 'variable' && p.variations && Array.isArray(p.variations) && p.variations.length > 0) {
          isVariableProduct = true;
          logger.info('Detected variable product for deal import', { 
            productId: wcProductId, 
            productName: p.name,
            variationCount: p.variations.length 
          });
          
          variationData = await fetchAndProcessVariations(client, wcProductId, p.name);
          
          if (variationData && variationData.variations.length > 0) {
            // Check if any variation is on sale
            const hasOnSaleVariation = variationData.applicableVariationIds && variationData.applicableVariationIds.length > 0;
            if (!hasOnSaleVariation) {
              logger.warn('Variable product has no variations on sale', { productId: wcProductId });
              results.push({ 
                wcProductId, 
                success: false, 
                error: 'Variable product has no variations on sale' 
              });
              continue;
            }
            logger.info('Successfully fetched variations for deal', {
              productId: wcProductId,
              variationCount: variationData.variations.length,
              onSaleCount: variationData.applicableVariationIds?.length || 0,
              allVariationsOnSale: variationData.allVariationsOnSale
            });
            
            // Use default variation prices
            const defaultVar = variationData.defaultVariation;
            if (defaultVar) {
              regular = defaultVar.regularPrice || 0;
              sale = defaultVar.onSale && defaultVar.salePrice ? defaultVar.salePrice : 0;
              
              if (regular > 0 && sale > 0 && sale < regular) {
                originalPrice = regular;
                discountedPrice = sale;
              } else {
                // Use first on-sale variation
                const onSaleVar = variationData.variations.find(v => v.onSale && v.regularPrice && v.salePrice);
                if (onSaleVar) {
                  regular = onSaleVar.regularPrice;
                  sale = onSaleVar.salePrice;
                  originalPrice = regular;
                  discountedPrice = sale;
                }
              }
            }
          } else {
            logger.warn('No variations found or failed to fetch', { productId: wcProductId });
            results.push({ 
              wcProductId, 
              success: false, 
              error: 'Variable product has no available variations' 
            });
            continue;
          }
        } else {
          // Simple product - check if on sale
          const onSale = Boolean(p.on_sale) || (p.sale_price && p.sale_price !== '' && p.sale_price !== '0');
          const regularPriceStr = p.regular_price || p.price || '0';
          const salePriceStr = p.sale_price || '0';
          regular = parseFloat(regularPriceStr) || 0;
          sale = parseFloat(salePriceStr) || 0;
          
          logger.info('Simple product pricing check - DETAILED', {
            productId: wcProductId,
            productName: p.name || 'Unknown',
            on_sale: p.on_sale,
            regular_price_raw: regularPriceStr,
            sale_price_raw: salePriceStr,
            regular_price_parsed: regular,
            sale_price_parsed: sale,
            onSale: onSale,
            hasRegularPrice: regular > 0,
            hasSalePrice: sale > 0,
            saleLessThanRegular: sale < regular,
            isValid: onSale && regular > 0 && sale > 0 && sale < regular
          });
        
        if (!onSale || !(regular > 0 && sale > 0 && sale < regular)) {
            logger.warn('Product is not on sale or has invalid pricing - REJECTED', {
              productId: wcProductId,
              productName: p.name || 'Unknown',
              onSale,
              regular,
              sale,
              reason: !onSale ? 'Not marked as on sale' : 
                      regular <= 0 ? 'No regular price' :
                      sale <= 0 ? 'No sale price' :
                      sale >= regular ? 'Sale price not less than regular price' : 'Unknown'
            });
          results.push({ 
            wcProductId, 
            success: false, 
            error: 'Product is not on sale or invalid pricing' 
            });
            continue;
          }
          
          originalPrice = regular;
          discountedPrice = sale;
        }
        
        if (!regular || !sale || regular <= 0 || sale <= 0) {
          logger.error('Invalid pricing after processing', {
            productId: wcProductId,
            regular,
            sale,
            isVariableProduct
          });
          results.push({
            wcProductId,
            success: false,
            error: 'Invalid pricing data'
          });
          continue;
        }
        
        const discountPct = Math.round(((regular - sale) / regular) * 100);
        
        logger.info('Product pricing calculated', {
          productId: wcProductId,
          regular,
          sale,
          discountPct,
          originalPrice,
          discountedPrice
        });
        const startDate = p.date_on_sale_from ? new Date(p.date_on_sale_from) : new Date();
        const endDate = p.date_on_sale_to ? new Date(p.date_on_sale_to) : new Date(Date.now() + 14 * 86400000);
        
        // Get product images - create image gallery
        let imageGallery = [];
        let imageUrl = undefined;
        
        if (p.images && Array.isArray(p.images) && p.images.length > 0) {
          // If imageGallery is provided from frontend (user selected images), use it
          // Otherwise, use all product images
          if (req.body.productData && req.body.productData[wcProductId] && req.body.productData[wcProductId].imageGallery) {
            imageGallery = req.body.productData[wcProductId].imageGallery;
          } else {
            // Create gallery from all product images
            imageGallery = p.images.map((img, idx) => ({
              url: img.src,
              alt: img.alt || img.name || p.name || 'Product image',
              order: idx,
            }));
          }
          // Set imageUrl to first gallery image for backward compatibility
          imageUrl = imageGallery.length > 0 ? imageGallery[0].url : undefined;
        }
        
        // Get instructions and description from request body if provided
        // IMPORTANT: For deals, we do NOT use product description - only use custom data if admin provides it
        const productCustomData = req.body.productData && req.body.productData[wcProductId] ? req.body.productData[wcProductId] : {};
        const instructions = productCustomData.instructions || ''; // Leave empty if not provided - admin will fill manually
        const description = productCustomData.description || ''; // Do NOT use product description - leave empty for manual entry
        const longDescription = productCustomData.longDescription || ''; // Do NOT use product description - leave empty for manual entry
        
        // Extract highlights from product short description or attributes
        let highlights = [];
        if (productCustomData.highlights && Array.isArray(productCustomData.highlights)) {
          highlights = productCustomData.highlights;
        } else if (p.short_description) {
          // Try to extract bullet points from short description
          const bulletPoints = p.short_description.split(/[•\-\*]/).filter(line => line.trim().length > 0);
          highlights = bulletPoints.slice(0, 5).map(point => point.trim()); // Limit to 5 highlights
        }
        
        // Extract features from product attributes
        let features = [];
        if (productCustomData.features && Array.isArray(productCustomData.features)) {
          features = productCustomData.features;
        } else if (p.attributes && Array.isArray(p.attributes)) {
          features = p.attributes
            .filter(attr => attr.visible && attr.options && attr.options.length > 0)
            .map(attr => `${attr.name}: ${attr.options.join(', ')}`)
            .slice(0, 10); // Limit to 10 features
        }
        
        // Extract specifications from product attributes as key-value pairs
        let specifications = {};
        if (productCustomData.specifications && typeof productCustomData.specifications === 'object') {
          specifications = productCustomData.specifications;
        } else if (p.attributes && Array.isArray(p.attributes)) {
          p.attributes.forEach(attr => {
            if (attr.visible && attr.options && attr.options.length > 0) {
              specifications[attr.name] = attr.options.join(', ');
            }
          });
        }
        
        // Extract tags from product tags
        let tags = [];
        if (productCustomData.tags && Array.isArray(productCustomData.tags)) {
          tags = productCustomData.tags;
        } else if (p.tags && Array.isArray(p.tags)) {
          tags = p.tags.map(tag => tag.name || tag.slug).filter(Boolean);
        }
        
        // Get currency from store or default to USD
        const currency = productCustomData.currency || p.currency || store.currency || 'USD';
        
        // Get location targeting from store settings
        const availableCountries = store.availableCountries || ['WORLDWIDE'];
        const isWorldwide = store.isWorldwide !== undefined ? store.isWorldwide : true;
        
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

        logger.info('Attempting to save deal to database', {
          productId: wcProductId,
          productName: p.name,
          storeId: store._id.toString(),
          categoryId: finalCategoryId?.toString(),
          hasOriginalPrice: !!originalPrice,
          hasDiscountedPrice: !!discountedPrice,
          discountPct
        });
        
        try {
        const deal = await Deal.findOneAndUpdate(
          { name: p.name, store: store._id },
          {
              title: productCustomData.title || p.name, // Use custom title or product name
            name: p.name,
              description: description || undefined, // Only use custom description if provided - do NOT use product description
              instructions: instructions || undefined, // Only use custom instructions if provided - do NOT use product description
              longDescription: longDescription || undefined, // Only use custom long description if provided - do NOT use product description
            dealType: 'discount',
            discountType: 'percentage',
            discountValue: discountPct,
              // Pricing fields for savings calculation
              originalPrice: originalPrice,
              discountedPrice: discountedPrice,
            // Variable product fields
            isVariableProduct: isVariableProduct,
            variations: isVariableProduct && variationData && variationData.variations ? variationData.variations : undefined,
            defaultVariationId: isVariableProduct && variationData && variationData.defaultVariationId ? variationData.defaultVariationId : undefined,
            applicableVariationIds: isVariableProduct && variationData && variationData.applicableVariationIds ? variationData.applicableVariationIds : undefined,
            allVariationsOnSale: isVariableProduct && variationData ? variationData.allVariationsOnSale : true,
            priceRange: isVariableProduct && variationData && variationData.priceRange ? variationData.priceRange : undefined,
              currency: currency,
              // Rich content fields
              highlights: highlights.length > 0 ? highlights : undefined,
              features: features.length > 0 ? features : undefined,
              specifications: Object.keys(specifications).length > 0 ? specifications : undefined,
              tags: tags.length > 0 ? tags : undefined,
              // Image fields
            imageUrl: imageUrl || store.logo || undefined, // Product image or store logo fallback
              imageGallery: imageGallery.length > 0 ? imageGallery : undefined, // Add image gallery
              // Product fields
            productUrl: p.permalink || undefined,
            productId: p.id || Number(wcProductId),
              // Date fields
            startDate,
            endDate,
              // Location targeting
              availableCountries: availableCountries,
              isWorldwide: isWorldwide,
              // Status fields
            isActive: true,
            store: store._id,
            categoryId: finalCategoryId, // Required field
            userId: store.userId,
            updatedAt: new Date(),
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
          
          logger.info('✅ Successfully saved deal to database', {
            productId: wcProductId,
            dealId: deal._id.toString(),
            productName: p.name
          });
        
        results.push({ wcProductId, success: true, dealId: deal._id, name: p.name });
        } catch (dbError) {
          logger.error('❌ DATABASE SAVE ERROR - DETAILED', {
            productId: wcProductId,
            productName: p.name,
            errorMessage: dbError.message,
            errorName: dbError.name,
            errorCode: dbError.code,
            errorCodeName: dbError.codeName,
            errorKeyPattern: dbError.keyPattern ? JSON.stringify(dbError.keyPattern) : 'N/A',
            errorKeyValue: dbError.keyValue ? JSON.stringify(dbError.keyValue) : 'N/A',
            errorStack: dbError.stack
          });
          results.push({ 
            wcProductId, 
            success: false, 
            error: `Database error: ${dbError.message}${dbError.codeName ? ` (${dbError.codeName})` : ''}` 
          });
        }
      } catch (error) {
        logger.error('❌ ERROR SYNCING PRODUCT AS DEAL - DETAILED', {
          productId: wcProductId,
          errorMessage: error.message,
          errorName: error.name,
          errorCode: error.code,
          errorStack: error.stack,
          errorResponse: error.response?.data ? JSON.stringify(error.response.data).substring(0, 500) : 'N/A'
        });
        results.push({ wcProductId, success: false, error: error.message });
      }
    }
    
    store.lastSyncDate = new Date();
    await store.save();
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    logger.info('📊 Selective deals sync complete - FINAL SUMMARY', { 
      storeId, 
      total: productIds.length, 
      successCount, 
      failureCount,
      results: results.map(r => ({
        productId: r.wcProductId,
        success: r.success,
        error: r.error || 'None',
        dealId: r.dealId || 'N/A'
      }))
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
