/**
 * Check New Language Translations
 * Simple script to identify English copies in new languages
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

// Get seed files
const scriptsDir = __dirname;
const seedFiles = fs.readdirSync(scriptsDir)
  .filter(f => f.startsWith('seed') && f.endsWith('.js'))
  .map(f => path.join(scriptsDir, f));

console.log(`Found ${seedFiles.length} seed files\n`);

seedFiles.forEach(filePath => {
  const fileName = path.basename(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Split by translation objects (look for { key: pattern)
  const objects = content.split(/\{\s*key:\s*['"]/);
  
  objects.forEach((obj, idx) => {
    if (idx === 0) return; // Skip first part before first object
    
    // Extract key
    const keyMatch = obj.match(/^([^'"]+)['"]/);
    if (!keyMatch) return;
    const key = keyMatch[1];
    
    // Extract English
    const enMatch = obj.match(/en:\s*['"]([^'"]+)['"]/);
    if (!enMatch) return;
    const enValue = enMatch[1];
    
    // Check each new language
    newLanguages.forEach(lang => {
      let pattern;
      if (lang.includes('-')) {
        pattern = new RegExp(`['"]${lang.replace(/-/g, '\\-')}['"]:\\s*['"]([^'"]+)['"]`, 'i');
      } else {
        pattern = new RegExp(`${lang}:\\s*['"]([^'"]+)['"]`, 'i');
      }
      
      const match = obj.match(pattern);
      if (match) {
        const langValue = match[1];
        results[lang].total++;
        
        if (langValue.trim() === enValue.trim()) {
          results[lang].copies++;
          results[lang].entries.push({
            file: fileName,
            key: key,
            value: enValue.substring(0, 60)
          });
        }
      }
    });
  });
  
  console.log(`✓ ${fileName}`);
});

// Report
console.log('\n' + '='.repeat(80));
console.log('TRANSLATION ANALYSIS REPORT');
console.log('='.repeat(80) + '\n');

newLanguages.forEach(lang => {
  const r = results[lang];
  const pct = r.total > 0 ? ((r.copies / r.total) * 100).toFixed(1) : 0;
  
  console.log(`${langNames[lang]} (${lang}):`);
  console.log(`  Total entries: ${r.total}`);
  console.log(`  English copies: ${r.copies} (${pct}%)`);
  console.log(`  Proper translations: ${r.total - r.copies}`);
  
  if (r.copies > 0) {
    // Group by file
    const byFile = {};
    r.entries.forEach(e => {
      if (!byFile[e.file]) byFile[e.file] = 0;
      byFile[e.file]++;
    });
    
    console.log(`  Files with issues:`);
    Object.keys(byFile).forEach(f => {
      console.log(`    - ${f}: ${byFile[f]} entries`);
    });
    
    console.log(`  Sample (first 5):`);
    r.entries.slice(0, 5).forEach((e, i) => {
      console.log(`    ${i+1}. [${e.file}] ${e.key}: "${e.value}${e.value.length >= 60 ? '...' : ''}"`);
    });
  }
  console.log('');
});

// Summary
let totalEntries = 0;
let totalCopies = 0;
newLanguages.forEach(lang => {
  totalEntries += results[lang].total;
  totalCopies += results[lang].copies;
});

console.log('='.repeat(80));
console.log(`OVERALL: ${totalCopies} of ${totalEntries} entries are English copies`);
console.log(`Percentage: ${totalEntries > 0 ? ((totalCopies / totalEntries) * 100).toFixed(1) : 0}%`);
console.log('='.repeat(80));

// Save CSV
const csv = ['File,Language,Key,English Value'];
newLanguages.forEach(lang => {
  results[lang].entries.forEach(e => {
    csv.push(`"${e.file}","${lang}","${e.key}","${e.value}"`);
  });
});
fs.writeFileSync(path.join(__dirname, 'english_copies_report.csv'), csv.join('\n'));
console.log('\n✓ CSV report saved: english_copies_report.csv');









