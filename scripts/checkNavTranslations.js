const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const Translation = require('../models/translation');

const outputFile = path.join(__dirname, 'nav_check_results.txt');
let output = '';

function log(msg) {
  console.log(msg);
  output += msg + '\n';
}

async function checkNav() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    log('\n=== CHECKING NAV TRANSLATIONS IN DATABASE ===\n');
    
    const navKeys = ['nav.home', 'nav.coupons', 'nav.deals', 'nav.stores', 'nav.categories'];
    
    for (const key of navKeys) {
      const trans = await Translation.findOne({ key });
      if (trans) {
        log(`✅ Key: ${key}`);
        log(`   en: "${trans.en || 'MISSING'}"`);
        log(`   fr: "${trans.fr || 'MISSING'}"`);
        log(`   pt: "${trans.pt || 'MISSING'}"`);
        log(`   nl: "${trans.nl || 'MISSING'}"`);
        log(`   de-AT: "${trans['de-AT'] || 'MISSING'}"`);
        log('');
      } else {
        log(`❌ Key "${key}" NOT FOUND in database\n`);
      }
    }
    
    // Check total count
    const total = await Translation.countDocuments();
    log(`📊 Total translations in database: ${total}`);
    
    // Check how many have fr, pt, nl
    const withFr = await Translation.countDocuments({ fr: { $exists: true, $ne: '' } });
    const withPt = await Translation.countDocuments({ pt: { $exists: true, $ne: '' } });
    const withNl = await Translation.countDocuments({ nl: { $exists: true, $ne: '' } });
    
    log(`\n📊 Translations with fr: ${withFr}/${total}`);
    log(`📊 Translations with pt: ${withPt}/${total}`);
    log(`📊 Translations with nl: ${withNl}/${total}`);
    
    // Write to file
    fs.writeFileSync(outputFile, output);
    log(`\n✅ Results written to: ${outputFile}`);
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    const errorMsg = '❌ Error: ' + error.message;
    log(errorMsg);
    fs.writeFileSync(outputFile, output);
    process.exit(1);
  }
}

checkNav();




