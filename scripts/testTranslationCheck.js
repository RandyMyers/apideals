const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'seedTranslations.js');
const content = fs.readFileSync(filePath, 'utf8');

console.log('File size:', content.length, 'characters');
console.log('First 500 chars:', content.substring(0, 500));

// Test pattern matching
const testPattern = /fr:\s*['"]([^'"]+)['"]/g;
let matches = 0;
let englishCopies = 0;

const enPattern = /en:\s*['"]([^'"]+)['"]/g;

// Find all translation objects
const objects = content.split(/\{\s*key:\s*['"]/);
console.log('\nFound', objects.length, 'potential translation objects');

// Check first 10 objects
objects.slice(1, 11).forEach((obj, idx) => {
  const keyMatch = obj.match(/^([^'"]+)['"]/);
  const enMatch = obj.match(/en:\s*['"]([^'"]+)['"]/);
  const frMatch = obj.match(/fr:\s*['"]([^'"]+)['"]/);
  
  if (keyMatch && enMatch && frMatch) {
    const key = keyMatch[1];
    const en = enMatch[1];
    const fr = frMatch[1];
    
    console.log(`\n${idx + 1}. Key: ${key}`);
    console.log(`   EN: ${en.substring(0, 50)}`);
    console.log(`   FR: ${fr.substring(0, 50)}`);
    console.log(`   Is copy: ${fr.trim() === en.trim()}`);
    
    if (fr.trim() === en.trim()) {
      englishCopies++;
    }
    matches++;
  }
});

console.log(`\n\nTest Results:`);
console.log(`Total matches: ${matches}`);
console.log(`English copies: ${englishCopies}`);









