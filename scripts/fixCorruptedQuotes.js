/**
 * Fix Corrupted Quotes in Seed Files
 * Fixes ''': patterns that should be 'en-GB': or 'en-AU':
 */

const fs = require('fs');
const path = require('path');

const fixFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let fixed = 0;
  
  // Find all instances of ''': and determine if they should be en-GB or en-AU
  // We'll look at the context - if the previous line has en-GB, this is en-AU, and vice versa
  const lines = content.split('\n');
  const fixedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    if (line.includes("''':")) {
      // Check previous lines to determine which language this should be
      let shouldBe = 'en-GB'; // default
      
      // Look back up to 5 lines to find the pattern
      for (let j = Math.max(0, i - 5); j < i; j++) {
        if (lines[j].includes("'en-GB':")) {
          shouldBe = 'en-AU';
          break;
        } else if (lines[j].includes("'en-AU':")) {
          shouldBe = 'en-GB';
          break;
        }
      }
      
      // Also check if the previous line with '''': was en-GB or en-AU
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        if (lines[j].includes("'en-GB':")) {
          shouldBe = 'en-AU';
          break;
        } else if (lines[j].includes("'en-AU':")) {
          shouldBe = 'en-GB';
          break;
        } else if (lines[j].includes("''':")) {
          // If previous broken quote was just fixed to en-GB, this should be en-AU
          if (fixedLines[j] && fixedLines[j].includes("'en-GB':")) {
            shouldBe = 'en-AU';
            break;
          }
        }
      }
      
      line = line.replace(/''':/g, `'${shouldBe}':`);
      fixed++;
    }
    
    fixedLines.push(line);
  }
  
  if (fixed > 0) {
    fs.writeFileSync(filePath, fixedLines.join('\n'), 'utf8');
  }
  
  return fixed;
};

console.log('🔧 Fixing corrupted quotes...\n');

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
    if (fixed > 0) {
      console.log(`  Fixed ${fixed} corrupted quotes`);
      totalFixed += fixed;
    }
  }
});

console.log(`\n✅ Total: ${totalFixed} corrupted quotes fixed\n`);

