/**
 * Add Missing Translation Keys from Client Code
 * Filters out false positives and adds real translation keys
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Translation = require('../models/translation');
const fs = require('fs');
const path = require('path');

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

// Filter out false positives
function isValidTranslationKey(key) {
  // Skip empty or very short keys
  if (!key || key.length < 2) return false;
  
  // Skip API URLs and endpoints
  if (key.includes('${') || key.includes('api/') || key.includes('http') || key.includes('://')) {
    return false;
  }
  
  // Skip single characters and symbols
  if (/^[^a-z0-9]$/i.test(key)) return false;
  
  // Skip file paths
  if (key.includes('../') || key.includes('./') || key.includes('/')) {
    return false;
  }
  
  // Skip code references
  if (key.includes('[') || key.includes(']') || key.includes('(') || key.includes(')')) {
    return false;
  }
  
  // Skip template variables
  if (key.includes('$') || key.includes('{') || key.includes('}')) {
    return false;
  }
  
  // Skip common code patterns
  const codePatterns = ['script', 'ref', 'token', 'type', 'q', 't', 'config', 'web-vitals', 'en-us'];
  if (codePatterns.includes(key.toLowerCase())) {
    return false;
  }
  
  // Must contain at least one letter
  if (!/[a-z]/i.test(key)) return false;
  
  // Should look like a translation key (contains dots or is a word)
  return true;
}

const addMissingKeys = async () => {
  // Load missing keys
  const missingKeysFile = path.join(__dirname, '../../MISSING_TRANSLATION_KEYS.json');
  if (!fs.existsSync(missingKeysFile)) {
    console.error('❌ MISSING_TRANSLATION_KEYS.json not found');
    process.exit(1);
  }
  
  const data = JSON.parse(fs.readFileSync(missingKeysFile, 'utf8'));
  const allMissing = data.missingKeys || [];
  
  // Filter valid keys
  const validKeys = allMissing.filter(isValidTranslationKey);
  
  console.log(`📊 Total missing keys: ${allMissing.length}`);
  console.log(`✅ Valid translation keys: ${validKeys.length}`);
  console.log(`❌ Filtered out: ${allMissing.length - validKeys.length}\n`);
  
  if (validKeys.length === 0) {
    console.log('✅ No valid missing keys to add!');
    return;
  }
  
  // Group by category
  const byCategory = {};
  validKeys.forEach(key => {
    const category = key.split('.')[0] || 'common';
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(key);
  });
  
  console.log('='.repeat(80));
  console.log('VALID MISSING KEYS BY CATEGORY');
  console.log('='.repeat(80));
  Object.keys(byCategory).sort().forEach(cat => {
    console.log(`\n📂 ${cat}: ${byCategory[cat].length} keys`);
    byCategory[cat].slice(0, 10).forEach(k => console.log(`  - ${k}`));
    if (byCategory[cat].length > 10) {
      console.log(`  ... and ${byCategory[cat].length - 10} more`);
    }
  });
  
  // Create translations for missing keys
  let created = 0;
  let skipped = 0;
  
  console.log('\n' + '='.repeat(80));
  console.log('ADDING MISSING KEYS TO DATABASE');
  console.log('='.repeat(80));
  
  for (const key of validKeys) {
    try {
      // Check if already exists
      const exists = await Translation.findOne({ key: key.toLowerCase() });
      if (exists) {
        skipped++;
        continue;
      }
      
      // Determine category
      const category = key.split('.')[0] || 'common';
      const validCategories = ['navigation', 'buttons', 'forms', 'messages', 'pages', 'common', 'footer', 'header'];
      const transCategory = validCategories.includes(category) ? category : 'common';
      
      // Create translation with English fallback (will be translated later)
      const englishValue = key.split('.').pop().replace(/([A-Z])/g, ' $1').trim();
      
      await Translation.create({
        key: key.toLowerCase(),
        category: transCategory,
        en: englishValue.charAt(0).toUpperCase() + englishValue.slice(1),
        description: `Auto-generated from client code`,
        context: 'client'
      });
      
      created++;
      
      if (created % 10 === 0) {
        console.log(`📝 Progress: Created ${created} keys...`);
      }
    } catch (error) {
      console.error(`❌ Error creating ${key}:`, error.message);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Created: ${created} new translation keys`);
  console.log(`⏭️  Skipped: ${skipped} (already exist)`);
  console.log(`\n✨ Done! Missing keys have been added.`);
  console.log(`\n⚠️  Note: These keys have English placeholders. You should add proper translations.`);
};

const main = async () => {
  if (await connectDB()) {
    await addMissingKeys();
    await mongoose.connection.close();
  }
  process.exit(0);
};

main();







