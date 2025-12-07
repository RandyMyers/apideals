const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const Translation = require('../models/translation');

async function testAPI() {
  try {
    console.log('\n🔍 COMPREHENSIVE TRANSLATION TEST\n');
    console.log('='.repeat(60));
    
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB\n');
    
    // 1. Check raw database data
    console.log('1️⃣  CHECKING RAW DATABASE DATA');
    console.log('-'.repeat(60));
    
    const navHome = await Translation.findOne({ key: 'nav.home' });
    if (navHome) {
      console.log('✅ nav.home found in database:');
      console.log('   en:', navHome.en);
      console.log('   fr:', navHome.fr || 'MISSING');
      console.log('   pt:', navHome.pt || 'MISSING');
      console.log('   nl:', navHome.nl || 'MISSING');
    } else {
      console.log('❌ nav.home NOT FOUND in database!');
    }
    
    // Count translations
    const total = await Translation.countDocuments();
    const withFr = await Translation.countDocuments({ fr: { $exists: true, $ne: '', $ne: null } });
    const withPt = await Translation.countDocuments({ pt: { $exists: true, $ne: '', $ne: null } });
    const withNl = await Translation.countDocuments({ nl: { $exists: true, $ne: '', $ne: null } });
    
    console.log(`\n📊 Database Coverage:`);
    console.log(`   Total: ${total}`);
    console.log(`   With fr: ${withFr}/${total} (${Math.round(withFr/total*100)}%)`);
    console.log(`   With pt: ${withPt}/${total} (${Math.round(withPt/total*100)}%)`);
    console.log(`   With nl: ${withNl}/${total} (${Math.round(withNl/total*100)}%)`);
    
    // 2. Test the model method (what the API uses)
    console.log('\n\n2️⃣  TESTING MODEL METHOD (getTranslationsForLanguage)');
    console.log('-'.repeat(60));
    
    for (const lang of ['en', 'fr', 'pt', 'nl']) {
      console.log(`\n📦 Testing ${lang.toUpperCase()}:`);
      const translations = await Translation.getTranslationsForLanguage(lang);
      
      const keys = Object.keys(translations);
      console.log(`   Top-level keys: ${keys.length}`);
      console.log(`   Keys:`, keys.join(', '));
      
      if (translations.nav) {
        console.log(`   ✅ nav.home: "${translations.nav.home || 'MISSING'}"`);
        console.log(`   ✅ nav.coupons: "${translations.nav.coupons || 'MISSING'}"`);
        console.log(`   ✅ nav.deals: "${translations.nav.deals || 'MISSING'}"`);
      } else {
        console.log(`   ❌ No 'nav' object in translations!`);
      }
      
      if (translations.home && translations.home.hero) {
        console.log(`   ✅ home.hero.titleSubtext: "${translations.home.hero.titleSubtext || 'MISSING'}"`);
      } else {
        console.log(`   ❌ No 'home.hero' in translations!`);
      }
    }
    
    // 3. Sample some translations to check structure
    console.log('\n\n3️⃣  CHECKING TRANSLATION STRUCTURE');
    console.log('-'.repeat(60));
    
    const sampleKeys = ['nav.home', 'home.hero.title', 'home.hero.titleSubtext'];
    for (const key of sampleKeys) {
      const trans = await Translation.findOne({ key });
      if (trans) {
        console.log(`\n✅ ${key}:`);
        console.log(`   en: "${trans.en}"`);
        console.log(`   fr: "${trans.fr || 'NULL/EMPTY'}"`);
        console.log(`   pt: "${trans.pt || 'NULL/EMPTY'}"`);
        console.log(`   nl: "${trans.nl || 'NULL/EMPTY'}"`);
      } else {
        console.log(`\n❌ ${key} NOT FOUND`);
      }
    }
    
    // 4. Check for any empty or null translations
    console.log('\n\n4️⃣  CHECKING FOR ISSUES');
    console.log('-'.repeat(60));
    
    const emptyFr = await Translation.countDocuments({ 
      $or: [
        { fr: { $exists: false } },
        { fr: '' },
        { fr: null }
      ]
    });
    const emptyPt = await Translation.countDocuments({ 
      $or: [
        { pt: { $exists: false } },
        { pt: '' },
        { pt: null }
      ]
    });
    const emptyNl = await Translation.countDocuments({ 
      $or: [
        { nl: { $exists: false } },
        { nl: '' },
        { nl: null }
      ]
    });
    
    console.log(`\n⚠️  Empty/Missing Translations:`);
    console.log(`   fr: ${emptyFr}/${total} entries missing/empty`);
    console.log(`   pt: ${emptyPt}/${total} entries missing/empty`);
    console.log(`   nl: ${emptyNl}/${total} entries missing/empty`);
    
    if (emptyFr > total * 0.5 || emptyPt > total * 0.5 || emptyNl > total * 0.5) {
      console.log('\n❌ MORE THAN 50% OF TRANSLATIONS ARE MISSING FOR THESE LANGUAGES!');
      console.log('   This means the seed scripts may not have run properly.');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETE\n');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testAPI();




