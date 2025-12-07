/**
 * Scan all supplementary files for English placeholders in fr, pt, nl
 */

const fs = require('fs');
const path = require('path');

const files = [
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

console.log('🔍 SCANNING FOR ENGLISH PLACEHOLDERS\n');
console.log('='.repeat(80));

const filesWithPlaceholders = [];

files.forEach((filename, index) => {
  const filepath = path.join(__dirname, filename);
  
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    
    // Extract translation entries
    const entryPattern = /{[\s\S]*?key:\s*['"]([^'"]+)['"][\s\S]*?en:\s*['"]([^'"]+)['"][\s\S]*?fr:\s*['"]([^'"]+)['"][\s\S]*?pt:\s*['"]([^'"]+)['"][\s\S]*?nl:\s*['"]([^'"]+)['"][\s\S]*?}/g;
    
    const entries = [];
    let match;
    while ((match = entryPattern.exec(content)) !== null) {
      const [, key, en, fr, pt, nl] = match;
      
      // Check if fr, pt, or nl matches English value (likely placeholder)
      if (fr === en || pt === en || nl === en) {
        entries.push({ key, en, fr, pt, nl });
      }
    }
    
    if (entries.length > 0) {
      console.log(`\n[${index + 1}] ${filename}`);
      console.log(`   ⚠️  Found ${entries.length} English placeholder(s)\n`);
      
      entries.slice(0, 3).forEach(e => {
        console.log(`   Key: ${e.key}`);
        console.log(`   en: ${e.en}`);
        if (e.fr === e.en) console.log(`   fr: "${e.fr}" ❌ (English)`);
        if (e.pt === e.en) console.log(`   pt: "${e.pt}" ❌ (English)`);
        if (e.nl === e.en) console.log(`   nl: "${e.nl}" ❌ (English)`);
        console.log();
      });
      
      if (entries.length > 3) {
        console.log(`   ... and ${entries.length - 3} more\n`);
      }
      
      filesWithPlaceholders.push({ filename, count: entries.length, entries });
    }
    
  } catch (err) {
    console.log(`   ⚠️  Error: ${err.message}\n`);
  }
});

console.log('='.repeat(80));
console.log(`\n✅ Scan complete!`);
console.log(`   Files scanned: ${files.length}`);
console.log(`   Files with placeholders: ${filesWithPlaceholders.length}`);
console.log(`   Total placeholders: ${filesWithPlaceholders.reduce((sum, f) => sum + f.count, 0)}\n`);

if (filesWithPlaceholders.length > 0) {
  console.log('Files needing translation fixes:');
  filesWithPlaceholders.forEach(f => {
    console.log(`   - ${f.filename} (${f.count} entries)`);
  });
} else {
  console.log('✨ All files appear to have proper translations!');
}

console.log();




