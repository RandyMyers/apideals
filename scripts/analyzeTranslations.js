/**
 * Translation Analysis Script
 * Analyzes all pages/components and compares with seeded translations
 * Identifies missing translations for each language
 * 
 * Usage: node server/scripts/analyzeTranslations.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Translation = require('../models/translation');
const fs = require('fs');
const path = require('path');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    return false;
  }
};

// Supported languages
const SUPPORTED_LANGUAGES = ['en', 'en-GB', 'en-AU', 'ga', 'de', 'de-AT', 'es', 'it', 'no', 'fi', 'da', 'sv', 'fr', 'pt', 'nl'];

// Extract translation keys from a file
// Translation keys typically follow patterns like: "nav.home", "button.submit", "deals.filter.activeOnly"
const extractTranslationKeys = (filePath, content) => {
  const keys = new Set();
  
  // Pattern 1: t('key') or t("key") - must look like a translation key (contains dots, lowercase, etc.)
  // Translation keys usually have format: category.subcategory.key or similar
  const pattern1 = /t\(['"]([a-z][a-z0-9._-]+)['"]\)/g;
  let match;
  while ((match = pattern1.exec(content)) !== null) {
    const key = match[1];
    // Filter out obvious non-translation strings
    if (isValidTranslationKey(key)) {
      keys.add(key);
    }
  }
  
  // Pattern 2: t(`key`) - template literals
  const pattern2 = /t\(`([a-z][a-z0-9._-]+)`\)/g;
  while ((match = pattern2.exec(content)) !== null) {
    const key = match[1];
    if (isValidTranslationKey(key)) {
      keys.add(key);
    }
  }
  
  // Pattern 3: i18n.t('key')
  const pattern3 = /i18n\.t\(['"]([a-z][a-z0-9._-]+)['"]\)/g;
  while ((match = pattern3.exec(content)) !== null) {
    const key = match[1];
    if (isValidTranslationKey(key)) {
      keys.add(key);
    }
  }
  
  // Pattern 4: {t('key')} in JSX
  const pattern4 = /\{t\(['"]([a-z][a-z0-9._-]+)['"]\)\}/g;
  while ((match = pattern4.exec(content)) !== null) {
    const key = match[1];
    if (isValidTranslationKey(key)) {
      keys.add(key);
    }
  }
  
  return Array.from(keys);
};

// Validate if a string looks like a translation key
// Translation keys typically: start with lowercase, contain dots/underscores, not too short
const isValidTranslationKey = (key) => {
  // Must be at least 3 characters
  if (key.length < 3) return false;
  
  // Must start with lowercase letter
  if (!/^[a-z]/.test(key)) return false;
  
  // Should contain at least one dot or underscore (typical pattern: nav.home, button.submit)
  // OR be a common single-word key (like "home", "about", "contact")
  const commonSingleWords = ['home', 'about', 'contact', 'login', 'register', 'search', 'filter', 'sort', 'submit', 'cancel', 'save', 'delete', 'edit', 'view', 'back', 'next', 'prev', 'close', 'open', 'yes', 'no', 'ok', 'error', 'success', 'loading', 'empty', 'all', 'none'];
  
  if (commonSingleWords.includes(key)) return true;
  
  // Must contain dot or underscore for multi-part keys
  if (!/[._-]/.test(key)) return false;
  
  // Exclude obvious non-translation strings
  const excludedPatterns = [
    /^ref$/,
    /^token$/,
    /^type$/,
    /^store$/,
    /^config$/,
    /^script$/,
    /^q$/,
    /^[,\/\.\-]$/,
    /^@$/,
    /^text$/,
    /^textarea$/,
    /^none$/,
    /^next$/,
    /^prev$/,
    /^web-vitals$/,
    /^tx_ref$/,
    /^[a-z]$/, // Single letter
    /^[0-9]+$/, // Numbers only
    /^https?:\/\//, // URLs
    /^\.\./, // Relative paths
    /^\/api\//, // API paths
    /^\$\{/, // Template strings
    /\[data-/, // Data attributes
    /^[a-z]+\.[a-z]+\.[a-z]+$/, // But allow if it's a proper key pattern
  ];
  
  for (const pattern of excludedPatterns) {
    if (pattern.test(key)) return false;
  }
  
  return true;
};

// Recursively scan directory for JS/JSX files (optimized)
const scanDirectory = (dir, fileList = [], maxFiles = 500) => {
  if (fileList.length >= maxFiles) return fileList;
  
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      if (fileList.length >= maxFiles) break;
      
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Skip node_modules, build, and other non-source directories
        if (!file.includes('node_modules') && 
            !file.includes('build') && 
            !file.includes('.git') &&
            !file.includes('__tests__') &&
            !file.includes('.next')) {
          scanDirectory(filePath, fileList, maxFiles);
        }
      } else if ((file.endsWith('.js') || file.endsWith('.jsx')) && 
                 !file.includes('.test.') && 
                 !file.includes('.spec.')) {
        fileList.push(filePath);
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }
  
  return fileList;
};

// Main analysis function
const analyzeTranslations = async () => {
  console.log('\n🔍 Starting Translation Analysis...\n');
  
  // 1. Get all translations from database
  console.log('📊 Fetching translations from database...');
  const dbTranslations = await Translation.find({}).lean();
  const dbKeys = new Set(dbTranslations.map(t => t.key));
  const dbTranslationsMap = {};
  
  dbTranslations.forEach(t => {
    dbTranslationsMap[t.key] = t;
  });
  
  console.log(`   Found ${dbTranslations.length} translation keys in database\n`);
  
  // 2. Scan client directory for translation keys (EXCLUDE admin)
  console.log('📂 Scanning client files for translation usage...');
  const clientDir = path.join(__dirname, '../../client/src');
  const files = scanDirectory(clientDir).filter(file => {
    // Exclude admin directory and test files
    const relativePath = path.relative(clientDir, file);
    return !relativePath.includes('admin') && 
           !relativePath.includes('__tests__') &&
           !relativePath.includes('.test.') &&
           !relativePath.includes('.spec.');
  });
  
  console.log(`   Scanned ${files.length} client files (admin excluded)\n`);
  
  // 3. Extract all translation keys from files
  const usedKeys = new Set();
  const keyUsage = {}; // Track which files use which keys
  
  files.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const keys = extractTranslationKeys(filePath, content);
      
      keys.forEach(key => {
        usedKeys.add(key);
        if (!keyUsage[key]) {
          keyUsage[key] = [];
        }
        const relativePath = path.relative(clientDir, filePath);
        keyUsage[key].push(relativePath);
      });
    } catch (error) {
      console.error(`   ⚠️  Error reading ${filePath}:`, error.message);
    }
  });
  
  console.log(`   Found ${usedKeys.size} unique translation keys in use\n`);
  
  // 4. Compare and identify missing keys
  console.log('🔎 Analyzing missing translations...\n');
  
  const missingInDB = Array.from(usedKeys).filter(key => !dbKeys.has(key));
  const missingInCode = Array.from(dbKeys).filter(key => !usedKeys.has(key));
  
  // 5. Check missing translations for each language
  const missingTranslations = {};
  
  SUPPORTED_LANGUAGES.forEach(lang => {
    missingTranslations[lang] = [];
    
    dbTranslations.forEach(trans => {
      if (usedKeys.has(trans.key)) {
        if (!trans[lang] || trans[lang].trim() === '') {
          missingTranslations[lang].push({
            key: trans.key,
            category: trans.category,
            english: trans.en,
            context: keyUsage[trans.key] || ['unknown']
          });
        }
      }
    });
  });
  
  // 6. Generate report
  console.log('📝 Generating Analysis Report...\n');
  console.log('='.repeat(80));
  console.log('TRANSLATION ANALYSIS REPORT');
  console.log('='.repeat(80));
  console.log();
  
  // Summary
  console.log('📊 SUMMARY');
  console.log('-'.repeat(80));
  console.log(`Total keys in database:        ${dbKeys.size}`);
  console.log(`Total keys used in code:       ${usedKeys.size}`);
  console.log(`Keys in DB but not used:       ${missingInCode.length}`);
  console.log(`Keys used but not in DB:       ${missingInDB.length}`);
  console.log();
  
  // Missing translations by language
  console.log('🌍 MISSING TRANSLATIONS BY LANGUAGE');
  console.log('-'.repeat(80));
  
  SUPPORTED_LANGUAGES.forEach(lang => {
    const missing = missingTranslations[lang];
    const langNames = {
      en: 'English',
      ga: 'Irish',
      de: 'German',
      es: 'Spanish',
      it: 'Italian',
      no: 'Norwegian',
      fi: 'Finnish',
      da: 'Danish',
      sv: 'Swedish'
    };
    
    console.log(`\n${langNames[lang]} (${lang}): ${missing.length} missing`);
    if (missing.length > 0) {
      console.log('  Top 20 missing keys:');
      missing.slice(0, 20).forEach(item => {
        console.log(`    - ${item.key} (${item.category})`);
        console.log(`      English: "${item.english}"`);
        console.log(`      Used in: ${item.context.slice(0, 2).join(', ')}`);
      });
      if (missing.length > 20) {
        console.log(`    ... and ${missing.length - 20} more`);
      }
    }
  });
  
  console.log();
  console.log('='.repeat(80));
  
  // Keys used but not in database
  if (missingInDB.length > 0) {
    console.log('\n⚠️  KEYS USED IN CODE BUT NOT IN DATABASE');
    console.log('-'.repeat(80));
    missingInDB.slice(0, 50).forEach(key => {
      console.log(`  - ${key}`);
      if (keyUsage[key]) {
        console.log(`    Used in: ${keyUsage[key].slice(0, 3).join(', ')}`);
      }
    });
    if (missingInDB.length > 50) {
      console.log(`  ... and ${missingInDB.length - 50} more`);
    }
    console.log();
  }
  
  // Keys in database but not used
  if (missingInCode.length > 0) {
    console.log('\n📦 KEYS IN DATABASE BUT NOT USED IN CODE');
    console.log('-'.repeat(80));
    console.log(`  Total: ${missingInCode.length} keys`);
    console.log('  (These may be used in admin or future features)');
    console.log();
  }
  
  // Detailed breakdown by category
  console.log('\n📋 BREAKDOWN BY CATEGORY');
  console.log('-'.repeat(80));
  
  const categoryStats = {};
  
  SUPPORTED_LANGUAGES.forEach(lang => {
    categoryStats[lang] = {};
    missingTranslations[lang].forEach(item => {
      const cat = item.category || 'common';
      categoryStats[lang][cat] = (categoryStats[lang][cat] || 0) + 1;
    });
  });
  
  SUPPORTED_LANGUAGES.forEach(lang => {
    const langNames = {
      en: 'English',
      ga: 'Irish',
      de: 'German',
      es: 'Spanish',
      it: 'Italian',
      no: 'Norwegian',
      fi: 'Finnish',
      da: 'Danish',
      sv: 'Swedish'
    };
    
    console.log(`\n${langNames[lang]} (${lang}):`);
    Object.keys(categoryStats[lang]).sort().forEach(cat => {
      console.log(`  ${cat}: ${categoryStats[lang][cat]} missing`);
    });
  });
  
  // Generate JSON report
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalInDB: dbKeys.size,
      totalUsed: usedKeys.size,
      missingInDB: missingInDB.length,
      missingInCode: missingInCode.length
    },
    missingTranslations,
    missingInDB: missingInDB.slice(0, 100),
    missingInCode: missingInCode.slice(0, 100),
    keyUsage: Object.fromEntries(
      Object.entries(keyUsage).map(([key, files]) => [key, files.slice(0, 5)])
    )
  };
  
  const reportPath = path.join(__dirname, 'translation_analysis_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Detailed report saved to: ${reportPath}`);
  
  // Generate CSV for missing translations
  const csvLines = ['Language,Key,Category,English Translation,Files'];
  
  SUPPORTED_LANGUAGES.forEach(lang => {
    missingTranslations[lang].forEach(item => {
      const files = item.context.join('; ');
      csvLines.push(`"${lang}","${item.key}","${item.category}","${item.english.replace(/"/g, '""')}","${files}"`);
    });
  });
  
  const csvPath = path.join(__dirname, 'missing_translations.csv');
  fs.writeFileSync(csvPath, csvLines.join('\n'));
  console.log(`📄 CSV report saved to: ${csvPath}`);
  
  console.log('\n✅ Analysis complete!\n');
  
  return report;
};

// Run analysis
(async () => {
  const connected = await connectDB();
  if (!connected) {
    process.exit(1);
  }
  
  try {
    await analyzeTranslations();
  } catch (error) {
    console.error('❌ Error during analysis:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
})();

