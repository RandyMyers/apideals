/**
 * Find All Translation Keys Used in Client Code
 * Scans all client files to find all translation keys being used
 * 
 * Usage: node server/scripts/findAllClientTranslationKeys.js
 */

const fs = require('fs');
const path = require('path');

// Recursively find all JS/JSX/TS/TSX files
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and build directories
      if (!['node_modules', 'build', 'dist', '.git'].includes(file)) {
        findFiles(filePath, fileList);
      }
    } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Extract translation keys from file content
function extractTranslationKeys(content, filePath) {
  const keys = new Set();
  
  // Pattern 1: t('key', 'fallback')
  const pattern1 = /t\(['"]([^'"]+)['"]/g;
  let match;
  while ((match = pattern1.exec(content)) !== null) {
    keys.add(match[1]);
  }
  
  // Pattern 2: t("key", "fallback")
  // Pattern 3: t(`key`, `fallback`)
  const pattern2 = /t\([`'"]([^`'"]+)[`'"]/g;
  while ((match = pattern2.exec(content)) !== null) {
    keys.add(match[1]);
  }
  
  // Pattern 4: useTranslation and then t.key
  // This is harder to detect, but we can look for common patterns
  
  return Array.from(keys);
}

// Main function
function findAllTranslationKeys() {
  const clientDir = path.join(__dirname, '../../client/src');
  
  if (!fs.existsSync(clientDir)) {
    console.error('❌ Client directory not found:', clientDir);
    process.exit(1);
  }
  
  console.log('🔍 Scanning client files for translation keys...\n');
  
  const files = findFiles(clientDir);
  console.log(`📁 Found ${files.length} files to scan\n`);
  
  const allKeys = new Map(); // key -> { files: Set, count: number }
  
  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const keys = extractTranslationKeys(content, file);
      
      keys.forEach(key => {
        if (!allKeys.has(key)) {
          allKeys.set(key, { files: new Set(), count: 0 });
        }
        allKeys.get(key).files.add(file.replace(clientDir + path.sep, ''));
        allKeys.get(key).count++;
      });
    } catch (error) {
      console.error(`⚠️  Error reading ${file}:`, error.message);
    }
  });
  
  // Sort keys alphabetically
  const sortedKeys = Array.from(allKeys.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  
  console.log('='.repeat(80));
  console.log(`FOUND ${sortedKeys.length} UNIQUE TRANSLATION KEYS IN CLIENT CODE`);
  console.log('='.repeat(80));
  console.log();
  
  // Group by category (first part of key)
  const byCategory = {};
  sortedKeys.forEach(([key, info]) => {
    const category = key.split('.')[0] || 'other';
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push({ key, ...info });
  });
  
  // Print by category
  Object.keys(byCategory).sort().forEach(category => {
    const keys = byCategory[category];
    console.log(`\n📂 ${category.toUpperCase()} (${keys.length} keys):`);
    keys.forEach(({ key, count, files }) => {
      const fileList = Array.from(files).slice(0, 2);
      const moreFiles = files.size > 2 ? ` (+${files.size - 2} more)` : '';
      console.log(`  ${key} (used ${count}x in ${files.size} file(s))`);
      if (files.size <= 2) {
        fileList.forEach(f => console.log(`    - ${f}`));
      } else {
        console.log(`    - ${fileList[0]}`);
        console.log(`    - ${fileList[1]}${moreFiles}`);
      }
    });
  });
  
  // Save to file for comparison
  const outputFile = path.join(__dirname, '../../CLIENT_TRANSLATION_KEYS.json');
  const output = {
    totalKeys: sortedKeys.length,
    keys: sortedKeys.map(([key, info]) => ({
      key,
      usageCount: info.count,
      files: Array.from(info.files)
    })),
    byCategory: Object.keys(byCategory).reduce((acc, cat) => {
      acc[cat] = byCategory[cat].length;
      return acc;
    }, {})
  };
  
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
  console.log(`\n✅ Results saved to: ${outputFile}`);
  
  return sortedKeys.map(([key]) => key);
}

// Run
const clientKeys = findAllTranslationKeys();
console.log(`\n📊 Total unique keys found: ${clientKeys.length}`);







