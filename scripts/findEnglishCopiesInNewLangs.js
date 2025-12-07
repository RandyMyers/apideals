/**
 * Find English Copies in New Languages
 * Analyzes seed translation files to find entries where new languages
 * (fr, pt, it, nl, en-GB, en-AU, de-AT) have English copies
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
  results[lang] = { total: 0, copies: 0, entries: [] };
});

// Get all seed files
const scriptsDir = __dirname;
const files = fs.readdirSync(scriptsDir)
  .filter(f => f.startsWith('seed') && f.endsWith('.js'))
  .map(f => ({ name: f, path: path.join(scriptsDir, f) }));

console.log(`Analyzing ${files.length} seed files...\n`);

files.forEach(({ name, path: filePath }) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Split by translation objects
    const parts = content.split(/\{\s*key:\s*['"]/);
    
    parts.forEach((part, idx) => {
      if (idx === 0) return; // Skip first part
      
      // Extract key
      const keyMatch = part.match(/^([^'"]+)['"]/);
      if (!keyMatch) return;
      const key = keyMatch[1];
      
      // Extract English
      const enMatch = part.match(/en:\s*['"]([^'"]+)['"]/);
      if (!enMatch) return;
      const enValue = enMatch[1];
      
      // Check each new language
      newLanguages.forEach(lang => {
        let pattern;
        if (lang.includes('-')) {
          // Handle 'en-GB', 'en-AU', 'de-AT'
          pattern = new RegExp(`['"]${lang.replace(/-/g, '\\-')}['"]:\\s*['"]([^'"]+)['"]`, 'i');
        } else {
          pattern = new RegExp(`${lang}:\\s*['"]([^'"]+)['"]`, 'i');
        }
        
        const match = part.match(pattern);
        if (match) {
          const langValue = match[1];
          results[lang].total++;
          
          // Check if it's an English copy (exact match, ignoring whitespace)
          if (langValue.trim() === enValue.trim()) {
            results[lang].copies++;
            results[lang].entries.push({
              file: name,
              key: key,
              english: enValue.length > 80 ? enValue.substring(0, 80) + '...' : enValue
            });
          }
        }
      });
    });
    
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ Error processing ${name}:`, error.message);
  }
});

// Generate report
const reportLines = [];
reportLines.push('='.repeat(80));
reportLines.push('TRANSLATION ANALYSIS REPORT');
reportLines.push('='.repeat(80));
reportLines.push('');

newLanguages.forEach(lang => {
  const r = results[lang];
  const pct = r.total > 0 ? ((r.copies / r.total) * 100).toFixed(1) : 0;
  
  reportLines.push(`${langNames[lang]} (${lang}):`);
  reportLines.push(`  Total entries: ${r.total}`);
  reportLines.push(`  English copies: ${r.copies} (${pct}%)`);
  reportLines.push(`  Proper translations: ${r.total - r.copies}`);
  
  if (r.copies > 0) {
    // Group by file
    const byFile = {};
    r.entries.forEach(e => {
      if (!byFile[e.file]) byFile[e.file] = 0;
      byFile[e.file]++;
    });
    
    reportLines.push(`  Files with issues:`);
    Object.keys(byFile).sort().forEach(f => {
      reportLines.push(`    - ${f}: ${byFile[f]} entries`);
    });
    
    reportLines.push(`  Sample entries (first 10):`);
    r.entries.slice(0, 10).forEach((e, i) => {
      reportLines.push(`    ${i+1}. [${e.file}] ${e.key}`);
      reportLines.push(`       "${e.english}"`);
    });
    if (r.entries.length > 10) {
      reportLines.push(`    ... and ${r.entries.length - 10} more`);
    }
  }
  reportLines.push('');
});

// Overall summary
let totalEntries = 0;
let totalCopies = 0;
newLanguages.forEach(lang => {
  totalEntries += results[lang].total;
  totalCopies += results[lang].copies;
});

reportLines.push('='.repeat(80));
reportLines.push('OVERALL SUMMARY');
reportLines.push('='.repeat(80));
reportLines.push(`Total entries analyzed: ${totalEntries}`);
reportLines.push(`English copies found: ${totalCopies}`);
reportLines.push(`Proper translations: ${totalEntries - totalCopies}`);
if (totalEntries > 0) {
  const overallPct = ((totalCopies / totalEntries) * 100).toFixed(1);
  reportLines.push(`Percentage needing translation: ${overallPct}%`);
}
reportLines.push('='.repeat(80));

// Output to console
const reportText = reportLines.join('\n');
console.log('\n' + reportText);

// Save to file
const reportPath = path.join(__dirname, 'translation_analysis_report.txt');
fs.writeFileSync(reportPath, reportText, 'utf8');
console.log(`\n✓ Report saved to: translation_analysis_report.txt`);

// Generate CSV
const csvLines = ['File,Language,Key,English Value'];
newLanguages.forEach(lang => {
  results[lang].entries.forEach(e => {
    csvLines.push(`"${e.file}","${lang}","${e.key}","${e.english.replace(/"/g, '""')}"`);
  });
});
const csvPath = path.join(__dirname, 'english_copies_report.csv');
fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8');
console.log(`✓ CSV report saved to: english_copies_report.csv`);

// Save detailed JSON
const jsonPath = path.join(__dirname, 'translation_analysis_detailed.json');
fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2), 'utf8');
console.log(`✓ Detailed JSON saved to: translation_analysis_detailed.json`);

console.log('\n✅ Analysis complete!\n');









