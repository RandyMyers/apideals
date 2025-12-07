/**
 * Find entries where fr, pt, nl are English copies
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'seedTranslations.js');
const content = fs.readFileSync(filePath, 'utf8');

// Pattern to match translation objects
const objPattern = /\{\s*key:\s*['"]([^'"]+)['"][^}]*\}/g;
let match;
let count = 0;
const entries = [];

while ((match = objPattern.exec(content)) !== null) {
  const objStr = match[0];
  
  // Extract values
  const enMatch = objStr.match(/en:\s*['"]([^'"]+)['"]/);
  const frMatch = objStr.match(/fr:\s*['"]([^'"]+)['"]/);
  const ptMatch = objStr.match(/pt:\s*['"]([^'"]+)['"]/);
  const nlMatch = objStr.match(/nl:\s*['"]([^'"]+)['"]/);
  
  if (enMatch && frMatch && ptMatch && nlMatch) {
    const en = enMatch[1];
    const fr = frMatch[1];
    const pt = ptMatch[1];
    const nl = nlMatch[1];
    
    // Check if fr, pt, nl are all the same as English
    if (fr === en && pt === en && nl === en) {
      const keyMatch = objStr.match(/key:\s*['"]([^'"]+)['"]/);
      if (keyMatch) {
        entries.push({
          key: keyMatch[1],
          en: en,
          line: content.substring(0, match.index).split('\n').length
        });
        count++;
      }
    }
  }
}

console.log(`Found ${count} entries where fr, pt, nl are English copies:\n`);
entries.slice(0, 100).forEach((entry, i) => {
  console.log(`${i + 1}. Line ${entry.line}: ${entry.key} = "${entry.en}"`);
});

if (count > 100) {
  console.log(`\n... and ${count - 100} more entries`);
}







