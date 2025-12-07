/**
 * Analyze Seed Files for Translation Quality
 * Checks if seed files have proper translations or just English copies
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

function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract translation objects using regex
    // Pattern: { key: '...', en: '...', fr: '...', ... }
    const objPattern = /\{\s*key:\s*['"]([^'"]+)['"][^}]*en:\s*['"]([^'"]+)['"][^}]*fr:\s*['"]([^'"]+)['"][^}]*pt:\s*['"]([^'"]+)['"][^}]*nl:\s*['"]([^'"]+)['"][^}]*\}/g;
    
    const issues = {
      fr: [],
      pt: [],
      nl: []
    };
    
    let match;
    while ((match = objPattern.exec(content)) !== null) {
      const key = match[1];
      const en = match[2];
      const fr = match[3];
      const pt = match[4];
      const nl = match[5];
      
      if (fr === en) {
        issues.fr.push({ key, en, fr });
      }
      if (pt === en) {
        issues.pt.push({ key, en, pt });
      }
      if (nl === en) {
        issues.nl.push({ key, en, nl });
      }
    }
    
    return issues;
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
    return { fr: [], pt: [], nl: [] };
  }
}

// Main
const scriptsDir = path.join(__dirname);
let totalFr = 0;
let totalPt = 0;
let totalNl = 0;

console.log('🔍 Analyzing seed files for translation quality...\n');

seedFiles.forEach(fileName => {
  const filePath = path.join(scriptsDir, fileName);
  
  if (!fs.existsSync(filePath)) {
    return;
  }
  
  const issues = analyzeFile(filePath);
  const frCount = issues.fr.length;
  const ptCount = issues.pt.length;
  const nlCount = issues.nl.length;
  
  if (frCount > 0 || ptCount > 0 || nlCount > 0) {
    console.log(`📄 ${fileName}:`);
    if (frCount > 0) console.log(`   ❌ French: ${frCount} English copies`);
    if (ptCount > 0) console.log(`   ❌ Portuguese: ${ptCount} English copies`);
    if (nlCount > 0) console.log(`   ❌ Dutch: ${nlCount} English copies`);
    
    totalFr += frCount;
    totalPt += ptCount;
    totalNl += nlCount;
  }
});

console.log('\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`❌ French: ${totalFr} keys are English copies`);
console.log(`❌ Portuguese: ${totalPt} keys are English copies`);
console.log(`❌ Dutch: ${totalNl} keys are English copies`);
console.log(`\n📊 Total: ${totalFr + totalPt + totalNl} keys need proper translations`);







