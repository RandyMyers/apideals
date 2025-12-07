/**
 * Analyze New Language Translations
 * Identifies translation entries where new languages (fr, pt, it, nl, en-GB, en-AU, de-AT)
 * have English copies instead of proper translations
 * 
 * Initial languages: ga, de, es, it, no, fi, da, sv (and en as base)
 * New languages to check: fr, pt, it, nl, en-GB, en-AU, de-AT
 * 
 * Usage: node server/scripts/analyzeNewLanguageTranslations.js
 */

const fs = require('fs');
const path = require('path');

// Languages to check
const newLanguages = ['fr', 'pt', 'it', 'nl', 'en-GB', 'en-AU', 'de-AT'];

// Get all seed translation files
const scriptsDir = path.join(__dirname);
const seedFiles = fs.readdirSync(scriptsDir)
  .filter(file => file.startsWith('seed') && file.endsWith('.js'))
  .map(file => path.join(scriptsDir, file));

console.log('🔍 Analyzing translation seed files...\n');
console.log(`Found ${seedFiles.length} seed files to analyze\n`);

const results = {
  files: {},
  summary: {}
};

// Initialize summary
newLanguages.forEach(lang => {
  results.summary[lang] = {
    totalEntries: 0,
    englishCopies: 0,
    properTranslations: 0,
    entries: []
  };
});

// Function to parse a translation object from content
function parseTranslationEntry(content, startIndex) {
  // Find the opening brace
  let braceCount = 0;
  let objStart = -1;
  let objEnd = -1;
  let inString = false;
  let stringChar = null;
  let escapeNext = false;

  for (let i = startIndex; i < content.length; i++) {
    const char = content[i];
    const prevChar = i > 0 ? content[i - 1] : '';

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && !escapeNext) {
      escapeNext = true;
      continue;
    }

    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
      continue;
    }

    if (inString && char === stringChar && !escapeNext) {
      inString = false;
      stringChar = null;
      continue;
    }

    if (!inString) {
      if (char === '{') {
        if (braceCount === 0) {
          objStart = i;
        }
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0 && objStart !== -1) {
          objEnd = i + 1;
          break;
        }
      }
    }
  }

  if (objStart === -1 || objEnd === -1) {
    return null;
  }

  return content.substring(objStart, objEnd);
}

// Analyze each file
seedFiles.forEach(filePath => {
  const fileName = path.basename(filePath);
  console.log(`📄 Analyzing ${fileName}...`);

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Find all translation objects by looking for "key:" patterns
    const keyPattern = /key:\s*['"]([^'"]+)['"]/g;
    let match;
    let processed = 0;

    while ((match = keyPattern.exec(content)) !== null) {
      const keyStart = match.index;
      const objStr = parseTranslationEntry(content, keyStart);
      
      if (!objStr) continue;

      // Extract key
      const keyMatch = objStr.match(/key:\s*['"]([^'"]+)['"]/);
      if (!keyMatch) continue;

      const key = keyMatch[1];

      // Extract English value
      const enMatch = objStr.match(/en:\s*['"]([^'"]+)['"]/);
      if (!enMatch) continue;

      const enValue = enMatch[1];

      // Extract all new language values
      newLanguages.forEach(lang => {
        let langPattern;
        if (lang.includes('-')) {
          // Handle 'en-GB', 'en-AU', 'de-AT' with quotes
          langPattern = new RegExp(`['"]${lang.replace(/-/g, '\\-')}['"]:\\s*['"]([^'"]+)['"]`, 'i');
        } else {
          langPattern = new RegExp(`${lang}:\\s*['"]([^'"]+)['"]`, 'i');
        }

        const langMatch = objStr.match(langPattern);
        if (langMatch) {
          const langValue = langMatch[1];
          results.summary[lang].totalEntries++;

          // Check if it's an English copy
          if (langValue.trim() === enValue.trim()) {
            results.summary[lang].englishCopies++;
            results.summary[lang].entries.push({
              file: fileName,
              key: key,
              english: enValue,
              translation: langValue
            });
          } else {
            results.summary[lang].properTranslations++;
          }
        }
      });

      processed++;
    }

    console.log(`   Processed ${processed} translation entries`);

  } catch (error) {
    console.error(`❌ Error reading ${fileName}:`, error.message);
    console.error(error.stack);
  }
});

