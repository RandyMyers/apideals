/**
 * Test Translation API for all languages
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

const testLanguages = async () => {
  const langs = ['fr', 'pt', 'nl', 'en-GB', 'en-AU', 'de-AT'];
  
  console.log('Testing translation API for all languages...\n');
  
  for (const lang of langs) {
    try {
      const result = await Translation.getTranslationsForLanguage(lang);
      const keyCount = Object.keys(result).length;
      console.log(`✅ ${lang}: ${keyCount} categories`);
      
      // Check a few specific keys
      if (result.deals?.filter?.activeOnly) {
        console.log(`   - deals.filter.activeOnly: "${result.deals.filter.activeOnly.substring(0, 30)}..."`);
      }
      if (result.footer?.brandTagline) {
        console.log(`   - footer.brandTagline: "${result.footer.brandTagline.substring(0, 30)}..."`);
      }
    } catch (error) {
      console.error(`❌ ${lang}: ${error.message}`);
    }
  }
};

const main = async () => {
  if (await connectDB()) {
    await testLanguages();
    await mongoose.connection.close();
    console.log('\n✅ All tests complete!');
  }
  process.exit(0);
};

main();







