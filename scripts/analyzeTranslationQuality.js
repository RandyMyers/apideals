/**
 * Analyze Translation Quality for New Languages
 * 
 * Identifies entries where new languages (fr, pt, it, nl, en-GB, en-AU, de-AT)
 * have English copies instead of proper translations.
 * 
 * Initial languages: ga, de, es, no, fi, da, sv (and en as base)
 * New languages to check: fr, pt, it, nl, en-GB, en-AU, de-AT
 */

const fs = require('fs');
const path = require('path');

const newLanguages = ['fr', 'pt', 'it', 'nl', 'en-GB', 'en-AU', 'de-AT'];
const langNames = {
  'fr': 'French',
  'pt': 'Portuguese',
  'it': 'Italian',
  'nl': 'Dutch',
  'en-GB': 'English (UK)',
  'en-AU': 'English (Australia)',
  'de-AT': 'German (Austria)'
};

const results = {};
newLanguages.forEach(lang => {
  results[lang] = {
    total: 0,
    copies: 0,
    entries: []
  };
});

// Get all seed translation files
const scriptsDir = __dirname;
const seedFiles = fs.readdirSync(scriptsDir)
  .filter(f => f.startsWith('seed') && f.endsWith('.js'))
  .map(f => ({ name: f, path: path.join(scriptsDir, f) }));

console.log(`Found ${seedFiles.length} seed files to analyze\n`);

// Process each file
seedFiles.forEach(({ name, path: filePath }) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Split content by translation objects (look for { key: pattern)
    const objectParts = content.split(/\{\s*key:\s*['"]/);
    
    objectParts.forEach((part, idx) => {
      if (idx === 0) return; // Skip first part before any objects
      
      // Extract the translation key
      const keyMatch = part.match(/^([^'"]+)['"]/);
      if (!keyMatch) return;
      const key = keyMatch[1];
      
      // Extract English value
      const enMatch = part.match(/en:\s*['"]([^'"]+)['"]/);
      if (!enMatch) return;
      const enValue = enMatch[1];
      
      // Check each new language
      newLanguages.forEach(lang => {
        let pattern;
        if (lang.includes('-')) {
          // Handle 'en-GB', 'en-AU', 'de-AT' with quotes
          pattern = new RegExp(`['"]${lang.replace(/-/g, '\\-')}['"]:\\s*['"]([^'"]+)['"]`, 'i');
        } else {
          // Handle fr, pt, it, nl
          pattern = new RegExp(`${lang}:\\s*['"]([^'"]+)['"]`, 'i');
        }
        
        const langMatch = part.match(pattern);
        if (langMatch) {
          const langValue = langMatch[1];
          results[lang].total++;
          
          // Check if translation is identical to English (English copy)
          if (langValue.trim() === enValue.trim()) {
            results[lang].copies++;
            results[lang].entries.push({
              file: name,
              key: key,
              english: enValue.length > 100 ? enValue.substring(0, 100) + '...' : enValue
            });
          }
        }
      });
    });
    
    console.log(`✓ Processed ${name}`);
  } catch (error) {
    console.error(`✗ Error processing ${name}:`, error.message);
  }
});

// Generate report
const report = [];
report.push('='.repeat(80));
report.push('TRANSLATION QUALITY ANALYSIS REPORT');
report.push('='.repeat(80));
report.push('');
report.push('This report identifies translation entries where new languages');
report.push('(fr, pt, it, nl, en-GB, en-AU, de-AT) have English copies instead');
report.push('of proper translations.');
report.push('');
report.push('='.repeat(80));
report.push('');

// Report for each language
newLanguages.forEach(lang => {
  const r = results[lang];
  const pct = r.total > 0 ? ((r.copies / r.total) * 100).toFixed(1) : 0;
  
  report.push(`${langNames[lang]} (${lang}):`);
  report.push(`  Total entries found: ${r.total}`);
  report.push(`  ✅ Proper translations: ${r.total - r.copies}`);
  report.push(`  ❌ English copies: ${r.copies} (${pct}%)`);
  
  if (r.copies > 0) {
    // Group by file
    const byFile = {};
    r.entries.forEach(e => {
      if (!byFile[e.file]) byFile[e.file] = [];
      byFile[e.file].push(e);
    });
    
    report.push(`  Files with English copies:`);
    Object.keys(byFile).sort().forEach(f => {
      report.push(`    - ${f}: ${byFile[f].length} entries`);
    });
    
    report.push(`  Sample entries needing translation (first 15):`);
    r.entries.slice(0, 15).forEach((e, i) => {
      report.push(`    ${i+1}. [${e.file}] ${e.key}`);
      report.push(`       "${e.english}"`);
    });
    if (r.entries.length > 15) {
      report.push(`    ... and ${r.entries.length - 15} more entries`);
    }
  }
  report.push('');
});

// Overall summary
let totalEntries = 0;
let totalCopies = 0;
newLanguages.forEach(lang => {
  totalEntries += results[lang].total;
  totalCopies += results[lang].copies;
});

report.push('='.repeat(80));
report.push('OVERALL SUMMARY');
report.push('='.repeat(80));
report.push(`Total translation entries analyzed: ${totalEntries}`);
report.push(`✅ Proper translations: ${totalEntries - totalCopies}`);
report.push(`❌ English copies: ${totalCopies}`);
if (totalEntries > 0) {
  const overallPct = ((totalCopies / totalEntries) * 100).toFixed(1);
  report.push(`⚠️  ${overallPct}% of entries are English copies and need translation`);
}
report.push('='.repeat(80));

// Output to console
const reportText = report.join('\n');
console.log('\n' + reportText);

// Save report to file
const reportPath = path.join(__dirname, 'translation_quality_report.txt');
fs.writeFileSync(reportPath, reportText, 'utf8');
console.log(`\n✓ Report saved to: translation_quality_report.txt`);

// Generate CSV for easy filtering
const csvLines = ['File,Language,Key,English Value'];
newLanguages.forEach(lang => {
  results[lang].entries.forEach(e => {
    // Escape quotes in CSV
    const escapedValue = e.english.replace(/"/g, '""');
    csvLines.push(`"${e.file}","${lang}","${e.key}","${escapedValue}"`);
  });
});
const csvPath = path.join(__dirname, 'translation_english_copies.csv');
fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8');
console.log(`✓ CSV report saved to: translation_english_copies.csv`);

// Save detailed JSON
const jsonPath = path.join(__dirname, 'translation_analysis.json');
fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2), 'utf8');
console.log(`✓ Detailed JSON saved to: translation_analysis.json`);

console.log('\n✅ Analysis complete!\n');
console.log('Next steps:');
console.log('1. Review the reports to identify which translations need work');
console.log('2. Translate the English copies to proper translations');
console.log('3. Update the seed files with proper translations');
console.log('4. Delete existing translations from database');
console.log('5. Reseed translations with updated seed files\n');









