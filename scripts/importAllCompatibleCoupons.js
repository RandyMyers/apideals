/**
 * Script to import all compatible coupons from a WooCommerce store
 * This helps test and debug the coupon import functionality
 */

require('dotenv').config();
const mongoose = require('mongoose');
const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
const Coupon = require('../models/coupon');
const Store = require('../models/store');
const logger = require('../utils/logger');

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URL) {
      console.error('❌ Error: MONGO_URL environment variable is not set');
      process.exit(1);
    }
    const conn = await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

// Helper function to check if coupon is compatible
const isCompatibleCoupon = (coupon) => {
  const hasProductIds = Array.isArray(coupon.product_ids) && coupon.product_ids.length > 0;
  const hasProductCategories = Array.isArray(coupon.product_categories) && coupon.product_categories.length > 0;
  
  if (hasProductIds) {
    return { compatible: true, type: 'multi_product', productCount: coupon.product_ids.length };
  } else if (!hasProductCategories) {
    return { compatible: true, type: 'all_products', productCount: 0 };
  } else {
    return { compatible: false, type: 'category_only', reason: 'Coupon restricted to product categories only.' };
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
    console.log(`  Fetching variations for product ${productId}...`);
    
    let page = 1;
    let allVariations = [];
    
    while (true) {
      const variationsResp = await client.get(`products/${productId}/variations`, {
        per_page: 100,
        page: page,
        status: 'publish'
      });
      
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
          console.warn(`  ⚠️  Failed to parse variations response: ${parseError.message}`);
          variationsData = [];
        }
      }
      
      const variations = Array.isArray(variationsData) ? variationsData : [];
      if (variations.length === 0) break;
      
      allVariations = allVariations.concat(variations);
      if (variations.length < 100) break;
      page++;
    }
    
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
    
    const onSaleVariations = processedVariations.filter(v => v.onSale);
    const applicableVariationIds = onSaleVariations.map(v => v.variationId);
    const allVariationsOnSale = onSaleVariations.length === processedVariations.length && processedVariations.length > 0;
    
    const prices = onSaleVariations.length > 0
      ? onSaleVariations.map(v => v.salePrice || v.regularPrice).filter(p => p !== null && p > 0)
      : processedVariations.map(v => v.regularPrice).filter(p => p !== null && p > 0);
    
    const priceRange = prices.length > 0 ? {
      min: Math.min(...prices),
      max: Math.max(...prices),
    } : undefined;
    
    const defaultVariation = onSaleVariations.find(v => 
      v.stockStatus === 'instock' && v.purchasable
    ) || processedVariations.find(v => 
      v.stockStatus === 'instock' && v.purchasable
    ) || processedVariations[0];
    
    return {
      variations: processedVariations,
      defaultVariationId: defaultVariation?.variationId,
      applicableVariationIds: applicableVariationIds,
      allVariationsOnSale: allVariationsOnSale,
      priceRange: priceRange,
      defaultVariation: defaultVariation,
    };
  } catch (error) {
    console.error(`  ❌ Error fetching variations: ${error.message}`);
    return null;
  }
};

