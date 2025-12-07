const fs = require('fs');
const path = require('path');

const newLanguages = ['fr', 'pt', 'it', 'nl', 'en-GB', 'en-AU', 'de-AT'];
const results = {};

newLanguages.forEach(lang => {
  results[lang] = { total: 0, copies: 0, entries: [] };
});

// Test with main seed file first
const mainFile = path.join(__dirname, 'seedTranslations.js');
console.log('Reading main seed file...');
const content = fs.readFileSync(mainFile, 'utf8');
console.log('File size:', content.length, 'characters');

// Split by objects
const parts = content.split(/\{\s*key:\s*['"]/);
console.log('Found', parts.length - 1, 'translation objects');

parts.forEach((part, idx) => {
  if (idx === 0) return;
  
  const keyMatch = part.match(/^([^'"]+)['"]/);
  if (!keyMatch) return;
  const key = keyMatch[1];
  
  const enMatch = part.match(/en:\s*['"]([^'"]+)['"]/);
  if (!enMatch) return;
  const enValue = enMatch[1];
  
  newLanguages.forEach(lang => {
    let pattern;
    if (lang.includes('-')) {
      pattern = new RegExp(`['"]${lang.replace(/-/g, '\\-')}['"]:\\s*['"]([^'"]+)['"]`, 'i');
    } else {
      pattern = new RegExp(`${lang}:\\s*['"]([^'"]+)['"]`, 'i');
    }
    
    const match = part.match(pattern);
    if (match) {
      const langValue = match[1];
      results[lang].total++;
      
      if (langValue.trim() === enValue.trim()) {
        results[lang].copies++;
        results[lang].entries.push({ key, english: enValue });
      }
    }
  });
  
  if (idx % 1000 === 0) {
    console.log(`Processed ${idx} objects...`);
  }
});

console.log('\nResults:');
newLanguages.forEach(lang => {
  const r = results[lang];
  console.log(`${lang}: ${r.copies} copies out of ${r.total} total`);
});

// Write results
const output = {
  summary: {},
  details: {}
};

newLanguages.forEach(lang => {
  output.summary[lang] = {
    total: results[lang].total,
    copies: results[lang].copies,
    proper: results[lang].total - results[lang].copies
  };
  output.details[lang] = results[lang].entries.slice(0, 100); // First 100
});

fs.writeFileSync(path.join(__dirname, 'translation_check_results.json'), JSON.stringify(output, null, 2));
console.log('\nResults saved to translation_check_results.json');









