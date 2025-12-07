const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const Translation = require('../models/translation');

async function verify() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('\n✅ TRANSLATION VERIFICATION');
    console.log('===========================\n');
    
    const total = await Translation.countDocuments();
    console.log(`📊 Total translations: ${total}`);
    
    // Check sample with all languages
    const sample = await Translation.findOne({ key: 'nav.home' });
    if (sample) {
      console.log('\n🌍 Languages in database:');
      const langs = ['en', 'ga', 'de', 'es', 'it', 'no', 'fi', 'da', 'sv', 'fr', 'pt', 'nl', 'en-GB', 'en-AU', 'de-AT'];
      langs.forEach(lang => {
        if (sample[lang]) {
          console.log(`  ✅ ${lang}: "${sample[lang].substring(0, 30)}${sample[lang].length > 30 ? '...' : ''}"`);
        } else {
          console.log(`  ❌ ${lang}: MISSING`);
        }
      });
    }
    
    // Check specific fixed translations
    console.log('\n🔍 Checking fixed translations:');
    const testKeys = [
      'woocommerce.wizard.selectStore',
      'toast.success.linkCopied',
      'home.stores.title',
      'activity.all'
    ];
    
    for (const key of testKeys) {
      const trans = await Translation.findOne({ key });
      if (trans) {
        console.log(`\n  Key: ${key}`);
        console.log(`    fr: ${trans.fr || 'MISSING'}`);
        console.log(`    pt: ${trans.pt || 'MISSING'}`);
        console.log(`    nl: ${trans.nl || 'MISSING'}`);
      }
    }
    
    console.log('\n✅ Verification complete!\n');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verify();




