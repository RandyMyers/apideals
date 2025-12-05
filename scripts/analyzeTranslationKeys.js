/**
 * Analyze translation keys to understand the camelCase conversion pattern
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Translation = require('../models/translation');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    console.log('✅ Connected to MongoDB\n');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect:', error.message);
    return false;
  }
};

const analyzeKeys = async () => {
  const translations = await Translation.find({}).select('key').lean();
  
  // Group keys by their last part
  const lastParts = new Map();
  
  translations.forEach(t => {
    const parts = t.key.split('.');
    const lastPart = parts[parts.length - 1];
    
    if (!lastParts.has(lastPart)) {
      lastParts.set(lastPart, []);
    }
    lastParts.get(lastPart).push(t.key);
  });
  
  // Find keys that are all lowercase and might need camelCase conversion
  const needsConversion = [];
  
  lastParts.forEach((keys, lastPart) => {
    if (lastPart === lastPart.toLowerCase() && lastPart.length > 3) {
      // Check if it looks like it should be camelCase (has common word patterns)
      const commonPatterns = ['only', 'info', 'tagline', 'description', 'title', 'subtitle', 
                              'placeholder', 'filter', 'sort', 'empty', 'active', 'results'];
      const hasPattern = commonPatterns.some(pattern => 
        lastPart.includes(pattern) && lastPart.length > pattern.length
      );
      
      if (hasPattern) {
        needsConversion.push({
          key: lastPart,
          fullKeys: keys,
          suggested: suggestCamelCase(lastPart)
        });
      }
    }
  });
  
  console.log('Keys that likely need camelCase conversion:\n');
  needsConversion.slice(0, 50).forEach(item => {
    console.log(`${item.key} -> ${item.suggested}`);
    console.log(`  Used in: ${item.fullKeys.join(', ')}\n`);
  });
  
  await mongoose.connection.close();
};

function suggestCamelCase(str) {
  // Common word boundaries
  const words = ['active', 'only', 'results', 'info', 'brand', 'tagline', 'description',
                 'title', 'subtitle', 'search', 'placeholder', 'filter', 'sort', 'empty',
                 'no', 'view', 'grid', 'list', 'newest', 'discount', 'expiring', 'price',
                 'low', 'high', 'card', 'default', 'verified', 'unverified', 'timeleft',
                 'days', 'hours', 'minutes', 'seconds'];
  
  for (const word of words) {
    if (str.startsWith(word) && str.length > word.length) {
      return word + str.charAt(word.length).toUpperCase() + str.slice(word.length + 1);
    }
    if (str.endsWith(word) && str.length > word.length) {
      const before = str.slice(0, str.length - word.length);
      return before + before.charAt(before.length - 1).toUpperCase() + word;
    }
  }
  
  // Default: capitalize first letter after position 4-6 (common word length)
  if (str.length > 6) {
    return str.slice(0, 6) + str.charAt(6).toUpperCase() + str.slice(7);
  }
  
  return str;
}

const main = async () => {
  if (await connectDB()) {
    await analyzeKeys();
  }
  process.exit(0);
};

main();

