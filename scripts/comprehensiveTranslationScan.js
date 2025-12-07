/**
 * Comprehensive Translation Scan
 * Scans all 22 supplementary files and generates detailed report
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
  'seedMissingTranslations_20_settings.js',
  'seedMissingTranslations_20_stores_detail_extras.js',
  'seedMissingTranslations_21_savings_stats.js',
  'seedMissingTranslations_22_activity.js',
];

console.log('🔍 COMPREHENSIVE TRANSLATION SCAN\n');
console.log('='.repeat(100));
console.log();

const report = [];
let totalIssues = 0;
let filesWithIssues = 0;
let filesFixed = 0;

files.forEach((filename, index) => {
  const filepath = path.join(__dirname, filename);
  
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    const lines = content.split('\n');
    
    const issues = {
      filename,
      totalEntries: 0,
      frIssues: [],
      ptIssues: [],
      nlIssues: [],
    };
    
    // Find all translation entries
    let currentKey = null;
    let currentEn = null;
    
    lines.forEach((line, lineNum) => {
      // Extract key
      const keyMatch = line.match(/key:\s*['"]([^'"]+)['"]/);
      if (keyMatch) {
        currentKey = keyMatch[1];
        issues.totalEntries++;
      }
      
      // Extract en value
      const enMatch = line.match(/en:\s*['"]([^'"]+)['"]/);
      if (enMatch) {
        currentEn = enMatch[1];
      }
      
      // Check fr, pt, nl for English content
      const frMatch = line.match(/fr:\s*['"]([^'"]+)['"]/);
      if (frMatch && currentKey && currentEn) {
        const frValue = frMatch[1];
        // Check if it's likely English (starts with capital, contains English words)
        if (frValue === currentEn || 
            /^(Select|Choose|Add|Enter|Click|Create|Edit|Delete|Save|Cancel|Confirm|Connect|Sync|Consumer|Webhook)/.test(frValue)) {
          issues.frIssues.push({
            key: currentKey,
            en: currentEn,
            current: frValue,
            line: lineNum + 1
          });
        }
      }
      
      const ptMatch = line.match(/pt:\s*['"]([^'"]+)['"]/);
      if (ptMatch && currentKey && currentEn) {
        const ptValue = ptMatch[1];
        if (ptValue === currentEn || 
            /^(Select|Choose|Add|Enter|Click|Create|Edit|Delete|Save|Cancel|Confirm|Connect|Sync|Consumer|Webhook)/.test(ptValue)) {
          issues.ptIssues.push({
            key: currentKey,
            en: currentEn,
            current: ptValue,
            line: lineNum + 1
          });
        }
      }
      
      const nlMatch = line.match(/nl:\s*['"]([^'"]+)['"]/);
      if (nlMatch && currentKey && currentEn) {
        const nlValue = nlMatch[1];
        if (nlValue === currentEn || 
            /^(Select|Choose|Add|Enter|Click|Create|Edit|Delete|Save|Cancel|Confirm|Connect|Sync|Consumer|Webhook)/.test(nlValue)) {
          issues.nlIssues.push({
            key: currentKey,
            en: currentEn,
            current: nlValue,
            line: lineNum + 1
          });
        }
      }
    });
    
    const totalFileIssues = issues.frIssues.length + issues.ptIssues.length + issues.nlIssues.length;
    
    if (totalFileIssues > 0) {
      report.push(issues);
      filesWithIssues++;
      totalIssues += totalFileIssues;
      
      console.log(`[${index + 1}/${files.length}] ${filename}`);
      console.log(`   Entries: ${issues.totalEntries}`);
      console.log(`   ⚠️  Issues: ${totalFileIssues} (fr: ${issues.frIssues.length}, pt: ${issues.ptIssues.length}, nl: ${issues.nlIssues.length})`);
      
      if (issues.frIssues.length > 0) {
        console.log(`   Sample fr issues:`);
        issues.frIssues.slice(0, 2).forEach(i => {
          console.log(`      • ${i.key}: "${i.current}" (line ${i.line})`);
        });
      }
      console.log();
    } else {
      filesFixed++;
      console.log(`[${index + 1}/${files.length}] ${filename} ✅ Clean`);
    }
    
  } catch (err) {
    console.log(`[${index + 1}/${files.length}] ${filename} ⚠️  Error: ${err.message}`);
  }
});

console.log();
console.log('='.repeat(100));
console.log('\n📊 SUMMARY\n');
console.log(`Files scanned:         ${files.length}`);
console.log(`Files with issues:     ${filesWithIssues}`);
console.log(`Files already fixed:   ${filesFixed}`);
console.log(`Total issues found:    ${totalIssues}`);
console.log();

if (filesWithIssues > 0) {
  console.log('Files needing fixes:');
  report.forEach(r => {
    console.log(`   ${r.filename}`);
    console.log(`      fr: ${r.frIssues.length} issues, pt: ${r.ptIssues.length} issues, nl: ${r.nlIssues.length} issues`);
  });
}

console.log();
console.log('='.repeat(100));

// Save detailed report
const reportPath = path.join(__dirname, 'TRANSLATION_SCAN_REPORT.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n📄 Detailed report saved to: TRANSLATION_SCAN_REPORT.json\n`);




