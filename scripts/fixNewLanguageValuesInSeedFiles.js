/**
 * Fix New Language Values in Seed Files
 * Replaces incorrect values (Swedish) with correct English values for fr, pt, nl, en-GB, en-AU
 * 
 * Usage: node server/scripts/fixNewLanguageValuesInSeedFiles.js
 */

const fs = require('fs');
const path = require('path');

const seedFiles = [
  'seedTranslations.js',
  'seedMissingTranslations_1_dashboard_sections.js',
  'seedMissingTranslations_2_dashboard_submissions.js',
  'seedMissingTranslations_3_dashboard_followed.js',
  'seedMissingTranslations_4_forms_titles.js',
  'seedMissingTranslations_5_forms_fields.js',
  'seedMissingTranslations_6_forms_placeholders.js',
  'seedMissingTranslations_7_forms_validation1.js',
  'seedMissingTranslations_8_forms_validation2.js',
  'seedMissingTranslations_9_modals.js',
  'seedMissingTranslations_10_modals2.js',
  'seedMissingTranslations_11_woocommerce.js',
  'seedMissingTranslations_12_woocommerce_fields.js',
  'seedMissingTranslations_13_error_boundary.js',
  'seedMissingTranslations_14_notifications.js',
  'seedMissingTranslations_15_toast.js',
  'seedMissingTranslations_16_home.js',
  'seedMissingTranslations_17_footer.js',
  'seedMissingTranslations_18_cards.js',
  'seedMissingTranslations_19_stores.js',
  'seedMissingTranslations_20_stores_detail_extras.js',
  'seedMissingTranslations_20_settings.js',
  'seedMissingTranslations_21_savings_stats.js',
  'seedMissingTranslations_22_activity.js',
];

function escapeQuote(str) {
  return str.replace(/'/g, "\\'");
}

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Find each translation object and fix the new language values
    // Pattern: Match entire translation objects
    const objPattern = /\{\s*key:\s*['"]([^'"]+)['"][^}]*\}/g;
    
    content = content.replace(objPattern, (match) => {
      // Extract English value
      const enMatch = match.match(/en:\s*['"]([^'"]+)['"]/);
      if (!enMatch) return match; // No English value, skip
      
      const enValue = enMatch[1];
      
      // Extract German value for de-AT
      const deMatch = match.match(/de:\s*['"]([^'"]+)['"]/);
      const deValue = deMatch ? deMatch[1] : enValue;
      
      // Check if new languages exist and need fixing
      const hasNewLangs = match.includes("fr:") || match.includes("'fr':");
      if (!hasNewLangs) return match; // No new languages, skip
      
      // Replace new language values with correct ones
      let fixed = match;
      
      // Fix fr, pt, nl, en-GB, en-AU (use English)
      fixed = fixed.replace(/fr:\s*['"]([^'"]+)['"]/g, `fr: '${escapeQuote(enValue)}'`);
      fixed = fixed.replace(/pt:\s*['"]([^'"]+)['"]/g, `pt: '${escapeQuote(enValue)}'`);
      fixed = fixed.replace(/nl:\s*['"]([^'"]+)['"]/g, `nl: '${escapeQuote(enValue)}'`);
      fixed = fixed.replace(/'en-GB':\s*['"]([^'"]+)['"]/g, `'en-GB': '${escapeQuote(enValue)}'`);
      fixed = fixed.replace(/'en-AU':\s*['"]([^'"]+)['"]/g, `'en-AU': '${escapeQuote(enValue)}'`);
      
      // Fix de-AT (use German)
      fixed = fixed.replace(/'de-AT':\s*['"]([^'"]+)['"]/g, `'de-AT': '${escapeQuote(deValue)}'`);
      
      return fixed;
    });
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return false;
  }
}

// Main
const scriptsDir = path.join(__dirname);
let updated = 0;
let skipped = 0;

console.log('🔧 Fixing new language values in seed files...\n');

seedFiles.forEach(fileName => {
  const filePath = path.join(scriptsDir, fileName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Not found: ${fileName}`);
    return;
  }
  
  console.log(`📝 ${fileName}...`);
  const changed = fixFile(filePath);
  
  if (changed) {
    console.log(`   ✅ Fixed`);
    updated++;
  } else {
    console.log(`   ⏭️  No changes needed`);
    skipped++;
  }
});

console.log('\n' + '='.repeat(80));
console.log(`✅ Fixed: ${updated} files`);
console.log(`⏭️  Skipped: ${skipped} files`);
console.log('\n✨ Done!');