// Main import function
const importAllCompatibleCoupons = async (storeId) => {
  try {
    console.log('\n=== Starting Import of All Compatible Coupons ===\n');
    
    // Find store
    const store = await Store.findById(storeId);
    if (!store) {
      console.error('Store not found with ID:', storeId);
      return;
    }
    
    console.log('Store found:', {
      _id: store._id,
      name: store.name,
      url: store.url,
      hasApiKey: !!store.apiKey,
      hasSecretKey: !!store.secretKey
    });
    
    if (!store.apiKey || !store.secretKey) {
      console.error('Store is missing API credentials');
      return;
    }
    
    // Build WooCommerce client
    const WooCommerce = new WooCommerceRestApi({
      url: store.url,
      consumerKey: store.apiKey,
      consumerSecret: store.secretKey,
      version: 'wc/v3'
    });
    
    // Fetch all coupons
    console.log('\nFetching all coupons from WooCommerce...');
    let page = 1;
    let allCoupons = [];
    
    while (true) {
      try {
        console.log(`  Attempting to fetch page ${page}...`);
        const resp = await WooCommerce.get('coupons', { per_page: 100, page });
        
        // Handle different response formats (same logic as testWooCommerce.js and controller)
        let rawData = resp.data;
        
        // If data is a string, try to parse it as JSON
        if (typeof rawData === 'string') {
          console.log(`  ⚠️  Response.data is a string, attempting to parse as JSON...`);
          console.log(`  String length: ${rawData.length}`);
          
          // Try to extract JSON part if HTML is mixed in
          let jsonString = rawData;
          const jsonStart = jsonString.indexOf('[');
          
          if (jsonStart !== -1) {
            // Find the actual end of the JSON array
            let jsonEnd = -1;
            for (let i = jsonString.length - 1; i >= jsonStart; i--) {
              if (jsonString[i] === ']') {
                const after = jsonString.substring(i + 1).trim();
                if (after === '' || after.startsWith('<') || after.startsWith('\n<script') || after.startsWith('<script')) {
                  jsonEnd = i;
                  break;
                }
              }
            }
            
            if (jsonEnd === -1) {
              jsonEnd = jsonString.lastIndexOf(']');
            }
            
            if (jsonEnd !== -1 && jsonEnd > jsonStart) {
              jsonString = jsonString.substring(jsonStart, jsonEnd + 1);
              console.log(`  Extracted JSON substring (length: ${jsonString.length})`);
            }
          }
          
          try {
            rawData = JSON.parse(jsonString);
            console.log(`  ✅ Successfully parsed JSON string`);
          } catch (parseError) {
            console.error(`  ❌ Failed to parse JSON: ${parseError.message}`);
            console.error(`  String preview (first 500 chars): ${rawData.substring(0, 500)}`);
            break;
          }
        }
        
        // Extract coupons array from various response formats
        let coupons = [];
        if (Array.isArray(rawData)) {
          coupons = rawData;
        } else if (resp && Array.isArray(resp)) {
          coupons = resp;
        } else if (rawData && Array.isArray(rawData.data)) {
          coupons = rawData.data;
        } else if (rawData && typeof rawData === 'object') {
          coupons = rawData.coupons || rawData.items || rawData.results || [];
        }
        
        if (coupons.length === 0) {
          console.log(`  No more coupons found on page ${page}`);
          break;
        }
        
        allCoupons = allCoupons.concat(coupons);
        console.log(`  ✓ Fetched page ${page}: ${coupons.length} coupons (Total: ${allCoupons.length})`);
        page++;
        
        // Safety limit
        if (page > 100) {
          console.log('  ⚠️  Reached page limit (100), stopping');
          break;
        }
      } catch (error) {
        console.error('  ✗ Error fetching coupons:', error.message);
        if (error.response) {
          console.error('  Response status:', error.response.status);
          if (error.response.data) {
            const errorData = typeof error.response.data === 'string' 
              ? error.response.data.substring(0, 500) 
              : JSON.stringify(error.response.data, null, 2).substring(0, 500);
            console.error('  Response data:', errorData);
          }
        }
        if (error.code) {
          console.error('  Error code:', error.code);
        }
        break;
      }
    }
    
    console.log(`\nTotal coupons fetched: ${allCoupons.length}`);
    
    // Filter compatible coupons
    const compatibleCoupons = [];
    const incompatibleCoupons = [];
    
    for (const coupon of allCoupons) {
      const compatibility = isCompatibleCoupon(coupon);
      if (compatibility.compatible) {
        compatibleCoupons.push({ coupon, compatibility });
      } else {
        incompatibleCoupons.push({ coupon, compatibility });
      }
    }
    
    console.log(`\nCompatible coupons: ${compatibleCoupons.length}`);
    console.log(`Incompatible coupons: ${incompatibleCoupons.length}`);
    
    if (incompatibleCoupons.length > 0) {
      console.log('\nIncompatible coupons (skipped):');
      incompatibleCoupons.forEach(({ coupon, compatibility }) => {
        console.log(`  - ${coupon.code}: ${compatibility.reason}`);
      });
    }
    
    // Import compatible coupons
    console.log('\n=== Starting Import Process ===\n');
    const results = [];
    
    for (let i = 0; i < compatibleCoupons.length; i++) {
      const { coupon: c, compatibility } = compatibleCoupons[i];
      console.log(`\n[${i + 1}/${compatibleCoupons.length}] Processing coupon: ${c.code}`);
      
      try {
        // Determine which products to process
        let productsToProcess = [];
        
        if (compatibility.type === 'multi_product') {
          console.log(`  - Multi-product coupon with ${c.product_ids.length} products`);
          
          // Fetch all products and group by URL
          const productMap = new Map();
          
          for (const productId of c.product_ids) {
            try {
              console.log(`    Fetching product ${productId}...`);
              const productResp = await WooCommerce.get(`products/${productId}`);
              
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
                  console.error(`    - Failed to parse product ${productId} response:`, parseError.message);
                  console.error(`    - Response preview (first 500 chars):`, productResp.data.substring(0, 500));
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
                  console.log(`    ✓ Fetched: ${product.name} (Price: ${product.regular_price || 'N/A'})`);
                } else if (product.parent_id === 0 && existing.productData?.parent_id !== 0) {
                  // This is a parent product, replace the variation with the parent
                  productMap.set(mapKey, {
                    productId: productId,
                    productData: product,
                    isPrimary: existing.isPrimary, // Keep the primary flag from the first one
                    mapKey: mapKey,
                  });
                  console.log(`    ✓ Replaced with parent: ${product.name} (Price: ${product.regular_price || 'N/A'})`);
                } else if (productUrl && existing.productData && (!existing.productData.permalink && !existing.productData.link)) {
                  // Existing has no URL but this one does - replace it
                  productMap.set(mapKey, {
                    productId: productId,
                    productData: product,
                    isPrimary: existing.isPrimary,
                    mapKey: mapKey,
                  });
                  console.log(`    ✓ Replaced (this product has URL): ${product.name}`);
                } else {
                  // Same key, different product - skip to avoid duplicates
                  console.log(`    ⚠️  Product ${productId} has same key as ${existing.productId}, skipping (variation of same product or duplicate)`);
                }
              } else {
                console.log(`    ⚠️  Product ${productId} missing name, skipping`);
              }
            } catch (error) {
              if (error.response && error.response.status === 404) {
                console.log(`    ⚠️  Product ${productId} not found (404), skipping`);
              } else {
                console.error(`    ✗ Error fetching product ${productId}:`, error.message);
              }
              // Don't add to map if fetch failed
            }
          }
          
          productsToProcess = Array.from(productMap.values());
          console.log(`  - Grouped into ${productsToProcess.length} unique products (by URL)`);
        } else {
          // All-products coupon: Get featured product
          try {
            console.log(`  - Fetching featured/on-sale product for all-products coupon...`);
            const featuredResp = await WooCommerce.get('products', { 
              per_page: 1, 
              featured: true,
              on_sale: true,
              status: 'publish'
            });
            
            // Handle string response - extract JSON array from HTML/JS
            let featuredData = featuredResp.data;
            if (typeof featuredData === 'string') {
              try {
                let jsonString = featuredData;
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
                    featuredData = JSON.parse(jsonString);
                  } else {
                    throw new Error('Could not find valid JSON array');
                  }
                } else {
                  throw new Error('No JSON array found in response');
                }
              } catch (parseError) {
                console.error(`  - Failed to parse featured products response:`, parseError.message);
                featuredData = [];
              }
            }
            
            const featuredProducts = Array.isArray(featuredData) ? featuredData : [];
            
            if (featuredProducts.length > 0 && featuredProducts[0].name) {
              productsToProcess = [{ productId: featuredProducts[0].id, isPrimary: true, isFeatured: true, productData: featuredProducts[0] }];
              console.log(`  ✓ Using featured product: ${featuredProducts[0].name} (Price: ${featuredProducts[0].regular_price || 'N/A'})`);
            } else {
              console.log(`  - No featured products found, trying on-sale products...`);
              const saleResp = await WooCommerce.get('products', { 
                per_page: 1, 
                on_sale: true,
                status: 'publish'
              });
              
              // Handle string response - extract JSON array from HTML/JS
              let saleData = saleResp.data;
              if (typeof saleData === 'string') {
                try {
                  let jsonString = saleData;
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
                      saleData = JSON.parse(jsonString);
                    } else {
                      throw new Error('Could not find valid JSON array');
                    }
                  } else {
                    throw new Error('No JSON array found in response');
                  }
                } catch (parseError) {
                  console.error(`  - Failed to parse on-sale products response:`, parseError.message);
                  saleData = [];
                }
              }
              
              const saleProducts = Array.isArray(saleData) ? saleData : [];
              if (saleProducts.length > 0 && saleProducts[0].name) {
                productsToProcess = [{ productId: saleProducts[0].id, isPrimary: true, isFeatured: false, productData: saleProducts[0] }];
                console.log(`  ✓ Using on-sale product: ${saleProducts[0].name} (Price: ${saleProducts[0].regular_price || 'N/A'})`);
              } else {
                productsToProcess = [{ productId: null, isPrimary: true, isFeatured: false, productData: null }];
                console.log(`  ⚠️  No featured/on-sale product found, creating without product data`);
              }
            }
          } catch (error) {
            console.error(`  ✗ Error fetching featured product:`, error.message);
            productsToProcess = [{ productId: null, isPrimary: true, isFeatured: false, productData: null }];
          }
        }
        
        // Process each product
        for (const productInfo of productsToProcess) {
          const productId = productInfo.productId;
          let productFullDetails = productInfo.productData;
          
          // Get actual product URL (handle variations)
          let actualProductUrl = productFullDetails ? (productFullDetails.permalink || productFullDetails.link) : null;
          if (productFullDetails && productFullDetails.parent_id && productFullDetails.parent_id > 0) {
            try {
              console.log(`  - Fetching parent product ${productFullDetails.parent_id} for variation...`);
              const parentResp = await WooCommerce.get(`products/${productFullDetails.parent_id}`);
              
              // Handle string response - extract JSON object from HTML/JS
              let parentData = parentResp.data;
              if (typeof parentData === 'string') {
                try {
                  let jsonString = parentData;
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
                      parentData = JSON.parse(jsonString);
                    } else {
                      throw new Error('Could not find valid JSON object');
                    }
                  } else {
                    throw new Error('No JSON object found in response');
                  }
                } catch (parseError) {
                  console.error(`  - Failed to parse parent product response:`, parseError.message);
                }
              }
              
              const parentProduct = parentData;
              if (parentProduct && parentProduct.permalink) {
                actualProductUrl = parentProduct.permalink || parentProduct.link || actualProductUrl;
                // Use parent's images if variation doesn't have any
                if ((!productFullDetails.images || productFullDetails.images.length === 0) && 
                    parentProduct.images && parentProduct.images.length > 0) {
                  productFullDetails.images = parentProduct.images;
                  console.log(`  ✓ Using parent product images (${parentProduct.images.length} images)`);
                }
              }
            } catch (error) {
              console.error(`  - Error fetching parent product:`, error.message);
            }
          }
          
          // Build image gallery from product images
          let imageGallery = [];
          let imageUrl = undefined;
          if (productFullDetails && productFullDetails.images && Array.isArray(productFullDetails.images) && productFullDetails.images.length > 0) {
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
            
            imageUrl = imageGallery.length > 0 ? imageGallery[0].url : undefined;
            console.log(`  - Images: Found ${imageGallery.length} product image(s)`);
          } else {
            console.log(`  - Images: No product images found`);
          }
          
          // Extract highlights from product description
          let highlights = [];
          if (productFullDetails && productFullDetails.short_description) {
            // Try to extract bullet points
            const bulletPoints = productFullDetails.short_description
              .split(/[•\-\*]/)
              .map(point => point.trim())
              .filter(point => point.length > 0);
            highlights = bulletPoints.slice(0, 5); // Limit to 5 highlights
          }
          
          // Extract tags from product
          let tags = [];
          if (productFullDetails && productFullDetails.tags && Array.isArray(productFullDetails.tags)) {
            tags = productFullDetails.tags
              .map(tag => tag.name || tag.slug)
              .filter(Boolean)
              .slice(0, 10); // Limit to 10 tags
          }
          
          // Get product categories for tags
          if (productFullDetails && productFullDetails.categories && Array.isArray(productFullDetails.categories)) {
            const categoryNames = productFullDetails.categories
              .map(cat => cat.name)
              .filter(Boolean);
            tags = [...tags, ...categoryNames].slice(0, 10);
          }
          
          // Check if this is a variable product and fetch variations if needed
          let variationData = null;
          let isVariableProduct = false;
          
          if (productFullDetails && productFullDetails.type === 'variable' && 
              productFullDetails.variations && Array.isArray(productFullDetails.variations) && 
              productFullDetails.variations.length > 0) {
            isVariableProduct = true;
            console.log(`  - Variable product detected: ${productFullDetails.variations.length} variations`);
            variationData = await fetchAndProcessVariations(WooCommerce, productId, productFullDetails.name);
            
            if (variationData && variationData.variations.length > 0) {
              const hasOnSaleVariation = variationData.applicableVariationIds && variationData.applicableVariationIds.length > 0;
              if (!hasOnSaleVariation) {
                console.log(`  ⚠️  Variable product has no variations on sale, but continuing (coupon may still apply)`);
              } else if (!variationData.allVariationsOnSale) {
                console.log(`  ⚠️  Partial sale: Only ${variationData.applicableVariationIds.length} of ${variationData.variations.length} variations on sale`);
              }
            }
          }
          
          // Get pricing from product and calculate discounted price based on coupon
          // IMPORTANT: Products may already have a sale_price. The coupon applies on top of that.
          // Original price = regular_price (the base price before any discounts)
          // Current price = sale_price (if exists) or regular_price
          // Discounted price = Apply coupon discount to the current price (sale_price or regular_price)
          let originalPrice = undefined;
          let discountedPrice = undefined;
          if (productFullDetails) {
            if (isVariableProduct && variationData && variationData.defaultVariation) {
              // For variable products, use the default variation's pricing
              const defaultVar = variationData.defaultVariation;
              const regular = defaultVar.regularPrice || 0;
              const sale = defaultVar.onSale && defaultVar.salePrice ? defaultVar.salePrice : 0;
              
              if (regular > 0) {
                originalPrice = regular;
                const currentPrice = (sale > 0 && sale < regular) ? sale : regular;
                
                // Calculate discounted price by applying coupon to the current price
                const discountValue = parseFloat(c.amount) || 0;
                if (c.discount_type === 'percent' && discountValue > 0) {
                  discountedPrice = currentPrice * (1 - discountValue / 100);
                  discountedPrice = Math.round(discountedPrice * 100) / 100;
                } else if (c.discount_type === 'fixed_cart' || c.discount_type === 'fixed_product') {
                  discountedPrice = Math.max(0, currentPrice - discountValue);
                  discountedPrice = Math.round(discountedPrice * 100) / 100;
                } else {
                  discountedPrice = currentPrice;
                }
              }
            } else {
              // For simple products, use the existing logic
              const regularPriceStr = productFullDetails.regular_price || productFullDetails.price || '0';
              const regular = parseFloat(regularPriceStr) || 0;
              const salePriceStr = productFullDetails.sale_price || '0';
              const sale = parseFloat(salePriceStr) || 0;
              
              if (regular > 0) {
                originalPrice = regular;
                const currentPrice = (sale > 0 && sale < regular) ? sale : regular;
                
                const discountValue = parseFloat(c.amount) || 0;
                if (c.discount_type === 'percent' && discountValue > 0) {
                  discountedPrice = currentPrice * (1 - discountValue / 100);
                  discountedPrice = Math.round(discountedPrice * 100) / 100;
                } else if (c.discount_type === 'fixed_cart' || c.discount_type === 'fixed_product') {
                  discountedPrice = Math.max(0, currentPrice - discountValue);
                  discountedPrice = Math.round(discountedPrice * 100) / 100;
                } else {
                  discountedPrice = currentPrice;
                }
              } else if (sale > 0) {
                originalPrice = sale;
                discountedPrice = sale;
              } else {
                const priceStr = productFullDetails.price || '0';
                const price = parseFloat(priceStr) || 0;
                if (price > 0) {
                  originalPrice = price;
                  discountedPrice = price;
                }
              }
            }
          }
          
          if (originalPrice) {
            console.log(`  - Pricing: Original=$${originalPrice}, Discounted=$${discountedPrice || 'N/A'}, Discount=${c.amount}${c.discount_type === 'percent' ? '%' : ''}`);
          } else {
            console.log(`  - Pricing: No product price available`);
          }
          
          // Build coupon data
          const couponTitle = productFullDetails 
            ? `${c.description || c.code} - ${productFullDetails.name}` 
            : c.description || c.code;
          
          const couponData = {
            userId: store.userId,
            storeId: store._id,
            categoryId: store.categoryId || undefined,
            code: c.code,
            title: couponTitle,
            // Use coupon description from WooCommerce, not product description
            description: c.description || undefined,
            // Instructions should be manually written in admin, not from product
            instructions: undefined,
            // Long description can be from product if needed, but prefer coupon description
            longDescription: c.description || undefined,
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
            wooCommerceId: c.id,
            originalPrice: originalPrice,
            discountedPrice: discountedPrice,
            currency: store.currency || 'USD',
            // Variable product fields
            isVariableProduct: isVariableProduct,
            variations: isVariableProduct && variationData && variationData.variations ? variationData.variations : undefined,
            defaultVariationId: isVariableProduct && variationData && variationData.defaultVariationId ? variationData.defaultVariationId : undefined,
            applicableVariationIds: isVariableProduct && variationData && variationData.applicableVariationIds ? variationData.applicableVariationIds : undefined,
            allVariationsOnSale: isVariableProduct && variationData ? variationData.allVariationsOnSale : true,
            priceRange: isVariableProduct && variationData && variationData.priceRange ? variationData.priceRange : undefined,
            highlights: highlights.length > 0 ? highlights : undefined,
            tags: tags.length > 0 ? tags : undefined,
            imageUrl: imageUrl || store.logo || undefined,
            imageGallery: imageGallery.length > 0 ? imageGallery : undefined,
            productUrl: actualProductUrl || undefined,
            productName: productFullDetails ? productFullDetails.name : undefined,
            wooProductId: productId || undefined, // Store WooCommerce product ID (not MongoDB ObjectId)
            parentProductId: productFullDetails && productFullDetails.parent ? productFullDetails.parent : undefined,
            availableCountries: store.availableCountries || ['WORLDWIDE'],
            isWorldwide: store.isWorldwide !== undefined ? store.isWorldwide : true,
            isActive: true,
            updatedAt: new Date(),
          };
          
          // Create or update coupon
          // IMPORTANT: The unique index is on { code: 1, storeId: 1 }
          // For multi-product coupons, we MUST include productUrl or wooProductId in the query
          // to make each entry unique. If products share the same URL (variations), they will
          // create only one entry (which is correct).
          let query;
          if (actualProductUrl) {
            // Use productUrl for uniqueness - this ensures variations with same URL create only one entry
            query = { code: c.code, storeId: store._id, productUrl: actualProductUrl };
          } else if (productId) {
            // If no URL but we have productId, use that for uniqueness
            // This handles cases where product has no permalink
            query = { code: c.code, storeId: store._id, wooProductId: productId };
          } else if (compatibility.type === 'all_products') {
            // All-products coupon - use a placeholder productUrl to ensure uniqueness
            // We'll use a special marker to indicate this is an all-products coupon
            const allProductsMarker = `__all_products__${c.code}`;
            query = { code: c.code, storeId: store._id, productUrl: allProductsMarker };
          } else {
            // Multi-product but no URL/productId - this means product fetch failed or product has no permalink
            // For multi-product coupons, we MUST have a unique identifier (productUrl or wooProductId)
            // to avoid violating the unique index on (code, storeId)
            // Skip this entry to avoid duplicates
            console.log(`  ⚠️  Skipping entry - no product URL or ID available (product fetch may have failed)`);
            continue;
          }
          
          // Debug log to help diagnose duplicate issues
          if (compatibility.type === 'multi_product') {
            console.log(`  - Query for product ${productId || 'N/A'}:`, JSON.stringify(query));
          }
          
          const coupon = await Coupon.findOneAndUpdate(
            query,
            couponData,
            { upsert: true, new: true }
          );
          
          console.log(`  ✓ Created/Updated coupon entry: ${couponTitle} (ID: ${coupon._id})`);
          results.push({ 
            wcCouponId: c.id, 
            productId: productId || 'all-products',
            success: true, 
            couponId: coupon._id, 
            code: c.code,
            title: couponTitle
          });
        }
      } catch (error) {
        console.error(`  ✗ Error processing coupon ${c.code}:`, error.message);
        console.error('  Stack:', error.stack);
        results.push({ 
          wcCouponId: c.id, 
          code: c.code,
          success: false, 
          error: error.message 
        });
      }
    }
    
    // Summary
    console.log('\n=== Import Summary ===');
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    console.log(`Total processed: ${results.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${failureCount}`);
    
    if (failureCount > 0) {
      console.log('\nFailed imports:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.code}: ${r.error}`);
      });
    }
    
    // Update store last sync date
    store.lastSyncDate = new Date();
    await store.save();
    console.log('\nStore lastSyncDate updated');
    
  } catch (error) {
    console.error('Fatal error:', error);
    console.error('Stack:', error.stack);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  
  // Get store ID from command line argument or find first WooCommerce store
  let storeId = process.argv[2];
  
  if (!storeId) {
    console.log('No store ID provided, searching for WooCommerce stores...');
    const stores = await Store.find({ 
      storeType: 'woocommerce',
      apiKey: { $exists: true, $ne: null, $ne: '' },
      secretKey: { $exists: true, $ne: null, $ne: '' }
    }).lean();
    
    if (stores.length === 0) {
      console.error('❌ No WooCommerce stores with API credentials found');
      console.log('\nPlease provide a store ID as argument:');
      console.log('Usage: node importAllCompatibleCoupons.js <storeId>');
      process.exit(1);
    }
    
    storeId = stores[0]._id.toString();
    console.log(`✅ Found store: ${stores[0].name} (ID: ${storeId})`);
    console.log(`   URL: ${stores[0].url}\n`);
  }
  
  await importAllCompatibleCoupons(storeId);
  
  mongoose.connection.close();
  console.log('\n=== Script Complete ===');
  process.exit(0);
};

main();

