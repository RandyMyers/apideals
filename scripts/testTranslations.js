const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const Translation = require('../models/translation');

let output = '';
function log(msg) {
  console.log(msg);
  output += msg + '\n';
}

async function test() {
  try {
    log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URL);
    log('✅ Connected!\n');
    
    // 1. Check total count
    const total = await Translation.countDocuments();
    log(`📊 Total translations in database: ${total}\n`);
    
    // 2. Check nav translations
    log('=== NAV TRANSLATIONS CHECK ===\n');
    const navKeys = ['nav.home', 'nav.coupons', 'nav.deals', 'nav.stores', 'nav.categories'];
    
    for (const key of navKeys) {
      const trans = await Translation.findOne({ key });
      if (trans) {
        log(`✅ ${key}:`);
        log(`   en: "${trans.en || 'MISSING'}"`);
        log(`   fr: "${trans.fr || 'MISSING'}"`);
        log(`   pt: "${trans.pt || 'MISSING'}"`);
        log(`   nl: "${trans.nl || 'MISSING'}"`);
        log(`   de-AT: "${trans['de-AT'] || 'MISSING'}"`);
        log('');
      } else {
        log(`❌ ${key} NOT FOUND\n`);
      }
    }
    
    // 3. Count translations by language
    log('=== TRANSLATION COVERAGE ===\n');
    const withFr = await Translation.countDocuments({ fr: { $exists: true, $ne: '' } });
    const withPt = await Translation.countDocuments({ pt: { $exists: true, $ne: '' } });
    const withNl = await Translation.countDocuments({ nl: { $exists: true, $ne: '' } });
    const withDeAt = await Translation.countDocuments({ 'de-AT': { $exists: true, $ne: '' } });
    
    log(`French (fr): ${withFr}/${total}`);
    log(`Portuguese (pt): ${withPt}/${total}`);
    log(`Dutch (nl): ${withNl}/${total}`);
    log(`Austrian German (de-AT): ${withDeAt}/${total}`);
    
    // 4. Check if hero translations exist
    log('\n=== HERO SECTION CHECK ===\n');
    const heroKeys = ['home.hero.titleSubtext', 'home.hero.title', 'home.hero.subtitle'];
    
    for (const key of heroKeys) {
      const trans = await Translation.findOne({ key });
      if (trans) {
        log(`✅ ${key}:`);
        log(`   pt: "${trans.pt || 'MISSING'}"`);
        log(`   fr: "${trans.fr || 'MISSING'}"`);
        log(`   nl: "${trans.nl || 'MISSING'}"`);
        log('');
      } else {
        log(`❌ ${key} NOT FOUND\n`);
      }
    }
    
    // Write to file
    const outputFile = path.join(__dirname, 'translation_test_results.txt');
    fs.writeFileSync(outputFile, output);
    log(`\n✅ Results written to: ${outputFile}`);
    
    await mongoose.connection.close();
    log('✅ Done!');
    
    // Also write at the end
    fs.writeFileSync(outputFile, output);
    process.exit(0);
  } catch (error) {
    const errorMsg = '❌ Error: ' + error.message + '\n' + error.stack;
    log(errorMsg);
    const outputFile = path.join(__dirname, 'translation_test_results.txt');
    fs.writeFileSync(outputFile, output);
    process.exit(1);
  }
}

test();




