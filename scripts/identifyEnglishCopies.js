/**
 * Identify English copies in files with all languages
 * Only checks files that have initial languages (ga, de, es, no, fi, da, sv)
 */

const fs = require('fs');
const path = require('path');

const newLanguages = ['fr', 'pt', 'it', 'nl', 'en-GB', 'en-AU', 'de-AT'];
const initialLanguages = ['ga', 'de', 'es', 'no', 'fi', 'da', 'sv'];

const results = {};
newLanguages.forEach(lang => {
  results[lang] = [];
});

// Get all seed files
const scriptsDir = __dirname;
const seedFiles = fs.readdirSync(scriptsDir)
  .filter(f => f.startsWith('seed') && f.endsWith('.js'))
  .map(f => path.join(scriptsDir, f));

seedFiles.forEach(filePath => {
  const fileName = path.basename(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file has initial languages (has all languages)
  const hasAllLanguages = initialLanguages.some(lang => 
    content.includes(`${lang}:`) || content.includes(`'${lang}':`)
  );
  
  if (!hasAllLanguages) {
    console.log(`Skipping ${fileName} - doesn't have all initial languages`);
    return;
  }
  
  console.log(`Checking ${fileName}...`);
  
  // Split by translation objects
  const parts = content.split(/\{\s*key:\s*['"]/);
  
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
        if (langValue.trim() === enValue.trim()) {
          results[lang].push({
            file: fileName,
            key: key,
            english: enValue,
            line: content.substring(0, content.indexOf(part)).split('\n').length
          });
        }
      }
    });
  });
});

// Save results
const output = {
  summary: {},
  details: results
};

newLanguages.forEach(lang => {
  output.summary[lang] = results[lang].length;
});

fs.writeFileSync(
  path.join(__dirname, 'english_copies_to_fix.json'),
  JSON.stringify(output, null, 2)
);

console.log('\nSummary:');
newLanguages.forEach(lang => {
  console.log(`${lang}: ${results[lang].length} English copies found`);
});

console.log('\nResults saved to english_copies_to_fix.json');









