/**
 * Quick Analysis Script - Compare Translation Keys
 * Checks if seedTranslations.js contains all keys or if supplementary files add new ones
 */

const fs = require('fs');
const path = require('path');

// Read seedTranslations.js
console.log('📊 ANALYZING TRANSLATION KEYS\n');
console.log('='.repeat(80));

const mainFile = fs.readFileSync(path.join(__dirname, 'seedTranslations.js'), 'utf8');
const mainMatches = mainFile.match(/key:\s*['"]([^'"]+)['"]/g);
const mainKeys = mainMatches ? mainMatches.map(m => m.match(/['"]([^'"]+)['"]/)[1]) : [];

console.log(`\n📁 seedTranslations.js`);
console.log(`   Total keys: ${mainKeys.length}`);
console.log(`   Sample keys (first 10):`);
mainKeys.slice(0, 10).forEach((key, i) => console.log(`      ${i+1}. ${key}`));

// Check supplementary files
const supplementaryFiles = [
  'seedMissingTranslations_1_dashboard_sections.js',
  'seedMissingTranslations_2_dashboard_submissions.js',
  'seedMissingTranslations_4_forms_titles.js',
  'seedMissingTranslations_11_woocommerce.js',
  'seedMissingTranslations_16_home.js',
];

console.log('\n' + '='.repeat(80));
console.log('📁 CHECKING SUPPLEMENTARY FILES\n');

let totalSupplementaryKeys = 0;
let uniqueSupplementaryKeys = 0;
let overlappingKeys = 0;

supplementaryFiles.forEach(filename => {
  try {
    const content = fs.readFileSync(path.join(__dirname, filename), 'utf8');
    const matches = content.match(/key:\s*['"]([^'"]+)['"]/g);
    const keys = matches ? matches.map(m => m.match(/['"]([^'"]+)['"]/)[1]) : [];
    
    totalSupplementaryKeys += keys.length;
    
    // Check for overlaps
    const unique = keys.filter(k => !mainKeys.includes(k));
    uniqueSupplementaryKeys += unique.length;
    overlappingKeys += keys.length - unique.length;
    
    console.log(`\n   ${filename}`);
    console.log(`      Total keys: ${keys.length}`);
    console.log(`      Unique (not in main): ${unique.length}`);
    console.log(`      Overlapping: ${keys.length - unique.length}`);
    
    if (unique.length > 0) {
      console.log(`      Sample unique keys (first 5):`);
      unique.slice(0, 5).forEach(k => console.log(`         - ${k}`));
    }
  } catch (err) {
    console.log(`   ⚠️  File not found: ${filename}`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('📊 SUMMARY\n');
console.log(`   Main file (seedTranslations.js): ${mainKeys.length} keys`);
console.log(`   Supplementary files checked: ${supplementaryFiles.length}`);
console.log(`   Total keys in supplementary: ${totalSupplementaryKeys}`);
console.log(`   Unique keys (not in main): ${uniqueSupplementaryKeys}`);
console.log(`   Overlapping keys: ${overlappingKeys}`);

console.log('\n' + '='.repeat(80));
if (uniqueSupplementaryKeys > 0) {
  console.log('❌ CONCLUSION: seedTranslations.js does NOT cover everything');
  console.log(`   You NEED the supplementary files - they add ${uniqueSupplementaryKeys} unique keys`);
} else {
  console.log('✅ CONCLUSION: seedTranslations.js covers all keys');
  console.log('   You may NOT need the supplementary files (they only duplicate)');
}
console.log('='.repeat(80));
