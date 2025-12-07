/**
 * Fix British/Australian Spelling for en-GB and en-AU - Manual Fix
 * Converts American English to British/Australian English spelling
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'seedTranslations.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replacements for en-GB and en-AU
const replacements = [
  // favorite → favourite
  [/'en-GB': '([^']*?)favorite([^']*?)'/g, "'en-GB': '$1favourite$2'"],
  [/'en-AU': '([^']*?)favorite([^']*?)'/g, "'en-AU': '$1favourite$2'"],
  // Help Center → Help Centre
  [/'en-GB': 'Help Center'/g, "'en-GB': 'Help Centre'"],
  [/'en-AU': 'Help Center'/g, "'en-AU': 'Help Centre'"],
];

let totalFixed = 0;

replacements.forEach(([pattern, replacement]) => {
  const matches = content.match(pattern);
  if (matches) {
    content = content.replace(pattern, replacement);
    totalFixed += matches.length;
    console.log(`Fixed ${matches.length} instances`);
  }
});

fs.writeFileSync(filePath, content, 'utf8');
console.log(`\n✅ Fixed ${totalFixed} British/Australian spellings in seedTranslations.js`);

// Also fix footer file
const footerPath = path.join(__dirname, 'seedMissingTranslations_17_footer.js');
if (fs.existsSync(footerPath)) {
  let footerContent = fs.readFileSync(footerPath, 'utf8');
  let footerFixed = 0;
  
  replacements.forEach(([pattern, replacement]) => {
    const matches = footerContent.match(pattern);
    if (matches) {
      footerContent = footerContent.replace(pattern, replacement);
      footerFixed += matches.length;
    }
  });
  
  if (footerFixed > 0) {
    fs.writeFileSync(footerPath, footerContent, 'utf8');
    console.log(`✅ Fixed ${footerFixed} British/Australian spellings in seedMissingTranslations_17_footer.js`);
  }
}

console.log('\nDone!');



