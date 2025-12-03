/**
 * Script to import all compatible deals (on-sale products) from a WooCommerce store
 * This helps test and debug the deal import functionality
 */

require('dotenv').config();
const mongoose = require('mongoose');
const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
const Deal = require('../models/deal');
const Store = require('../models/store');
const logger = require('../utils/logger');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ Error: MongoDB URI environment variable is not set');
      process.exit(1);
    }
    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error);
    process.exit(1);
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
const importAllCompatibleDeals = async (storeId) => {
  try {
    console.log('\n=== Starting Import of All Compatible Deals ===\n');
    
    // Find store
    const store = await Store.findById(storeId);
    if (!store) {
      console.error('❌ Store not found');
      process.exit(1);
    }
    
    console.log(`📦 Store: ${store.name}`);
    console.log(`🌐 URL: ${store.url}\n`);
    
    if (!store.apiKey || !store.secretKey) {
      console.error('❌ Store missing API credentials');
      process.exit(1);
    }
    
    // Build WooCommerce client
    const WooCommerce = new WooCommerceRestApi({
      url: store.url,
      consumerKey: store.apiKey,
      consumerSecret: store.secretKey,
      version: 'wc/v3',
      axiosConfig: {
        headers: {
          'User-Agent': 'DealCouponz/1.0'
        }
      }
    });
    
    let page = 1;
    let totalImported = 0;
    let totalSkipped = 0;
    let variableProductsWithPartialSale = 0;
    
    console.log('🔄 Fetching products...\n');
    
    while (true) {
      const resp = await WooCommerce.get('products', {
        per_page: 100,
        page: page,
        on_sale: true,
        status: 'publish'
      });
      
      let products = resp.data;
      if (typeof products === 'string') {
        try {
          console.log(`  ⚠️  Response.data is a string, attempting to parse as JSON...`);
          console.log(`  String length: ${products.length}`);
          let jsonString = products;
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
              console.log(`  Extracted JSON substring (length: ${jsonString.length})`);
              products = JSON.parse(jsonString);
              console.log(`  ✅ Successfully parsed JSON string`);
            } else {
              throw new Error('Could not find valid JSON array');
            }
          } else {
            throw new Error('No JSON array found in response');
          }
        } catch (parseError) {
          console.error(`  ❌ Failed to parse products response: ${parseError.message}`);
          console.error(`  Response preview (first 500 chars): ${products.substring(0, 500)}`);
          break;
        }
      }
      
      if (!Array.isArray(products) || products.length === 0) break;
      
      console.log(`📄 Page ${page}: Found ${products.length} products\n`);
      
      for (const p of products) {
        try {
          let variationData = null;
          let isVariableProduct = false;
          let regular = 0;
          let sale = 0;
          let originalPrice = undefined;
          let discountedPrice = undefined;
          
          if (p.type === 'variable' && p.variations && Array.isArray(p.variations) && p.variations.length > 0) {
            isVariableProduct = true;
            console.log(`  🔄 Variable product: ${p.name} (${p.variations.length} variations)`);
            
            variationData = await fetchAndProcessVariations(WooCommerce, p.id, p.name);
            
            if (variationData && variationData.variations.length > 0) {
              const hasOnSaleVariation = variationData.applicableVariationIds && variationData.applicableVariationIds.length > 0;
              if (!hasOnSaleVariation) {
                console.log(`  ⏭️  Skipped: No variations on sale`);
                totalSkipped++;
                continue;
              }
              
              if (!variationData.allVariationsOnSale) {
                variableProductsWithPartialSale++;
                console.log(`  ⚠️  Partial sale: Only ${variationData.applicableVariationIds.length} of ${variationData.variations.length} variations on sale`);
              }
              
              const defaultVar = variationData.defaultVariation;
              if (defaultVar) {
                regular = defaultVar.regularPrice || 0;
                sale = defaultVar.onSale && defaultVar.salePrice ? defaultVar.salePrice : 0;
                
                if (regular > 0 && sale > 0 && sale < regular) {
                  originalPrice = regular;
                  discountedPrice = sale;
                } else {
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
              console.log(`  ⏭️  Skipped: No variations found`);
              totalSkipped++;
              continue;
            }
          } else {
            const onSale = Boolean(p.on_sale) || (p.sale_price && p.sale_price !== '');
            regular = parseFloat(p.regular_price || 0);
            sale = parseFloat(p.sale_price || 0);
            
            if (!onSale || !(regular > 0 && sale > 0 && sale < regular)) {
              console.log(`  ⏭️  Skipped: Not on sale or invalid pricing`);
              totalSkipped++;
              continue;
            }
            
            originalPrice = regular;
            discountedPrice = sale;
          }
          
          if (!regular || !sale || regular <= 0 || sale <= 0) {
            console.log(`  ⏭️  Skipped: Invalid pricing`);
            totalSkipped++;
            continue;
          }
          
          const discountPct = Math.round(((regular - sale) / regular) * 100);
          const startDate = p.date_on_sale_from ? new Date(p.date_on_sale_from) : new Date();
          const endDate = p.date_on_sale_to ? new Date(p.date_on_sale_to) : new Date(Date.now() + 14 * 86400000);
          
          let imageGallery = [];
          let imageUrl = undefined;
          if (p.images && Array.isArray(p.images) && p.images.length > 0) {
            imageGallery = p.images.map((img, idx) => ({
              url: img.src,
              alt: img.alt || img.name || p.name || 'Product image',
              order: idx,
            }));
            imageUrl = imageGallery[0].url;
          }
          
          const currency = p.currency || store.currency || 'USD';
          const finalCategoryId = store.categoryId;
          
          if (!finalCategoryId) {
            console.log(`  ⏭️  Skipped: Store has no categoryId`);
            totalSkipped++;
            continue;
          }
          
          const deal = await Deal.findOneAndUpdate(
            { name: p.name, store: store._id },
            {
              title: p.name,
              name: p.name,
              description: undefined,
              instructions: undefined,
              longDescription: undefined,
              dealType: 'discount',
              discountType: 'percentage',
              discountValue: discountPct,
              originalPrice: originalPrice,
              discountedPrice: discountedPrice,
              isVariableProduct: isVariableProduct,
              variations: isVariableProduct && variationData && variationData.variations ? variationData.variations : undefined,
              defaultVariationId: isVariableProduct && variationData && variationData.defaultVariationId ? variationData.defaultVariationId : undefined,
              applicableVariationIds: isVariableProduct && variationData && variationData.applicableVariationIds ? variationData.applicableVariationIds : undefined,
              allVariationsOnSale: isVariableProduct && variationData ? variationData.allVariationsOnSale : true,
              priceRange: isVariableProduct && variationData && variationData.priceRange ? variationData.priceRange : undefined,
              currency: currency,
              imageUrl: imageUrl || store.logo || undefined,
              imageGallery: imageGallery.length > 0 ? imageGallery : undefined,
              productUrl: p.permalink || undefined,
              productId: p.id || undefined,
              startDate,
              endDate,
              isActive: true,
              store: store._id,
              categoryId: finalCategoryId,
              userId: store.userId,
              updatedAt: new Date(),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          
          console.log(`  ✅ Imported: ${p.name} (${discountPct}% off)`);
          if (isVariableProduct && !variationData.allVariationsOnSale) {
            console.log(`     ⚠️  Partial variations on sale: ${variationData.applicableVariationIds.length} of ${variationData.variations.length}`);
          }
          totalImported++;
        } catch (error) {
          console.error(`  ❌ Error importing ${p.name}:`, error.message);
          totalSkipped++;
        }
      }
      
      page++;
    }
    
    console.log('\n=== Import Complete ===');
    console.log(`✅ Total imported: ${totalImported}`);
    console.log(`⏭️  Total skipped: ${totalSkipped}`);
    console.log(`⚠️  Variable products with partial sale: ${variableProductsWithPartialSale}`);
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Import error:', error);
    throw error;
  }
};

// Run script
const main = async () => {
  try {
    await connectDB();
    
    // Get store ID from command line argument
    const storeId = process.argv[2];
    if (!storeId) {
      console.error('❌ Please provide a store ID as argument');
      console.log('Usage: node importAllCompatibleDeals.js <storeId>');
      process.exit(1);
    }
    
    await importAllCompatibleDeals(storeId);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
};

main();