// Generate report
console.log('\n' + '='.repeat(80));
console.log('TRANSLATION ANALYSIS REPORT');
console.log('='.repeat(80));
console.log('\n');

const langNames = {
  'fr': 'French',
  'pt': 'Portuguese',
  'it': 'Italian',
  'nl': 'Dutch',
  'en-GB': 'English (UK)',
  'en-AU': 'English (Australia)',
  'de-AT': 'German (Austria)'
};

newLanguages.forEach(lang => {
  const langName = langNames[lang] || lang;
  const summary = results.summary[lang];
  
  console.log(`\n📊 ${langName} (${lang}):`);
  console.log(`   Total entries found: ${summary.totalEntries}`);
  console.log(`   ✅ Proper translations: ${summary.properTranslations}`);
  console.log(`   ❌ English copies: ${summary.englishCopies}`);
  
  if (summary.englishCopies > 0) {
    const percentage = ((summary.englishCopies / summary.totalEntries) * 100).toFixed(1);
    console.log(`   ⚠️  ${percentage}% need translation`);
    
    // Group by file
    const byFile = {};
    summary.entries.forEach(entry => {
      if (!byFile[entry.file]) {
        byFile[entry.file] = [];
      }
      byFile[entry.file].push(entry);
    });
    
    console.log(`\n   Files with English copies:`);
    Object.keys(byFile).forEach(file => {
      console.log(`   - ${file}: ${byFile[file].length} entries`);
    });
    
    // Show sample entries
    console.log(`\n   Sample entries needing translation (first 10):`);
    summary.entries.slice(0, 10).forEach((entry, i) => {
      const preview = entry.english.length > 50 
        ? entry.english.substring(0, 50) + '...' 
        : entry.english;
      console.log(`   ${i + 1}. [${entry.file}] ${entry.key}: "${preview}"`);
    });
    
    if (summary.entries.length > 10) {
      console.log(`   ... and ${summary.entries.length - 10} more`);
    }
  }
});

// Overall summary
console.log('\n' + '='.repeat(80));
console.log('OVERALL SUMMARY');
console.log('='.repeat(80));

let totalEntries = 0;
let totalEnglishCopies = 0;
let totalProper = 0;

newLanguages.forEach(lang => {
  totalEntries += results.summary[lang].totalEntries;
  totalEnglishCopies += results.summary[lang].englishCopies;
  totalProper += results.summary[lang].properTranslations;
});

console.log(`\nTotal translation entries analyzed: ${totalEntries}`);
console.log(`✅ Proper translations: ${totalProper}`);
console.log(`❌ English copies: ${totalEnglishCopies}`);

if (totalEntries > 0) {
  const overallPercentage = ((totalEnglishCopies / totalEntries) * 100).toFixed(1);
  console.log(`⚠️  ${overallPercentage}% of entries are English copies and need translation`);
}

// Save detailed report to file
const reportPath = path.join(__dirname, 'translation_analysis_detailed.json');
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log(`\n📄 Detailed report saved to: ${reportPath}`);

// Generate CSV for easy review
const csvPath = path.join(__dirname, 'translation_english_copies.csv');
const csvLines = ['File,Language,Key,English Value,Translation Value'];
newLanguages.forEach(lang => {
  results.summary[lang].entries.forEach(entry => {
    csvLines.push(`"${entry.file}","${lang}","${entry.key}","${entry.english}","${entry.translation}"`);
  });
});
fs.writeFileSync(csvPath, csvLines.join('\n'));
console.log(`📄 CSV report saved to: ${csvPath}`);

console.log('\n✅ Analysis complete!\n');









