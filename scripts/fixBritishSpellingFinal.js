/**
 * Fix British/Australian Spelling - Final Version
 */

const fs = require('fs');
const path = require('path');

const fixFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let fixed = 0;
  
  // Replace favorite with favourite for en-GB and en-AU
  const favoritePattern = /('en-GB'|'en-AU'):\s*'([^']*?)favorite([^']*?)'/g;
  content = content.replace(favoritePattern, (match, lang, before, after) => {
    fixed++;
    return `${lang}: '${before}favourite${after}'`;
  });
  
  // Replace Help Center with Help Centre for en-GB and en-AU
  const centerPattern = /('en-GB'|'en-AU'):\s*'Help Center'/g;
  content = content.replace(centerPattern, (match, lang) => {
    fixed++;
    return `${lang}: 'Help Centre'`;
  });
  
  if (fixed > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
  
  return fixed;
};

const files = [
  'seedTranslations.js',
  'seedMissingTranslations_17_footer.js',
];

let totalFixed = 0;
files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const fixed = fixFile(filePath);
    if (fixed > 0) {
      console.log(`✓ ${file}: Fixed ${fixed} spellings`);
      totalFixed += fixed;
    }
  }
});

console.log(`\n✅ Total: ${totalFixed} British/Australian spellings fixed`);



