const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testAPI() {
  const output = [];
  
  function log(msg) {
    console.log(msg);
    output.push(msg);
  }
  
  try {
    log('=== TESTING API RESPONSES ===\n');
    
    const languages = ['pt', 'fr', 'nl'];
    
    for (const lang of languages) {
      log(`\n📡 Testing ${lang.toUpperCase()}...`);
      
      try {
        const response = await axios.get(`http://localhost:5000/api/v1/translations/${lang}`);
        
        if (response.data && response.data.success) {
          const translations = response.data.translations;
          const keys = Object.keys(translations);
          
          log(`✅ ${lang}: ${keys.length} top-level keys loaded`);
          log(`   Keys: ${keys.join(', ')}`);
          
          // Check nav translations specifically
          if (translations.nav) {
            log(`   ✅ nav.home: "${translations.nav.home || 'MISSING'}"`);
            log(`   ✅ nav.coupons: "${translations.nav.coupons || 'MISSING'}"`);
            log(`   ✅ nav.deals: "${translations.nav.deals || 'MISSING'}"`);
          } else {
            log(`   ❌ nav translations not found!`);
          }
          
          // Check hero translations
          if (translations.home && translations.home.hero) {
            log(`   ✅ home.hero.titleSubtext: "${translations.home.hero.titleSubtext || 'MISSING'}"`);
          } else {
            log(`   ❌ home.hero translations not found!`);
          }
          
        } else {
          log(`❌ ${lang}: Failed - ${JSON.stringify(response.data)}`);
        }
      } catch (error) {
        log(`❌ ${lang}: Error - ${error.message}`);
      }
    }
    
    // Write to file
    const outputFile = path.join(__dirname, 'api_test_results.txt');
    fs.writeFileSync(outputFile, output.join('\n'));
    log(`\n✅ Results written to: ${outputFile}`);
    
  } catch (error) {
    log(`\n❌ Fatal Error: ${error.message}`);
  }
}

testAPI();




