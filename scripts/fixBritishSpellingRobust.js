/**
 * Fix British/Australian Spelling - Robust Version
 * Uses proper regex to find and replace all instances
 */

const fs = require('fs');
const path = require('path');

const fixFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let fixed = 0;
  const originalContent = content;
  
  // Fix favorite → favourite for en-GB and en-AU
  // Match: 'en-GB': '...favorite...' or 'en-AU': '...favorite...'
  content = content.replace(/(['"]en-GB['"]:\s*['"])([^'"]*?)favorite([^'"]*?)(['"])/gi, (match, prefix, before, after, suffix) => {
    fixed++;
    return `${prefix}${before}favourite${after}${suffix}`;
  });
  
  content = content.replace(/(['"]en-AU['"]:\s*['"])([^'"]*?)favorite([^'"]*?)(['"])/gi, (match, prefix, before, after, suffix) => {
    fixed++;
    return `${prefix}${before}favourite${after}${suffix}`;
  });
  
  // Fix Help Center → Help Centre for en-GB and en-AU
  content = content.replace(/(['"]en-GB['"]:\s*['"])Help Center(['"])/gi, (match, prefix, suffix) => {
    fixed++;
    return `${prefix}Help Centre${suffix}`;
  });
  
  content = content.replace(/(['"]en-AU['"]:\s*['"])Help Center(['"])/gi, (match, prefix, suffix) => {
    fixed++;
    return `${prefix}Help Centre${suffix}`;
  });
  
  if (fixed > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  Fixed ${fixed} spellings`);
  }
  
  return fixed;
};

console.log('🔧 Fixing British/Australian spelling...\n');

const files = [
  'seedTranslations.js',
  'seedMissingTranslations_17_footer.js',
];

let totalFixed = 0;
files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`Processing ${file}...`);
    const fixed = fixFile(filePath);
    totalFixed += fixed;
  }
});

console.log(`\n✅ Total: ${totalFixed} British/Australian spellings fixed\n`);

