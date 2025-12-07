/**
 * Fix British/Australian Spelling for en-GB and en-AU
 * Converts American English to British/Australian English spelling
 * 
 * Usage: node server/scripts/fixBritishSpelling.js
 */

const fs = require('fs');
const path = require('path');

// British/Australian spelling conversions
const britishSpellings = {
  'favorite': 'favourite',
  'favorites': 'favourites',
  'Help Center': 'Help Centre',
  'help center': 'help centre',
  'organize': 'organise',
  'organizing': 'organising',
  'organized': 'organised',
  'color': 'colour',
  'colors': 'colours',
  'center': 'centre',
  'centers': 'centres',
};

// Files to process
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
  'seedMissingTranslations_23_detail_pages.js',
];

const fixFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let fixed = 0;
  
  // For each British spelling conversion
  Object.keys(britishSpellings).forEach(american => {
    const british = britishSpellings[american];
    
    // Match en-GB or en-AU with the American spelling
    // Pattern: 'en-GB': 'text with favorite' or "en-GB": "text with favorite"
    const patterns = [
      // Single quotes
      new RegExp(`(['"])en-GB(['"]):\\s*['"]([^'"]*\\b${american.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[^'"]*)['"]`, 'gi'),
      new RegExp(`(['"])en-AU(['"]):\\s*['"]([^'"]*\\b${american.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[^'"]*)['"]`, 'gi'),
      // Double quotes
      new RegExp(`(['"])en-GB(['"]):\\s*["']([^"']*\\b${american.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[^"']*)["']`, 'gi'),
      new RegExp(`(['"])en-AU(['"]):\\s*["']([^"']*\\b${american.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[^"']*)["']`, 'gi'),
    ];
    
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        // Replace American spelling with British spelling
        content = content.replace(pattern, (match, quote1, lang, text) => {
          const replaced = text.replace(new RegExp(`\\b${american}\\b`, 'gi'), british);
          return `${quote1}${lang}${quote1}: '${replaced}'`;
        });
        fixed += matches.length;
      }
    });
  });
  
  return { content, fixed };
};

const main = () => {
  console.log('🔧 Fixing British/Australian spelling in seed files...\n');
  
  const scriptsDir = __dirname;
  let totalFixed = 0;
  const results = [];
  
  seedFiles.forEach(fileName => {
    const filePath = path.join(scriptsDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      return;
    }
    
    const { content, fixed } = fixFile(filePath);
    
    if (fixed > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ ${fileName}: Fixed ${fixed} spelling(s)`);
      totalFixed += fixed;
      results.push({ file: fileName, fixed });
    }
  });
  
  console.log('\n' + '='.repeat(80));
  console.log(`✅ Fixed ${totalFixed} British/Australian spelling differences`);
  console.log('='.repeat(80));
  
  if (results.length > 0) {
    console.log('\nFiles updated:');
    results.forEach(r => {
      console.log(`  - ${r.file}: ${r.fixed} fixes`);
    });
  } else {
    console.log('\nNo spelling differences found to fix.');
  }
  
  console.log('\n📝 Changes made:');
  console.log('  - favorite → favourite');
  console.log('  - Help Center → Help Centre');
  console.log('  - (and other British spellings where found)');
  console.log();
};

main();



