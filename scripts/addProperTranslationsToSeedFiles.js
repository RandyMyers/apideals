/**
 * Add Proper Translations to Seed Files
 * Replaces English copies with proper French, Portuguese, and Dutch translations
 * 
 * Usage: node server/scripts/addProperTranslationsToSeedFiles.js
 */

const fs = require('fs');
const path = require('path');
const translations = require('./translationMappings');

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

function getTranslation(enValue, lang) {
  // Check exact match first
  if (translations[enValue] && translations[enValue][lang]) {
    return translations[enValue][lang];
  }
  
  // Check partial matches (for phrases with variables)
  for (const [key, value] of Object.entries(translations)) {
    if (enValue.includes(key) && value[lang]) {
      // Try to replace the key part
      return enValue.replace(key, value[lang]);
    }
  }
  
  // No translation found - return null (will keep English)
  return null;
}

function fixTranslations(content) {
  // Pattern: Match translation objects with fr:, pt:, nl: that equal en:
  // We'll replace them one by one
  
  // Pattern for fr: 'English', pt: 'English', nl: 'English'
  const pattern = /(en:\s*['"]([^'"]+)['"][^}]*?)(fr:\s*['"])([^'"]+)(['"][^}]*?)(pt:\s*['"])([^'"]+)(['"][^}]*?)(nl:\s*['"])([^'"]+)(['"])/g;
  
  return content.replace(pattern, (match, beforeEn, enValue, frStart, frValue, frEnd, ptStart, ptValue, ptEnd, nlStart, nlValue, nlEnd) => {
    // Only replace if the translation equals English
    if (frValue === enValue && ptValue === enValue && nlValue === enValue) {
      const frTrans = getTranslation(enValue, 'fr') || enValue;
      const ptTrans = getTranslation(enValue, 'pt') || enValue;
      const nlTrans = getTranslation(enValue, 'nl') || enValue;
      
      return beforeEn + 
        frStart + escapeQuote(frTrans) + frEnd +
        ptStart + escapeQuote(ptTrans) + ptEnd +
        nlStart + escapeQuote(nlTrans) + nlEnd;
    }
    
    return match;
  });
}

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Fix translations
    content = fixTranslations(content);
    
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

console.log('🔧 Adding proper translations to seed files...\n');

seedFiles.forEach(fileName => {
  const filePath = path.join(scriptsDir, fileName);
  
  if (!fs.existsSync(filePath)) {
    return;
  }
  
  console.log(`📝 ${fileName}...`);
  const changed = updateFile(filePath);
  
  if (changed) {
    console.log(`   ✅ Updated`);
    updated++;
  } else {
    console.log(`   ⏭️  No changes`);
    skipped++;
  }
});

console.log('\n' + '='.repeat(80));
console.log(`✅ Updated: ${updated} files`);
console.log(`⏭️  Skipped: ${skipped} files`);
console.log('\n⚠️  Note: This script only translates common terms.');
console.log('   Many keys may still need manual translation.');
console.log('\n📋 Next: Delete and re-seed the database');







